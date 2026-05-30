import { ButtonHTMLAttributes, ReactNode } from 'react';
import Button, { ButtonProps } from './Button';

export interface SecondaryButtonProps extends Omit<ButtonProps, 'variant'> {
  children: ReactNode;
}

const SecondaryButton = ({ children, ...props }: SecondaryButtonProps) => {
  return <Button variant="secondary" {...props}>{children}</Button>;
};

export default SecondaryButton;

