import React from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "/src/Components/App";

const rootElement = document.querySelector("#root");
if (!rootElement) 
  throw new Error("Failed to find root element");

// We're using SSR
hydrateRoot(
  rootElement,
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
