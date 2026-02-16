const express = require('express');
const bwipjs = require('bwip-js');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Barcode = require('../models/Barcode');

const router = express.Router();

const parseOptions = (body) => {
  const {
    width,
    height,
    fontSize,
    lineColor,
    background,
    margin,
    displayValue,
  } = body || {};

  return {
    width: Number(width) || 2,
    height: Number(height) || 80,
    fontSize: Number(fontSize) || 14,
    lineColor: lineColor || '#000000',
    background: background || '#ffffff',
    margin: Number(margin) || 10,
    displayValue: displayValue !== undefined ? Boolean(displayValue) : true,
  };
};

// Helper to map client type to bwip-js barcode type
const mapBarcodeType = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'code128':
      return 'code128';
    case 'ean13':
      return 'ean13';
    case 'upca':
      return 'upca';
    default:
      return 'code128';
  }
};

// POST /api/barcodes/generate
router.post('/generate', async (req, res) => {
  try {
    const { text, type = 'code128', format = 'png', save = true, label } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }

    const options = parseOptions(req.body);

    // Save metadata to MongoDB BEFORE generating image (so it's saved even if image generation fails)
    let savedBarcode = null;
    if (save) {
      const dbState = mongoose.connection.readyState;
      // eslint-disable-next-line no-console
      console.log(`[Generate] MongoDB connection state: ${dbState} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`);
      
      if (dbState === 1) {
        try {
          savedBarcode = await Barcode.create({
            type: type.toLowerCase(),
            text,
            options,
            label: label || null,
          });
          // eslint-disable-next-line no-console
          console.log('✅ Barcode saved to MongoDB:', {
            id: savedBarcode._id,
            type: savedBarcode.type,
            text: savedBarcode.text,
            label: savedBarcode.label,
            createdAt: savedBarcode.createdAt,
          });
        } catch (dbErr) {
          // eslint-disable-next-line no-console
          console.error('❌ Save barcode error:', dbErr.message);
          // eslint-disable-next-line no-console
          console.error('Error details:', dbErr);
          // Continue even if save fails - still generate the barcode
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('⚠️ MongoDB not connected (state=' + dbState + ') - barcode not saved to history');
        // eslint-disable-next-line no-console
        console.warn('   Check MONGODB_URI in .env file');
      }
    }

    if (type.toLowerCase() === 'qrcode') {
      // QR code handled with qrcode library
      // QR code margin is in quiet zone modules (typically 1-4), convert from pixel-like value
      const qrMargin = Math.max(1, Math.min(4, Math.round(options.margin / 10)));
      
      if (format === 'svg') {
        const svg = await QRCode.toString(text, {
          type: 'svg',
          margin: qrMargin,
          color: {
            dark: options.lineColor,
            light: options.background,
          },
        });
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }

      const pngBuffer = await QRCode.toBuffer(text, {
        margin: qrMargin,
        color: {
          dark: options.lineColor,
          light: options.background,
        },
        width: options.width * 20,
      });

      if (format === 'pdf') {
        const doc = new PDFDocument({ size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
        const x = (doc.page.width - options.width * 4) / 2;
        const y = 150;
        doc.image(pngBuffer, x, y, { width: options.width * 4 });
        doc.end();
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      return res.end(pngBuffer);
    }

    // 1D barcodes via bwip-js
    // Margin: paddingwidth/paddingheight are in pixels - ensure minimum visibility
    // Scale margin appropriately: margin value * scale factor for better visibility
    const scaleFactor = Math.max(1, options.width);
    const effectiveMargin = Math.max(5, Math.round(options.margin * scaleFactor));
    
    // Font size: textsize is in points (bwip-js accepts 8-72, but scales with barcode)
    // Use the fontSize directly but ensure it's in valid range
    const effectiveFontSize = Math.max(8, Math.min(72, Math.round(options.fontSize)));
    
    const bwipOptions = {
      bcid: mapBarcodeType(type),
      text,
      scale: options.width,
      height: options.height,
      includetext: options.displayValue,
      alttext: label || text,
      textxalign: 'center',
      backgroundcolor: options.background.replace('#', ''),
      inkcolor: options.lineColor.replace('#', ''),
      textsize: effectiveFontSize,
      paddingwidth: effectiveMargin,
      paddingheight: effectiveMargin,
      paddingleft: effectiveMargin,
      paddingright: effectiveMargin,
      paddingtop: effectiveMargin,
      paddingbottom: effectiveMargin,
    };

    if (format === 'svg') {
      return bwipjs.toBuffer({ ...bwipOptions, encoding: 'svg' }, (err, svg) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.error('Barcode SVG error:', err);
          return res.status(400).json({ message: 'Failed to generate barcode' });
        }
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg.toString());
      });
    }

    bwipjs.toBuffer(bwipOptions, (err, png) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('Barcode PNG error:', err);
        return res.status(400).json({ message: 'Failed to generate barcode' });
      }

      if (format === 'pdf') {
        const doc = new PDFDocument({ size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);
        const x = (doc.page.width - options.width * 4) / 2;
        const y = 150;
        doc.image(png, x, y, { width: options.width * 4 });
        doc.end();
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      return res.end(png);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Generate barcode error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/barcodes/history
router.get('/history', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    // eslint-disable-next-line no-console
    console.log(`[History] MongoDB connection state: ${dbState}`);
    
    if (dbState !== 1) {
      // eslint-disable-next-line no-console
      console.warn('[History] MongoDB not connected - returning empty history');
      return res.json([]);
    }
    
    const items = await Barcode.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    // eslint-disable-next-line no-console
    console.log(`[History] ✅ Found ${items.length} barcodes in database`);
    if (items.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[History] Sample: ${items[0].type} - ${items[0].text}`);
    }
    
    return res.json(items);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[History] ❌ Error:', err.message);
    // eslint-disable-next-line no-console
    console.error('[History] Error details:', err);
    // Return empty array if DB is unavailable
    return res.json([]);
  }
});

// DELETE /api/barcodes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Barcode.findOneAndDelete({ _id: id });
    if (!deleted) {
      return res.status(404).json({ message: 'Barcode not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Delete barcode error (non-fatal):', err.message);
    // If DB error, still return success to avoid breaking UI
    return res.json({ success: true });
  }
});

// GET /api/barcodes/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    // eslint-disable-next-line no-console
    console.log(`[Dashboard] MongoDB connection state: ${dbState}`);
    
    if (dbState !== 1) {
      // eslint-disable-next-line no-console
      console.warn('[Dashboard] MongoDB not connected - returning empty dashboard');
      return res.json({
        totalBarcodes: 0,
        recentBarcodes: [],
      });
    }
    
    const total = await Barcode.countDocuments({});
    const recent = await Barcode.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // eslint-disable-next-line no-console
    console.log(`[Dashboard] ✅ Total=${total}, Recent=${recent.length}`);
    if (recent.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[Dashboard] Sample recent: ${recent[0].type} - ${recent[0].text}`);
    }
    
    return res.json({
      totalBarcodes: total,
      recentBarcodes: recent,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Dashboard] ❌ Error:', err.message);
    // eslint-disable-next-line no-console
    console.error('[Dashboard] Error details:', err);
    // Return empty data if DB is unavailable
    return res.json({
      totalBarcodes: 0,
      recentBarcodes: [],
    });
  }
});

module.exports = router;

