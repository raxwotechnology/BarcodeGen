import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface DashboardData {
  totalBarcodes: number;
  recentBarcodes: {
    _id: string;
    type: string;
    text: string;
    createdAt: string;
  }[];
}

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get<DashboardData>('/barcodes/dashboard');
      console.log('Dashboard data loaded:', res.data);
      setData(res.data);
    } catch (err: any) {
      console.error('Dashboard load error:', err);
      // Set empty data on error
      setData({ totalBarcodes: 0, recentBarcodes: [] });
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

  return (
    <div className="cards-grid">
      <div className="card primary">
        <h3>Total barcodes generated</h3>
        <p className="big-number">
          {loading ? '—' : data?.totalBarcodes.toLocaleString() ?? '0'}
        </p>
      </div>
      <div className="card">
        <h3>Recently generated</h3>
        {loading && <p>Loading...</p>}
        {!loading && data && data.recentBarcodes.length === 0 && (
          <p className="muted">No barcodes yet. Generate your first one!</p>
        )}
        {!loading && data && data.recentBarcodes.length > 0 && (
          <ul className="list">
            {data.recentBarcodes.map((b) => (
              <li key={b._id} className="list-item">
                <div className="pill pill-soft">{b.type.toUpperCase()}</div>
                <div className="list-main">
                  <div className="list-title">{b.text}</div>
                  <div className="list-sub">
                    {new Date(b.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

