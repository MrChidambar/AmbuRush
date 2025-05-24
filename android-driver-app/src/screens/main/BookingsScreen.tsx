import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ApiService } from '../../services/ApiService';

interface Booking {
  id: number;
  bookingType: string;
  status: string;
  pickupAddress: string;
  destinationAddress?: string;
  patientDetails: any;
  emergencyContact?: any;
  scheduledTime?: string;
  createdAt: string;
}

export default function BookingsScreen({ route }: any) {
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActiveBookings();
    // If a booking was passed from dashboard, select it
    if (route?.params?.selectedBooking) {
      setSelectedBooking(route.params.selectedBooking);
    }
  }, []);

  const loadActiveBookings = async () => {
    try {
      const bookings = await ApiService.getActiveBookings();
      setActiveBookings(bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('Error', 'Failed to load bookings');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveBookings();
    setRefreshing(false);
  };

  const updateBookingStatus = async (bookingId: number, newStatus: string, message?: string) => {
    try {
      await ApiService.updateBookingStatus(bookingId, newStatus, message);
      await loadActiveBookings();
      
      Alert.alert('Success', `Booking status updated to ${newStatus.replace('_', ' ')}`);
      setStatusModalVisible(false);
      setStatusMessage('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update booking status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#f39c12';
      case 'en_route': return '#3498db';
      case 'arrived': return '#9b59b6';
      case 'picked_up': return '#e67e22';
      case 'in_transit': return '#2980b9';
      case 'completed': return '#27ae60';
      default: return '#95a5a6';
    }
  };

  const getNextStatusOptions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'confirmed':
        return [
          { status: 'en_route', label: 'En Route to Pickup', icon: 'directions-car' },
        ];
      case 'en_route':
        return [
          { status: 'arrived', label: 'Arrived at Pickup', icon: 'location-on' },
        ];
      case 'arrived':
        return [
          { status: 'picked_up', label: 'Patient Picked Up', icon: 'person' },
        ];
      case 'picked_up':
        return [
          { status: 'in_transit', label: 'In Transit to Hospital', icon: 'local-hospital' },
        ];
      case 'in_transit':
        return [
          { status: 'completed', label: 'Trip Completed', icon: 'check-circle' },
        ];
      default:
        return [];
    }
  };

  const showStatusUpdateModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setStatusModalVisible(true);
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (selectedBooking) {
      updateBookingStatus(selectedBooking.id, newStatus, statusMessage);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Icon name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeBookings.length > 0 ? (
          activeBookings.map((booking) => (
            <View key={booking.id} style={styles.bookingCard}>
              {/* Booking Header */}
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingId}>#{booking.id}</Text>
                  <Text style={styles.bookingTime}>
                    {formatDate(booking.createdAt)} • {formatTime(booking.createdAt)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusText}>{booking.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
              </View>

              {/* Booking Type */}
              <View style={styles.typeContainer}>
                <Icon 
                  name={booking.bookingType === 'emergency' ? 'warning' : 'schedule'} 
                  size={16} 
                  color={booking.bookingType === 'emergency' ? '#e74c3c' : '#3498db'} 
                />
                <Text style={[styles.bookingType, {
                  color: booking.bookingType === 'emergency' ? '#e74c3c' : '#3498db'
                }]}>
                  {booking.bookingType === 'emergency' ? 'Emergency' : 'Scheduled'}
                </Text>
              </View>

              {/* Patient Information */}
              <View style={styles.patientSection}>
                <Text style={styles.sectionTitle}>Patient Information</Text>
                <Text style={styles.patientName}>{booking.patientDetails?.name || 'N/A'}</Text>
                <Text style={styles.patientDetails}>
                  Age: {booking.patientDetails?.age || 'N/A'} • Gender: {booking.patientDetails?.gender || 'N/A'}
                </Text>
                <Text style={styles.condition}>Condition: {booking.patientDetails?.condition || 'N/A'}</Text>
              </View>

              {/* Location Information */}
              <View style={styles.locationSection}>
                <View style={styles.locationItem}>
                  <Icon name="my-location" size={16} color="#e74c3c" />
                  <Text style={styles.locationLabel}>Pickup:</Text>
                </View>
                <Text style={styles.locationAddress}>{booking.pickupAddress}</Text>
                
                {booking.destinationAddress && (
                  <>
                    <View style={[styles.locationItem, { marginTop: 8 }]}>
                      <Icon name="local-hospital" size={16} color="#27ae60" />
                      <Text style={styles.locationLabel}>Destination:</Text>
                    </View>
                    <Text style={styles.locationAddress}>{booking.destinationAddress}</Text>
                  </>
                )}
              </View>

              {/* Emergency Contact */}
              {booking.emergencyContact && (
                <View style={styles.contactSection}>
                  <Text style={styles.sectionTitle}>Emergency Contact</Text>
                  <View style={styles.contactRow}>
                    <Text style={styles.contactName}>{booking.emergencyContact.name}</Text>
                    <TouchableOpacity style={styles.callButton}>
                      <Icon name="phone" size={16} color="#27ae60" />
                      <Text style={styles.contactPhone}>{booking.emergencyContact.phone}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              {getNextStatusOptions(booking.status).length > 0 && (
                <View style={styles.actionSection}>
                  {getNextStatusOptions(booking.status).map((option) => (
                    <TouchableOpacity
                      key={option.status}
                      style={styles.actionButton}
                      onPress={() => showStatusUpdateModal(booking)}
                    >
                      <Icon name={option.icon} size={20} color="white" />
                      <Text style={styles.actionButtonText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="assignment" size={64} color="#bdc3c7" />
            <Text style={styles.emptyText}>No Active Bookings</Text>
            <Text style={styles.emptySubtext}>You currently have no assigned bookings</Text>
          </View>
        )}
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={statusModalVisible}
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Booking Status</Text>
            
            {selectedBooking && getNextStatusOptions(selectedBooking.status).map((option) => (
              <TouchableOpacity
                key={option.status}
                style={styles.statusOption}
                onPress={() => handleStatusUpdate(option.status)}
              >
                <Icon name={option.icon} size={24} color="#3498db" />
                <Text style={styles.statusOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.messageInput}
              placeholder="Add a message (optional)"
              value={statusMessage}
              onChangeText={setStatusMessage}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setStatusModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  bookingTime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bookingType: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  patientSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  condition: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '500',
  },
  locationSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 6,
  },
  locationAddress: {
    fontSize: 14,
    color: '#34495e',
    marginLeft: 22,
  },
  contactSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  contactPhone: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionSection: {
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    marginBottom: 12,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    fontWeight: '500',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});