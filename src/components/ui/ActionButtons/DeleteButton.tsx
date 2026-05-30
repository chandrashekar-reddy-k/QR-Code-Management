import { Trash2 } from 'lucide-react';
import { IconButton } from '../Button';

export interface DeleteButtonProps {
  onClick: () => void;
  size?: number;
  className?: string;
  tooltip?: string;
}

const DeleteButton = ({ onClick, size = 12, className = '', tooltip }: DeleteButtonProps) => {
  return (
    <IconButton
      icon={Trash2}
      iconSize={size}
      aria-label={tooltip || 'Delete'}
      onClick={onClick}
      className={className || 'text-red-600 hover:bg-red-50 rounded transition-colors'}
      title={tooltip || 'Delete'}
    />
  );
};

export default DeleteButton;


