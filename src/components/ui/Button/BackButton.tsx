import { ArrowLeft } from 'lucide-react';
import Button, { ButtonProps } from './Button';

export interface BackButtonProps extends Omit<ButtonProps, 'children' | 'variant'> {
  onClick: () => void;
  label?: string;
  variant?: 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const BackButton = ({
  onClick,
  label = 'Back',
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: BackButtonProps) => {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={className}
      {...props}
    >
      <ArrowLeft size={14} />
      {label}
    </Button>
  );
};

export default BackButton;

