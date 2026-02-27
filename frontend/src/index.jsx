import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // This points to your App.jsx

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);