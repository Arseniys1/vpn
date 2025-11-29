import React, { useState, useEffect } from 'react';
import TgCard from '../components/TgCard';
import SectionHeader from '../components/SectionHeader';
import { Plan, UserSubscription } from '../types';
import * as api from '../services/api';

interface ShopProps {
  balance: number;
  subscription: UserSubscription;
  onBuy: (plan: Plan) => void;
  onTopUp: () => void;
}

const Shop: React.FC<ShopProps> = ({ balance, subscription, onBuy, onTopUp }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const plansData = await api.getPlans();
      const plansList = (plansData.plans || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        durationMonths: p.duration_months,
        priceStars: p.price_stars,
        discount: p.discount
      }));
      setPlans(plansList);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-4 px-4 w-full">
        <div className="flex items-center justify-center p-8">
          <div className="w-8 h-8 border-4 border-tg-blue border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 px-4 w-full">
      <div className="bg-gradient-to-r from-tg-secondary to-tg-bg border border-tg-separator rounded-xl p-5 mb-6 flex items-center justify-between shadow-sm">
         <div>
             <div className="text-tg-hint text-xs mb-1">Ваш баланс</div>
             <div className="text-2xl font-bold flex items-center text-tg-text">
                {balance} <i className="fas fa-star text-yellow-400 ml-2 text-xl"></i>
             </div>
         </div>
         <div 
            onClick={onTopUp}
            className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center cursor-pointer active:scale-95 transition-transform hover:bg-yellow-400/20"
         >
             <i className="fas fa-plus text-yellow-400"></i>
         </div>
      </div>

      <SectionHeader title="Выберите план" />
      <div className="flex flex-col gap-3">
        {plans.map((plan) => {
          const isCurrent = subscription.active && subscription.planName === plan.name;
          return (
            <TgCard key={plan.id} className={`transition-all hover:bg-tg-hover ${isCurrent ? 'ring-1 ring-tg-green' : ''}`}>
               <div onClick={() => onBuy(plan)} className="flex items-center p-4 cursor-pointer active:bg-tg-hover h-full">
                  <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center mr-4 ${isCurrent ? 'bg-tg-green/10 text-tg-green' : 'bg-tg-blue/10 text-tg-blue'}`}>
                      <span className="text-lg font-bold">{plan.durationMonths}</span>
                      <span className="text-[10px] leading-none uppercase">мес</span>
                  </div>
                  <div className="flex-1">
                      <div className="flex items-center">
                          <span className="font-semibold text-lg text-tg-text">{plan.name}</span>
                          {plan.discount && <span className="ml-2 text-[10px] bg-tg-red text-white px-1.5 py-0.5 rounded font-bold">{plan.discount}</span>}
                      </div>
                      <div className="text-sm text-tg-hint">Полный доступ ко всем серверам</div>
                  </div>
                  <div className="flex flex-col items-end">
                      <div className="flex items-center font-bold text-tg-text">
                          {plan.priceStars} <i className="fas fa-star text-xs ml-1 text-yellow-400"></i>
                      </div>
                      {isCurrent && <div className="text-xs text-tg-green font-medium mt-1">Активен</div>}
                  </div>
               </div>
            </TgCard>
          );
        })}
      </div>
    </div>
  );
};

export default Shop;

