import React, { useState, useEffect } from "react";
import HomeScreen from "./screens/HomeScreen";
import OrderTakerLogin from "./screens/OrderTakerLogin";
import SalesManLogin from "./screens/SalesManLogin";
import OrderTakerScreen from "./screens/OrderTakerScreen";
import SalesManScreen from "./screens/SalesManScreen";
import { clearSession } from "./services/session";

export default function App({ initialScreen = "home", initialUser = null }) {
  const [currentScreen, setCurrentScreen] = useState(initialScreen);
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    if (initialScreen !== "home" && initialUser) {
      setCurrentScreen(initialScreen);
      setUser(initialUser);
    }
  }, [initialScreen, initialUser]);

  const goHome = async () => {
    await clearSession();
    setUser(null);
    setCurrentScreen("home");
  };

  return (
    <>
      {currentScreen === "home" && (
        <HomeScreen onSelectPortal={(portal) => setCurrentScreen(portal)} />
      )}

      {currentScreen === "order_login" && (
        <OrderTakerLogin
          onLoginSuccess={(u) => {
            setUser(u);
            setCurrentScreen("order_portal");
          }}
          onBack={() => setCurrentScreen("home")}
        />
      )}

      {currentScreen === "sales_login" && (
        <SalesManLogin
          onLoginSuccess={(u) => {
            setUser(u);
            setCurrentScreen("sales_portal");
          }}
          onBack={() => setCurrentScreen("home")}
        />
      )}

      {currentScreen === "order_portal" && user && (
        <OrderTakerScreen user={user} onBack={goHome} />
      )}

      {currentScreen === "sales_portal" && user && (
        <SalesManScreen user={user} onBack={goHome} />
      )}
    </>
  );
}
