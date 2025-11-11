import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try to load .env from current working directory (backend/) first,
// otherwise fall back to the monorepo root ../.env so MONGODB_URI is available
let envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(process.cwd(), '../.env');
}

dotenv.config({ path: envPath });

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export default connectDB;
