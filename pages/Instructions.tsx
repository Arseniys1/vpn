
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TgCard from '../components/TgCard';
import { OS_INSTRUCTIONS } from '../constants';
import { OSType } from '../types';

const Instructions: React.FC = () => {
  const [osTab, setOsTab] = useState<OSType>(OSType.IOS);
  const navigate = useNavigate();

  return (
    <div className="pt-4 px-4 pb-6 w-full max-w-4xl mx-auto">
      <div className="flex items-center mb-4">
         <button onClick={() => navigate(-1)} className="mr-3 text-tg-blue active:opacity-60">
             <i className="fas fa-arrow-left text-xl"></i>
         </button>
         <h2 className="text-xl font-bold">Инструкции</h2>
      </div>
      
      <div className="bg-tg-secondary p-1 rounded-lg flex mb-6 overflow-x-auto max-w-md">
         {Object.values(OSType).map((os) => (
             <button
             key={os}
             onClick={() => setOsTab(os)}
             className={`flex-1 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap px-2 ${
                 osTab === os ? 'bg-tg-blue text-white shadow' : 'text-tg-hint hover:text-white'
             }`}
             >
             {os}
             </button>
         ))}
     </div>
     
     <TgCard className="p-5 max-w-3xl">
         <a 
            href={OS_INSTRUCTIONS[osTab].downloadUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center mb-6 bg-tg-bg p-3 rounded-xl border border-tg-separator hover:border-tg-blue transition-colors group cursor-pointer active:scale-[0.98]"
            onClick={() => {
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.selectionChanged();
                }
            }}
         >
             <div className="w-12 h-12 bg-tg-blue/10 rounded-lg flex items-center justify-center text-tg-blue mr-4 group-hover:bg-tg-blue group-hover:text-white transition-colors">
                 <i className="fas fa-download text-xl"></i>
             </div>
             <div className="flex-1">
                 <div className="text-xs text-tg-hint uppercase mb-0.5">Скачать клиент</div>
                 <div className="text-lg font-bold text-tg-text">{OS_INSTRUCTIONS[osTab].appName}</div>
             </div>
             <i className="fas fa-external-link-alt text-tg-hint group-hover:text-tg-blue transition-colors"></i>
         </a>
         
         <div className="space-y-4">
             {OS_INSTRUCTIONS[osTab].steps.map((step, idx) => (
                 <div key={idx} className="flex">
                     <span className="flex-shrink-0 w-6 h-6 rounded-full bg-tg-bg border border-tg-separator text-xs flex items-center justify-center mr-3 text-tg-hint font-bold mt-0.5">
                         {idx + 1}
                     </span>
                     <p className="text-sm text-tg-text leading-relaxed">{step}</p>
                 </div>
             ))}
         </div>
     </TgCard>
    </div>
  );
};

export default Instructions;
