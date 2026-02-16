const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async (mongoUri) => {
  try {
    // Set up connection event listeners
    mongoose.connection.on('connected', () => {
      isConnected = true;
      // eslint-disable-next-line no-console
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      isConnected = false;
      // eslint-disable-next-line no-console
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      // eslint-disable-next-line no-console
      console.warn('⚠️ MongoDB disconnected');
    });

    // Mongoose 8+ no longer needs useNewUrlParser/useUnifiedTopology options
    await mongoose.connect(mongoUri);
    isConnected = mongoose.connection.readyState === 1;
    
    if (isConnected) {
      // eslint-disable-next-line no-console
      console.log('✅ MongoDB connected successfully');
      // eslint-disable-next-line no-console
      console.log(`   Database: ${mongoose.connection.db.databaseName}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn('⚠️ MongoDB connection state:', mongoose.connection.readyState);
    }
  } catch (err) {
    isConnected = false;
    // eslint-disable-next-line no-console
    console.error('❌ MongoDB connection error (continuing without database):', err.message);
    // eslint-disable-next-line no-console
    console.error('   Note: Barcode history will not be saved. To enable history:');
    // eslint-disable-next-line no-console
    console.error('   1. Start MongoDB locally, OR');
    // eslint-disable-next-line no-console
    console.error('   2. Set MONGODB_URI in .env file to MongoDB Atlas connection string');
    process.exit(1); // Exit process with failure
  }
};

// Check connection status
const checkConnection = () => {
  return mongoose.connection.readyState === 1;
};

module.exports = { connectDB, checkConnection };

