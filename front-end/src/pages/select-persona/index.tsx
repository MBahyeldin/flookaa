import { useAuth } from "@/Auth.context";

import { DialogTrigger } from "@/components/ui/dialog";
import { setCurrentPersona } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import CreatePersona from "./CreatePersona";

export default function SelectPersonaPage() {
    const { personas } = useUserProfileStore();
    const { revalidatePersona } = useAuth();

    return (
        <main className="min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl md:text-4xl font-semibold mb-10">
                Who’s using this?
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
                {personas.map((persona) => (
                    <button
                        key={persona.id}
                        onClick={async () => { await setCurrentPersona(persona.id); revalidatePersona(); }}
                        className="group flex flex-col items-center focus:outline-none cursor-pointer"
                    >
                        <div className="w-28 h-28 rounded-lg bg-muted overflow-hidden 
                                        group-hover:scale-110 transition-transform duration-200">
                            {persona.thumbnail ? (
                                <img
                                    src={persona.thumbnail}
                                    alt={persona.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold">
                                    {persona.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <span className="mt-3 group-hover:text-black">
                            {persona.name}
                        </span>
                        <span className="text-sm text-success group-hover:text-foreground">
                            {persona.first_name} {persona.last_name}
                        </span>
                    </button>
                ))}

                <DialogTrigger asChild>
                <button
                    className="group flex flex-col items-center focus:outline-none"
                >
                    <div className="w-28 h-28 rounded-lg border-2 border-foreground/30 
                                    bg-background
                                    flex items-center justify-center
                                    group-hover:border-black group-hover:scale-110
                                    transition-all duration-200">
                        <span className="text-5xl group-hover:text-black">
                            +
                        </span>
                    </div>
                    <span className="mt-3 group-hover:text-black">
                        Add Persona
                    </span>
                </button>
                </DialogTrigger>
                
            </div>

            {personas.length === 0 && (
                <p className="mt-8">
                    No personas found. Create one to continue.
                </p>
            )}

            <CreatePersona />
        </main>
    );
}
