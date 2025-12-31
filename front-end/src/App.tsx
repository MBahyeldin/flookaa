import { useAuth } from "./Auth.context";
import AppLoader from "./components/app-loader";
import AppRouter from "./routes/AppRouter";
import DefaultLayout from "./layouts/default";
import { Toaster } from "sonner";
import DashboardLayout from "./layouts/dashboard";
import { Tooltip } from "./components/ui/tooltip";
import useAudioContext from "./hooks/useAudioContext";
import { useEffect } from "react";
import { DialogProvider } from "./Dialog.context";
import { useLoading } from "./Loading.context";
function App() {
  const { isAuthenticated } = useAuth();
  const { isFetchUserLoading } = useLoading();

  const { initAudio } = useAudioContext();
  useEffect(() => {
      const init = async () => {
        await initAudio();
      };
      init();
  }, []);

  if (isFetchUserLoading) {
    return <AppLoader />;
  }

  return (
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
  );
}

export default App;
