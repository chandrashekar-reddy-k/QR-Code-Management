import { ReactNode } from 'react';

export interface FormSectionWithDotsProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const FormSectionWithDots = ({
  title,
  children,
  className = '',
}: FormSectionWithDotsProps) => {
  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex items-center mb-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mr-3 whitespace-nowrap">{title}</h3>
        <div className="flex-1 border-t border-dotted border-gray-300 dark:border-gray-600"></div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export default FormSectionWithDots;

