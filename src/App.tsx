import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Modal from './components/Modal';
import { Plan, UserSubscription, ServerLocation, OSType } from './types';
import * as api from './services/api';

// Pages
import Main from './pages/Main';
import Tunnels from './pages/Tunnels';
import Shop from './pages/Shop';
import Referrals from './pages/Referrals';
import Support, { ExtendedTicket } from './pages/Support';
import Instructions from './pages/Instructions';
import Admin from './pages/Admin';

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

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedServerForReport, setSelectedServerForReport] = useState<ServerLocation | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportOS, setReportOS] = useState<OSType>(OSType.IOS);
  const [reportProvider, setReportProvider] = useState("");
  const [reportRegion, setReportRegion] = useState("");
  
  // Initialize Telegram WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#0e1621'); 
        window.Telegram.WebApp.setBackgroundColor('#0e1621');
    }
    loadUserData();
  }, []);

  // Load user data from backend
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user data
      const userData = await api.getMe();
      setBalance(userData.balance || 0);
      setIsAdmin(userData.is_admin || false);
      
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
        window.Telegram.WebApp.showAlert('Спасибо! Ваш отчет отправлен администраторам.');
      }
      
      setIsReportModalOpen(false);
    } catch (error: any) {
      console.error('Report failed:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка отправки отчета');
      }
    }
  };

  const handleCreateTicket = async (subject: string, message: string, category: string) => {
    try {
      await api.createTicket({ subject, message, category });
      
      // Reload tickets
      const ticketsData = await api.getMyTickets();
      setTickets(ticketsData.tickets || []);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (error: any) {
      console.error('Create ticket failed:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка создания тикета');
      }
    }
  };

  const handleAddTicketMessage = async (ticketId: string, message: string) => {
    try {
      await api.addTicketMessage(ticketId, message);
      
      // Reload tickets
      const ticketsData = await api.getMyTickets();
      setTickets(ticketsData.tickets || []);
      
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      }
    } catch (error: any) {
      console.error('Add message failed:', error);
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(error.message || 'Ошибка отправки сообщения');
      }
    }
  };

  // Validation check
  const isReportFormValid = reportText.trim().length > 0 && reportProvider.trim().length > 0 && reportRegion.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-tg-bg">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-tg-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-tg-hint">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Main subscription={userSubscription} adminMessage={adminMessage} isAdmin={isAdmin} />} />
          <Route path="servers" element={<Tunnels subscription={userSubscription} onReport={openReportModal} />} />
          <Route path="shop" element={<Shop balance={balance} subscription={userSubscription} onBuy={handleBuyPlanClick} onTopUp={handleTopUp} />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="support" element={<Support tickets={tickets} onCreateTicket={handleCreateTicket} onAddMessage={handleAddTicketMessage} />} />
          <Route path="instructions" element={<Instructions />} />
          {isAdmin && <Route path="admin" element={<Admin />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      
      {/* Purchase Modal */}
      <Modal
        isOpen={!!purchasePlan}
        onClose={() => setPurchasePlan(null)}
        title="Подтверждение"
      >
        <div className="flex flex-col items-center pt-2 pb-4">
            <div className="w-16 h-16 bg-tg-blue/10 rounded-full flex items-center justify-center mb-4 text-tg-blue">
                <i className="fas fa-cart-shopping text-3xl"></i>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-tg-text">{purchasePlan?.name}</h3>
            <p className="text-tg-hint text-center mb-6 text-sm px-4">
                С вашего баланса будет списано <span className="text-tg-text font-bold">{purchasePlan?.priceStars} звезд</span>.
            </p>
            
            <button 
                onClick={handleConfirmPurchase}
                className="w-full bg-tg-blue text-white py-3.5 rounded-xl font-semibold text-[16px] active:scale-95 transition-transform mb-3 shadow-lg shadow-tg-blue/20"
            >
                Оплатить {purchasePlan?.priceStars} ★
            </button>
            <button 
                onClick={() => setPurchasePlan(null)}
                className="w-full text-tg-red py-3.5 rounded-xl font-semibold text-[16px] active:bg-tg-hover/50 transition-colors"
            >
                Отмена
            </button>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
        title={`Проблема: ${selectedServerForReport?.country}`}
      >
        <div className="space-y-4 pt-2">
            <div>
                <label className="text-[11px] text-tg-hint font-bold uppercase mb-1 block">ОС устройства</label>
                <div className="flex bg-tg-bg p-1 rounded-lg border border-tg-separator overflow-x-auto">
                    {Object.values(OSType).map(os => (
                        <button 
                        key={os}
                        onClick={() => setReportOS(os)}
                        className={`flex-1 py-1.5 px-2 text-xs rounded whitespace-nowrap transition-colors ${reportOS === os ? 'bg-tg-blue text-white shadow' : 'text-tg-hint'}`}
                        >
                        {os}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex space-x-2">
                <div className="flex-1">
                    <input 
                        className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-[14px] text-tg-text focus:outline-none focus:border-tg-blue placeholder-tg-hint"
                        placeholder="Провайдер (МТС...)"
                        value={reportProvider}
                        onChange={(e) => setReportProvider(e.target.value)}
                    />
                </div>
                <div className="flex-1">
                    <input 
                        className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-[14px] text-tg-text focus:outline-none focus:border-tg-blue placeholder-tg-hint"
                        placeholder="Регион (Москва...)"
                        value={reportRegion}
                        onChange={(e) => setReportRegion(e.target.value)}
                    />
                </div>
            </div>

            <textarea
                className="w-full bg-tg-bg border border-tg-separator rounded-xl p-3 text-[15px] text-tg-text focus:outline-none focus:border-tg-blue placeholder-tg-hint resize-none"
                placeholder="Опишите проблему..."
                rows={3}
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
            />
            <button
                onClick={handleSendReport}
                disabled={!isReportFormValid}
                className={`w-full py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all shadow-lg ${
                    !isReportFormValid ? 'bg-tg-separator text-tg-hint cursor-not-allowed' : 'bg-tg-blue text-white active:scale-95 shadow-tg-blue/20'
                }`}
            >
                <i className="fas fa-paper-plane"></i>
                <span>Отправить</span>
            </button>
        </div>
      </Modal>
    </HashRouter>
  );
};

export default App;

