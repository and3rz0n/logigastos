import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onConfirm, 
  message, 
  confirmText = "Confirmar", 
  variant = "neutral" 
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Fondo oscuro con desenfoque */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Contenedor del Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-in fade-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in duration-300">
        
        {/* Cabecera */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
           <div className="flex items-center overflow-hidden">
             {!children && variant === 'danger' && (
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mr-3 shrink-0">
                  <AlertTriangle className="w-6 h-6 shrink-0" />
                </div>
             )}
             
             <h3 className="text-xl font-bold text-gray-900 dark:text-white font-sans truncate">
               {title}
             </h3>
           </div>
           
           <button 
             onClick={onClose}
             className="text-gray-400 hover:text-gray-500 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 shrink-0"
           >
             <X className="w-6 h-6 shrink-0" />
           </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children ? (
            children
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {/* Pie del Modal */}
        {!children && onConfirm && (
          <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button 
              variant="secondary" 
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={onConfirm}
              variant={variant === 'danger' ? 'danger' : 'primary'}
              className="w-full sm:w-auto"
            >
              {confirmText}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}