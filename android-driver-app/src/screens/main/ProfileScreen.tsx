import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ApiService } from '../../services/ApiService';
import LocationService from '../../services/LocationService';

interface DriverProfile {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
}

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [stats, setStats] = useState({
    totalTrips: 156,
    totalEarnings: 45250,
    rating: 4.8,
    completionRate: 98.5,
    responseTime: '3.2 min'
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await AsyncStorage.getItem('driver_data');
      if (data) {
        setProfile(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Stop location tracking
              LocationService.stopTracking();
              
              // Clear stored data
              await AsyncStorage.removeItem('driver_token');
              await AsyncStorage.removeItem('driver_data');
              
              // Navigate to login
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const menuItems = [
    {
      icon: 'edit',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => Alert.alert('Coming Soon', 'Profile editing will be available soon'),
    },
    {
      icon: 'description',
      title: 'Documents',
      subtitle: 'Manage your driving license and certificates',
      onPress: () => Alert.alert('Coming Soon', 'Document management will be available soon'),
    },
    {
      icon: 'history',
      title: 'Trip History',
      subtitle: 'View your completed trips',
      onPress: () => Alert.alert('Coming Soon', 'Trip history will be available soon'),
    },
    {
      icon: 'assessment',
      title: 'Earnings Report',
      subtitle: 'Track your income and performance',
      onPress: () => Alert.alert('Coming Soon', 'Earnings report will be available soon'),
    },
    {
      icon: 'settings',
      title: 'Settings',
      subtitle: 'App preferences and notifications',
      onPress: () => Alert.alert('Coming Soon', 'Settings will be available soon'),
    },
    {
      icon: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => Alert.alert('Help', 'For support, please contact: support@medirush.com'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Icon name="logout" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Icon name="person" size={48} color="#e74c3c" />
          </View>
          <View style={styles.onlineIndicator} />
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.driverName}>
            {profile ? `${profile.firstName} ${profile.lastName}` : 'Driver Name'}
          </Text>
          <Text style={styles.driverUsername}>@{profile?.username || 'username'}</Text>
          <Text style={styles.driverContact}>{profile?.email || 'email@example.com'}</Text>
          <Text style={styles.driverContact}>{profile?.phoneNumber || '+91XXXXXXXXXX'}</Text>
        </View>
      </View>

      {/* Performance Stats */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Performance Overview</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Icon name="local-taxi" size={24} color="#3498db" />
            <Text style={styles.statNumber}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="star" size={24} color="#f39c12" />
            <Text style={styles.statNumber}>{stats.rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="check-circle" size={24} color="#27ae60" />
            <Text style={styles.statNumber}>{stats.completionRate}%</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
          
          <View style={styles.statItem}>
            <Icon name="access-time" size={24} color="#9b59b6" />
            <Text style={styles.statNumber}>{stats.responseTime}</Text>
            <Text style={styles.statLabel}>Avg Response</Text>
          </View>
        </View>

        <View style={styles.earningsCard}>
          <Icon name="account-balance-wallet" size={32} color="#27ae60" />
          <View style={styles.earningsInfo}>
            <Text style={styles.earningsAmount}>₹{stats.totalEarnings.toLocaleString()}</Text>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
          </View>
          <Icon name="trending-up" size={24} color="#27ae60" />
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>Account & Settings</Text>
        
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={styles.menuIconContainer}>
              <Icon name={item.icon} size={24} color="#3498db" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={24} color="#bdc3c7" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Emergency Contacts */}
      <View style={styles.emergencySection}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        
        <View style={styles.emergencyCard}>
          <Icon name="local-hospital" size={24} color="#e74c3c" />
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyTitle}>Medical Emergency</Text>
            <Text style={styles.emergencyNumber}>108</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Icon name="phone" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.emergencyCard}>
          <Icon name="security" size={24} color="#3498db" />
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyTitle}>Police Emergency</Text>
            <Text style={styles.emergencyNumber}>100</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Icon name="phone" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.emergencyCard}>
          <Icon name="support" size={24} color="#27ae60" />
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyTitle}>MediRush Support</Text>
            <Text style={styles.emergencyNumber}>+91-8080-123-456</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Icon name="phone" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appVersion}>MediRush Driver v1.0.0</Text>
        <Text style={styles.appCopyright}>© 2024 MediRush. All rights reserved.</Text>
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
  logoutButton: {
    padding: 8,
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#27ae60',
    borderWidth: 2,
    borderColor: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  driverUsername: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  driverContact: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 2,
  },
  statsSection: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  earningsCard: {
    backgroundColor: '#27ae60',
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  earningsInfo: {
    flex: 1,
    marginLeft: 16,
  },
  earningsAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  earningsLabel: {
    fontSize: 14,
    color: '#ffffff90',
    marginTop: 2,
  },
  menuSection: {
    margin: 16,
  },
  menuItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  emergencySection: {
    margin: 16,
  },
  emergencyCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  emergencyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#27ae60',
    padding: 12,
    borderRadius: 25,
  },
  appInfo: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  appVersion: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 10,
    color: '#95a5a6',
  },
});