import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortIconProps {
  field: string;
  currentField: string | null;
  direction: 'asc' | 'desc' | null;
  size?: number;
  className?: string;
}

const SortIcon = ({
  field,
  currentField,
  direction,
  size = 10,
  className = '',
}: SortIconProps) => {
  if (currentField !== field || !direction) {
    return <ArrowUpDown size={size} className={`text-gray-400 ${className}`} />;
  }

  if (direction === 'asc') {
    return <ArrowUp size={size} className={`text-green-600 ${className}`} />;
  }

  return <ArrowDown size={size} className={`text-green-600 ${className}`} />;
};

export default SortIcon;


