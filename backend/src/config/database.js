const mongoose = require("mongoose");

let connectionListenersRegistered = false;

function registerConnectionListeners() {
  if (connectionListenersRegistered) {
    return;
  }

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  mongoose.connection.on("error", (error) => {
    console.error(`MongoDB connection error: ${error.message}`);
  });

  connectionListenersRegistered = true;
}

async function connectToDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is required to start the backend");
  }

  registerConnectionListeners();

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    throw error;
  }
}

module.exports = { connectToDatabase };
