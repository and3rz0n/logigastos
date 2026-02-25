import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const Button = React.forwardRef(({ className, variant = "primary", size = "default", isLoading, children, ...props }, ref) => {
  
  const variants = {
    primary: "bg-brand-700 text-white hover:bg-brand-900 shadow-md shadow-brand-700/20 dark:bg-brand-600 dark:hover:bg-brand-500 dark:shadow-none",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700",
    ghost: "hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-slate-800",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/20 dark:shadow-none"
  };

  const sizes = {
    default: "h-12 px-6 py-2",
    sm: "h-9 rounded-lg px-3 text-xs",
    icon: "h-10 w-10 rounded-full",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      ref={ref}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
});

Button.displayName = "Button";

export { Button };