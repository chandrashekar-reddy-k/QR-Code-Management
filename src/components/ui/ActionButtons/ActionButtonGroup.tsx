import { ReactNode } from 'react';

export interface ActionButtonGroupProps {
  children: ReactNode;
  className?: string;
}

const ActionButtonGroup = ({ children, className = '' }: ActionButtonGroupProps) => {
  return <div className={`flex items-center gap-1.5 ${className}`}>{children}</div>;
};

export default ActionButtonGroup;


