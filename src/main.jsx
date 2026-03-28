import React from "react";
import ReactDOM from "react-dom/client";
import AuthProvider from "./AuthProvider";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      {({ user, logout, saveUserData, loadUserData }) => (
        <App user={user} logout={logout} saveUserData={saveUserData} loadUserData={loadUserData} />
      )}
    </AuthProvider>
  </React.StrictMode>
);
