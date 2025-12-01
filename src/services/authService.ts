// Authentication Service for hybrid Telegram WebApp and browser access
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// Detect if we're in Telegram WebApp
export const isTelegramWebApp = (): boolean => {
  // Check if Telegram WebApp object exists and has the necessary properties
  const telegram = (window as any).Telegram;
  if (!telegram || !telegram.WebApp) {
    return false;
  }
  
  // For a more reliable check, we can verify multiple properties
  const webApp = telegram.WebApp;
  return !!(webApp.ready && webApp.expand && webApp.initData);
};

// Get Telegram init data
export const getTelegramInitData = (): string => {
  if (isTelegramWebApp() && (window as any).Telegram?.WebApp?.initData) {
    return (window as any).Telegram.WebApp.initData;
  }
  return '';
};

// Get browser authentication token (from localStorage or cookies)
export const getBrowserAuthToken = (): string | null => {
  // Check localStorage
  const token = localStorage.getItem('auth_token');
  if (token) {
    return token;
  }
  
  // Check cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'auth_token') {
      return value;
    }
  }
  
  return null;
};

// Set browser authentication token
export const setBrowserAuthToken = (token: string): void => {
  // Set in localStorage
  localStorage.setItem('auth_token', token);
  
  // Set in cookie (expires in 30 days)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  document.cookie = `auth_token=${token}; expires=${expiryDate.toUTCString()}; path=/`;
};

// Clear browser authentication
export const clearBrowserAuth = (): void => {
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

// Enhanced API call with authentication detection
export const authenticatedApiCall = async (endpoint: string, options: RequestInit = {}, retries = 3) => {
  // Determine authentication method
  const isTelegram = isTelegramWebApp();
  const telegramInitData = getTelegramInitData();
  const browserToken = getBrowserAuthToken();

  // debugger;
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Copy any existing headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }
  
  // Add appropriate authentication header
  // Priority: Telegram initData > Browser token
  if (isTelegram && telegramInitData) {
    headers['X-Telegram-Init-Data'] = telegramInitData;
  } else if (browserToken) {
    headers['Authorization'] = `Bearer ${browserToken}`;
  }
  
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        
        // If unauthorized, clear auth and notify caller to handle redirect
        if (response.status === 401) {
          if (!isTelegram) {
            clearBrowserAuth();
            // Instead of redirecting, we'll throw a specific error that can be caught
            throw new Error('UNAUTHORIZED_BROWSER');
          }
        }
        
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error('Request failed after retries');
};

// Initialize Telegram WebApp
export const initializeTelegramWebApp = (): void => {
  if (isTelegramWebApp()) {
    const webApp = (window as any).Telegram.WebApp;
    webApp.ready();
    webApp.expand();
    webApp.setHeaderColor('#0e1621');
    webApp.setBackgroundColor('#0e1621');
    
    // Set up the main button if available
    if (webApp.MainButton) {
      webApp.MainButton.setParams({
        text: 'Open App',
        color: '#2481cc',
        text_color: '#ffffff'
      });
      
      webApp.MainButton.onClick(() => {
        // Just expand the app if it's not already expanded
        webApp.expand();
      });
      
      webApp.MainButton.show();
    }
    
    // Hide back button by default
    if (webApp.BackButton) {
      webApp.BackButton.hide();
    }
    
    // Expand the app to full screen
    webApp.expand();
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  // First check if we're in Telegram WebApp
  if (isTelegramWebApp()) {
    // For Telegram WebApp, we primarily rely on initData
    const initData = getTelegramInitData();
    // If we have initData, we're authenticated via Telegram
    if (initData) {
      return true;
    }
    // Fallback to browser token if no initData
    return !!getBrowserAuthToken();
  } else {
    // For browser access, check for browser token
    return !!getBrowserAuthToken();
  }
};

// Get authentication method
export const getAuthMethod = (): 'telegram' | 'browser' | 'none' => {
  // First check if we're in Telegram WebApp
  if (isTelegramWebApp()) {
    // For Telegram WebApp, check if we have initData
    const initData = getTelegramInitData();
    if (initData) {
      return 'telegram';
    }
    // If no initData but we have a browser token, it's browser auth
    if (getBrowserAuthToken()) {
      return 'browser';
    }
    // If neither, then no auth
    return 'none';
  } else {
    // For browser access, check for browser token
    if (getBrowserAuthToken()) {
      return 'browser';
    }
    return 'none';
  }
};

// Redirect to browser authentication
export const redirectToBrowserAuth = (): void => {
  // Instead of redirecting, we'll throw an error that can be caught by components
  throw new Error('BROWSER_AUTH_REQUIRED');
};

// Validate browser token
export const validateBrowserToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL.replace('/api/v1', '')}/auth/validate?token=${token}`);
    return response.ok;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};