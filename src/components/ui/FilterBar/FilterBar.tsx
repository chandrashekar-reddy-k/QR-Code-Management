import { ReactNode } from 'react';

export interface FilterBarProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

const FilterBar = ({ children, className = '', title }: FilterBarProps) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 mb-4 ${className}`}>
      {title && (
        <div className="mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">{title}</h3>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
    </div>
  );
};

export default FilterBar;


