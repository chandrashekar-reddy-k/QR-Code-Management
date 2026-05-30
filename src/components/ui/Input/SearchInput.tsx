import { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  placeholder?: string;
}

const SearchInput = ({ placeholder = 'Search...', className = '', ...props }: SearchInputProps) => {
  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        className={`w-full pl-3.5 pr-10 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 ${className}`}
        {...props}
      />
      <Search 
        size={16} 
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" 
      />
    </div>
  );
};

export default SearchInput;

