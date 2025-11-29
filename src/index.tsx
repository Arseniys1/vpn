import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Import Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.min.css';

// Extend window interface for Telegram
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        initData: string;
        HapticFeedback: {
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        showPopup: (params: {
          title?: string;
          message: string;
          buttons?: {id?: string; type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive', text?: string}[];
        }, callback?: (id: string) => void) => void;
        showAlert: (message: string, callback?: () => void) => void;
      };
    };
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
