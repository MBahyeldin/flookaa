import {
  createContext,
  useContext,
  useState,
} from "react";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const setDarkMode = (dark: boolean) => {
    setIsDarkMode(dark);
    window.document.documentElement.classList.toggle("dark", dark);
  };

  const toggleTheme = () => setDarkMode(!isDarkMode);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        setDarkMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}


export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
