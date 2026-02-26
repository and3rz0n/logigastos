import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      console.warn("⚠️ Error cargando perfil:", err.message);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          if (userProfile) {
            // Perfil cargado correctamente
            setUser(session.user);
            setProfile(userProfile);
          } else {
            // Sesión corrupta o perfil eliminado: forzamos limpieza
            await supabase.auth.signOut();
            setUser(null);
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("❌ Error en inicialización:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          if (userProfile) {
            setUser(session.user);
            setProfile(userProfile);
          } else {
            setUser(null);
            setProfile(null);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("❌ Error al procesar evento de auth:", error);
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
      window.location.href = '/login'; // Limpieza absoluta
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
