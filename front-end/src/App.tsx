import { useAuth } from "./Auth.context";
import AppLoader from "./components/app-loader";
import AppRouter from "./routes/AppRouter";
import DefaultLayout from "./layouts/default";
import { Toaster } from "sonner";
import DashboardLayout from "./layouts/dashboard";
import { Tooltip } from "./components/ui/tooltip";
import useAudioContext from "./hooks/useAudioContext";
import useWakeLock from "./hooks/useWakeLock";
import { useEffect } from "react";
import { DialogProvider } from "./Dialog.context";
import { useLoading } from "./Loading.context";
import { useTranslation } from "react-i18next";
import { DirectionProvider } from "@radix-ui/react-direction";
import { direction } from "./i18n";

function App() {
  const { i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { isFetchUserLoading } = useLoading();

  const { initAudio } = useAudioContext();
  useEffect(() => {
      const init = async () => {
        await initAudio();
      };
      init();
  }, [initAudio]);

  useWakeLock();

  if (isFetchUserLoading) {
    return <AppLoader />;
  }

  return (
    // Remounting on a language change re-renders strings built outside React too.
    <DirectionProvider dir={direction()} key={i18n.language}>
      <DialogProvider>
        <Tooltip>
          <>
            { isAuthenticated ? (
              <DashboardLayout>
                <AppRouter />
              </DashboardLayout>
            ) : (
              <DefaultLayout>
                <AppRouter />
              </DefaultLayout>
            )}
            <Toaster />
          </>
        </Tooltip>
      </DialogProvider>
    </DirectionProvider>
  );
}

export default App;
