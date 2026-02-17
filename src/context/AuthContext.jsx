import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  // Iniciamos cargando solo si hay token en local storage, para evitar parpadeos
  const [loading, setLoading] = useState(true);

  // Función auxiliar para cargar el perfil sin bloquear la app
  const fetchProfile = async (userId) => {
    console.log("🔄 Buscando perfil para ID:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn("⚠️ No se pudo cargar el perfil (posiblemente falta crearlo):", error.message);
      } else {
        console.log("✅ Perfil cargado:", data.nombre_completo);
        setProfile(data);
      }
    } catch (err) {
      console.error("❌ Error crítico buscando perfil:", err);
    }
  };

  useEffect(() => {
    console.log("🏁 Inicializando sistema de Auth...");

    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log("🔓 Sesión recuperada:", session.user.email);
        setUser(session.user);
        // Cargamos el perfil en paralelo (sin await para no bloquear el render)
        fetchProfile(session.user.id);
      } else {
        console.log("🔒 No hay sesión activa");
      }
      setLoading(false); // <--- LIBERAMOS LA APP INMEDIATAMENTE
    });

    // 2. Escuchar cambios en tiempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔔 Cambio de estado Auth:", _event);
      
      if (session?.user) {
        setUser(session.user);
        // Solo buscamos perfil si no lo tenemos ya
        setProfile(prev => {
          if (!prev) fetchProfile(session.user.id);
          return prev;
        });
      } else {
        console.log("👋 Usuario desconectado");
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithDni = async (dni, password) => {
    const email = `${dni}@logigastos.app`;
    console.log("🔑 Intentando login con:", email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Error de login:", error.message);
      throw error;
    }
    
    console.log("✅ Login exitoso en Supabase");
    return data;
  };

  const signOut = async () => {
    console.log("🛑 Cerrando sesión...");
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Error al salir:", error);
    
    // Forzamos limpieza local inmediata
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    // Limpieza agresiva de localStorage para evitar fantasmas
    localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
  };

  return (
    <AuthContext.Provider value={{ user, profile, signInWithDni, signOut, loading }}>
      {/* Si está cargando, mostramos un spinner simple, si no, la app */}
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-brand-700">
          <div className="w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-medium animate-pulse">Iniciando sistema...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};