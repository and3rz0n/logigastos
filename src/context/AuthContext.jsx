import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // AHORA: Esta función devuelve el perfil para poder esperarlo (await)
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn("⚠️ Error cargando perfil:", error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error("❌ Error crítico perfil:", err);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // 1. Verificar sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      }
      
      setLoading(false);
    };

    initializeAuth();

    // 2. Escuchar cambios de estado (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Si el perfil está vacío o es un login, buscamos datos frescos
        const userProfile = await fetchProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithDni = async (dni, password) => {
    // Al intentar un nuevo login, bloqueamos la UI preventivamente
    setLoading(true); 
    const email = `${dni}@logigastos.app`;
    
    try {
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
    setLoading(true);
    try {
      await supabase.auth.signOut();
      // Limpieza profunda e inmediata de la memoria
      setUser(null);
      setProfile(null);
      localStorage.clear(); 
    } catch (error) {
      console.error("Error al salir:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, signInWithDni, signOut, loading }}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-brand-700">
          <div className="w-8 h-8 border-4 border-brand-700 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-medium animate-pulse">Sincronizando identidad...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
