import Category from '../models/Category.js';

export async function listCategories(_req, res, next) {
  try {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json({ categories });
  } catch (err) {
    next(err);
  }
}
