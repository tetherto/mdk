import { MdkProvider, useAuthToken } from "@tetherto/mdk-react-adapter";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";

import "@tetherto/mdk-react-devkit/styles.css";
import "@tetherto/mdk-react-devkit/styles-domain.css";
import { auth } from "./auth";
import { SignInPage } from "./SignInPage";
import { SitePage } from "./SitePage";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("ERR_ROOT_ELEMENT_MISSING");

// Every site route needs a signed-in user: the Gateway checks each call
// against the Kernel's spec.rbac, so sign in first.
function App() {
  const token = useAuthToken();
  return token ? <SitePage /> : <SignInPage />;
}

// One silent refresh from the session cookie, so a reload stays signed in.
void auth.restore().finally(() => {
  ReactDOM.createRoot(rootElement).render(
    <StrictMode>
      <HashRouter>
        <MdkProvider apiBaseUrl="" auth={auth} fetcher={auth.fetcher}>
          <App />
        </MdkProvider>
      </HashRouter>
    </StrictMode>,
  );
});
