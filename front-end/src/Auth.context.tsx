import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { AuthContextType, Info } from "@/types/auth";
import { fetchCurrentUser, logOut } from "@/services/auth";
import {
  hasRole as checkRole,
  hasPermission as checkPermission,
} from "@/utils/permissions";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Info | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revalidateCounter, setRevalidateCounter] = useState(0);

  const revalidateUser = useCallback(() => {
    setRevalidateCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      setIsLoading(true);
      const data = await fetchCurrentUser();
      if (active) {
        setUser(data);
        setIsLoading(false);
      }
    }

    loadUser();
    return () => {
      active = false;
    };
  }, [revalidateCounter]);

  const handleLogOut = useCallback(async () => {
    console.log("Logging out... Context");

    await logOut();
    setUser(null);
    localStorage.removeItem("loginSuccess");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        setUser,
        revalidateUser,
        hasRole: (role) => checkRole(user, role),
        hasPermission: (perm) => checkPermission(user, perm),
        handleLogOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
