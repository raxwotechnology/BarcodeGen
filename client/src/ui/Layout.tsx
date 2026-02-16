import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-circle">
            <img src="/logo.jpg" alt="App logo" className="logo-image" />
          </div>
          <div>
            <div className="brand-name">BarcodeGen</div>
            <div className="brand-subtitle">Online Generator</div>
          </div>
        </div>
        <nav className="nav">
          <Link
            to="/"
            className={location.pathname === '/' ? 'nav-link active' : 'nav-link'}
          >
            Dashboard
          </Link>
          <Link
            to="/generator"
            className={location.pathname === '/generator' ? 'nav-link active' : 'nav-link'}
          >
            Generator
          </Link>
          <Link
            to="/history"
            className={location.pathname === '/history' ? 'nav-link active' : 'nav-link'}
          >
            History
          </Link>
        </nav>
        <div className="sidebar-footer" />
      </aside>
      <main className="main">
        <header className="topbar">
          <h1 className="page-title">Online Barcode Generator</h1>
          <p className="page-subtitle">Generate, download, and manage professional barcodes.</p>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
};

