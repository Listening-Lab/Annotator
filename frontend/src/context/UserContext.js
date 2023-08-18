import React, { createContext, useEffect, useState } from "react";

export const UserContext = createContext();

export const UserProvider = (props) => {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const fetchUser = async () => {
      const requestOptions = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
      };

      const response = await fetch("http://localhost:8000/api/users/current", requestOptions);

      if (!response.ok) {
        setToken(null); // Invalid, logout user
      } else {
        const user_data = await response.json()
        if (user_data.verified) {
          localStorage.setItem("token", token);
        } else {
          console.log("Not verified")
          setToken(null)
        }
      }
    }
    fetchUser()
  }, [token])

  
  return (
    <UserContext.Provider value={[token, setToken]}>
      {props.children}
    </UserContext.Provider>
  );
};