import mongoose from 'mongoose';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`[feastgo-api] MongoDB connected -> ${mongoose.connection.name}`);
}
