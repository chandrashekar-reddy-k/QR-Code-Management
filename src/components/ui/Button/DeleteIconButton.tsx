import { Trash2 } from 'lucide-react';
import IconButton, { IconButtonProps } from './IconButton';

export interface DeleteIconButtonProps extends Omit<IconButtonProps, 'icon' | 'aria-label'> {
  onClick: () => void;
  size?: number;
  tooltip?: string;
  'aria-label'?: string;
}

const DeleteIconButton = ({
  onClick,
  size = 12,
  tooltip,
  'aria-label': ariaLabel,
  className = '',
  ...props
}: DeleteIconButtonProps) => {
  const defaultAriaLabel = ariaLabel || tooltip || 'Delete';
  const defaultClassName = 'text-red-600 hover:bg-red-50 rounded transition-colors';

  return (
    <IconButton
      icon={Trash2}
      iconSize={size}
      aria-label={defaultAriaLabel}
      onClick={onClick}
      className={className || defaultClassName}
      title={tooltip || 'Delete'}
      {...props}
    />
  );
};

export default DeleteIconButton;

