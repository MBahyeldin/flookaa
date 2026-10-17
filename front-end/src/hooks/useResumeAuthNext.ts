import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import safeNext from "@/lib/safeNext";

export const AUTH_NEXT_KEY = "auth_next";

export default function useResumeAuthNext() {
  const navigate = useNavigate();

  useEffect(() => {
    let next: string | null = null;
    try {
      next = sessionStorage.getItem(AUTH_NEXT_KEY);
      sessionStorage.removeItem(AUTH_NEXT_KEY);
    } catch {
      return;
    }
    if (next) navigate(safeNext(next), { replace: true });
  }, [navigate]);
}
