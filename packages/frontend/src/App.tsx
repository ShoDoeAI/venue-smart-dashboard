import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/app-layout';
import Dashboard from './pages/dashboard';
import Analytics from './pages/analytics';
import AIAssistant from './pages/ai-assistant';
import Actions from './pages/actions';
import Events from './pages/events';
import Customers from './pages/customers';
import Activity from './pages/activity';
import Settings from './pages/settings';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="actions" element={<Actions />} />
          <Route path="events" element={<Events />} />
          <Route path="customers" element={<Customers />} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}