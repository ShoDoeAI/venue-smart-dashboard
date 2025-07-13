import React from 'react';
import ReactDOM from 'react-dom/client';
import DataViewer from './pages/data-viewer';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DataViewer />
  </React.StrictMode>
);