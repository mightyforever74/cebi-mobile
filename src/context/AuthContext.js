// src/context/AuthContext.js
// TulipFleet - Authentication Context with MOCK MODE support

import { createContext, useContext, useEffect, useState } from "react";
import { authAPI } from "../services/api";
import { getErrorMessage } from "../utils/helpers";
import {
  clearTokens,
  clearUserData,
  getAccessToken,
  getUserData,
  storeTokens,
  storeUserData,
} from "../utils/storage";

// 🧪 MOCK MODE - Network issues için
const USE_MOCK_MODE = false; // ✅ true = Mock kullan, false = Real API

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
      const token = await getAccessToken();
      const userData = await getUserData();

      if (token && userData) {
        console.log("✅ User found in storage:", userData.email);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log("ℹ️ No user in storage");
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error("❌ Auth check error:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login - MOCK MODE veya REAL API
   */
  const login = async (email, password) => {
    try {
      setLoading(true);

      // 🧪 MOCK MODE
      if (USE_MOCK_MODE) {
        console.log("🧪 Using MOCK login mode");

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockUser = {
          id: "mock-" + Date.now(),
          email: email,
          role: email.includes("admin") ? "admin" : "driver",
          firstName: email.split("@")[0],
          lastName: "User",
          language: "tr",
        };

        const mockToken = "mock-token-" + Date.now();

        // Save to storage
        await storeTokens(mockToken, mockToken);
        await storeUserData(mockUser);

        setUser(mockUser);
        setIsAuthenticated(true);

        console.log(
          "✅ Mock login successful:",
          mockUser.email,
          "Role:",
          mockUser.role
        );
        return { success: true, user: mockUser };
      }

      // 🌐 REAL API LOGIN
      console.log("🔐 Attempting REAL API login:", email);

      const response = await authAPI.login(email, password);
      console.log("📦 Login response:", response);

      const { token, user: userData } = response.data || response;

      if (token && userData) {
        console.log("✅ Real API login successful:", userData.role);

        console.log("💾 Saving token to storage..."); // YENİ
        await storeTokens(token, token);
        console.log("💾 Saving user data to storage..."); // YENİ
        await storeUserData(userData);
        console.log("✅ Storage complete!"); // YENİ

        setUser(userData);
        setIsAuthenticated(true);

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
   * Register - MOCK MODE veya REAL API
   */
  const register = async (data) => {
    try {
      setLoading(true);

      // 🧪 MOCK MODE
      if (USE_MOCK_MODE) {
        console.log("🧪 Using MOCK register mode");

        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockUser = {
          id: "mock-" + Date.now(),
          email: data.email,
          role: "driver", // Default role
          firstName: data.firstName || data.email.split("@")[0],
          lastName: data.lastName || "User",
          language: "tr",
        };

        const mockToken = "mock-token-" + Date.now();

        await storeTokens(mockToken, mockToken);
        await storeUserData(mockUser);

        setUser(mockUser);
        setIsAuthenticated(true);

        console.log("✅ Mock registration successful");
        return {
          success: true,
          user: mockUser,
          message: "Registration successful",
        };
      }

      // 🌐 REAL API REGISTER
      console.log("📝 Attempting REAL API registration:", data.email);

      const response = await authAPI.register(data);
      console.log("📦 Register response:", response);

      const { token, user: userData } = response.data || response;

      if (token && userData) {
        console.log("✅ Real API registration successful");

        await storeTokens(token, token);
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

      // MOCK MODE'da backend çağrısı yapma
      if (!USE_MOCK_MODE) {
        try {
          await authAPI.logout();
        } catch (err) {
          console.warn(
            "Backend logout failed, continuing with local logout:",
            err
          );
        }
      }

      // Storage'ı temizle
      await clearTokens();
      await clearUserData();

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

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    checkAuthStatus,
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
