import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerWebMcpTools } from "./agent/webmcp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

void registerWebMcpTools().catch((error) => {
  console.warn("WebMCP tool registration failed:", error);
});
