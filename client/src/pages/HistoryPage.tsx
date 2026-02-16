import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface BarcodeItem {
  _id: string;
  type: string;
  text: string;
  createdAt: string;
}

export const HistoryPage: React.FC = () => {
  const [items, setItems] = useState<BarcodeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<BarcodeItem[]>('/barcodes/history');
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error('History load error:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh every 5 seconds to show new barcodes
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const remove = async (id: string) => {
    await api.delete(`/barcodes/${id}`);
    setItems((prev) => prev.filter((x) => x._id !== id));
  };

  const download = async (item: BarcodeItem) => {
    try {
      const body = {
        text: item.text,
        type: item.type,
        format: 'png',
        save: false,
        width: 2,
        height: 80,
        fontSize: 14,
        margin: 10,
        displayValue: true,
      };
      const res = await api.post('/barcodes/generate', body, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barcode-${item.type}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error:', err);
      alert('Failed to download barcode: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="card">
      <div className="card-header-row">
        <div>
          <h2>Barcode history</h2>
          <p className="subtitle">View and manage barcodes you&apos;ve generated.</p>
        </div>
        <button type="button" className="secondary-btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && items.length === 0 && (
        <p className="muted">No barcodes yet. Generate one from the Generator tab.</p>
      )}
      {!loading && items.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Data</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id}>
                <td>
                  <span className="pill pill-soft">{item.type.toUpperCase()}</span>
                </td>
                <td className="code-cell">{item.text}</td>
                <td>
                  {new Date(item.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </td>
                <td className="table-actions">
                  <button
                    type="button"
                    className="secondary-btn small"
                    onClick={() => download(item)}
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    className="ghost-btn small danger"
                    onClick={() => remove(item._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

