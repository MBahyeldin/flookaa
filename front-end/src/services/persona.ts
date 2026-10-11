import { apiFetch } from "@/lib/apiFetch";
import type { Persona, PublicPersona } from "@/types/persona";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not defined");
}

export async function fetchCurrentPersona(): Promise<Persona | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/current`, { credentials: "include" });
    if (!resp.ok) return null;
    const data = (await resp.json()) as Persona;
    return (data);
  } catch (err) {
    console.error("Error fetching current persona:", err);
    return null;
  }
}

export async function fetchUserPersonas(): Promise<Persona[]> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/list`, { credentials: "include" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as Persona[];
    return data.sort((a, b) => a.created_at.localeCompare(b.created_at));
  } catch (err) {
    console.error("Error fetching personas:", err);
    return [];
  }
}

export async function fetchPersonaProfile(id: string): Promise<PublicPersona | "not_found" | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${id}`, { credentials: "include" });
    if (resp.status === 404 || resp.status === 400) return "not_found";
    if (!resp.ok) return null;
    return (await resp.json()) as PublicPersona;
  } catch (err) {
    console.error("Error fetching persona:", err);
    return null;
  }
}

export async function fetchConnectedPersonas(id: string): Promise<PublicPersona[] | null> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/${id}/connected`, { credentials: "include" });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { personas: PublicPersona[] };
    return data.personas;
  } catch (err) {
    console.error("Error fetching connected personas:", err);
    return null;
  }
}

export async function setShowOnProfile(personaId: string, showOnProfile: boolean): Promise<boolean> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/update/${personaId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ show_on_profile: showOnProfile }),
    });
    return resp.ok;
  } catch (err) {
    console.error("Error updating show on profile:", err);
    return false;
  }
}

export async function setCurrentPersona(personaId: string): Promise<boolean> {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/api/v1/persona/set-current-persona`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ persona_id: personaId }),
    });
    return resp.ok;
  } catch (err) {
    console.error("Error setting current persona:", err);
    return false;
  }
}

