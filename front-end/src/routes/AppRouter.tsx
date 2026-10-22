import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Signup from "../pages/sign-up";
import Login from "../pages/login";
import HomePage from "../pages/home";
import ChannelPage from "@/pages/(dashboard)/channels/[id]";
import DashboardSettingsProfile from "@/pages/(dashboard)/settings/profile";
import AdminInterestsPage from "@/pages/(dashboard)/admin/interests";
import ChannelsPage from "@/pages/(dashboard)/channels";
import CreateChannelPage from "@/pages/(dashboard)/channels/create";
import CommunitiesPage from "@/pages/(dashboard)/communities";
import CreateCommunityPage from "@/pages/(dashboard)/communities/create";
import CommunityPage from "@/pages/(dashboard)/communities/[slug]";
import PersonaManagerPage from "@/pages/(dashboard)/persona-manager";
import PersonaSettingsPage from "@/pages/(dashboard)/persona-manager/[id]";
import NotificationsPage from "@/pages/(dashboard)/notifications";
import PersonaProfilePage from "@/pages/(dashboard)/personas/[id]";
import FollowInvitePage from "@/pages/(dashboard)/follow/[token]";
import BlocksGalleryPage from "@/pages/(dashboard)/blocks";
import NotFound from "@/components/not-found";

const DevThemesPage = import.meta.env.DEV ? lazy(() => import("@/pages/dev-themes")) : () => null;
const DevOnboardingPage = import.meta.env.DEV ? lazy(() => import("@/pages/dev-onboarding")) : () => null;

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />


      <Route path="/communities">
        <Route index element={<CommunitiesPage />} />
        <Route path="create" element={<CreateCommunityPage />} />
        <Route path=":slug" element={<CommunityPage />} />
      </Route>

      <Route path="/channels">
        {<Route index element={<ChannelsPage />} />}
        <Route path="create" element={<CreateChannelPage />} />
        <Route path=":id" element={<ChannelPage />} />
      </Route>

      <Route path="/settings">
        <Route path="profile" element={<DashboardSettingsProfile />} />
      </Route>

      <Route path="/sign-up" element={<Signup />} />
      <Route path="/login" element={<Login />} />

      <Route path="/persona-manager" element={<PersonaManagerPage />} />
      <Route path="/persona-manager/:id" element={<PersonaSettingsPage />} />

      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/admin/interests" element={<AdminInterestsPage />} />

      <Route path="/blocks" element={<BlocksGalleryPage />} />

      <Route path="/personas/:id" element={<PersonaProfilePage />} />

      <Route path="/follow/:token" element={<FollowInvitePage />} />

      {import.meta.env.DEV && <Route path="/dev/themes" element={<Suspense><DevThemesPage /></Suspense>} />}
      {import.meta.env.DEV && <Route path="/dev/onboarding" element={<Suspense><DevOnboardingPage /></Suspense>} />}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
