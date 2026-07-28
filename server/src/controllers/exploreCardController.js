import ExploreCard from '../models/ExploreCard.js';

export async function listExploreCards(_req, res, next) {
  try {
    const cards = await ExploreCard.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json({ cards });
  } catch (err) {
    next(err);
  }
}
