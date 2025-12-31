import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { AuthContextType, Info } from "@/types/auth";
import { fetchCurrentUser, logOut } from "@/services/auth";
import { fetchCurrentPersona } from "./services/persona";
import {
  hasRole as checkRole,
  hasPermission as checkPermission,
} from "@/utils/permissions";
import type { Persona } from "./types/persona";
import { useLoading } from "./Loading.context";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Info | null>(null);
  const [revalidateCounter, setRevalidateCounter] = useState(0);
  const [revalidatePersonaCounter, setRevalidatePersonaCounter] = useState(0);
  const [isPersonaSelected, setIsPersonaSelected] = useState<boolean>(false);
  const [persona, setPersona] = useState<Persona | null>(null);
  const { setIsFetchUserLoading, setIsFetchCurrentPersonaLoading } = useLoading();

  const revalidateUser = useCallback(() => {
    setRevalidateCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {

    async function loadUser() {
      setIsFetchUserLoading(true);
      try {
        const data = await fetchCurrentUser();
        setUser(data);
      } catch (error) {
        setUser(null);
      }
     
      setIsFetchUserLoading(false);
    }

    loadUser();
  }, [revalidateCounter]);

  useEffect(() => {
    if (!user) return;
    const getCurrentPersona = async () => {
      try {
        const response = await fetchCurrentPersona();
        if (response) {
          setPersona(response);
          setIsPersonaSelected(true);
        } else {
          setPersona(null);
          setIsPersonaSelected(false);
        }
      } catch (error) {
        setPersona(null);
        setIsPersonaSelected(false);
      } finally {
        setIsFetchCurrentPersonaLoading(false);
      }
    };

    getCurrentPersona();
  }, [user, revalidatePersonaCounter]);

  const revalidatePersona = useCallback(() => {
    setRevalidatePersonaCounter((prev) => prev + 1);
  }, []);

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
        isPersonaSelected,
        persona,
        revalidatePersona,
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
