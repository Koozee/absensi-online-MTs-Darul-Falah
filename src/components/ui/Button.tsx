import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconProps?: React.ComponentProps<LucideIcon>;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconProps,
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'flex items-center justify-center font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-200',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
    success: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200',
    danger: 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200',
    ghost: 'bg-transparent text-slate-500 hover:text-slate-900',
    outline: 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[11px] rounded-xl',
    md: 'px-4 py-2.5 text-xs rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-2xl'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {Icon && (
        <Icon className={`w-3.5 h-3.5 ${children ? 'mr-1.5' : ''} ${isLoading ? 'animate-spin' : ''} ${iconProps?.className || ''}`} {...iconProps} />
      )}
      {children}
    </button>
  );
};
