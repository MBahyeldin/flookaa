import { useAuth } from "@/Auth.context";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useDialog } from "@/Dialog.context";
import { Form } from "@/models/Forms/Form";
import { fetchUserPersonas, setCurrentPersona } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";

export default function SelectPersonaPage() {
    const { personas, setPersonas } = useUserProfileStore();
    const { revalidatePersona} = useAuth();
    const { setOpen } = useDialog();

    const onStatusChange = async (status: { success: boolean; error: string | null; result: unknown; }) => {
        if (status.success) {
            setOpen(false);
            await fetchUserPersonas().then(setPersonas);
            revalidatePersona();
        }
    };

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
                        <span className="text-sm text-gray-500 group-hover:text-gray-700">
                            {persona.first_name} {persona.last_name}
                        </span>
                    </button>
                ))}

                <DialogTrigger asChild>
                <button
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
                </DialogTrigger>
                
            </div>

            {personas.length === 0 && (
                <p className="mt-8">
                    No personas found. Create one to continue.
                </p>
            )}

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Have another persona in mind?</DialogTitle>
                    <DialogDescription>
                         Create it now to get started!
                    </DialogDescription>
                    <FormComponent className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto" form={Form.persona} onStatusChange={onStatusChange}>
                        <div className="md:col-span-12">
                            <Button type="submit" className="w-full">
                            {Form.persona.submitText}
                            </Button>
                        </div>
                    </FormComponent>
                </DialogHeader>  
            </DialogContent>
        </main>
    );
}
