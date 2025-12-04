import useFetchData from "@/hooks/useFetchData";
import { ProfileForm } from "./form";
import type { Profile } from "@/types/user";
import { getUserData } from "@/services/user";
import SectionLoader from "@/components/section-loader";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data, loading: userDataIsLoading } =
    useFetchData<Profile>(getUserData);

  if (userDataIsLoading) return <SectionLoader />;

  if (!data) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and personal information.
          </p>
        </div>
        <ProfileForm data={data} />
      </div>
    </div>
  );
}
