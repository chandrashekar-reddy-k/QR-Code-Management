import { Edit } from 'lucide-react';
import { IconButton } from '../Button';

export interface EditButtonProps {
  onClick: () => void;
  size?: number;
  className?: string;
  tooltip?: string;
}

const EditButton = ({ onClick, size = 12, className = '', tooltip }: EditButtonProps) => {
  return (
    <IconButton
      icon={Edit}
      iconSize={size}
      aria-label={tooltip || 'Edit'}
      onClick={onClick}
      className={className || 'text-blue-600 hover:bg-blue-50 rounded transition-colors'}
      title={tooltip || 'Edit'}
    />
  );
};

export default EditButton;


