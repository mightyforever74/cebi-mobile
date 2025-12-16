import PropTypes from "prop-types";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import argonTheme from "../constants/Theme";

// Galio Button yerine custom implementation
// React 19 + Expo SDK 54 uyumlu

const ArButton = ({
  children,
  color = "primary",
  small = false,
  shadowless = false,
  loading = false,
  disabled = false,
  onPress,
  style,
  textStyle,
  ...props
}) => {
  // Color mapping - defensive approach
  const getBackgroundColor = () => {
    if (!color) return argonTheme.COLORS?.PRIMARY || "#5E72E4";

    const colorKey = color.toUpperCase();

    // Önce argonTheme'den bak
    if (argonTheme.COLORS && argonTheme.COLORS[colorKey]) {
      return argonTheme.COLORS[colorKey];
    }

    // Fallback color map
    const colorMap = {
      PRIMARY: "#5E72E4",
      SECONDARY: "#F7FAFC",
      INFO: "#11CDEF",
      SUCCESS: "#2DCE89",
      WARNING: "#FB6340",
      ERROR: "#F5365C",
      WHITE: "#FFFFFF",
      BLACK: "#000000",
      TRANSPARENT: "transparent",
      DEFAULT: "#172B4D",
    };

    return colorMap[colorKey] || colorMap.PRIMARY;
  };

  // Text color based on background
  const getTextColor = () => {
    const lightBackgrounds = ["WHITE", "SECONDARY", "TRANSPARENT"];
    const colorKey = (color || "primary").toUpperCase();

    if (lightBackgrounds.includes(colorKey)) {
      return argonTheme.COLORS?.DEFAULT || "#172B4D";
    }
    return "#FFFFFF";
  };

  const backgroundColor = getBackgroundColor();
  const textColor = getTextColor();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.button,
        small && styles.smallButton,
        !shadowless && styles.shadow,
        { backgroundColor },
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

ArButton.propTypes = {
  children: PropTypes.node,
  color: PropTypes.string,
  small: PropTypes.bool,
  shadowless: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  onPress: PropTypes.func,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  textStyle: PropTypes.object,
};

const styles = StyleSheet.create({
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  smallButton: {
    width: 75,
    height: 28,
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    shadowOpacity: 0.12,
    elevation: 3,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default ArButton;
