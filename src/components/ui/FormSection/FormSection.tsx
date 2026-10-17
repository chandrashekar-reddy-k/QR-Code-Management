import { ReactNode, FormEvent } from 'react';

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: ReactNode;
  variant?: 'default' | 'highlighted' | 'white';
  className?: string;
  onSubmit?: (e: FormEvent) => void;
}

const FormSection = ({
  title,
  description,
  children,
  variant = 'white',
  className = '',
  onSubmit,
}: FormSectionProps) => {
  const baseStyles = 'rounded-lg border p-4';
  const variantStyles =
    variant === 'highlighted'
      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      : variant === 'white'
      ? 'bg-white dark:bg-gray-800 shadow-md border-gray-200 dark:border-gray-700'
      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';

  const Component = onSubmit ? 'form' : 'div';

  return (
    <Component
      onSubmit={onSubmit}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {title && (
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4">{title}</h3>
      )}
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </Component>
  );
};

export default FormSection;

