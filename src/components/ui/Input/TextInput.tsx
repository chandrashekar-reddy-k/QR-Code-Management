import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | ReactNode;
  error?: string;
  required?: boolean;
  onlyNumbers?: boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, required, className = '', type = 'text', onlyNumbers = false, maxLength, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;


      if (onlyNumbers) {
        value = value.replace(/[^0-9]/g, '');
      }


      if (maxLength && value.length > maxLength) {
        value = value.slice(0, maxLength);
      }

      e.target.value = value;
      onChange?.(e);
    };
    return (
      <div>
        {label && (
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {typeof label === 'string' ? (
              <>
                {label} {required && <span className="text-red-500 dark:text-red-400">*</span>}
              </>
            ) : (
              label
            )}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          onChange={handleChange}
          inputMode={onlyNumbers ? 'numeric' : undefined}
          maxLength={type !== 'number' ? maxLength : undefined}
          className={`w-full px-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 ${props.disabled
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-300 dark:border-gray-600'
            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            } placeholder-gray-500 dark:placeholder-gray-400 ${error
              ? 'border-red-300 dark:border-red-600 focus:ring-red-500 dark:focus:ring-red-400'
              : 'border-gray-300 dark:border-gray-600 focus:ring-gray-400 dark:focus:ring-gray-500'
            } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{error}</p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;

