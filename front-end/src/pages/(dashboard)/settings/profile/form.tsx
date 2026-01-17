import { toast } from "sonner";

import type { Profile } from "@/types/user";
import FormComponent from "@/components/form";
import { Form } from "@/models/Forms/Form";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";

export function ProfileForm({ data }: { data: Profile }) {
  const onStatusChange = (status: {
    success: boolean;
    error: string | null;
  }) => {
    if (status && status.success) {
      toast.success("Profile updated successfully!");
    }
    if (status && status.error) {
      toast.error("Failed to update profile: " + status.error);
    }
  };

  if (!data) return null;

  return (
    <div>
      <FormComponent
        onStatusChange={onStatusChange}
        form={Form.profile}
        initialValues={data}
        className="gap-4 max-w-4xl mx-auto"
      >
        <div className="flex gap-4 justify-end">
          <Button variant="outline" type="button">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </FormComponent>
    </div>
  );
}
