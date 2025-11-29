import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeader from '../components/SectionHeader';
import { AVAILABLE_SERVERS } from '../constants';
import { ServerLocation, UserSubscription, ServerStatus } from '../types';

interface TunnelsProps {
  subscription: UserSubscription;
  onReport: (server: ServerLocation) => void;
}

const Tunnels: React.FC<TunnelsProps> = ({ subscription, onReport }) => {
  const navigate = useNavigate();
  const [activeServerId, setActiveServerId] = useState<string | null>(null);

  const handleCreateConnection = (server: ServerLocation) => {
    if (!subscription.active) {
      navigate('/shop');
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
      }
      return;
    }
    setActiveServerId(prev => prev === server.id ? null : server.id);
    if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
    }
  };

  const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text);
     if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
     }
  };

  const getKey = (server: ServerLocation) => 
    `${server.protocol}://${Math.random().toString(36).substr(2)}@${server.country.toLowerCase()}.vpn.com:443?security=reality&type=tcp&headerType=none#${server.country}-User1`;
  
  const getSubLink = (server: ServerLocation) => 
    `https://api.xray-service.io/sub/${server.id}/${Math.random().toString(36).substr(2, 6)}`;

  return (
    <div className="pt-2 w-full">
      <SectionHeader title="Доступные серверы" />
      <div className="flex flex-col gap-3 px-4">
        {AVAILABLE_SERVERS.map((server) => {
           const isActive = activeServerId === server.id;
           return (
             <div key={server.id} className={`bg-tg-secondary rounded-xl overflow-hidden shadow-sm transition-all duration-300 border border-transparent hover:border-tg-separator ${isActive ? 'ring-1 ring-tg-blue' : ''}`}>
                <div 
                   onClick={() => handleCreateConnection(server)}
                   className="flex items-center p-4 cursor-pointer active:bg-tg-hover transition-colors"
                >
                   <div className="text-3xl mr-4">{server.flag}</div>
                   <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                         <span className="font-semibold text-[15px] text-tg-text">{server.country}</span>
                         {subscription.active ? (
                            <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                                server.status === ServerStatus.ONLINE ? 'bg-tg-green/10 text-tg-green' : 
                                server.status === ServerStatus.MAINTENANCE ? 'bg-tg-red/10 text-tg-red' : 'bg-orange-400/10 text-orange-400'
                            }`}>
                                {server.ping} ms
                            </span>
                         ) : (
                             <i className="fas fa-lock text-tg-hint text-xs"></i>
                         )}
                      </div>
                      <div className="text-xs text-tg-hint flex items-center">
                         <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            server.status === ServerStatus.ONLINE ? 'bg-tg-green' : 
                            server.status === ServerStatus.MAINTENANCE ? 'bg-tg-red' : 'bg-orange-400'
                         }`}></span>
                         {server.status} • {server.protocol.toUpperCase()}
                      </div>
                   </div>
                   <div className="ml-3 text-tg-hint">
                      <i className={`fas fa-chevron-down transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`}></i>
                   </div>
                </div>

                {isActive && subscription.active && (
                   <div className="px-4 pb-4 pt-0 bg-tg-hover/30 border-t border-tg-separator animate-fade-in">
                      <div className="mt-4">
                         <label className="text-[11px] text-tg-hint uppercase font-semibold mb-1 block">Ссылка для подключения</label>
                         <div className="flex items-center bg-tg-bg rounded-lg p-2 border border-tg-separator mb-3">
                            <div className="flex-1 truncate text-xs font-mono text-tg-blue opacity-80 mr-2">
                               {getKey(server)}
                            </div>
                            <button onClick={() => copyToClipboard(getKey(server))} className="w-8 h-8 rounded bg-tg-secondary flex items-center justify-center text-tg-text hover:text-tg-blue transition-colors">
                               <i className="fas fa-copy"></i>
                            </button>
                         </div>

                         <label className="text-[11px] text-tg-hint uppercase font-semibold mb-1 block">Ссылка на подписку</label>
                         <div className="flex items-center bg-tg-bg rounded-lg p-2 border border-tg-separator mb-4">
                            <div className="flex-1 truncate text-xs font-mono text-tg-blue opacity-80 mr-2">
                               {getSubLink(server)}
                            </div>
                            <button onClick={() => copyToClipboard(getSubLink(server))} className="w-8 h-8 rounded bg-tg-secondary flex items-center justify-center text-tg-text hover:text-tg-blue transition-colors">
                               <i className="fas fa-copy"></i>
                            </button>
                         </div>

                         <button 
                            onClick={(e) => { e.stopPropagation(); onReport(server); }} 
                            className="w-full py-2 rounded-lg border border-tg-red/30 text-tg-red text-sm font-medium hover:bg-tg-red/10 transition-colors flex items-center justify-center"
                         >
                            <i className="fas fa-triangle-exclamation mr-2"></i>
                            Сообщить о проблеме
                         </button>
                      </div>
                   </div>
                )}
             </div>
           );
        })}
      </div>
    </div>
  );
};

export default Tunnels;

