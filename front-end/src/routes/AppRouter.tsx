import { Routes, Route } from "react-router-dom";
import Signup from "../pages/sign-up";
import Login from "../pages/login";
import HomePage from "../pages/home";
import ChannelPage from "@/pages/(dashboard)/channels/[id]";
import DashboardSettingsProfile from "@/pages/(dashboard)/settings/profile";
import ChannelsPage from "@/pages/(dashboard)/channels";
import CreateChannelPage from "@/pages/(dashboard)/channels/create";
import VerifyEmailPage from "@/pages/verify-email";
import PersonaManagerPage from "@/pages/(dashboard)/persona-manager/[slug]";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />


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

      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route path="/persona-manager/:slug" element={<PersonaManagerPage />} />
    </Routes>
  );
}
