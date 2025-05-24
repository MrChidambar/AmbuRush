import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform } from 'react-native';
import { ApiService } from './ApiService';

class LocationService {
  private watchId: number | null = null;
  private isTracking = false;
  private lastUpdate = 0;
  private readonly UPDATE_INTERVAL = 10000; // 10 seconds

  async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Driver app needs access to your location to track ambulance position',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  }

  async startTracking(): Promise<void> {
    if (this.isTracking) return;

    const hasPermission = await this.requestLocationPermission();
    if (!hasPermission) {
      console.error('Location permission denied');
      return;
    }

    this.isTracking = true;

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        this.updateLocationOnServer(latitude, longitude);
      },
      (error) => {
        console.error('Location error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: this.UPDATE_INTERVAL,
        fastestInterval: 5000,
      }
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  private async updateLocationOnServer(latitude: number, longitude: number): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdate < this.UPDATE_INTERVAL) {
      return; // Throttle updates
    }

    try {
      await ApiService.updateLocation(latitude, longitude);
      this.lastUpdate = now;
    } catch (error) {
      console.error('Failed to update location on server:', error);
    }
  }

  async getCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Get current position error:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }
}

export default new LocationService();