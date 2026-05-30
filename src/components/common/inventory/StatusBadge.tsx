import { InventoryStatusInfo } from '../../types/inventory.types';

interface StatusBadgeProps {
  status: InventoryStatusInfo;
  size?: 'sm' | 'md';
}

const StatusBadge = ({ status, size = 'sm' }: StatusBadgeProps) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  
  return (
    <span className={`${sizeClasses} rounded-full font-medium ${status.colorClass}`}>
      {status.label}
    </span>
  );
};

export default StatusBadge;

