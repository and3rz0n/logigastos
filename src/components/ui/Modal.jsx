import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, // <--- ESTO ES LA CLAVE: Recibir el contenido interno
  // Props para modo Alerta (opcionales)
  onConfirm, 
  message, 
  confirmText = "Confirmar", 
  variant = "neutral" 
}) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Fondo oscuro con desenfoque */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Contenedor del Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
        
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
           {/* Si es alerta, mostramos icono. Si es formulario (children), no mostramos icono para ganar espacio */}
           {!children && variant === 'danger' && (
              <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mr-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
           )}
           
           <h3 className="text-xl font-bold text-gray-900 dark:text-white font-sans flex-1">
             {title}
           </h3>
           
           <button 
             onClick={onClose}
             className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700"
           >
             <X className="w-6 h-6" />
           </button>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6">
          {children ? (
            // CASO A: Es un formulario o contenido personalizado
            // Renderizamos los inputs, selectores, etc.
            children
          ) : (
            // CASO B: Es una alerta simple
            // Renderizamos solo el mensaje de texto
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {message}
            </p>
          )}
        </div>

        {/* Pie del Modal (Solo automático si NO hay children) */}
        {/* Si hay children, asumimos que el formulario trae sus propios botones */}
        {!children && onConfirm && (
          <div className="bg-gray-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              onClick={onConfirm}
              className={variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
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