import AsyncStorage from "@react-native-async-storage/async-storage";

// Token storage
export const storeTokens = async (accessToken, refreshToken) => {
  try {
    await AsyncStorage.multiSet([
      ["accessToken", accessToken],
      ["refreshToken", refreshToken],
    ]);
    return true;
  } catch (error) {
    console.error("Error storing tokens:", error);
    return false;
  }
};

export const getAccessToken = async () => {
  try {
    return await AsyncStorage.getItem("accessToken");
  } catch (error) {
    console.error("Error getting access token:", error);
    return null;
  }
};

export const getRefreshToken = async () => {
  try {
    return await AsyncStorage.getItem("refreshToken");
  } catch (error) {
    console.error("Error getting refresh token:", error);
    return null;
  }
};

export const clearTokens = async () => {
  try {
    await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
    return true;
  } catch (error) {
    console.error("Error clearing tokens:", error);
    return false;
  }
};

// User data storage
export const storeUserData = async (userData) => {
  try {
    await AsyncStorage.setItem("userData", JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error("Error storing user data:", error);
    return false;
  }
};

export const getUserData = async () => {
  try {
    const data = await AsyncStorage.getItem("userData");
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error getting user data:", error);
    return null;
  }
};

export const clearUserData = async () => {
  try {
    await AsyncStorage.removeItem("userData");
    return true;
  } catch (error) {
    console.error("Error clearing user data:", error);
    return false;
  }
};

// Generic storage functions
export const storeData = async (key, value) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    console.error(`Error storing ${key}:`, error);
    return false;
  }
};

export const getData = async (key) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error(`Error getting ${key}:`, error);
    return null;
  }
};

export const removeData = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing ${key}:`, error);
    return false;
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error("Error clearing all data:", error);
    return false;
  }
};
