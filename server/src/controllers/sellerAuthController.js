import bcrypt from 'bcryptjs';
import RestaurantOwner from '../models/RestaurantOwner.js';
import Restaurant from '../models/Restaurant.js';
import { signToken } from '../utils/token.js';
import { ApiError } from '../utils/ApiError.js';
import { assertValidMobile, assertMobileNotTaken } from '../utils/mobileValidation.js';
import { createNotification, notifySellerAccount, notifyAdmins } from '../utils/notify.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function respondWithToken(res, owner, statusCode = 200) {
  const token = signToken(owner._id.toString(), 'seller');
  res.cookie('feastgo_seller_token', token, COOKIE_OPTIONS);
  res.status(statusCode).json({ token, user: owner.toSafeObject() });
}

export async function signup(req, res, next) {
  try {
    const name = String(req.body.name ?? '').trim();
    const businessName = String(req.body.businessName ?? '').trim();
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const phone = assertValidMobile(req.body.phone);
    const password = String(req.body.password ?? '');

    if (!name || !businessName) throw new ApiError(400, 'Name and business name are required');
    if (!isValidEmail(email)) throw new ApiError(400, 'Enter a valid email address');
    if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');

    const existing = await RestaurantOwner.findOne({ email });
    if (existing) throw new ApiError(409, 'An account with this email already exists');
    await assertMobileNotTaken(RestaurantOwner, phone);

    const passwordHash = await bcrypt.hash(password, 10);
    const owner = await RestaurantOwner.create({ name, businessName, email, phone, passwordHash });
    await createNotification({
      recipientId: owner._id,
      recipientRole: 'seller',
      type: 'welcome',
      title: 'Welcome to FeastGo!',
      message: `Hi ${owner.name.split(' ')[0]}, your seller account for "${owner.businessName}" is set up. Register your restaurant to start receiving orders.`,
    });
    await notifyAdmins('new_seller_registration', 'New seller registered', `${owner.businessName} (${owner.email}) signed up and is awaiting review`);
    respondWithToken(res, owner, 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email = String(req.body.email ?? '').trim().toLowerCase();
    const password = String(req.body.password ?? '');
    if (!email || !password) throw new ApiError(400, 'Email and password are required');

    const owner = await RestaurantOwner.findOne({ email }).select('+passwordHash');
    if (!owner) throw new ApiError(401, 'Invalid email or password');

    const match = await bcrypt.compare(password, owner.passwordHash);
    if (!match) throw new ApiError(401, 'Invalid email or password');

    respondWithToken(res, owner);
  } catch (err) {
    next(err);
  }
}

export async function logout(_req, res) {
  res.clearCookie('feastgo_seller_token');
  res.status(200).json({ message: 'Logged out' });
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new ApiError(400, 'Current and new password are required');
    if (newPassword.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');

    const owner = await RestaurantOwner.findById(req.user._id).select('+passwordHash');
    const match = await bcrypt.compare(currentPassword, owner.passwordHash);
    if (!match) throw new ApiError(401, 'Current password is incorrect');

    owner.passwordHash = await bcrypt.hash(newPassword, 10);
    await owner.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user.toSafeObject() });
}

export async function updateMyProfile(req, res, next) {
  try {
    const owner = await RestaurantOwner.findById(req.user._id);
    if (!owner) throw new ApiError(404, 'Account not found');

    const name = req.body.name !== undefined ? String(req.body.name).trim() : owner.name;
    const phone = req.body.phone !== undefined ? assertValidMobile(req.body.phone) : owner.phone;
    const email = req.body.email !== undefined ? String(req.body.email).trim().toLowerCase() : owner.email;

    if (!name) throw new ApiError(400, 'Owner name is required');
    if (!isValidEmail(email)) throw new ApiError(400, 'Enter a valid email address');

    if (email !== owner.email) {
      const existing = await RestaurantOwner.findOne({ email, _id: { $ne: owner._id } });
      if (existing) throw new ApiError(409, 'An account with this email already exists');
    }
    if (phone !== owner.phone) {
      await assertMobileNotTaken(RestaurantOwner, phone, owner._id);
    }

    owner.name = name;
    owner.phone = phone;
    owner.email = email;
    await owner.save();
    await notifySellerAccount(owner._id, 'profile_updated', 'Profile updated', 'Your account details have been saved.');
    res.json({ user: owner.toSafeObject() });
  } catch (err) {
    next(err);
  }
}

export async function registerRestaurant(req, res, next) {
  try {
    if (req.user.restaurant) throw new ApiError(409, 'You have already registered a restaurant');

    const { name, description, cuisines, coverImage, address, priceRange, deliveryFee, minOrder } = req.body;
    if (!name) throw new ApiError(400, 'Restaurant name is required');

    const slug = String(name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // A seller whose account is already admin-approved doesn't need their
    // restaurant to sit in a second, separate pending queue — only a
    // brand-new (still-pending) seller's first restaurant needs review.
    const preApproved = req.user.status === 'approved';

    const restaurant = await Restaurant.create({
      name,
      slug,
      description: description || '',
      cuisines: cuisines || [],
      coverImage: coverImage || '',
      address: address || {},
      priceRange: priceRange || 2,
      deliveryFee: deliveryFee ?? 2.5,
      minOrder: minOrder ?? 8,
      owner: req.user._id,
      verificationStatus: preApproved ? 'approved' : 'pending',
      isOpen: preApproved,
    });

    req.user.restaurant = restaurant._id;
    await req.user.save();

    if (!preApproved) {
      await notifyAdmins('restaurant_approval_request', 'Restaurant awaiting approval', `${restaurant.name} (${req.user.businessName}) submitted for review`, null);
    }

    res.status(201).json({ restaurant });
  } catch (err) {
    next(err);
  }
}
