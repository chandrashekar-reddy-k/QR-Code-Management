import { ReactNode } from 'react';

export interface FilterItemProps {
  label: string;
  children: ReactNode;
  className?: string;
}

const FilterItem = ({ label, children, className = '' }: FilterItemProps) => {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
};

export default FilterItem;


