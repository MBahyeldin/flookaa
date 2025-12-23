import { useAuth } from "./Auth.context";
import AppLoader from "./components/app-loader";
import AppRouter from "./routes/AppRouter";
import DefaultLayout from "./layouts/default";
import { Dialog } from "./components/ui/dialog";
import { Toaster } from "sonner";
import DashboardLayout from "./layouts/dashboard";
import { Tooltip } from "./components/ui/tooltip";
import useAudioContext from "./hooks/useAudioContext";
import { useEffect } from "react";
function App() {
  const { isLoading, isAuthenticated } = useAuth(); 

  const { initAudio } = useAudioContext();
  useEffect(() => {
      const init = async () => {
        await initAudio();
      };
      init();
  }, []);

  if (isLoading) {
    return <AppLoader />;
  }

  return (
    <Dialog>
      <Tooltip>
        <>
          {isAuthenticated ? (
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
    </Dialog>
  );
}

export default App;
