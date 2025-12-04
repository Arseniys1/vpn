import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {authenticatedApiCall, isAuthenticated, setBrowserAuthToken} from '@/services/authService';

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState, setAuthState] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [botLinkCopied, setBotLinkCopied] = useState(false);
  const [botLink, setBotLink] = useState<string | null>(null);
  const [showManualAuth, setShowManualAuth] = useState(false);
  const navigate = useNavigate();

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      // Redirect to main page if already authenticated
      window.location.href = '/';
    }
  }, [navigate]);

  // Poll for authentication status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;

    if (isPolling && authState) {
      const checkAuthStatus = async () => {
        try {
          const data = await authenticatedApiCall(`/auth/status?state=${authState}`);
          
          if (data.status === 'complete') {
            setBrowserAuthToken(data.token);
            setIsPolling(false);
            window.location.href = '/';
          } else if (data.status === 'expired') {
            // Authentication expired
            setIsPolling(false);
            setError('Сессия аутентификации истекла. Пожалуйста, попробуйте снова.');
            setShowManualAuth(true);
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

  // Fetch bot information
  useEffect(() => {
    const fetchBotInfo = async () => {
      try {
        const data = await authenticatedApiCall('/bot-info');
        setBotLink(data.bot_link);
      } catch (err) {
        console.error('Failed to fetch bot info:', err);
        // Use fallback bot link
        setBotLink("https://t.me/vpnconnect_bot");
      }
    };

    fetchBotInfo();
  }, []);

  const handleTelegramAuth = async () => {
    setIsLoading(true);
    setError(null);
    setCopySuccess(false);
    setBotLinkCopied(false);
    
    try {
      // Call the browser auth endpoint to create an auth session
      // This endpoint is at the root level, not under /api/v1
      const data = await authenticatedApiCall(`/auth/browser`);

      const redirectUrl = data.url;
      const url = new URL(redirectUrl);
      const state = url.searchParams.get('start');
      if (state) {
        setAuthState(state);
        setIsPolling(true);
        setShowManualAuth(true); // Show manual auth immediately after clicking
        window.location.href = redirectUrl;
        // Show manual auth instructions after a delay if redirect doesn't work
        setTimeout(() => {
          setShowManualAuth(true);
        }, 5000);
      } else {
        setError('Не удалось начать аутентификацию через Telegram. Пожалуйста, попробуйте снова.');
        setShowManualAuth(true);
      }
    } catch (err) {
      setError('Не удалось начать аутентификацию через Telegram. Пожалуйста, попробуйте снова.');
      setShowManualAuth(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCommand = async () => {
    if (!authState) return;
    
    const command = `/start ${authState}`;
    try {
      await navigator.clipboard.writeText(command);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error('Failed to copy command:', err);
      setError('Не удалось скопировать команду в буфер обмена');
    }
  };

  const handleCopyBotLink = async () => {
    if (!botLink) return;
    
    try {
      await navigator.clipboard.writeText(botLink);
      setBotLinkCopied(true);
      setTimeout(() => setBotLinkCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy bot link:', err);
      setError('Не удалось скопировать ссылку на бота');
    }
  };

  // Don't render anything if user is already authenticated (redirecting)
  if (isAuthenticated()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-tg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-tg-blue to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-tg-blue/20">
            <i className="fas fa-user-lock"></i>
          </div>
        </div>

        <div className="bg-tg-secondary rounded-xl p-6 mb-6 border border-tg-separator/50">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-tg-text mb-2">VPN Connect</h1>
            <p className="text-tg-hint">Безопасный и быстрый VPN сервис</p>
          </div>
          
          <h2 className="text-xl font-bold text-tg-text mb-4 text-center">Требуется аутентификация</h2>
          <p className="text-tg-hint text-sm mb-6 text-center">
            Для доступа к сервису, пожалуйста, авторизуйтесь через Telegram.
          </p>
          
          {isPolling && (
            <div className="bg-tg-blue/10 border border-tg-blue/30 text-tg-blue px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-tg-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Ожидание аутентификации через Telegram... Проверьте приложение Telegram.</span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <button
            onClick={handleTelegramAuth}
            disabled={isLoading || isPolling}
            className="w-full bg-tg-blue hover:bg-opacity-90 disabled:bg-tg-button-disabled text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center mb-3"
          >
            {(isLoading || isPolling) ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isPolling ? 'Ожидание аутентификации...' : 'Аутентификация...'}
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Авторизоваться через Telegram
              </>
            )}
          </button>
          
          <div className="mt-6 text-center text-xs text-tg-hint">
            <p>После нажатия кнопки вы будете перенаправлены в Telegram для подтверждения аутентификации.</p>
            <p className="mt-1">После подтверждения вы автоматически войдете в приложение.</p>
          </div>
        </div>
        
        {showManualAuth && (
          <div className="bg-tg-secondary rounded-xl p-5 border border-tg-separator/50 mb-6">
            <h3 className="font-bold text-tg-text mb-3 text-center">Если страница не открылась автоматически:</h3>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <button
                onClick={handleCopyBotLink}
                disabled={!botLink}
                className="text-xs flex items-center justify-center bg-tg-button-disabled hover:bg-tg-hover disabled:opacity-50 text-tg-text py-1.5 px-3 rounded transition flex-1"
              >
                {botLinkCopied ? (
                  <>
                    <svg className="w-4 h-4 mr-1 text-tg-green" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Ссылка скопирована
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    Скопировать ссылку на бота
                  </>
                )}
              </button>
              <button
                onClick={handleCopyCommand}
                disabled={!authState}
                className="text-xs flex items-center justify-center bg-tg-button-disabled hover:bg-tg-hover disabled:opacity-50 text-tg-text py-1.5 px-3 rounded transition flex-1"
              >
                {copySuccess ? (
                  <>
                    <svg className="w-4 h-4 mr-1 text-tg-green" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Команда скопирована
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    Скопировать команду
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-tg-hint text-center">
              Откройте Telegram, перейдите по ссылке на бота и отправьте ему команду для входа.
            </p>
          </div>
        )}
        
        <div className="bg-tg-secondary rounded-xl p-5 border border-tg-separator/50">
          <h3 className="font-bold text-tg-text mb-3 text-center">Как это работает</h3>
          <ol className="text-sm text-tg-hint space-y-3 list-decimal list-inside pl-4">
            <li>Нажмите кнопку "Авторизоваться через Telegram"</li>
            <li>Вы будете перенаправлены в Telegram для подтверждения аутентификации</li>
            <li>После подтверждения вы автоматически войдете в приложение</li>
            <li>Если перенаправление не работает, следуйте инструкциям выше</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Auth;