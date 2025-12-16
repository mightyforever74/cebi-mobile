/**
 * TulipFleet - Vehicle Marker Component
 * Paket A: Pro Marker System
 * 
 * Özellikler:
 * - Smooth position animation (A.2)
 * - Heading rotation (A.2)
 * - Z-index control for selected marker (A.4)
 * - Performance optimized (A.4)
 */

import React, { useEffect, useRef, useMemo, memo } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import {
  toFloat,
  clampHeading,
  calculateDistance,
  calculateBearing,
  shouldSmooth,
  lerpCoordinate,
  lerpHeading,
  SMOOTHING_CONFIG,
} from '../../utils/mapMath';

// ============================================================================
// CONSTANTS
// ============================================================================

const MARKER_COLORS = {
  in_use: '#10B981',      // Yeşil - aktif
  available: '#3B82F6',   // Mavi - müsait
  maintenance: '#F59E0B', // Turuncu - bakımda
  offline: '#6B7280',     // Gri - offline
  default: '#3B82F6',
};

const Z_INDEX = {
  DEFAULT: 1,
  SELECTED: 999,
};

// ============================================================================
// VEHICLE MARKER COMPONENT
// ============================================================================

const VehicleMarker = memo(({
  vehicle,
  isSelected = false,
  onPress,
  tracksViewChanges = false, // Performance: false for static markers
}) => {
  // Refs for smoothing
  const currentPositionRef = useRef(null);
  const currentHeadingRef = useRef(0);
  const lastUpdateTimeRef = useRef(Date.now());
  const animationFrameRef = useRef(null);
  
  // Animated values
  const animatedCoord = useRef(new Animated.ValueXY({
    x: toFloat(vehicle.latitude),
    y: toFloat(vehicle.longitude),
  })).current;
  
  const animatedHeading = useRef(new Animated.Value(
    clampHeading(toFloat(vehicle.heading, 0))
  )).current;

  // Target position (normalized)
  const targetPosition = useMemo(() => ({
    latitude: toFloat(vehicle.latitude),
    longitude: toFloat(vehicle.longitude),
  }), [vehicle.latitude, vehicle.longitude]);

  // Target heading with bearing fallback
  const targetHeading = useMemo(() => {
    let heading = toFloat(vehicle.heading, null);
    
    // Heading null ise ve önceki pozisyon varsa bearing hesapla
    if (heading === null && currentPositionRef.current) {
      const distance = calculateDistance(
        currentPositionRef.current.latitude,
        currentPositionRef.current.longitude,
        targetPosition.latitude,
        targetPosition.longitude
      );
      
      // Min mesafe kontrolü (4m altında bearing hesaplama)
      if (distance >= SMOOTHING_CONFIG.MIN_DISTANCE_FOR_BEARING) {
        heading = calculateBearing(
          currentPositionRef.current.latitude,
          currentPositionRef.current.longitude,
          targetPosition.latitude,
          targetPosition.longitude
        );
      } else {
        heading = currentHeadingRef.current; // Önceki heading'i koru
      }
    }
    
    return clampHeading(heading || 0);
  }, [vehicle.heading, targetPosition]);

  // ============================================================================
  // SMOOTHING ANIMATION LOOP
  // ============================================================================

  useEffect(() => {
    const now = Date.now();
    const timeDelta = now - lastUpdateTimeRef.current;
    
    // İlk render
    if (!currentPositionRef.current) {
      currentPositionRef.current = targetPosition;
      currentHeadingRef.current = targetHeading;
      animatedCoord.setValue({ x: targetPosition.latitude, y: targetPosition.longitude });
      animatedHeading.setValue(targetHeading);
      lastUpdateTimeRef.current = now;
      return;
    }

    // Mesafe hesapla
    const distance = calculateDistance(
      currentPositionRef.current.latitude,
      currentPositionRef.current.longitude,
      targetPosition.latitude,
      targetPosition.longitude
    );

    // Smoothing kararı
    const doSmooth = shouldSmooth(distance, timeDelta);

    if (doSmooth) {
      // Smooth animation loop
      const animate = () => {
        const currentLat = currentPositionRef.current.latitude;
        const currentLng = currentPositionRef.current.longitude;
        const currentHead = currentHeadingRef.current;

        // Lerp pozisyon
        const newPos = lerpCoordinate(
          { latitude: currentLat, longitude: currentLng },
          targetPosition
        );

        // Lerp heading
        const newHeading = lerpHeading(currentHead, targetHeading);

        // Update refs
        currentPositionRef.current = newPos;
        currentHeadingRef.current = newHeading;

        // Update animated values
        animatedCoord.setValue({ x: newPos.latitude, y: newPos.longitude });
        animatedHeading.setValue(newHeading);

        // Hedefe yaklaştık mı kontrol
        const remainingDistance = calculateDistance(
          newPos.latitude,
          newPos.longitude,
          targetPosition.latitude,
          targetPosition.longitude
        );

        // 0.5m'den fazla kaldıysa devam et
        if (remainingDistance > 0.5) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Hedefe ulaştık, snap
          currentPositionRef.current = targetPosition;
          currentHeadingRef.current = targetHeading;
          animatedCoord.setValue({ x: targetPosition.latitude, y: targetPosition.longitude });
          animatedHeading.setValue(targetHeading);
        }
      };

      // Önceki animasyonu iptal et
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Yeni animasyon başlat
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Teleport - anında geç
      currentPositionRef.current = targetPosition;
      currentHeadingRef.current = targetHeading;
      animatedCoord.setValue({ x: targetPosition.latitude, y: targetPosition.longitude });
      animatedHeading.setValue(targetHeading);
    }

    lastUpdateTimeRef.current = now;

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetPosition.latitude, targetPosition.longitude, targetHeading]);

  // ============================================================================
  // MARKER RENDER
  // ============================================================================

  const markerColor = MARKER_COLORS[vehicle.status] || MARKER_COLORS.default;
  const zIndex = isSelected ? Z_INDEX.SELECTED : Z_INDEX.DEFAULT;

  // Coordinate for Marker (use current smoothed position)
  const coordinate = {
    latitude: currentPositionRef.current?.latitude || targetPosition.latitude,
    longitude: currentPositionRef.current?.longitude || targetPosition.longitude,
  };

  // Heading for rotation
  const rotation = currentHeadingRef.current || targetHeading;

  return (
    <Marker
      identifier={vehicle.id}
      coordinate={coordinate}
      zIndex={zIndex}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges || isSelected}
      onPress={() => onPress && onPress(vehicle)}
    >
      <View style={styles.markerContainer}>
        {/* Rotation wrapper */}
        <View style={[
          styles.markerRotationWrapper,
          { transform: [{ rotate: `${rotation}deg` }] }
        ]}>
          {/* Direction indicator (arrow) */}
          <View style={[styles.directionArrow, { borderBottomColor: markerColor }]} />
        </View>
        
        {/* Main marker body */}
        <View style={[
          styles.markerBody,
          { backgroundColor: markerColor },
          isSelected && styles.markerSelected,
        ]}>
          <Ionicons 
            name="car" 
            size={isSelected ? 20 : 16} 
            color="#fff" 
          />
        </View>
        
        {/* Plate label for selected */}
        {isSelected && (
          <View style={styles.plateContainer}>
            <View style={styles.plateBadge}>
              <Ionicons name="location" size={10} color={markerColor} />
              <View style={styles.plateLabelWrapper}>
                <Ionicons name="car-outline" size={8} color="#666" />
              </View>
            </View>
          </View>
        )}
      </View>
    </Marker>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerRotationWrapper: {
    position: 'absolute',
    top: -8,
    alignItems: 'center',
  },
  directionArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3B82F6', // Will be overridden
  },
  markerBody: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  markerSelected: {
    padding: 10,
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      ios: {
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  plateContainer: {
    position: 'absolute',
    bottom: -20,
    alignItems: 'center',
  },
  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  plateLabelWrapper: {
    marginLeft: 2,
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default VehicleMarker;

// Named export for testing
export { MARKER_COLORS, Z_INDEX };
