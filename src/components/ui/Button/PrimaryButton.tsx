import { ButtonHTMLAttributes, ReactNode } from 'react';
import Button, { ButtonProps } from './Button';

export interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {
  children: ReactNode;
}

const PrimaryButton = ({ children, ...props }: PrimaryButtonProps) => {
  return <Button variant="primary" {...props}>{children}</Button>;
};

export default PrimaryButton;

