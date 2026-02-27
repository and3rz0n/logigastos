import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Creamos el Contexto Global
const PWAContext = createContext();

export function PWAProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 2. Detectar si es un dispositivo Apple (iPhone/iPad)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 3. Detectar si la app ya está instalada y ejecutándose a pantalla completa
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isRunningStandalone);

    // 4. ATRAPAR EL MENSAJE RELÁMPAGO DE CHROME
    const handleBeforeInstallPrompt = (e) => {
      // Evitar que Chrome muestre su mini-banner nativo
      e.preventDefault();
      // Guardar el evento en el cajón del recepcionista
      setDeferredPrompt(e);
      // Encender la luz verde para mostrar nuestro botón personalizado
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Escuchar si la instalación fue exitosa para ocultar el botón automáticamente
    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Limpieza al desmontar
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 6. La función que ejecutará el Menú Lateral cuando hagan clic
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Mostrar el cuadro de diálogo nativo de instalación
    deferredPrompt.prompt();

    // Esperar a que el usuario le dé a "Instalar" o "Cancelar"
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación');
      setIsInstallable(false); // Ocultamos el botón porque ya aceptó
    } else {
      console.log('El usuario canceló la instalación');
    }

    // Limpiar el evento
    setDeferredPrompt(null);
  };

  return (
    <PWAContext.Provider value={{ isInstallable, isIOS, isStandalone, handleInstallClick }}>
      {children}
    </PWAContext.Provider>
  );
}

// Hook personalizado para usar el Recepcionista fácilmente
export function usePWA() {
  return useContext(PWAContext);
}