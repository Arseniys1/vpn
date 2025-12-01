import React, {useState, useEffect, useRef} from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Modal from './components/Modal';
import { Plan, UserSubscription, ServerLocation, OSType } from './types';
import * as api from './services/api';
import {initializeTelegramWebApp, isAuthenticated, getAuthMethod, isTelegramWebApp} from './services/authService';
import { ThemeProvider } from './contexts/ThemeContext';

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

  const initialized = useRef(false);

  useEffect(() => {
    const initializeApp = () => {
      if (initialized.current) return;
      initialized.current = true;

      // Initialize Telegram WebApp if in Telegram
      initializeTelegramWebApp();

      // Check authentication status
      const authStatus = isAuthenticated();
      const method = getAuthMethod();

      setIsAuthenticatedState(authStatus);
      setAuthMethod(method);

      if (authStatus) {
        loadUserData();
      } else {
        setLoading(false);
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
    };

    initializeApp();
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
      if (isTelegramWebApp()) {
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
      setBalance(result.user.balance);
      setUserSubscription({
        active: true,
        expiresAt: new Date(result.expires_at),
        planName: result.plan.name,
      });
      
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert('Подписка успешно активирована!');
      }
      
      setPurchasePlan(null);
      window.location.hash = '#/';
      
    } catch (error: any) {
      console.error('Purchase failed:', error);
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка при покупке подписки');
      }
      setPurchasePlan(null);
    }
  };

  const handleTopUp = async () => {
    try {
      const result = await api.topUp(500);
      setBalance(result.new_balance);
      
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
      
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert(`Баланс пополнен на 500 ★. Новый баланс: ${result.new_balance} ★`);
      }
    } catch (error: any) {
      console.error('Top up failed:', error);
      if (isTelegramWebApp()) {
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

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setSelectedServerForReport(null);
  };

  const handleSendReport = async () => {
    if (!selectedServerForReport || !reportText.trim()) return;

    try {
      await api.createServerReport({
        server_id: selectedServerForReport.id,
        os: reportOS,
        provider: reportProvider,
        region: reportRegion,
        description: reportText
      });

      if (isTelegramWebApp()) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert('Сообщение отправлено. Спасибо за обратную связь!');
      }

      closeReportModal();
    } catch (error: any) {
      console.error('Failed to send report:', error);
      if (isTelegramWebApp()) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка отправки сообщения');
      }
    }
  };

  // If not authenticated, show auth routes only
  if (!isAuthenticatedState) {
    return (
      <HashRouter>
        <Routes>
          <Route path="/auth/*" element={<Auth />} />
          <Route path="*" element={<Navigate to="/auth/browser" replace />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <ThemeProvider>
      <HashRouter>
        <div className="min-h-screen bg-tg-bg text-tg-text">
          <Routes>
            <Route path="/" element={<Layout />}>
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
                  onBuyPlan={handleBuyPlanClick}
                  onTopUp={handleTopUp}
                />
              } />
              <Route path="/referrals" element={
                <Referrals 
                  balance={balance}
                  referralCode={""} // Will be passed from user data
                />
              } />
              <Route path="/support" element={
                <Support 
                  tickets={tickets}
                  onCreateTicket={(subject, message, category) => {
                    // Implementation would go here
                  }}
                  onAddMessage={(ticketId, message) => {
                    // Implementation would go here
                  }}
                />
              } />
              <Route path="/instructions" element={<Instructions />} />
              {isAdmin && <Route path="/admin" element={<Admin />} />}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </div>

        {/* Purchase Confirmation Modal */}
        <Modal 
          isOpen={!!purchasePlan} 
          onClose={() => setPurchasePlan(null)} 
          title="Подтверждение покупки"
        >
          {purchasePlan && (
            <div className="space-y-4">
              <div className="bg-tg-secondary p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{purchasePlan.name}</span>
                  <span className="font-bold text-tg-blue">{purchasePlan.price_stars} ★</span>
                </div>
                <div className="text-sm text-tg-hint">
                  Длительность: {purchasePlan.duration_months} месяцев
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-tg-separator">
                <span className="font-medium">Ваш баланс:</span>
                <span className="font-bold">{balance} ★</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">К оплате:</span>
                <span className="font-bold text-tg-blue">{purchasePlan.price_stars} ★</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Будет после покупки:</span>
                <span className="font-bold">{balance - purchasePlan.price_stars} ★</span>
              </div>
              
              <button
                onClick={handleConfirmPurchase}
                disabled={balance < purchasePlan.price_stars}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center transition-all ${
                  balance < purchasePlan.price_stars 
                    ? 'bg-tg-separator text-tg-hint' 
                    : 'bg-tg-blue text-white active:scale-95 shadow-lg shadow-tg-blue/20'
                }`}
              >
                Подтвердить покупку
              </button>
              
              {balance < purchasePlan.price_stars && (
                <div className="text-center text-sm text-tg-red mt-2">
                  Недостаточно средств на балансе
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Server Report Modal */}
        <Modal 
          isOpen={isReportModalOpen} 
          onClose={closeReportModal} 
          title="Сообщить о проблеме"
        >
          {selectedServerForReport && (
            <div className="space-y-4">
              <div className="bg-tg-secondary p-3 rounded-lg">
                <div className="text-sm text-tg-hint mb-1">Сервер</div>
                <div className="font-medium">{selectedServerForReport.country}</div>
              </div>
              
              <div>
                <label className="block text-xs text-tg-hint uppercase font-bold mb-1.5">Операционная система</label>
                <div className="grid grid-cols-3 gap-2">
                  {[OSType.IOS, OSType.ANDROID, OSType.WINDOWS, OSType.MACOS, OSType.LINUX].map((os) => (
                    <button
                      key={os}
                      onClick={() => setReportOS(os)}
                      className={`py-2 text-xs font-medium rounded transition-colors ${
                        reportOS === os 
                          ? 'bg-tg-blue text-white' 
                          : 'bg-tg-bg border border-tg-separator text-tg-hint hover:text-tg-text'
                      }`}
                    >
                      {os}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-tg-hint uppercase font-bold mb-1.5">Провайдер</label>
                <input
                  type="text"
                  value={reportProvider}
                  onChange={(e) => setReportProvider(e.target.value)}
                  placeholder="Например: МТС, Билайн"
                  className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-sm text-tg-text focus:outline-none focus:border-tg-blue"
                />
              </div>
              
              <div>
                <label className="block text-xs text-tg-hint uppercase font-bold mb-1.5">Регион</label>
                <input
                  type="text"
                  value={reportRegion}
                  onChange={(e) => setReportRegion(e.target.value)}
                  placeholder="Например: Москва, Санкт-Петербург"
                  className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-sm text-tg-text focus:outline-none focus:border-tg-blue"
                />
              </div>
              
              <div>
                <label className="block text-xs text-tg-hint uppercase font-bold mb-1.5">Описание проблемы</label>
                <textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Опишите подробно проблему..."
                  rows={4}
                  className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-sm text-tg-text focus:outline-none focus:border-tg-blue resize-none"
                />
              </div>
              
              <button
                onClick={handleSendReport}
                disabled={!reportText.trim()}
                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center transition-all ${
                  !reportText.trim() 
                    ? 'bg-tg-separator text-tg-hint' 
                    : 'bg-tg-blue text-white active:scale-95 shadow-lg shadow-tg-blue/20'
                }`}
              >
                Отправить
              </button>
            </div>
          )}
        </Modal>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;