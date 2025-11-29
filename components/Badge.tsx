import React from 'react';

interface BadgeProps {
  color: 'red' | 'green' | 'blue' | 'orange' | 'gray';
  text: string;
}

const Badge: React.FC<BadgeProps> = ({ color, text }) => {
    const colors = {
        red: 'bg-red-500/10 text-red-500',
        green: 'bg-green-500/10 text-green-500',
        blue: 'bg-blue-500/10 text-blue-500',
        orange: 'bg-orange-500/10 text-orange-500',
        gray: 'bg-gray-500/10 text-gray-400',
    };
    return (
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colors[color] || colors.gray}`}>
            {text}
        </span>
    );
};

export default Badge;