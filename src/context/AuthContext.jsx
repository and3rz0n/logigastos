import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para descargar el perfil
  const fetchProfile = async (userId) => {
    console.log(`[🔍 fetchProfile] Buscando perfil para el ID: ${userId}`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("[❌ fetchProfile] Error de Supabase al traer perfil:", error.message);
        throw error;
      }
      console.log(`[✅ fetchProfile] Perfil encontrado: ${data.nombre_completo} (Rol: ${data.rol})`);
      return data;
    } catch (err) {
      console.warn("[⚠️ fetchProfile] Falla al obtener perfil:", err.message);
      return null;
    }
  };

  useEffect(() => {
    console.log("[🚀 AuthProvider] Montando componente / Iniciando motor");
    let isMounted = true;

    const initializeSession = async () => {
      console.log("[⚙️ initializeSession] Arrancando verificación de sesión inicial...");
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[❌ initializeSession] Error obteniendo sesión:", error);
          throw error;
        }

        if (session?.user) {
          console.log(`[🔓 initializeSession] Sesión en caché válida para: ${session.user.email}`);
          if (isMounted) setUser(session.user);
          
          const userProfile = await fetchProfile(session.user.id);
          
          if (isMounted) {
            if (userProfile) {
              console.log("[💾 initializeSession] Guardando perfil en el estado de la app.");
              setProfile(userProfile);
            } else {
              console.warn("[🗑️ initializeSession] Sesión activa pero SIN perfil. Cerrando sesión corrupta.");
              await supabase.auth.signOut();
              setUser(null);
              setProfile(null);
            }
          }
        } else {
          console.log("[🔒 initializeSession] No hay sesión activa en caché.");
        }
      } catch (error) {
        console.error("❌ Error inicializando sesión:", error);
      } finally {
        console.log(`[🏁 initializeSession] Bloque finally alcanzado. isMounted = ${isMounted}`);
        if (isMounted) {
            setLoading(false);
            console.log("[🟢 initializeSession] Pantalla de carga APAGADA exitosamente.");
        } else {
            console.warn("[⚠️ initializeSession] isMounted es FALSE. El componente se desmontó, omitiendo apagado de pantalla.");
        }
      }
    };

    initializeSession();

    // El Vigilante
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[🔔 onAuthStateChange] Evento de Supabase detectado: ${event}`);
      
      if (event === 'INITIAL_SESSION') {
         console.log("[⏭️ onAuthStateChange] Ignorando INITIAL_SESSION porque el motor ya lo procesó.");
         return;
      }

      try {
        if (isMounted) {
          setLoading(true);
          console.log("[🟡 onAuthStateChange] Pantalla de carga ENCENDIDA por nuevo evento.");
        }

        if (event === 'SIGNED_OUT') {
          console.log("[👋 onAuthStateChange] Usuario cerró sesión. Vaciando datos.");
          if (isMounted) {
            setUser(null);
            setProfile(null);
          }
        } else if (session?.user) {
          console.log(`[🔑 onAuthStateChange] Sesión autorizada para: ${session.user.email}`);
          if (isMounted) setUser(session.user);
          
          const userProfile = await fetchProfile(session.user.id);
          
          if (isMounted) {
            if (userProfile) {
              console.log("[💾 onAuthStateChange] Perfil inyectado en la app tras evento.");
              setProfile(userProfile);
            } else {
              console.warn("[🗑️ onAuthStateChange] Sin perfil válido, limpiando accesos.");
              setUser(null);
              setProfile(null);
            }
          }
        }
      } catch (error) {
        console.error("[❌ onAuthStateChange] Error crítico procesando evento:", error);
      } finally {
        console.log(`[🏁 onAuthStateChange] Finalizando procesamiento de evento. isMounted = ${isMounted}`);
        if (isMounted) {
            setLoading(false);
            console.log("[🟢 onAuthStateChange] Pantalla de carga APAGADA.");
        }
      }
    });

    return () => {
      console.log("[🛑 AuthProvider] Desmontando componente. Apagando suscripciones y bloqueando estados.");
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithDni = async (dni, password) => {
    console.log(`[🔑 signInWithDni] Intentando login para DNI: ${dni}`);
    try {
      setLoading(true);
      const email = `${dni}@logigastos.app`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[❌ signInWithDni] Falló credencial en Supabase:", error.message);
        throw error;
      }
      
      console.log("[✅ signInWithDni] Login exitoso en backend.");
      return data;
    } catch (error) {
      setLoading(false); 
      throw error;
    }
  };

  const signOut = async () => {
    console.log("[🛑 signOut] Ejecutando orden de cierre de sesión manual...");
    try {
      setLoading(true);
      await supabase.auth.signOut();
      console.log("[✅ signOut] Sesión destruida en Supabase.");
      
      setUser(null);
      setProfile(null);
      localStorage.clear(); 
      console.log("[🧹 signOut] Limpieza agresiva de localStorage completada.");
    } catch (error) {
      console.error("[❌ signOut] Error cerrando sesión:", error);
    } finally {
      setLoading(false);
      console.log("[🔄 signOut] Expulsando al usuario a /login");
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
