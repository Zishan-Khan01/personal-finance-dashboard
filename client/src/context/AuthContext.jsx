import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import { apiRequest } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  });

  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem("accessToken")
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  async function register(name, email, password) {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    localStorage.setItem(
      "accessToken",
      data.accessToken
    );

    setUser(data.user);
    setAccessToken(data.accessToken);

    return data;
  }

  async function login(email, password) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    localStorage.setItem(
      "user",
      JSON.stringify(data.user)
    );

    localStorage.setItem(
      "accessToken",
      data.accessToken
    );

    setUser(data.user);
    setAccessToken(data.accessToken);

    return data;
  }

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");

    setUser(null);
    setAccessToken(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        register,
        login,
        logout,
        isAuthenticated: Boolean(accessToken)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}