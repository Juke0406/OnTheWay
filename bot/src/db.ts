import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ontheway';
        await mongoose.connect(mongoURI);
    } catch (error) {
        process.exit(1);
    }
}