import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {apiCall} from "@/services/api.ts";

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<string | null>(null);
  const navigate = useNavigate();

  // Poll for authentication status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (isPolling && authState) {
      const checkAuthStatus = async () => {
        try {
          const data = await apiCall(`/auth/status?state=${authState}`);
          
          if (data.status === 'complete') {
            // Authentication complete, store token and redirect
            localStorage.setItem('auth_token', data.token);
            document.cookie = `auth_token=${data.token}; path=/`;
            setIsPolling(false);
            window.location.href = '/';
          } else if (data.status === 'expired') {
            // Authentication expired
            setIsPolling(false);
            setError('Authentication session expired. Please try again.');
          }
          // If status is 'pending', continue polling
        } catch (err) {
          console.error('Failed to check auth status:', err);
          // Continue polling even if there's an error
        }
      };

      // Start polling every 2 seconds
      pollInterval = setInterval(checkAuthStatus, 2000);
      // Also check immediately
      checkAuthStatus();
    }

    // Cleanup interval on unmount or when polling stops
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isPolling, authState, navigate]);

  const handleTelegramAuth = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the browser auth endpoint to create an auth session
      // This endpoint is at the root level, not under /api/v1
      const data = await apiCall(`/auth/browser`);

      const redirectUrl = data.url;
      const url = new URL(redirectUrl);
      const state = url.searchParams.get('start');
      if (state) {
        setAuthState(state);
        setIsPolling(true);
        window.location.href = redirectUrl;
      } else {
        setError('Failed to initiate Telegram authentication. Please try again.');
      }
    } catch (err) {
      setError('Failed to initiate Telegram authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">VPN Connect</h1>
          <p className="text-gray-400">Secure and fast VPN service</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">
            To access this service, please authenticate through Telegram. 
            Click the button below to start the authentication process.
          </p>
          
          {isPolling && (
            <div className="bg-blue-900 border border-blue-700 text-blue-200 px-4 py-3 rounded-lg mb-6">
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Waiting for Telegram authentication... Please check your Telegram app.</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <button
            onClick={handleTelegramAuth}
            disabled={isLoading || isPolling}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
          >
            {(isLoading || isPolling) ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isPolling ? 'Waiting for Authentication...' : 'Authenticating...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Authenticate with Telegram
              </>
            )}
          </button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>After clicking the button, you'll be redirected to Telegram to confirm authentication.</p>
          <p className="mt-2">Once confirmed, you'll be automatically logged in to the application.</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;