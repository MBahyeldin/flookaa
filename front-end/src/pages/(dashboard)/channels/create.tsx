import { Form } from "@/models/Forms/Form";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { getCommunity } from "@/services/communities";
import type { Community } from "@/types/community";
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
  const [searchParams] = useSearchParams();
  const communityId = Number(searchParams.get("community")) || 0;
  const [community, setCommunity] = useState<Community | null>(null);

  useEffect(() => {
    if (!communityId) return;
    let alive = true;
    getCommunity(communityId).then((r) => {
      if (alive && r.ok) setCommunity(r.data.community);
    });
    return () => {
      alive = false;
    };
  }, [communityId]);

  const initialValues = useMemo(
    () => (community ? { community_id: community.id } : {}),
    [community],
  );

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
      const result = status.result as { channel: { ID: string }; community_status?: string };
      if (result?.community_status === "pending" && community) {
        toast.success(`Channel created. ${community.name}'s managers will review your request to add it.`);
      }
      navigate(`/channels/${result?.channel?.ID}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className={"w-full max-w-4xl shadow-xl"}>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">
            {Form.channel.title}
          </CardTitle>
          <CardDescription className="mb-4">
            {Form.channel.description}
          </CardDescription>
          {community && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground">
              <Boxes className="h-4 w-4 shrink-0" />
              <span>
                {community.can_manage ? "In " : "Will be suggested to "}
                <Link to={`/communities/${community.slug}`} className="font-medium text-foreground hover:underline">
                  {community.name}
                </Link>
                {!community.can_manage && "; its managers decide whether it joins"}
              </span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <FormComponent
            key={community?.id ?? 0}
            initialValues={initialValues}
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
