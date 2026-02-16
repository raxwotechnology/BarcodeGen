import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { HistoryPage } from './HistoryPage';
import { GeneratorPage } from './GeneratorPage';
import { Layout } from '../ui/Layout';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <DashboardPage />
          </Layout>
        }
      />
      <Route
        path="/generator"
        element={
          <Layout>
            <GeneratorPage />
          </Layout>
        }
      />
      <Route
        path="/history"
        element={
          <Layout>
            <HistoryPage />
          </Layout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

