import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Update this URL to your backend server
const BASE_URL = 'http://localhost:5000/api';

class ApiService {
  private baseURL = BASE_URL;
  
  constructor() {
    // Setup axios interceptors for authentication
    axios.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('driver_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, logout user
          await AsyncStorage.removeItem('driver_token');
          await AsyncStorage.removeItem('driver_data');
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(credentials: { username: string; password: string }) {
    const response = await axios.post(`${this.baseURL}/driver/login`, credentials);
    return response.data;
  }

  async register(data: any) {
    const response = await axios.post(`${this.baseURL}/driver/register`, data);
    return response.data;
  }

  // Driver profile
  async getProfile() {
    const response = await axios.get(`${this.baseURL}/driver/profile`);
    return response.data;
  }

  async updateProfile(data: any) {
    const response = await axios.put(`${this.baseURL}/driver/profile`, data);
    return response.data;
  }

  // Location updates
  async updateLocation(latitude: number, longitude: number) {
    const response = await axios.put(`${this.baseURL}/driver/location`, {
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    });
    return response.data;
  }

  // Bookings
  async getActiveBookings() {
    const response = await axios.get(`${this.baseURL}/driver/bookings/active`);
    return response.data;
  }

  async getBookingHistory() {
    const response = await axios.get(`${this.baseURL}/driver/bookings/history`);
    return response.data;
  }

  async acceptBooking(bookingId: number) {
    const response = await axios.post(`${this.baseURL}/driver/bookings/${bookingId}/accept`);
    return response.data;
  }

  async updateBookingStatus(bookingId: number, status: string, message?: string) {
    const response = await axios.put(`${this.baseURL}/driver/bookings/${bookingId}/status`, {
      status,
      message
    });
    return response.data;
  }

  // Availability
  async updateAvailability(available: boolean) {
    const response = await axios.put(`${this.baseURL}/driver/availability`, {
      available
    });
    return response.data;
  }

  // Upload documents
  async uploadDocument(formData: FormData) {
    const response = await axios.post(`${this.baseURL}/driver/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export const ApiService = new ApiService();