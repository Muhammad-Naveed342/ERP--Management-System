import React, { useEffect, useState } from "react";
import App from "./App";
import { initDatabase } from "./database/database";
import { loadSession } from "./services/session";

/**
 * Loads SQLite then mounts main UI. Restores portal if a session exists.
 */
export default function Root() {
  const [ready, setReady] = useState(false);
  const [initial, setInitial] = useState({ screen: "home", user: null });

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const s = await loadSession();
        if (s?.user?.role === "order_taker") {
          setInitial({
            screen: "order_portal",
            user: { ...s.user, access_token: s.access_token },
          });
        } else if (s?.user?.role === "sales_man") {
          setInitial({
            screen: "sales_portal",
            user: { ...s.user, access_token: s.access_token },
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <App
      initialScreen={initial.screen}
      initialUser={initial.user}
    />
  );
}
