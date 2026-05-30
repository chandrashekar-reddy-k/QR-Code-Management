import { LucideIcon } from 'lucide-react';
import React from 'react';

export interface IconWrapperProps {
  icon?: LucideIcon;
  iconSrc?: string; // For custom SVG icons from assets
  variant?: 'purple' | 'orange' | 'green' | 'red' | 'pink' | 'blue' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses: Record<
  NonNullable<IconWrapperProps['variant']>,
  { bg: string; icon: string }
> = {
  purple: {
    bg: 'bg-purple-100',
    icon: 'text-purple-600',
  },
  orange: {
    bg: 'bg-orange-100',
    icon: 'text-orange-600',
  },
  green: {
    bg: 'bg-green-100',
    icon: 'text-green-600',
  },
  red: {
    bg: 'bg-red-100',
    icon: 'text-red-600',
  },
  pink: {
    bg: 'bg-pink-100',
    icon: 'text-pink-600',
  },
  blue: {
    bg: 'bg-blue-100',
    icon: 'text-blue-600',
  },
  yellow: {
    bg: 'bg-yellow-100',
    icon: 'text-yellow-600',
  },
};

const sizeClasses: Record<NonNullable<IconWrapperProps['size']>, { container: string; icon: number; customIcon: number }> = {
  sm: {
    container: 'p-2',
    icon: 16,
    customIcon: 40, // Custom icons are larger (56x56 SVG)
  },
  md: {
    container: 'p-3',
    icon: 20,
    customIcon: 48, // Custom icons are larger (56x56 SVG)
  },
  lg: {
    container: 'p-4',
    icon: 24,
    customIcon: 56, // Custom icons are larger (56x56 SVG)
  },
};

const IconWrapper = ({
  icon: Icon,
  iconSrc,
  variant = 'blue',
  size = 'md',
  className = '',
}: IconWrapperProps) => {
  const variantClass = variantClasses[variant];
  const sizeClass = sizeClasses[size];

  // For custom icons (iconSrc), don't apply background or padding since icons have their own background
  // For Lucide icons, apply the background and padding
  const isCustomIcon = !!iconSrc;
  const containerClasses = isCustomIcon 
    ? `${className}` // No background or padding for custom icons
    : `${variantClass.bg} ${sizeClass.container} rounded-lg ${className}`; // Full styling for Lucide icons

  return (
    <div className={containerClasses}>
      {iconSrc ? (
        <img 
          src={iconSrc} 
          alt="icon" 
          style={{ width: sizeClass.customIcon, height: sizeClass.customIcon }}
        />
      ) : Icon ? (
        <Icon size={sizeClass.icon} className={variantClass.icon} />
      ) : null}
    </div>
  );
};

export default IconWrapper;

