import { fetchUserPersonas } from "@/services/persona";
import type { Persona } from "@/types/persona";
import React from "react";

export default function SelectPersonaPage() {
    const [personas, setPersonas] = React.useState<Persona[]>([]);

    React.useEffect(() => {
        const fetchPersonas = async () => {
            try {
                const resp = await fetchUserPersonas();
                setPersonas(resp);
            } catch (error) {
                console.error("Error fetching personas:", error);
            }
        };
        fetchPersonas();
    }, []);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center">
            <h1 className="text-3xl md:text-4xl font-semibold mb-10">
                Who’s using this?
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
                {personas.map((persona) => (
                    <button
                        key={persona.id}
                        onClick={() => console.log("Selected persona:", persona)}
                        className="group flex flex-col items-center focus:outline-none cursor-pointer"
                    >
                        <div className="w-28 h-28 rounded-lg bg-gray-400 overflow-hidden 
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
                    </button>
                ))}

                <button
                    onClick={() => console.log("Add new persona")}
                    className="group flex flex-col items-center focus:outline-none"
                >
                    <div className="w-28 h-28 rounded-lg border-2 border-gray-500 
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
            </div>

            {personas.length === 0 && (
                <p className="mt-8">
                    No personas found. Create one to continue.
                </p>
            )}
        </main>
    );
}
