import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Modal from './components/Modal';
import { Plan, UserSubscription, ServerLocation, OSType } from './types';

// Pages
import Main from './pages/Main';
import Tunnels from './pages/Tunnels';
import Shop from './pages/Shop';
import Referrals from './pages/Referrals';
import Support, { ExtendedTicket } from './pages/Support';
import Instructions from './pages/Instructions';

const App: React.FC = () => {
  const [balance, setBalance] = useState(1500); 
  const [userSubscription, setUserSubscription] = useState<UserSubscription>({
    active: false,
    expiresAt: null
  });
  
  // Example admin message. In a real app, fetch this from an API.
  const [adminMessage] = useState("⚡️ Внимание! Технические работы на сервере NL-VIP с 03:00 до 05:00 МСК. Приносим извинения за неудобства.");

  // Updated mock data with a reply
  const [tickets, setTickets] = useState<ExtendedTicket[]>([
      { 
          id: '101', 
          subject: 'Не работает Германия', 
          message: 'Вчера вечером перестал подключаться к серверу DE-1. Пробовал разные клиенты, не помогает.', 
          status: 'answered', 
          date: '12.10.2023', 
          category: 'connection',
          reply: 'Здравствуйте! На сервере DE-1 проводились технические работы. Сейчас доступ восстановлен. Попробуйте обновить подписку.',
          messages: []
      }
  ]);
  
  const [purchasePlan, setPurchasePlan] = useState<Plan | null>(null);

  // Report State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedServerForReport, setSelectedServerForReport] = useState<ServerLocation | null>(null);
  const [reportText, setReportText] = useState("");
  const [reportOS, setReportOS] = useState<OSType>(OSType.IOS);
  const [reportProvider, setReportProvider] = useState("");
  const [reportRegion, setReportRegion] = useState("");
  
  useEffect(() => {
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
        // Force header colors
        window.Telegram.WebApp.setHeaderColor('#0e1621'); 
        window.Telegram.WebApp.setBackgroundColor('#0e1621');
    }
  }, []);

  const handleBuyPlanClick = (plan: Plan) => {
    setPurchasePlan(plan);
  };
  
  const handleConfirmPurchase = () => {
    if (!purchasePlan) return;
    
    if (balance >= purchasePlan.priceStars) {
        setBalance(prev => prev - purchasePlan.priceStars);
        
        const now = new Date();
        const baseDate = (userSubscription.active && userSubscription.expiresAt && userSubscription.expiresAt > now)
            ? userSubscription.expiresAt
            : now;
        
        const newExpiry = new Date(baseDate);
        newExpiry.setMonth(newExpiry.getMonth() + purchasePlan.durationMonths);

        setUserSubscription({
            active: true,
            expiresAt: newExpiry,
            planName: purchasePlan.name
        });
        
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        
        setPurchasePlan(null);
        window.location.hash = '#/';
        
    } else {
        alert('Недостаточно средств на балансе');
        setPurchasePlan(null);
    }
  };

  const handleTopUp = () => {
    // Mock top up functionality
    setBalance(prev => prev + 500);
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    alert('Баланс успешно пополнен на 500 ★ (Тест)');
  };

  const openReportModal = (server: ServerLocation) => {
    setSelectedServerForReport(server);
    setReportText("");
    setReportProvider("");
    setReportRegion("");
    setIsReportModalOpen(true);
  };

  const handleSendReport = () => {
    if (!reportText.trim() || !selectedServerForReport) return;
    
    // In a real app, you would send this data to your backend
    console.log("Report sent:", {
        server: selectedServerForReport,
        text: reportText,
        os: reportOS,
        provider: reportProvider,
        region: reportRegion
    });

    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    
    alert("Спасибо! Ваш отчет отправлен администраторам.");
    setIsReportModalOpen(false);
  };

  const handleCreateTicket = (subject: string, message: string, category: string) => {
      const newTicket: ExtendedTicket = {
          id: Math.floor(Math.random() * 1000).toString(),
          subject,
          message,
          category: category as any,
          status: 'open',
          date: new Date().toLocaleDateString('ru-RU'),
          messages: []
      };
      setTickets([newTicket, ...tickets]);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
  };

  // Validation check
  const isReportFormValid = reportText.trim().length > 0 && reportProvider.trim().length > 0 && reportRegion.trim().length > 0;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Main subscription={userSubscription} adminMessage={adminMessage} />} />
          <Route path="servers" element={<Tunnels subscription={userSubscription} onReport={openReportModal} />} />
          <Route path="shop" element={<Shop balance={balance} subscription={userSubscription} onBuy={handleBuyPlanClick} onTopUp={handleTopUp} />} />
          <Route path="referrals" element={<Referrals />} />
          <Route path="support" element={<Support tickets={tickets} onCreateTicket={handleCreateTicket} />} />
          <Route path="instructions" element={<Instructions />} />
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

