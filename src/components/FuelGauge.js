// src/components/FuelGauge.js
// TulipFleet - Dairesel Yakıt Göstergesi (Sanal Şamandıra)
// react-native-svg ile halka gauge: dış çember + dolu yay (yüzde) + ortada % ve yakıt ikonu

import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

/**
 * Dairesel yakıt göstergesi (yuvarlak halka).
 * @param {number} percent - 0-100 doluluk yüzdesi
 * @param {number} liters - mevcut litre (opsiyonel)
 * @param {number} capacity - kapasite litre (opsiyonel)
 * @param {string} color - dolu yayın rengi (fuelColor)
 * @param {object} COLORS - tema renkleri
 * @param {number} size - gösterge çapı px (default 170)
 */
export default function FuelGauge({
  percent = 0,
  liters = null,
  capacity = null,
  color = "#22C55E",
  COLORS = {},
  size = 170,
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeWidth = size * 0.09;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);

  const trackColor = COLORS.DIVIDER || "#E5E7EB";
  const textColor = COLORS.TEXT || "#111827";
  const subColor = COLORS.TEXT_SECONDARY || "#6B7280";

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="water" size={size * 0.18} color={color} />
        <Text style={{ fontSize: size * 0.22, fontWeight: "800", color: textColor, marginTop: size * 0.01 }}>
          %{Math.round(clamped)}
        </Text>
        {liters != null && capacity != null && (
          <Text style={{ fontSize: size * 0.085, color: subColor, marginTop: size * 0.01 }}>
            {Math.round(liters)} L / {Math.round(capacity)} L
          </Text>
        )}
      </View>
    </View>
  );
}
