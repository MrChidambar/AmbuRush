import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LocationService from '../../services/LocationService';
import { ApiService } from '../../services/ApiService';

interface Location {
  latitude: number;
  longitude: number;
}

interface ActiveBooking {
  id: number;
  pickupLatitude: number;
  pickupLongitude: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
  pickupAddress: string;
  destinationAddress?: string;
  status: string;
}

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    loadActiveBooking();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentPosition();
      if (location) {
        setCurrentLocation(location);
        setMapRegion({
          ...mapRegion,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to get current location');
    }
  };

  const loadActiveBooking = async () => {
    try {
      const bookings = await ApiService.getActiveBookings();
      if (bookings.length > 0) {
        setActiveBooking(bookings[0]);
      }
    } catch (error) {
      console.error('Error loading active booking:', error);
    }
  };

  const toggleTracking = () => {
    if (isTracking) {
      LocationService.stopTracking();
      setIsTracking(false);
      Alert.alert('Tracking Stopped', 'Location tracking has been disabled');
    } else {
      LocationService.startTracking();
      setIsTracking(true);
      Alert.alert('Tracking Started', 'Your location is now being shared');
    }
  };

  const navigateToPickup = () => {
    if (activeBooking) {
      // Open Google Maps for navigation
      const url = `google.navigation:q=${activeBooking.pickupLatitude},${activeBooking.pickupLongitude}`;
      Alert.alert(
        'Navigate',
        'Open Google Maps for navigation to pickup location?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Navigate', onPress: () => console.log('Open navigation:', url) },
        ]
      );
    }
  };

  const navigateToDestination = () => {
    if (activeBooking?.destinationLatitude && activeBooking?.destinationLongitude) {
      const url = `google.navigation:q=${activeBooking.destinationLatitude},${activeBooking.destinationLongitude}`;
      Alert.alert(
        'Navigate',
        'Open Google Maps for navigation to destination?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Navigate', onPress: () => console.log('Open navigation:', url) },
        ]
      );
    }
  };

  const centerOnCurrentLocation = () => {
    if (currentLocation) {
      setMapRegion({
        ...mapRegion,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Map</Text>
        <TouchableOpacity 
          style={[styles.trackingButton, { backgroundColor: isTracking ? '#27ae60' : '#e74c3c' }]}
          onPress={toggleTracking}
        >
          <Icon name={isTracking ? 'gps-fixed' : 'gps-off'} size={20} color="white" />
          <Text style={styles.trackingText}>
            {isTracking ? 'Tracking On' : 'Tracking Off'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsTraffic={true}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Ambulance current position"
          >
            <View style={styles.ambulanceMarker}>
              <Icon name="local-taxi" size={24} color="#e74c3c" />
            </View>
          </Marker>
        )}

        {/* Active Booking Markers */}
        {activeBooking && (
          <>
            {/* Pickup Location */}
            <Marker
              coordinate={{
                latitude: activeBooking.pickupLatitude,
                longitude: activeBooking.pickupLongitude,
              }}
              title="Pickup Location"
              description={activeBooking.pickupAddress}
              pinColor="#f39c12"
            />

            {/* Destination Location */}
            {activeBooking.destinationLatitude && activeBooking.destinationLongitude && (
              <Marker
                coordinate={{
                  latitude: activeBooking.destinationLatitude,
                  longitude: activeBooking.destinationLongitude,
                }}
                title="Destination"
                description={activeBooking.destinationAddress}
                pinColor="#27ae60"
              />
            )}

            {/* Route Line */}
            {currentLocation && (
              <Polyline
                coordinates={[
                  currentLocation,
                  {
                    latitude: activeBooking.pickupLatitude,
                    longitude: activeBooking.pickupLongitude,
                  },
                  ...(activeBooking.destinationLatitude && activeBooking.destinationLongitude
                    ? [{
                        latitude: activeBooking.destinationLatitude,
                        longitude: activeBooking.destinationLongitude,
                      }]
                    : []),
                ]}
                strokeColor="#3498db"
                strokeWidth={3}
                lineDashPattern={[5, 5]}
              />
            )}
          </>
        )}
      </MapView>

      {/* Active Booking Info */}
      {activeBooking && (
        <View style={styles.bookingInfo}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingTitle}>Active Booking #{activeBooking.id}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{activeBooking.status.toUpperCase()}</Text>
            </View>
          </View>
          
          <Text style={styles.addressText}>📍 {activeBooking.pickupAddress}</Text>
          {activeBooking.destinationAddress && (
            <Text style={styles.addressText}>🏥 {activeBooking.destinationAddress}</Text>
          )}

          <View style={styles.navigationButtons}>
            <TouchableOpacity 
              style={styles.navButton}
              onPress={navigateToPickup}
            >
              <Icon name="navigation" size={16} color="white" />
              <Text style={styles.navButtonText}>To Pickup</Text>
            </TouchableOpacity>
            
            {activeBooking.destinationLatitude && (
              <TouchableOpacity 
                style={[styles.navButton, styles.destinationButton]}
                onPress={navigateToDestination}
              >
                <Icon name="local-hospital" size={16} color="white" />
                <Text style={styles.navButtonText}>To Hospital</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={centerOnCurrentLocation}
        >
          <Icon name="my-location" size={24} color="#3498db" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={loadActiveBooking}
        >
          <Icon name="refresh" size={24} color="#3498db" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#e74c3c',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  trackingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  map: {
    flex: 1,
  },
  ambulanceMarker: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e74c3c',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bookingInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  navButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  destinationButton: {
    backgroundColor: '#27ae60',
  },
  navButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  mapControls: {
    position: 'absolute',
    right: 20,
    top: 120,
    flexDirection: 'column',
    gap: 12,
  },
  controlButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});