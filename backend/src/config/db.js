import mongoose from 'mongoose';
import dns from 'node:dns';

// Node's own DNS resolver (c-ares) can fail to complete the SRV lookup that
// `mongodb+srv://` URIs depend on — this shows up especially on Windows when
// the network's default DNS server is an IPv6 link-local address, even
// though the OS resolver (e.g. `nslookup`) handles the same query fine.
// Pointing Node at a public resolver sidesteps that mismatch.
dns.setServers(['8.8.8.8', '1.1.1.1']);

let connectionPromise = null;

/**
 * Connects to MongoDB Atlas, caching the connection promise so repeated
 * calls (e.g. one per request in a serverless environment) reuse the same
 * connection instead of opening a new one every time.
 */
export function connectDB() {
  if (connectionPromise) return connectionPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return Promise.reject(new Error('MONGODB_URI is not defined in the environment'));
  }

  connectionPromise = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 8000,
    })
    .then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((err) => {
      connectionPromise = null; // allow the next request to retry
      throw err;
    });

  return connectionPromise;
}

export function dbState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] ?? 'unknown';
}