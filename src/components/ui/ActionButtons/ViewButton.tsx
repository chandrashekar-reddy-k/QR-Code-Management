import { Eye } from 'lucide-react';
import { IconButton } from '../Button';

export interface ViewButtonProps {
  onClick: () => void;
  size?: number;
  className?: string;
  tooltip?: string;
}

const ViewButton = ({ onClick, size = 12, className = '', tooltip }: ViewButtonProps) => {
  return (
    <IconButton
      icon={Eye}
      iconSize={size}
      aria-label={tooltip || 'View'}
      onClick={onClick}
      className={className || 'text-blue-600 hover:bg-blue-50 rounded transition-colors'}
      title={tooltip || 'View'}
    />
  );
};

export default ViewButton;


