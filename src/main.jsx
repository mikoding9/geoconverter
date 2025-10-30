import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Force dark mode by ensuring the dark class is always present
if (!document.documentElement.classList.contains("dark")) {
  document.documentElement.classList.add("dark");
}

// Prevent OS appearance from affecting dark mode
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.attributeName === "class") {
      if (!document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.add("dark");
      }
    }
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
