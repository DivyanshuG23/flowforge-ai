import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('[MongoDB] Error: MONGODB_URI is not defined in environment variables.');
    if (process.env.NODE_ENV === 'production') {
      console.error('[MongoDB] Fatal: Cannot start production server without database connection.');
      process.exit(1);
    }
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      console.error('[MongoDB] Fatal: Database connection failure in production environment.');
      process.exit(1);
    }
  }
};

export default connectDB;
