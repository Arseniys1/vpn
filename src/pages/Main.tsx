import React from 'react';
import { useNavigate } from 'react-router-dom';
import TgCard from '../components/TgCard';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { UserSubscription } from '../types';

interface MainProps {
  subscription: UserSubscription;
  adminMessage?: string;
  isAdmin?: boolean;
  userName?: string;
}

const Main: React.FC<MainProps> = ({ subscription, adminMessage, isAdmin, userName = "Пользователь" }) => {
  const navigate = useNavigate();

  return (
    <div className="pt-4 px-4 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-tg-blue to-cyan-500 flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-tg-blue/20">
            <i className="fas fa-user"></i>
          </div>
          <div>
            <div className="text-sm text-tg-hint">Добро пожаловать</div>
            <div className="font-semibold text-tg-text">{userName}</div>
          </div>
        </div>
      </div>

      {adminMessage && (
        <div className="bg-tg-secondary border border-tg-blue/30 rounded-lg overflow-hidden mb-6 relative h-9 flex items-center shadow-lg shadow-tg-blue/5">
            <div className="absolute inset-y-0 left-0 bg-tg-secondary z-10 px-2 flex items-center border-r border-tg-separator-50">
                <i className="fas fa-bullhorn text-tg-blue"></i>
            </div>
            <div className="w-full overflow-hidden flex items-center">
                 <div className="whitespace-nowrap animate-marquee text-sm font-medium text-tg-text pl-10">
                    {adminMessage}
                 </div>
            </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Status Card */}
        <TgCard className="p-5 relative overflow-hidden">
            {/* Decorative background blur */}
            <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 ${subscription.active ? 'bg-tg-green' : 'bg-tg-red'}`}></div>
            
            <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div>
                <div className="text-tg-hint text-xs uppercase tracking-wide mb-1">Статус подписки</div>
                <div className={`text-2xl font-bold flex items-center ${subscription.active ? 'text-tg-green' : 'text-tg-red'}`}>
                    {subscription.active ? 'Активна' : 'Неактивна'}
                    <i className={`fas ${subscription.active ? 'fa-check-circle' : 'fa-times-circle'} ml-2 text-xl`}></i>
                </div>
                </div>
                {subscription.active && (
                <div className="bg-tg-blue/10 px-3 py-1 rounded text-tg-blue text-xs font-bold">
                    PRO
                </div>
                )}
            </div>

            <div className="border-t border-tg-separator-50 my-3"></div>

            {subscription.active ? (
                <div className="flex justify-between items-center">
                <div>
                    <div className="text-tg-hint text-xs">Истекает</div>
                    <div className="text-tg-text font-medium">
                    {subscription.expiresAt?.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
                <div>
                    <div className="text-tg-hint text-xs">План</div>
                    <div className="text-tg-text font-medium">{subscription.planName}</div>
                </div>
                </div>
            ) : (
                <div>
                <p className="text-tg-hint text-sm mb-4">Подключите подписку для доступа ко всем серверам.</p>
                <button 
                    onClick={() => navigate('/shop')}
                    className="w-full bg-tg-blue text-white py-2.5 rounded-lg font-medium text-sm hover:bg-opacity-90 transition-colors"
                >
                    Купить подписку
                </button>
                </div>
            )}
            </div>
        </TgCard>

        {/* Theme Switcher */}
        <ThemeSwitcher />

        {/* Quick Actions & News Grid */}
        <div className="flex flex-col gap-4">
            {isAdmin && (
              <TgCard className="p-4 active:scale-95 transition-transform cursor-pointer bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30" onClick={() => navigate('/admin')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center">
                      <i className="fas fa-shield-halved"></i>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-orange-500">Панель Администратора</div>
                      <div className="text-xs text-tg-hint">Управление системой</div>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-orange-500"></i>
                </div>
              </TgCard>
            )}
            <div className="grid grid-cols-2 gap-3">
                <TgCard className="p-4 active:scale-95 transition-transform cursor-pointer hover:bg-tg-hover" onClick={() => navigate('/tunnels')}>
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-tg-blue/10 text-tg-blue flex items-center justify-center mb-2">
                    <i className="fas fa-bolt"></i>
                    </div>
                    <div className="text-sm font-medium">Подключить</div>
                </div>
                </TgCard>
                <TgCard className="p-4 active:scale-95 transition-transform cursor-pointer hover:bg-tg-hover" onClick={() => navigate('/instructions')}>
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2">
                    <i className="fas fa-book-open"></i>
                    </div>
                    <div className="text-sm font-medium">Инструкции</div>
                </div>
                </TgCard>
            </div>
            
             <TgCard className="flex-1">
                <div className="p-4 h-full flex flex-col justify-center">
                <div className="flex items-start">
                    <i className="fas fa-info-circle text-tg-hint mt-1 mr-3"></i>
                    <div>
                        <h4 className="font-medium text-sm mb-1">Новые серверы добавлены</h4>
                        <p className="text-xs text-tg-hint leading-relaxed">
                        Мы добавили новые локации в Нидерландах и США. Скорость увеличена на 30%.
                        </p>
                    </div>
                </div>
                </div>
            </TgCard>
        </div>
      </div>
    </div>
  );
};

export default Main;