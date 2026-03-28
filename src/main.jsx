import React from "react";
import ReactDOM from "react-dom/client";
import AuthProvider from "./AuthProvider";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      {({ user, logout, saveUserData, loadUserData, houseCode, houseInfo, leaveHouse, refreshHouseInfo }) => (
        <App
          user={user}
          logout={logout}
          saveUserData={saveUserData}
          loadUserData={loadUserData}
          houseCode={houseCode}
          houseInfo={houseInfo}
          leaveHouse={leaveHouse}
          refreshHouseInfo={refreshHouseInfo}
        />
      )}
    </AuthProvider>
  </React.StrictMode>
);
