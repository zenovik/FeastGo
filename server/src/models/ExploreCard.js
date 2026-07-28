import mongoose from 'mongoose';

// Powers the customer home page's "Explore More" rail — each card is a
// shortcut into the food-listing page with a pre-applied filter combination.
// `filters` deliberately stores whatever shape the food-items query API
// accepts (see foodController.js's listFoodItems) rather than a fixed set of
// booleans, so new filter combinations can be authored from the admin panel
// without a schema change every time.
const exploreCardSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '' },
    icon: { type: String, required: true },
    image: { type: String, default: '' },
    gradientFrom: { type: String, default: '#ff5127' },
    gradientTo: { type: String, default: '#7f2010' },
    badge: { type: String, default: '' },
    route: { type: String, default: '/restaurants' },
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('ExploreCard', exploreCardSchema);
