import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App'
import { UserProvider } from "./context/UserContext";

const root = ReactDOM.createRoot(document.getElementById("root"));
 
root.render(
  <UserProvider token>
    <App/>
  </UserProvider>
);