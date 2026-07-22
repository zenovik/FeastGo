import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import Restaurant from '../models/Restaurant.js';
import { restaurantSeeds } from './data.js';
import { generateGalleryImages } from './svg.js';

// Adds `images` to restaurants that were seeded before the gallery-card
// feature existed, without touching orders/reviews/menu items like a full
// `npm run seed` would.
async function run() {
  await connectDB(process.env.MONGO_URI);

  let updated = 0;
  for (const r of restaurantSeeds) {
    const restaurant = await Restaurant.findOne({ slug: r.slug });
    if (!restaurant || restaurant.images.length > 0) continue;

    restaurant.images = [restaurant.coverImage, ...generateGalleryImages(r)];
    await restaurant.save();
    updated += 1;
    console.log(`[backfill]  -> ${r.name}`);
  }

  console.log(`[backfill] done. ${updated} restaurant(s) updated.`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('[backfill] failed', err);
  process.exit(1);
});
