import React from 'react';

interface TgCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const TgCard: React.FC<TgCardProps> = ({ children, className = "", onClick }) => (
  <div 
    onClick={onClick} 
    className={`bg-tg-secondary rounded-xl shadow-sm border border-black/10 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

export default TgCard;