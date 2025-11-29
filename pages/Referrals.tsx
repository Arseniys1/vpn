import React from 'react';
import SectionHeader from '../components/SectionHeader';
import TgCard from '../components/TgCard';

const Referrals: React.FC = () => {
    const handleCopy = () => {
        navigator.clipboard.writeText("https://t.me/MyVpnBot?start=ref_123");
        if(window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        alert('Ссылка скопирована');
     };

    return (
        <div className="pt-4 px-4 w-full">
             <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-center mb-6 shadow-lg shadow-blue-900/20 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                    <i className="fas fa-gift text-2xl text-white"></i>
                </div>
                <h2 className="text-white font-bold text-xl mb-1">Приглашайте друзей</h2>
                <p className="text-blue-100 text-sm mb-4">Получайте 10% с каждой покупки</p>
                <button 
                    onClick={handleCopy} 
                    className="bg-white text-blue-600 py-2.5 px-6 rounded-xl font-semibold text-sm shadow-md active:scale-95 transition-transform"
                >
                    <i className="fas fa-link mr-2"></i>
                    Скопировать ссылку
                </button>
            </div>

            <SectionHeader title="Статистика" />
            <div className="grid grid-cols-2 gap-4 mb-6">
                <TgCard className="p-4 text-center">
                    <div className="text-2xl font-bold text-tg-text mb-1">145</div>
                    <div className="text-xs text-tg-hint uppercase">Заработано ★</div>
                </TgCard>
                <TgCard className="p-4 text-center">
                    <div className="text-2xl font-bold text-tg-text mb-1">12</div>
                    <div className="text-xs text-tg-hint uppercase">Рефералов</div>
                </TgCard>
            </div>
        </div>
    );
};

export default Referrals;