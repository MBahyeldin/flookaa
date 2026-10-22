import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Community } from "@/types/community";
import CommunityForm from "./CommunityForm";

export default function CreateCommunityPage() {
  const navigate = useNavigate();
  const onSaved = useCallback(
    (community: Community | null) => {
      if (community) navigate(`/communities/${community.slug}`);
    },
    [navigate],
  );

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">Create a community</CardTitle>
          <CardDescription>A community groups channels about the same topics. You can add channels once it exists.</CardDescription>
        </CardHeader>
        <CardContent>
          <CommunityForm onSaved={onSaved} />
        </CardContent>
      </Card>
    </div>
  );
}
