import { useState, InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  required?: boolean;
}

const PasswordInput = ({ label, error, required, className = '', ...props }: PasswordInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className={`w-full px-3 py-1.5 pr-10 text-xs border rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${
            error 
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400' 
              : 'border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500'
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && (
        <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{error}</p>
      )}
    </div>
  );
};

export default PasswordInput;

