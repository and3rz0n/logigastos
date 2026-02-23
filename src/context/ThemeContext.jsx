import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  // Inicializamos el estado leyendo el localStorage o usando 'system' por defecto
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('logigastos-theme');
      if (savedTheme) {
        return savedTheme;
      }
    }
    return 'system';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Función para inyectar o quitar la clase 'dark' del HTML
    const applyTheme = (currentTheme) => {
      root.classList.remove('light', 'dark');
      
      if (currentTheme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(currentTheme);
      }
    };

    // Aplicar el tema actual y guardarlo en memoria
    applyTheme(theme);
    localStorage.setItem('logigastos-theme', theme);

    // Si el usuario elige "system", debemos escuchar si cambia el tema desde el SO (ej: iPhone cambia a oscuro de noche)
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [theme]);

  // Función cíclica para el botón: Claro -> Oscuro -> Sistema -> Claro...
  const cycleTheme = () => {
    setTheme((prevTheme) => {
      if (prevTheme === 'light') return 'dark';
      if (prevTheme === 'dark') return 'system';
      return 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};