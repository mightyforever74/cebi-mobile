// src/context/AuthContext.js
// TulipFleet - Authentication Context
// Updated: 12 Ocak 2026 - Token Race Condition Fix v3
// FIXES:
// - KRİTİK 1: logout parametresiz çağır
// - KRİTİK 2: forceRefreshToken düzeltildi
// - KRİTİK 3: Storage key'leri tutarlı (storage utils kullan)
// - ORTA 4: 401 callback ile state sync
// - ORTA 5: State'i öncelikli kullan, storage sadece persist

import { createContext, useContext, useEffect, useState } from "react";
import {
  authAPI,
  clearAuthToken,
  setAuthToken,
  setOnUnauthorized,
} from "../services/api";
import { getErrorMessage } from "../utils/helpers";
import {
  getAccessToken,
  getRefreshToken,
  getUserData,
  storeTokens,
  storeUserData,
} from "../utils/storage";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Uygulama açılışında token kontrolü
  useEffect(() => {
    checkAuthStatus();

    // ORTA 4 FIX: 401 callback'i set et
    setOnUnauthorized(() => {
      console.log("🔒 [AuthContext] 401 received - clearing state");
      clearAuthToken();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    });

    // Cleanup
    return () => {
      setOnUnauthorized(null);
    };
  }, []);

  /**
   * Auth durumu kontrolü - storage'dan user ve token oku
   */
  const checkAuthStatus = async () => {
    try {
      // KRİTİK 3 FIX: Storage utils kullan (doğru key'ler)
      const storedToken = await getAccessToken();
      const userData = await getUserData();

      if (storedToken && userData) {
        console.log("✅ User found in storage:", userData.email);

        // Memory cache + state güncelle
        setAuthToken(storedToken);
        setToken(storedToken);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log("ℹ️ No user in storage");
        clearAuthToken();
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("❌ Auth check error:", error);
      clearAuthToken();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login - Real API with Token Race Condition Fix
   */
  const login = async (email, password) => {
    try {
      setLoading(true);

      console.log("🔐 Attempting login:", email);

      const response = await authAPI.login(email, password);
      console.log("📦 Login response received");

      const {
        token: accessToken,
        refreshToken,
        expiresIn,
        user: userData,
      } = response;

      if (accessToken && userData) {
        console.log("✅ Login successful:", userData.role);

        // 1. ÖNCE memory cache'e kaydet (race condition fix)
        setAuthToken(accessToken);

        // 2. State'i güncelle (UI için)
        setToken(accessToken);
        setUser(userData);
        setIsAuthenticated(true);

        console.log("✅ Auth state + memory cache updated");

        // 3. Storage'a arka planda yaz (fire and forget)
        // ORTA 5: State zaten güncellendi, storage sadece persist için
        storeTokens(accessToken, refreshToken || accessToken)
          .then(() => console.log("✅ Tokens stored"))
          .catch((e) => console.warn("⚠️ Token storage error:", e));

        storeUserData(userData)
          .then(() => console.log("✅ User stored"))
          .catch((e) => console.warn("⚠️ User storage error:", e));

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
   * Register - Real API
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

        // Memory cache + state + storage
        setAuthToken(accessToken);
        setToken(accessToken);
        setUser(userData);
        setIsAuthenticated(true);

        await storeTokens(accessToken, refreshToken || accessToken);
        await storeUserData(userData);

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

      // KRİTİK 1 FIX: Parametresiz logout çağır
      // Backend'e bildirim (authAPI.logout storage'ı da temizler)
      try {
        await authAPI.logout();
      } catch (err) {
        console.warn("Backend logout error (ignored):", err.message);
      }

      // State temizle (authAPI.logout zaten memory + storage temizledi)
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

      console.log("✅ Logout successful");

      return { success: true };
    } catch (error) {
      console.error("❌ Logout error:", error);
      // Hata olsa bile state'i temizle
      clearAuthToken();
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);

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

      const updatedUser = { ...user, ...updatedData };

      // State önce (UI için)
      setUser(updatedUser);

      // Storage persist
      await storeUserData(updatedUser);

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
   * Force refresh token
   * KRİTİK 2 FIX: authAPI.refresh artık tanımlı
   */
  const forceRefreshToken = async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        console.log("⚠️ No refresh token available");
        return false;
      }

      console.log("🔄 Attempting token refresh...");
      const response = await authAPI.refresh(refreshToken);

      if (response.token) {
        // Memory cache + state + storage güncelle
        setAuthToken(response.token);
        setToken(response.token);
        await storeTokens(response.token, refreshToken);
        console.log("✅ Token refreshed successfully");
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
    token,
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
