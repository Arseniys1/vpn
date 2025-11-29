import React from 'react';

interface SectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action }) => (
  <div className="flex justify-between items-end px-4 mb-2 mt-6">
    <h3 className="text-[13px] font-semibold text-tg-blue uppercase tracking-wider">{title}</h3>
    {action}
  </div>
);

export default SectionHeader;

