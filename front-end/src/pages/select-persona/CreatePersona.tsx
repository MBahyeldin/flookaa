import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/models/Forms/Form";
import { useDialog } from "@/Dialog.context";
import { fetchUserPersonas } from "@/services/persona";
import { useUserProfileStore } from "@/stores/UserProfileStore";
import { useAuth } from "@/Auth.context";

export default function PersonaManagerPage() {
    const { setOpen } = useDialog();
    const { setPersonas } = useUserProfileStore();
    const { revalidatePersona} = useAuth();
    

    const onStatusChange = async (status: { success: boolean; error: string | null; result: unknown; }) => {
        if (status.success) {
            setOpen(false);
            await fetchUserPersonas().then(setPersonas);
            revalidatePersona();
        }
    };

    return (
        <DialogContent className="sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                <FormComponent
                    className="max-w-4xl mx-auto"
                    form={Form.persona}
                    onStatusChange={onStatusChange}
                >
                    <div className="md:col-span-12">
                        <Button type="submit" className="w-full">
                            {Form.persona.submitText}
                        </Button>
                    </div>
                </FormComponent>
            </DialogHeader>
        </DialogContent>
    )
}