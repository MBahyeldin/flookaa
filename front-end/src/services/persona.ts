import { useUserProfileStore } from "@/stores/UserProfileStore";
import type { Persona } from "@/types/persona";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export async function fetchCurrentPersona(): Promise<Persona | null> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/persona/current`, { credentials: "include" });
    if (!resp.ok) return null;
    const setPersonaId = useUserProfileStore.getState().setPersonaId;
    const data = (await resp.json()) as Persona;
    setPersonaId(data.id);
    return (data);
  } catch (err) {
    console.log("Error fetching current persona:", err);
    return null;
  }
}

export async function fetchUserPersonas(): Promise<Persona[]> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/persona/list`, { credentials: "include" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as Persona[];
    return data;
  } catch (err) {
    console.log("Error fetching personas:", err);
    return [];
  }
}

