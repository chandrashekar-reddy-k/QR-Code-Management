import { getStatusBadgeClass } from '../../lib/utils/status';

export interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
  className?: string;
  customColor?: string; // For custom badges (like available/not available)
}

const Badge = ({ status, size = 'sm', className = '', customColor }: BadgeProps) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };
  
  // If customColor is provided, use it; otherwise use getStatusBadgeClass
  const colorClass = customColor || getStatusBadgeClass(status);
  
  return (
    <span 
      className={`${sizeClasses[size]} rounded-full font-medium ${colorClass} ${className}`}
    >
      {status}
    </span>
  );
};

export default Badge;

