import mongoose from "mongoose";
import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  console.warn("⚠️  Unable to set public DNS servers:", err.message);
}

let cachedConn = null;
let cachedPromise = null;

const connectDB = async () => {
  if (cachedConn && mongoose.connection.readyState === 1) {
    return cachedConn;
  }

  const uri = process.env.MONGODB_URI;

  if (cachedPromise) {
    cachedConn = await cachedPromise;
    return cachedConn;
  }

  const options = {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 10,
  };

  mongoose.connection.on("connected", () => {
    const host = mongoose.connection.host ?? "unknown host";
    const dbName = mongoose.connection.name ?? "unknown db";
    console.log(`✅  MongoDB connected → host: ${host}  db: ${dbName}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error(`❌  MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("⚠️   MongoDB disconnected.");
    cachedConn = null;
    cachedPromise = null;
  });

  cachedPromise = mongoose.connect(uri, options).then((m) => m.connection);

  try {
    cachedConn = await cachedPromise;
  } catch (err) {
    cachedPromise = null;
    throw err;
  }

  return cachedConn;
};

export default connectDB;
