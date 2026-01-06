// src/context/AuthContext.js
// TulipFleet - Authentication Context with Refresh Token Support
// Updated: 26 Aralık 2025

import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";
import { getErrorMessage } from "../utils/helpers";
import {
  clearTokens,
  clearUserData,
  getAccessToken,
  getRefreshToken,
  getUserData,
  storeTokens,
  storeUserData,
} from "../utils/storage";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // Token state eklendi
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Uygulama açılışında token kontrolü
  useEffect(() => {
    checkAuthStatus();
  }, []);

  /**
   * Auth durumu kontrolü - storage'dan user ve token oku
   */
  const checkAuthStatus = async () => {
    try {
      const storedToken = await getAccessToken();
      const userData = await getUserData();

      if (storedToken && userData) {
        console.log("✅ User found in storage:", userData.email);
        setToken(storedToken); // Token'ı state'e kaydet
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log("ℹ️ No user in storage");
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("❌ Auth check error:", error);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login - Real API with Refresh Token
   */
  const login = async (email, password) => {
    try {
      setLoading(true);

      console.log("🔐 Attempting login:", email);

      const response = await authAPI.login(email, password);
      console.log("📦 Login response received");

      // Backend artık hem token hem refreshToken dönüyor
      const {
        token: accessToken,
        refreshToken,
        expiresIn,
        user: userData,
      } = response;

      if (accessToken && userData) {
        console.log("✅ Login successful:", userData.role);

        // ÖNCELİK: State'i hemen güncelle (navigate için)
        setToken(accessToken);
        setUser(userData);
        setIsAuthenticated(true);

        console.log("✅ Auth state updated, saving to storage...");

        // Storage arka planda yapsın
        try {
          await storeTokens(accessToken, refreshToken || accessToken);
          await storeUserData(userData);
          console.log("✅ Storage complete!");
        } catch (storageError) {
          console.warn("⚠️ Storage error (non-critical):", storageError);
        }

        return { success: true, user: userData };
      } else {
        return {
          success: false,
          error: "Invalid response from server",
        };
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Login failed";
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register - Real API with Refresh Token
   */
  const register = async (data) => {
    try {
      setLoading(true);

      console.log("📝 Attempting registration:", data.email);

      const response = await authAPI.register(
        data.email,
        data.password,
        data.role || "driver"
      );
      console.log("📦 Register response received");

      const { token: accessToken, refreshToken, user: userData } = response;

      if (accessToken && userData) {
        console.log("✅ Registration successful");

        await storeTokens(accessToken, refreshToken || accessToken);
        setToken(accessToken); // State'e de kaydet
        await storeUserData(userData);

        setUser(userData);
        setIsAuthenticated(true);

        return {
          success: true,
          user: userData,
          message: "Registration successful",
        };
      } else {
        return {
          success: false,
          error: "Invalid response from server",
        };
      }
    } catch (error) {
      console.error("❌ Register error:", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Registration failed";
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout - kullanıcıyı çıkar
   */
  const logout = async () => {
    try {
      setLoading(true);
      console.log("👋 Logging out user:", user?.email);

      // Backend'e logout bildirimi gönder (refresh token'ı iptal et)
      try {
        const refreshToken = await getRefreshToken();
        await authAPI.logout(refreshToken);
      } catch (err) {
        console.warn(
          "Backend logout failed, continuing with local logout:",
          err
        );
      }

      // Storage'ı temizle
      await clearTokens();
      await clearUserData();

      setToken(null); // Token state'ini de temizle
      setUser(null);
      setIsAuthenticated(false);

      console.log("✅ Logout successful");

      return { success: true };
    } catch (error) {
      console.error("❌ Logout error:", error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (updatedData) => {
    try {
      console.log("🔄 Updating profile:", updatedData);

      // Update local storage
      const updatedUser = { ...user, ...updatedData };
      await storeUserData(updatedUser);
      setUser(updatedUser);

      console.log("✅ Profile updated");

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error("❌ Update profile error:", error);
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  };

  /**
   * Force refresh token (API interceptor tarafından çağrılabilir)
   */
  const forceRefreshToken = async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const response = await authAPI.refresh(refreshToken);
      if (response.token) {
        await storeTokens(response.token, refreshToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Force refresh failed:", error);
      return false;
    }
  };

  const value = {
    user,
    token, // Ekranlar için token
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    checkAuthStatus,
    forceRefreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
