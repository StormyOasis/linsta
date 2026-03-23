import React, { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";

import { VISITOR_LAMBDA_HOST } from "../../api/config";

const DELAY_MS = 4000;
const STORAGE_KEY = "visitor_counter_visitor_id";

const siteIdsByHost: Record<string, string> = {
    "lboydstun.com": "lboydstun-com",
    "www.lboydstun.com": "lboydstun-com",
    "providerplane.ai": "providerplane-ai",
    "www.providerplane.ai": "providerplane-ai",
    "providerplane.dev": "providerplane-dev",
    "www.providerplane.dev": "providerplane-dev",
    "linsta.lboydstun.com": "linsta-lboydstun-com"
};

function getOrCreateVisitorId(): string {
    try {
        const existing = window.localStorage.getItem(STORAGE_KEY);
        if (existing) {
            return existing;
        }

        const created = window.crypto.randomUUID();
        window.localStorage.setItem(STORAGE_KEY, created);
        return created;
    } catch {
        return window.crypto.randomUUID();
    }
}

const VisitorCounter: React.FC = () => {
    const location = useLocation();
    const sentRouteKeysRef = useRef<Set<string>>(new Set());

    const routeKey = useMemo(
        () => `${location.pathname}${location.search}${location.hash}`,
        [location.pathname, location.search, location.hash]
    );

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const host = window.location.hostname;
        const siteId = siteIdsByHost[host];

        if (!siteId || !VISITOR_LAMBDA_HOST) {
            return;
        }

        if (sentRouteKeysRef.current.has(routeKey)) {
            return;
        }

        let sent = false;

        const sendPageview = () => {
            if (sent || sentRouteKeysRef.current.has(routeKey)) {
                return;
            }

            sent = true;
            sentRouteKeysRef.current.add(routeKey);

            window.fetch(`${VISITOR_LAMBDA_HOST.replace(/\/$/, "")}/pageview`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    siteId,
                    host,
                    path: location.pathname,
                    visitorId: getOrCreateVisitorId(),
                    eventId: window.crypto.randomUUID(),
                    visibility: document.visibilityState
                }),
                keepalive: true
            }).catch(() => {});
        };

        const timeoutId = window.setTimeout(sendPageview, DELAY_MS);

        const onPointerDown = () => sendPageview();
        const onKeyDown = () => sendPageview();
        const onVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                sendPageview();
            }
        };

        window.addEventListener("pointerdown", onPointerDown, { once: true });
        window.addEventListener("keydown", onKeyDown, { once: true });
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.clearTimeout(timeoutId);
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [location.pathname, routeKey]);

    return null;
};

export default VisitorCounter;
