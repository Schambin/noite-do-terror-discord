import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { initSync } from "./state/evento.js";
import "./style.css";

createRoot(document.getElementById("app")).render(<StrictMode><App /></StrictMode>);
initSync();
