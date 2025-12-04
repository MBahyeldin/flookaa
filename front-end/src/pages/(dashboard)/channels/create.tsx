import { Form } from "@/models/Forms/Form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/Auth.context";
import FormComponent from "@/components/form";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CreateChannelPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) {
    navigate("/");
    return null;
  }

  const onStatusChange = (status: {
    success: boolean;
    error: string | null;
    result: unknown;
  }) => {
    if (status && status.success) {
      navigate(
        `/channels/${(status.result as { channel: { ID: string } })?.channel?.ID}`
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className={"w-full max-w-4xl shadow-xl"}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {Form.channel.title}
          </CardTitle>
          <CardDescription className="mb-4">
            {Form.channel.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormComponent
            onStatusChange={onStatusChange}
            form={Form.channel}
            className="gap-4 max-w-4xl mx-auto grid grid-cols-12"
          >
            <div className="flex gap-4 justify-end">
              <Button variant="outline" type="button">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </FormComponent>
        </CardContent>
      </Card>
    </div>
  );
}
