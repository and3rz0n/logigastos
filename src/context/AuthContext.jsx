import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para descargar el perfil con manejo de errores
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.warn("⚠️ Perfil no encontrado o error de red:", err.message);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        // 1. Verificamos si hay una sesión activa guardada
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error("❌ Error en inicialización:", error);
      } finally {
        // SALIDA DE EMERGENCIA: Pase lo que pase, liberamos la pantalla de carga
        setLoading(false);
      }
    };

    initializeAuth();

    // Escuchador de cambios de sesión (Login / Logout / Expiración)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔔 Evento de Auth:", event);
      
      try {
        if (session?.user) {
          setUser(session.user);
          // Si es un nuevo inicio de sesión, traemos el perfil
          const userProfile = await fetchProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("❌ Error al procesar cambio de estado:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithDni = async (dni, password) => {
    try {
      setLoading(true);
      const email = `${dni}@logigastos.app`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setLoading(false); // Liberamos la carga si el login falla (error de contraseña, etc)
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
      // Limpieza total inmediata para evitar "fantasmas"
      setUser(null);
      setProfile(null);
      localStorage.clear(); 
    } catch (error) {
      console.error("Error al salir:", error);
    } finally {
      setLoading(false);
      // Forzamos recarga para asegurar limpieza de memoria del navegador
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, signInWithDni, signOut, loading }}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-brand-700">
          <div className="w-10 h-10 border-4 border-brand-700 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold animate-pulse text-sm">Sincronizando identidad...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
