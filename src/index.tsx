
import { hydrate } from "react-dom";
import { SciChartSurface, SciChart3DSurface } from "scichart";

import App from "./App";

const rootElement = document.getElementById("root");
SciChartSurface.loadWasmFromCDN();
SciChart3DSurface.loadWasmFromCDN();
hydrate( <App />, rootElement);
