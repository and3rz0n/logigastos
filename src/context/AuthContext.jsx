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
    let isMounted = true; 

    const initializeSession = async () => {
      try {
        setLoading(true);
        // 1. Buscamos la sesión activa UNA ÚNICA VEZ al arrancar (El F5)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session?.user) {
          if (isMounted) setUser(session.user);
          const userProfile = await fetchProfile(session.user.id);
          
          if (isMounted) {
            if (userProfile) {
              setProfile(userProfile); // Todo en orden, guardamos
            } else {
              // Si hay sesión pero no perfil, limpiamos
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error inicializando sesión:", error);
      } finally {
        // Apagamos la carga tras el F5
        if (isMounted) setLoading(false);
      }
    };

    initializeSession();

    // 2. El Vigilante: Ahora es silencioso y no secuestra la pantalla
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;

      try {
        // YA NO ENCENDEMOS LA PANTALLA DE CARGA AQUÍ (setLoading(true) eliminado)
        // Esto evita que el "Eco" de Supabase congele el Dashboard.

        if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
        } else if (session?.user) {
          if (isMounted) setUser(session.user);
          
          // Actualización silenciosa en segundo plano
          const userProfile = await fetchProfile(session.user.id);
          
          if (isMounted) {
            if (userProfile) {
              setProfile(userProfile);
            } else {
              setUser(null);
              setProfile(null);
            }
          }
        }
      } catch (error) {
        console.error("❌ Error al procesar cambio de estado:", error);
      } finally {
        // Nos aseguramos de que el cargador siempre termine apagado
        if (isMounted) setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithDni = async (dni, password) => {
    try {
      setLoading(true); // Aquí sí encendemos la carga intencionalmente para el login manual
      const email = `${dni}@logigastos.app`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setLoading(false); 
      throw error;
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      
      setUser(null);
      setProfile(null);
      localStorage.clear(); 
    } catch (error) {
      console.error("Error al salir:", error);
    } finally {
      setLoading(false);
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
