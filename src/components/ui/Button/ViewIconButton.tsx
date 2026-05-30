import { Eye } from 'lucide-react';
import IconButton, { IconButtonProps } from './IconButton';

export interface ViewIconButtonProps extends Omit<IconButtonProps, 'icon' | 'aria-label'> {
  onClick: () => void;
  size?: number;
  tooltip?: string;
  'aria-label'?: string;
}

const ViewIconButton = ({
  onClick,
  size = 12,
  tooltip,
  'aria-label': ariaLabel,
  className = '',
  ...props
}: ViewIconButtonProps) => {
  const defaultAriaLabel = ariaLabel || tooltip || 'View';
  const defaultClassName = 'text-blue-600 hover:bg-blue-50 rounded transition-colors';

  return (
    <IconButton
      icon={Eye}
      iconSize={size}
      aria-label={defaultAriaLabel}
      onClick={onClick}
      className={className || defaultClassName}
      title={tooltip || 'View'}
      {...props}
    />
  );
};

export default ViewIconButton;

