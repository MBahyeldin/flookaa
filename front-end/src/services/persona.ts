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
    return data.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch (err) {
    console.log("Error fetching personas:", err);
    return [];
  }
}

export async function setCurrentPersona(personaId: string): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE_URL}/api/v1/persona/set-current-persona`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ persona_id: personaId }),
    });
    return resp.ok;
  } catch (err) {
    console.log("Error setting current persona:", err);
    return false;
  }
}

