import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const { signInWithDni } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      await signInWithDni(data.dni, data.password);
      toast.success('¡Bienvenido de nuevo!');
      navigate('/dashboard'); // Redirigiremos aquí tras el éxito
    } catch (error) {
      console.error(error);
      toast.error('Credenciales incorrectas', {
        description: 'Verifica tu DNI/Código y contraseña.'
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      
      {/* Tarjeta de Login */}
      <div className="w-full max-w-[400px] bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
        
        {/* Cabecera con Logo */}
        <div className="p-8 text-center bg-white dark:bg-slate-800 border-b border-gray-50 dark:border-slate-700/50">
          <img 
            src="/logo-softys.png" 
            alt="Softys" 
            className="h-12 mx-auto object-contain mb-4 dark:hidden" 
          />
           <img 
            src="/logo-softys-white.png" 
            alt="Softys" 
            className="h-12 mx-auto object-contain mb-4 hidden dark:block" 
          />
          <h1 className="text-2xl font-bold text-brand-700 dark:text-brand-400">LogiGastos</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gestión de Gastos Logísticos</p>
        </div>

        {/* Formulario */}
        <div className="p-8 pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Input DNI */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">Usuario (DNI / Código)</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 shrink-0" />
                <Input 
                  placeholder="Ingresa tu documento" 
                  className="pl-10 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                  {...register("dni", { required: "El usuario es obligatorio" })}
                />
              </div>
              {errors.dni && <p className="text-red-500 dark:text-red-400 text-xs font-medium ml-1">{errors.dni.message}</p>}
            </div>

            {/* Input Password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 shrink-0" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••" 
                  className="pl-10 pr-10 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                  {...register("password", { required: "La contraseña es obligatoria" })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 dark:text-red-400 text-xs font-medium ml-1">{errors.password.message}</p>}
            </div>

            <Button 
              type="submit" 
              className="w-full font-bold text-base h-12 shadow-lg shadow-brand-700/20 dark:shadow-none"
              isLoading={isSubmitting}
            >
              Iniciar Sesión
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
              &copy; Copyright {new Date().getFullYear()} Todos los derechos reservados a Anderson Cabanillas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}