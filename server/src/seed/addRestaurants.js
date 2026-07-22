import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Restaurant from '../models/Restaurant.js';
import MenuItem from '../models/MenuItem.js';
import { restaurantSeeds, menuFor } from './data.js';
import { generateCoverSvg, generateLogoSvg, generateDishSvg, generateGalleryImages } from './svg.js';

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const INR_MULTIPLIER = 20;
const toInr = (amount) => Math.round(amount * INR_MULTIPLIER);

// Creates only restaurants from data.js that don't already exist in the DB
// (matched by slug), unlike `npm run seed` which wipes and rebuilds everything.
async function run() {
  await connectDB(process.env.MONGO_URI);

  let added = 0;
  for (const r of restaurantSeeds) {
    const existing = await Restaurant.findOne({ slug: r.slug });
    if (existing) continue;

    const coverImage = generateCoverSvg({
      slug: r.slug,
      title: r.name,
      emoji: r.emoji,
      colorFrom: r.gradient[0],
      colorTo: r.gradient[1],
    });
    const logoImage = generateLogoSvg({ slug: r.slug, initials: r.initials, color: r.color });
    const images = [coverImage, ...generateGalleryImages(r)];

    const restaurant = await Restaurant.create({
      name: r.name,
      slug: r.slug,
      description: r.description,
      cuisines: r.cuisines,
      priceRange: r.priceRange,
      rating: Math.round((3.9 + Math.random() * 1.1) * 10) / 10,
      ratingCount: Math.floor(50 + Math.random() * 950),
      deliveryTimeMin: r.deliveryTimeMin,
      deliveryTimeMax: r.deliveryTimeMax,
      deliveryFee: toInr(r.deliveryFee),
      minOrder: toInr(r.minOrder),
      coverImage,
      logoImage,
      images,
      address: { line1: `${Math.floor(10 + Math.random() * 900)} Main St`, area: r.area, city: r.city },
      location: { lat: 0, lng: 0 },
      isOpen: true,
      isFeatured: r.isFeatured,
      isPromoted: r.isPromoted,
      tags: r.tags,
      offer: r.offer,
    });

    const items = menuFor(r.slug);
    for (const item of items) {
      const itemSlug = `${r.slug}-${slugify(item.name)}`;
      const image = generateDishSvg({
        slug: itemSlug,
        emoji: item.emoji,
        colorFrom: r.gradient[0],
        colorTo: r.gradient[1],
      });
      await MenuItem.create({
        restaurant: restaurant._id,
        name: item.name,
        description: item.desc,
        price: toInr(item.price),
        image,
        category: item.category,
        isVeg: item.isVeg,
        isBestseller: !!item.bestseller,
        isAvailable: true,
        rating: Math.round((3.8 + Math.random() * 1.2) * 10) / 10,
      });
    }
    added += 1;
    console.log(`[add-restaurants]  -> ${r.name} (${items.length} items)`);
  }

  console.log(`[add-restaurants] done. ${added} restaurant(s) added.`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[add-restaurants] failed', err);
  process.exit(1);
});
