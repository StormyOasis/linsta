import React from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { loadableReady } from '@loadable/component';

import App from "../Components/App";
import { historyUtils } from "../utils/utils";
import { buildStore } from "../Components/Redux/redux";

const rootElement = document.querySelector("#root");
if (!rootElement)
    throw new Error("Failed to find root element");


historyUtils.isServer = false;

const store = buildStore(window.__PRELOADED_STATE__);
delete window.__PRELOADED_STATE__;

// We're using SSR
loadableReady(() => 
    hydrateRoot(
        rootElement,
        <React.StrictMode>
            <Provider store={store}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </Provider>
        </React.StrictMode>
    )
);