import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  loginUser,
  logoutUser,
} from "../services/authApi.js";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState("");

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setNetworkError("");
    try {
      const result = await getCurrentUser();
      setUser(result.user);
      return result.user;
    } catch (error) {
      setUser(null);
      if (error.status === 0) setNetworkError(error.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const result = await loginUser(credentials);
    setUser(result.user);
    setNetworkError("");
    return result;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      logout,
      networkError,
      refreshUser,
      setUser,
      user,
    }),
    [isLoading, login, logout, networkError, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export { AuthProvider, useAuth };
