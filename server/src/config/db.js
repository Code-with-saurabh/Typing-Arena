import mongoose from 'mongoose';

export async function connectDb(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
}

export function dbReady() {
  return mongoose.connection.readyState === 1;
}
