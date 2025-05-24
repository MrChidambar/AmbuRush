import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ApiService } from '../../services/ApiService';

interface DriverData {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
}

interface ActiveBooking {
  id: number;
  bookingType: string;
  status: string;
  pickupAddress: string;
  destinationAddress?: string;
  patientDetails: any;
}

export default function DashboardScreen({ navigation }: any) {
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [activeBookings, setActiveBookings] = useState<ActiveBooking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 12,
    todayTrips: 3,
    earnings: 2450,
    rating: 4.8
  });

  useEffect(() => {
    loadDriverData();
    loadActiveBookings();
  }, []);

  const loadDriverData = async () => {
    try {
      const data = await AsyncStorage.getItem('driver_data');
      if (data) {
        setDriverData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    }
  };

  const loadActiveBookings = async () => {
    try {
      const bookings = await ApiService.getActiveBookings();
      setActiveBookings(bookings);
    } catch (error) {
      console.error('Error loading active bookings:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveBookings();
    setRefreshing(false);
  };

  const toggleAvailability = async (value: boolean) => {
    try {
      await ApiService.updateAvailability(value);
      setIsAvailable(value);
      Alert.alert(
        'Status Updated',
        `You are now ${value ? 'available' : 'unavailable'} for new bookings`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to update availability status');
    }
  };

  const handleBookingPress = (booking: ActiveBooking) => {
    navigation.navigate('Bookings', { selectedBooking: booking });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#f39c12';
      case 'in_progress': return '#3498db';
      case 'completed': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Hello, {driverData?.firstName || 'Driver'}!
        </Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>

      {/* Availability Toggle */}
      <View style={styles.availabilityCard}>
        <View style={styles.availabilityHeader}>
          <Icon 
            name={isAvailable ? 'radio-button-checked' : 'radio-button-unchecked'} 
            size={24} 
            color={isAvailable ? '#27ae60' : '#e74c3c'} 
          />
          <Text style={styles.availabilityTitle}>
            {isAvailable ? 'Available for Bookings' : 'Unavailable'}
          </Text>
        </View>
        <Switch
          value={isAvailable}
          onValueChange={toggleAvailability}
          trackColor={{ false: '#e74c3c', true: '#27ae60' }}
          thumbColor={isAvailable ? '#ffffff' : '#ffffff'}
        />
      </View>

      {/* Active Bookings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Bookings</Text>
        {activeBookings.length > 0 ? (
          activeBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => handleBookingPress(booking)}
            >
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingId}>#{booking.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusText}>{booking.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.bookingType}>
                {booking.bookingType === 'emergency' ? '🚨 Emergency' : '📅 Scheduled'}
              </Text>
              <Text style={styles.patientName}>
                Patient: {booking.patientDetails?.name || 'N/A'}
              </Text>
              <Text style={styles.address}>
                📍 {booking.pickupAddress}
              </Text>
              {booking.destinationAddress && (
                <Text style={styles.destination}>
                  🏥 {booking.destinationAddress}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="assignment" size={48} color="#bdc3c7" />
            <Text style={styles.emptyText}>No active bookings</Text>
            <Text style={styles.emptySubtext}>
              {isAvailable ? 'You\'re available for new assignments' : 'Set yourself as available to receive bookings'}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="local-taxi" size={24} color="#3498db" />
            <Text style={styles.statNumber}>{stats.todayTrips}</Text>
            <Text style={styles.statLabel}>Trips Today</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="attach-money" size={24} color="#27ae60" />
            <Text style={styles.statNumber}>₹{stats.earnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="star" size={24} color="#f39c12" />
            <Text style={styles.statNumber}>{stats.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="timeline" size={24} color="#9b59b6" />
            <Text style={styles.statNumber}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Map')}
          >
            <Icon name="map" size={32} color="#3498db" />
            <Text style={styles.actionText}>View Map</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Bookings')}
          >
            <Icon name="assignment" size={32} color="#e74c3c" />
            <Text style={styles.actionText}>All Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Icon name="person" size={32} color="#27ae60" />
            <Text style={styles.actionText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#e74c3c',
    padding: 20,
    paddingTop: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#ffffff90',
  },
  availabilityCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  availabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  bookingCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookingId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  destination: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#2c3e50',
    marginTop: 8,
    fontWeight: '600',
  },
});