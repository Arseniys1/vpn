import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center h-full text-[10px] font-medium transition-colors duration-200 ${
      isActive ? 'text-tg-blue' : 'text-tg-hint hover:text-tg-text'
    }`;

  return (
    <div className="w-full min-h-screen bg-tg-bg text-tg-text relative">
      <div className="pb-20 max-w-lg mx-auto shadow-xl min-h-screen">
        <Outlet />
      </div>

      <nav className="fixed bottom-0 left-0 w-full bg-tg-secondary/95 backdrop-blur-md border-t border-tg-separator z-50 safe-area-pb">
        <div className="flex justify-between items-center h-[60px] w-full">
          <NavLink to="/" className={navClass}>
            <i className="fas fa-house text-xl mb-1"></i>
            <span>Главная</span>
          </NavLink>
          <NavLink to="/servers" className={navClass}>
            <i className="fas fa-server text-xl mb-1"></i>
            <span>Серверы</span>
          </NavLink>
          <NavLink to="/shop" className={navClass}>
            <i className="fas fa-star text-xl mb-1"></i>
            <span>Подписка</span>
          </NavLink>
          <NavLink to="/referrals" className={navClass}>
            <i className="fas fa-users text-xl mb-1"></i>
            <span>Рефералы</span>
          </NavLink>
          <NavLink to="/support" className={navClass}>
            <i className="fas fa-headset text-xl mb-1"></i>
            <span>Поддержка</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Layout;

