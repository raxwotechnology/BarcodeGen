import React, { useMemo, useState } from 'react';
import { api } from '../api/client';

type BarcodeType = 'code128' | 'ean13' | 'upca' | 'qrcode';
type OutputFormat = 'png' | 'svg' | 'pdf';

export const GeneratorPage: React.FC = () => {
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [shopName, setShopName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<'USD' | 'INR'>('USD');
  const [label, setLabel] = useState('');
  const [type, setType] = useState<BarcodeType>('code128');
  const [format, setFormat] = useState<OutputFormat>('png');
  const [width, setWidth] = useState(2);
  const [height, setHeight] = useState(80);
  const [fontSize, setFontSize] = useState(14);
  const [lineColor, setLineColor] = useState('#000000');
  const [background, setBackground] = useState('#ffffff');
  const [margin, setMargin] = useState(10);
  const [displayValue, setDisplayValue] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formattedPrice = useMemo(() => {
    const trimmed = itemPrice.trim();
    if (!trimmed) return '';
    const symbol = priceCurrency === 'USD' ? '$' : 'Rs ';
    return `${symbol}${trimmed}`;
  }, [itemPrice, priceCurrency]);

  const encodedText = useMemo(() => {
    // Build a single payload text that contains all requested fields
    // Example format: CODE|NAME|SHOP|PRICE
    const parts = [itemCode, itemName, shopName, formattedPrice || itemPrice].map((p) => p.trim());
    // Fallback to itemCode if others are empty
    if (parts.every((p) => !p)) {
      return '';
    }
    return parts.join(' | ');
  }, [formattedPrice, itemCode, itemName, shopName, itemPrice]);

  const displayLabel = useMemo(() => {
    // Human-readable text to show under the barcode (alt text)
    const parts = [itemCode, itemName, formattedPrice].map((p) => p.trim()).filter(Boolean);
    return parts.join(' • ');
  }, [formattedPrice, itemCode, itemName]);

  const previewStyles = useMemo(
    () => ({
      width: `${Math.max(1, width) * 80}px`,
      maxHeight: `${Math.max(40, height) * 2}px`,
      backgroundColor: background,
    }),
    [background, height, width]
  );

  const requestBody = useMemo(
    () => ({
      text: encodedText,
      // If we have item fields, prefer them as the visible text under the barcode.
      label: displayLabel || label,
      type,
      format,
      width,
      height,
      fontSize,
      lineColor,
      background,
      margin,
      displayValue,
      save: true,
    }),
    [background, displayValue, displayLabel, encodedText, fontSize, format, height, label, lineColor, margin, type, width]
  );

  const generatePreview = async () => {
    if (!encodedText.trim()) {
      setError('Please fill in at least one of: item code, item name, shop name, or price.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/barcodes/generate', requestBody, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(url);
      // Clear any previous errors on success
      setError(null);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to generate barcode';
      setError(errorMsg);
      console.error('Generate preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!encodedText.trim()) {
      setError('Please fill in at least one of: item code, item name, shop name, or price.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.post('/barcodes/generate', { ...requestBody, save: false }, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barcode-${type}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to download barcode';
      setError(errorMsg);
      console.error('Download error:', err);
    } finally {
      setLoading(false);
    }
  };

  const printLabels = async () => {
    if (!encodedText.trim()) {
      setError('Please fill in at least one of: item code, item name, shop name, or price.');
      return;
    }
    const qty = Number.isFinite(quantity) && quantity > 0 ? Math.min(quantity, 100) : 1;
    setQuantity(qty);
    setError(null);
    setLoading(true);
    try {
      // Always use PNG for printing for best compatibility
      const body = { ...requestBody, format: 'png', save: false };
      const res = await api.post('/barcodes/generate', body, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);

      // Map width/height sliders to print pixel size (same idea as previewStyles)
      const printWidthPx = Math.max(1, width) * 80;
      const printHeightPx = Math.max(40, height) * 2;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Allow popups to print barcodes.');
      }

      printWindow.document.write(`
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Print barcodes</title>
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      }
      .sheet {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .label {
        border: 1px dashed #cbd5f5;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        justify-content: center;
            background: ${background};
      }
      .label img {
            width: ${printWidthPx}px;
            height: ${printHeightPx}px;
      }
      @media print {
        body {
          padding: 0;
        }
        .label {
          border: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      ${Array.from({ length: qty })
        .map(
          () => `
        <div class="label">
          <img src="${url}" />
        </div>`
        )
        .join('')}
    </div>
    <script>
      window.onload = function () {
        window.focus();
        window.print();
      };
    </script>
  </body>
</html>
      `);
      printWindow.document.close();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to prepare print preview';
      setError(errorMsg);
      console.error('Print error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="two-column">
      <div className="card">
        <h2>Generate barcode</h2>
        <p className="subtitle">Customize your barcode and preview it in real time.</p>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-grid">
          <label className="field">
            <span>Item code</span>
            <input
              type="text"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
              placeholder="e.g. 0123456789"
            />
          </label>

          <label className="field">
            <span>Item name</span>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Software"
            />
          </label>

          <label className="field">
            <span>Shop name</span>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. Raxwo Store"
            />
          </label>

          <label className="field">
            <span>Item price</span>
            <input
              type="text"
              value={itemPrice}
              onChange={(e) => setItemPrice(e.target.value)}
              placeholder="e.g. 19.99"
            />
          </label>

          <label className="field">
            <span>Currency</span>
            <select
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value === 'INR' ? 'INR' : 'USD')}
            >
              <option value="USD">$ (USD)</option>
              <option value="INR">Rs (LKR)</option>
            </select>
          </label>

          <label className="field full">
            <span>Label / company name (optional)</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My Company"
            />
          </label>

          <label className="field">
            <span>Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as BarcodeType)}>
              <option value="code128">Code 128</option>
              <option value="ean13">EAN-13</option>
              <option value="upca">UPC-A</option>
              <option value="qrcode">QR Code</option>
            </select>
          </label>

          <label className="field">
            <span>Download format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as OutputFormat)}
            >
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
              <option value="pdf">PDF</option>
            </select>
          </label>

          <label className="field">
            <span>Width</span>
            <input
              type="number"
              min={1}
              max={10}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span>Height</span>
            <input
              type="number"
              min={40}
              max={200}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span>Font size</span>
            <input
              type="number"
              min={8}
              max={32}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span>Margin</span>
            <input
              type="number"
              min={0}
              max={40}
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </label>

          <label className="field">
            <span>Line color</span>
            <input
              type="color"
              value={lineColor}
              onChange={(e) => setLineColor(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Background</span>
            <input
              type="color"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
          </label>

          <label className="checkbox-row full">
            <input
              type="checkbox"
              checked={displayValue}
              onChange={(e) => setDisplayValue(e.target.checked)}
            />
            <span>Show text below barcode</span>
          </label>
        </div>

        <div className="actions-row">
          <button type="button" className="primary-btn" onClick={generatePreview} disabled={loading}>
            {loading ? 'Generating...' : 'Generate preview'}
          </button>
          <button type="button" className="secondary-btn" onClick={download} disabled={loading}>
            Download
          </button>
          <button type="button" className="secondary-btn" onClick={printLabels} disabled={loading}>
            Print
          </button>
        </div>
      </div>

      <div className="card preview-card">
        <h2>Preview</h2>
        <p className="subtitle">Your barcode preview will appear here.</p>
        <div className="preview-surface">
          {!previewUrl && <div className="muted">No preview yet. Generate to see it here.</div>}
          {previewUrl && format !== 'pdf' && (
            <img
              src={previewUrl}
              alt="Barcode preview"
              className="preview-image"
              style={previewStyles}
            />
          )}
          {previewUrl && format === 'pdf' && (
            <iframe
              title="Barcode PDF preview"
              src={previewUrl}
              className="preview-pdf"
              style={previewStyles}
            />
          )}
          {previewUrl && (
            <div className="preview-meta">
              {(itemName || itemCode) && (
                <div className="preview-meta-line">
                  {itemName && <span className="preview-strong">{itemName}</span>}
                  {itemName && itemCode && <span> · </span>}
                  {itemCode && <span>Code: {itemCode}</span>}
                </div>
              )}
              {shopName && (
                <div className="preview-meta-line">
                  <span>{shopName}</span>
                </div>
              )}
              {formattedPrice && (
                <div className="preview-meta-line">
                  <span>Price: {formattedPrice}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

