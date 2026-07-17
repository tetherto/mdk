import { MdkProvider } from "@tetherto/mdk-react-adapter";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";

import "@tetherto/mdk-react-devkit/styles.css";
import "@tetherto/mdk-react-devkit/styles-domain.css";
import { SitePage } from "./SitePage";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("ERR_ROOT_ELEMENT_MISSING");

// Same-origin: the Vite dev proxy forwards /site/* to the gateway.
ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <MdkProvider apiBaseUrl="">
        <SitePage />
      </MdkProvider>
    </HashRouter>
  </StrictMode>,
);
