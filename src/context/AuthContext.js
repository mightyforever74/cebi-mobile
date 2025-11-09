// src/context/AuthContext.js
// TulipFleet - Authentication Context with Mock Login

import { createContext, useContext, useEffect, useState } from "react";
import { mockLogin, mockRegister } from "../services/mockData";
import { getErrorMessage } from "../utils/helpers";
import {
  clearTokens,
  clearUserData,
  getAccessToken,
  getUserData,
  storeTokens,
  storeUserData,
} from "../utils/storage";
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
   * Mock Login - email/password ile giriş
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      console.log("🔐 Attempting mock login:", email);

      // Mock login fonksiyonunu çağır
      const response = await mockLogin(email, password);

      if (response.success) {
        const { user: userData, token } = response;

        console.log("✅ Mock login successful:", userData.role);

        // Token ve user data'yı storage'a kaydet
        await storeTokens(token, token); // Mock'ta refresh token yok, aynısını kullan
        await storeUserData(userData);

        setUser(userData);
        setIsAuthenticated(true);

        return { success: true, user: userData };
      } else {
        return {
          success: false,
          error: response.error || "Giriş başarısız",
        };
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      return {
        success: false,
        error: error.error || getErrorMessage(error),
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mock Register - yeni kullanıcı kaydı
   */
  const register = async (data) => {
    try {
      setLoading(true);
      console.log("📝 Attempting mock registration:", data.email);

      const response = await mockRegister(data);

      if (response.success) {
        const { user: userData, token } = response;

        console.log("✅ Mock registration successful");

        // Token ve user data'yı storage'a kaydet
        await storeTokens(token, token);
        await storeUserData(userData);

        setUser(userData);
        setIsAuthenticated(true);

        return { success: true, user: userData, message: response.message };
      } else {
        return {
          success: false,
          error: response.error || "Kayıt başarısız",
        };
      }
    } catch (error) {
      console.error("❌ Register error:", error);
      return {
        success: false,
        error: getErrorMessage(error),
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
   * Update user profile - mock update
   */
  const updateProfile = async (updatedData) => {
    try {
      console.log("🔄 Updating profile:", updatedData);

      // Mock update - storage'daki user'ı güncelle
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
