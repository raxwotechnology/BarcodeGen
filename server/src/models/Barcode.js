const mongoose = require('mongoose');

const barcodeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: ['code128', 'ean13', 'upca', 'qrcode'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: false,
    },
    options: {
      width: Number,
      height: Number,
      fontSize: Number,
      lineColor: String,
      background: String,
      margin: Number,
      displayValue: Boolean,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Barcode', barcodeSchema);

