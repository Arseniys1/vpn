import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Modal from './components/Modal';
import { Plan, UserSubscription, ServerLocation, OSType } from './types';
import * as api from './services/api';
import { initializeTelegramWebApp, isAuthenticated, getAuthMethod, setBrowserAuthToken, isTelegramWebApp } from './services/authService';

// Pages
import Main from './pages/Main';
import Tunnels from './pages/Tunnels';
import Shop from './pages/Shop';
import Referrals from './pages/Referrals';
import Support, { ExtendedTicket } from './pages/Support';
import Instructions from './pages/Instructions';
import Admin from './pages/Admin';
import Auth from './pages/Auth';

const App: React.FC = () => {
  const [balance, setBalance] = useState(0); 
  const [userSubscription, setUserSubscription] = useState<UserSubscription>({
    active: false,
    expiresAt: null
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string>("");
  const [tickets, setTickets] = useState<ExtendedTicket[]>([]);
  const [purchasePlan, setPurchasePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Пользователь");

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedServerForReport, setSelectedServerForReport] = useState<ServerLocation | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportOS, setReportOS] = useState<OSType>(OSType.IOS);
  const [reportProvider, setReportProvider] = useState("");
  const [reportRegion, setReportRegion] = useState("");
  
  // Auth State
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(false);
  const [authMethod, setAuthMethod] = useState<'telegram' | 'browser' | 'none'>('none');
  
  // Initialize Telegram WebApp and check authentication
  useEffect(() => {
    // Initialize Telegram WebApp if in Telegram
    initializeTelegramWebApp();
    
    // Check for token parameter in URL (from Telegram authentication)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // Also check for startapp parameter which Telegram uses for Mini Apps
    const startApp = urlParams.get('startapp');
    
    // If we have a startapp parameter with a token, use that
    let actualToken = token;
    if (startApp && startApp.includes('token=')) {
      const startAppParams = new URLSearchParams(startApp);
      actualToken = startAppParams.get('token') || token;
    }
    
    if (actualToken) {
      // Set the token in localStorage and cookies
      setBrowserAuthToken(actualToken);
      
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Reload to apply authentication
      window.location.reload();
      return;
    }
    
    // Check authentication status
    const authStatus = isAuthenticated();
    const method = getAuthMethod();
    
    setIsAuthenticatedState(authStatus);
    setAuthMethod(method);
    
    if (authStatus) {
      loadUserData();
    } else {
      // If not authenticated, redirect to auth page (for browser)
      if (method === 'none' && !window.Telegram?.WebApp) {
        // Redirect to browser authentication
        window.location.href = '/auth/browser';
      } else {
        setLoading(false);
      }
    }
    
    // Set up event listeners for Telegram WebApp buttons
    if (window.Telegram?.WebApp) {
      const webApp = window.Telegram.WebApp;
      
      // Handle back button if available
      if (webApp.BackButton) {
        webApp.BackButton.onClick(() => {
          // Go back in history or to main page
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.hash = '#/';
          }
        });
      }
    }
  }, []);

  // Load user data from backend
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user data
      const userData = await api.getMe();
      setBalance(userData.balance || 0);
      setIsAdmin(userData.is_admin || false);
      
      // Set user name
      if (userData.first_name) {
        setUserName(userData.first_name);
      } else if (userData.username) {
        setUserName(userData.username);
      }
      
      // Fetch subscription
      const subscription = await api.getMySubscription();
      if (subscription && subscription.active) {
        setUserSubscription({
          active: true,
          expiresAt: new Date(subscription.expires_at),
          planName: subscription.plan_name
        });
      }
      
      // Fetch tickets
      const ticketsData = await api.getMyTickets();
      setTickets(ticketsData.tickets || []);
      
      // Fetch servers to get admin message
      const serversData = await api.getServers();
      if (serversData.servers && serversData.servers.length > 0) {
        const serverWithMessage = serversData.servers.find((s: any) => s.admin_message);
        if (serverWithMessage) {
          setAdminMessage(serverWithMessage.admin_message);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Ошибка загрузки данных. Попробуйте позже.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPlanClick = (plan: Plan) => {
    setPurchasePlan(plan);
  };
  
  const handleConfirmPurchase = async () => {
    if (!purchasePlan) return;
    
    try {
      const result = await api.purchasePlan(purchasePlan.id);
      
      // Update local state
      setBalance(result.new_balance);
      setUserSubscription({
        active: true,
        expiresAt: new Date(result.subscription.expires_at),
        planName: result.subscription.plan_name
      });
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Подписка успешно активирована!');
      }
      
      setPurchasePlan(null);
      window.location.hash = '#/';
      
    } catch (error: any) {
      console.error('Purchase failed:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка при покупке подписки');
      }
      setPurchasePlan(null);
    }
  };

  const handleTopUp = async () => {
    try {
      const result = await api.topUp(500);
      setBalance(result.new_balance);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(`Баланс пополнен на 500 ★. Новый баланс: ${result.new_balance} ★`);
      }
    } catch (error: any) {
      console.error('Top up failed:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка пополнения баланса');
      }
    }
  };

  const openReportModal = (server: ServerLocation) => {
    setSelectedServerForReport(server);
    setReportText("");
    setReportProvider("");
    setReportRegion("");
    setIsReportModalOpen(true);
  };

  const handleSendReport = async () => {
    if (!reportText.trim() || !selectedServerForReport) return;
    
    try {
      await api.createTicket({
        subject: `Проблема с сервером ${selectedServerForReport.country}`,
        message: `ОС: ${reportOS}
Провайдер: ${reportProvider}
Регион: ${reportRegion}

${reportText}`,
        category: 'connection'
      });
      
      // Reload tickets
      const ticketsData = await api.getMyTickets();
      setTickets(ticketsData.tickets || []);

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Отчет успешно отправлен!');
      }

      setIsReportModalOpen(false);
    } catch (error: any) {
      console.error('Failed to send report:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка отправки отчета');
      }
    }
  };

  // Support ticket functions
  const handleCreateTicket = async (subject: string, message: string, category: string) => {
    try {
      await api.createTicket({ subject, message, category });
      
      // Reload tickets
      const ticketsData = await api.getMyTickets();
      setTickets(ticketsData.tickets || []);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert('Тикет успешно создан!');
      }
    } catch (error: any) {
      console.error('Failed to create ticket:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка создания тикета');
      }
    }
  };

  const handleAddMessage = async (ticketId: string, message: string) => {
    try {
      await api.addTicketMessage(ticketId, message);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Failed to add message:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка отправки сообщения');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Authentication route */}
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route index element={
            <Main 
              subscription={userSubscription} 
              adminMessage={adminMessage} 
              isAdmin={isAdmin}
              userName={userName}
            />
          } />
          <Route path="/tunnels" element={
            <Tunnels 
              subscription={userSubscription} 
              onReport={openReportModal} 
            />
          } />
          <Route path="/shop" element={
            <Shop 
              balance={balance} 
              subscription={userSubscription} 
              onBuy={handleBuyPlanClick} 
              onTopUp={handleTopUp} 
            />
          } />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/support" element={
            <Support 
              tickets={tickets} 
              onCreateTicket={handleCreateTicket} 
              onAddMessage={handleAddMessage} 
            />
          } />
          <Route path="/instructions" element={<Instructions />} />
          {isAdmin && <Route path="/admin/*" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>

      {/* Purchase Confirmation Modal */}
      {purchasePlan && (
        <Modal isOpen={true} onClose={() => setPurchasePlan(null)} title="Подтверждение покупки">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">{purchasePlan.name}</h3>
            <p className="text-gray-300 mb-4">{purchasePlan.priceStars} ★</p>
            {purchasePlan.discount && (
              <span className="inline-block bg-green-900 text-green-300 px-2 py-1 rounded text-sm mb-4">
                {purchasePlan.discount}
              </span>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setPurchasePlan(null)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Server Report Modal */}
      {isReportModalOpen && selectedServerForReport && (
        <Modal isOpen={true} onClose={() => setIsReportModalOpen(false)} title={`Сообщить о проблеме - ${selectedServerForReport.country}`}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ОС</label>
              <select
                value={reportOS}
                onChange={(e) => setReportOS(e.target.value as OSType)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value={OSType.IOS}>iOS</option>
                <option value={OSType.ANDROID}>Android</option>
                <option value={OSType.WINDOWS}>Windows</option>
                <option value={OSType.MACOS}>macOS</option>
                <option value={OSType.LINUX}>Linux</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Провайдер</label>
              <input
                type="text"
                value={reportProvider}
                onChange={(e) => setReportProvider(e.target.value)}
                placeholder="Например: МТС, Билайн"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Регион</label>
              <input
                type="text"
                value={reportRegion}
                onChange={(e) => setReportRegion(e.target.value)}
                placeholder="Например: Москва, Санкт-Петербург"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Описание проблемы</label>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Опишите проблему с подключением..."
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition"
              >
                Отмена
              </button>
              <button
                onClick={handleSendReport}
                disabled={!reportText.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white py-2 px-4 rounded-lg transition"
              >
                Отправить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </HashRouter>
  );
};

export default App;
