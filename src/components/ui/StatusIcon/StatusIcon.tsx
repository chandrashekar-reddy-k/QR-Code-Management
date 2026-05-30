import { CheckCircle, XCircle, AlertCircle, Info, Clock, LucideIcon } from 'lucide-react';

export interface StatusIconProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'pending';
  size?: number;
  className?: string;
}

const StatusIcon = ({ status, size = 16, className = '' }: StatusIconProps) => {
  const iconMap: Record<StatusIconProps['status'], LucideIcon> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
    pending: Clock,
  };

  const colorMap: Record<StatusIconProps['status'], string> = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    pending: 'text-orange-600',
  };

  const Icon = iconMap[status];
  const colorClass = colorMap[status];

  return <Icon size={size} className={`${colorClass} ${className}`} />;
};

export default StatusIcon;

