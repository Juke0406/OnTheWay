import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ontheway';
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}