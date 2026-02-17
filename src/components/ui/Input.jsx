import React from 'react';
import { cn } from '../../utils/cn'; // Crearemos esta utilidad en un segundo

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base shadow-sm transition-all",
        "placeholder:text-gray-400 focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-700/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-brand-500/20",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };