import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";
import type { AuthContextType } from "@/types/auth";
import { fetchCurrentUser, logOut } from "@/services/auth";
import { fetchCurrentPersona, fetchUserPersonas } from "./services/persona";
import {
  hasRole as checkRole,
  hasPermission as checkPermission,
} from "@/utils/permissions";
import { useLoading } from "./Loading.context";
import { useUserProfileStore } from "./stores/UserProfileStore";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setIsFetchUserLoading, setIsFetchCurrentPersonaLoading, setIsFetchAllPersonasLoading } = useLoading();
  const { setPersonas, setUser, setPersona, user } = useUserProfileStore();
  const [ revalidateUserCounter, setRevalidateUserCounter ] = useState(0);
  const [ revalidatePersonaCounter, setRevalidatePersonaCounter ] = useState(0);

  // Function to revalidate user
  const revalidateUser = useCallback(() => {
    setRevalidateUserCounter((prev) => prev + 1);
  }, []);

  const revalidatePersona = useCallback(() => {
    setRevalidatePersonaCounter((prev) => prev + 1);
  }, []);

  useEffect(() => {

    async function loadUser() {
      setIsFetchUserLoading(true);
      try {
        const data = await fetchCurrentUser();
        setUser(data);
      } catch (error) {
        console.log(error);
        setUser(null);
      }
     
      setIsFetchUserLoading(false);
    }

    loadUser();
  }, [revalidateUserCounter, setIsFetchUserLoading, setUser]);

  useEffect(() => {
    if (!user) return;
    const getCurrentPersona = async () => {
      try {
        const response = await fetchCurrentPersona();
        if (response) {
          setPersona(response);
        } else {
          setPersona(null);
        }
      } catch (error) {
        console.log(error);
        setPersona(null);
      } finally {
        setIsFetchCurrentPersonaLoading(false);
      }
    };

    getCurrentPersona();
  }, [user, revalidatePersonaCounter, setPersona, setIsFetchCurrentPersonaLoading]);

  const handleLogOut = useCallback(async () => {
    console.log("Logging out... Context");

    await logOut();
    setUser(null);
    setPersonas([]);
    setPersona(null);
    localStorage.removeItem("loginSuccess");
  }, []);

    useEffect(() => {
      console.log('fetchPersonas');
      
    const fetchPersonas = async () => {
      try{
        const personas = await fetchUserPersonas();
        setPersonas(personas);
      } catch (error) {
        console.log(error);
        setPersonas([]);
      } finally {
        setIsFetchAllPersonasLoading(false);
      }
    };

    fetchPersonas();
  }, [setIsFetchAllPersonasLoading, setPersonas, user]);


  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        revalidateUser,
        revalidatePersona,
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
