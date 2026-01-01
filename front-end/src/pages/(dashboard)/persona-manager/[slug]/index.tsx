import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useMemo } from "react";
import { useParams } from "react-router-dom";
import PersonaForm from "./PersonaForm";

export default function PersonaManagerPage() {
    const { slug } = useParams<{ slug: string }>();
    const { personas } = useUserProfileStore();
    const persona = useMemo(() => {
        return personas.find((p) => p.slug === slug);
    }, [slug, personas]);

    if (!persona) {
        return <div>Persona not found</div>;
    }
  return (
    <div className="py-8">
      <PersonaForm data={persona} />
    </div>
  );
}