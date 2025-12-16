/**
 * TulipFleet - Vehicle Info Sheet Component
 * Paket A: Pro Marker System
 * 
 * Özellikler:
 * - Araç bilgilerini gösterir
 * - Follow mode toggle butonu (A.3)
 * - Smooth animations
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/config';
import { clampHeading } from '../../utils/mapMath';

// ============================================================================
// CONSTANTS
// ============================================================================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 200;

const STATUS_CONFIG = {
  in_use: { label: 'Aktif', color: '#10B981', icon: 'car' },
  available: { label: 'Müsait', color: '#3B82F6', icon: 'car-outline' },
  maintenance: { label: 'Bakımda', color: '#F59E0B', icon: 'construct' },
  offline: { label: 'Çevrimdışı', color: '#6B7280', icon: 'cloud-offline' },
};

// ============================================================================
// VEHICLE INFO SHEET COMPONENT
// ============================================================================

const VehicleInfoSheet = ({
  vehicle,
  onClose,
  isFollowing = false,
  onToggleFollow,
  isTablet = false,
}) => {
  // Animation
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    // Slide in animation
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, []);

  const handleClose = () => {
    // Slide out animation
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose && onClose();
    });
  };

  if (!vehicle) return null;

  // Status config
  const status = STATUS_CONFIG[vehicle.status] || STATUS_CONFIG.offline;
  
  // Heading display
  const headingDisplay = vehicle.heading !== null && vehicle.heading !== undefined
    ? `${Math.round(clampHeading(vehicle.heading))}°`
    : '-';
  
  // Speed display
  const speedDisplay = vehicle.speed !== null && vehicle.speed !== undefined
    ? `${Math.round(vehicle.speed)} km/s`
    : '-';

  // Last update
  const lastUpdateDisplay = vehicle.lastLocationTime
    ? new Date(vehicle.lastLocationTime).toLocaleTimeString('tr-TR')
    : vehicle.last_location_time
      ? new Date(vehicle.last_location_time).toLocaleTimeString('tr-TR')
      : '-';

  return (
    <Animated.View
      style={[
        styles.container,
        isTablet && styles.containerTablet,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon} size={16} color="#fff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.plateText}>{vehicle.plate_no || 'Plaka Yok'}</Text>
            <Text style={styles.vehicleModel}>
              {vehicle.brand} {vehicle.model}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {/* Follow Mode Toggle */}
          {onToggleFollow && (
            <TouchableOpacity
              style={[
                styles.followToggle,
                isFollowing && styles.followToggleActive,
              ]}
              onPress={onToggleFollow}
            >
              <Ionicons
                name={isFollowing ? 'locate' : 'locate-outline'}
                size={18}
                color={isFollowing ? '#fff' : COLORS.primary}
              />
              <Text style={[
                styles.followText,
                isFollowing && styles.followTextActive,
              ]}>
                {isFollowing ? 'Takip' : 'Takip Et'}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={22} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Grid */}
      <View style={styles.infoGrid}>
        <InfoItem
          icon="speedometer-outline"
          label="Hız"
          value={speedDisplay}
        />
        <InfoItem
          icon="compass-outline"
          label="Yön"
          value={headingDisplay}
        />
        <InfoItem
          icon="time-outline"
          label="Son Güncelleme"
          value={lastUpdateDisplay}
        />
        <InfoItem
          icon="radio-button-on"
          label="Durum"
          value={status.label}
          valueColor={status.color}
        />
      </View>

      {/* Coordinates (Debug - can be hidden in production) */}
      <View style={styles.coordsRow}>
        <Text style={styles.coordsText}>
          📍 {vehicle.latitude?.toFixed(6)}, {vehicle.longitude?.toFixed(6)}
        </Text>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// INFO ITEM COMPONENT
// ============================================================================

const InfoItem = ({ icon, label, value, valueColor }) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon} size={18} color={COLORS.gray} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
      {value}
    </Text>
  </View>
);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  containerTablet: {
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  plateText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  vehicleModel: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  followToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  followToggleActive: {
    backgroundColor: COLORS.primary,
  },
  followText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  followTextActive: {
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  infoItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  coordsRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
  },
  coordsText: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

export default VehicleInfoSheet;
