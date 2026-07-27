import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-slate-50 border border-slate-200 rounded-2xl ${icon ? 'pl-10' : 'px-4'} py-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white shadow-sm transition-colors ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};
