import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import Button, { ButtonProps } from './Button';

export interface ActionButtonProps extends Omit<ButtonProps, 'variant' | 'size' | 'children'> {
  icon?: LucideIcon;
  action?: 'edit' | 'delete' | 'view' | 'custom';
  children?: ReactNode;
}

const ActionButton = ({ icon: Icon, action = 'custom', children, className = '', ...props }: ActionButtonProps) => {
  const actionVariants: Record<string, ButtonProps['variant']> = {
    edit: 'success',
    delete: 'danger',
    view: 'primary',
    custom: 'primary',
  };
  
  return (
    <Button
      variant={actionVariants[action]}
      size="sm"
      className={className}
      {...props}
    >
      {Icon && <Icon size={14} />}
      {children}
    </Button>
  );
};

export default ActionButton;

