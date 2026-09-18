import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (!savedUser) return null;
      const parsed = JSON.parse(savedUser);
      // Handle normalized vs nested user structures
      if (parsed && parsed.user && typeof parsed.user === "object") {
        return { ...parsed.user, token: parsed.token || localStorage.getItem("token") };
      }
      return parsed;
    } catch (e) {
      return null;
    }
  });

  const login = (userData) => {
    const token = userData.token || localStorage.getItem("token");
    // Normalize user object whether response is { token, user: { ... } } or { token, role, ... }
    const normalizedUser = userData.user
      ? { ...userData.user, token }
      : { ...userData, token };

    if (token) {
      localStorage.setItem("token", token);
    }
    localStorage.setItem("user", JSON.stringify(normalizedUser));

    setUser(normalizedUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}