
const dotenv = require("dotenv");
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const barcodeRoutes = require('./routes/barcode');

dotenv.config();

const app = express();

// Basic middleware
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:5173",
  "https://barcodesgenbyraxwo.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);


if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  res.status(200).json({
    status: 'ok',
    mongodb: {
      state: dbState,
      status: dbStates[dbState] || 'unknown',
      connected: dbState === 1,
      database: dbState === 1 ? mongoose.connection.db.databaseName : null,
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/barcodes', barcodeRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barcodegen';

connectDB(MONGODB_URI).then(() => {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`MongoDB status: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Not connected'}`);
  });
});

