const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.log("MONGO_URI environment variable is not set");
      console.log("Available environment variables:", Object.keys(process.env).filter(key => key.includes('MONGO')));
      process.exit(1);
    }
    
    console.log("Attempting to connect to MongoDB...");
    console.log("MONGO_URI starts with:", process.env.MONGO_URI.substring(0, 20) + "...");
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.log("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
