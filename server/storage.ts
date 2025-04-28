import { users, type User, type InsertUser, ambulanceTypes, type AmbulanceType, type InsertAmbulanceType, hospitals, type Hospital, type InsertHospital, ambulances, type Ambulance, type InsertAmbulance, bookings, type Booking, type InsertBooking, bookingStatusUpdates, type BookingStatusUpdate, type InsertBookingStatusUpdate } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // User related
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>; // For admin to get drivers/patients
  createUser(user: InsertUser): Promise<User>;
  
  // Ambulance type related
  getAmbulanceTypes(): Promise<AmbulanceType[]>;
  getAmbulanceTypeById(id: number): Promise<AmbulanceType | undefined>;
  createAmbulanceType(type: InsertAmbulanceType): Promise<AmbulanceType>;
  
  // Hospital related
  getHospitals(): Promise<Hospital[]>;
  getHospitalById(id: number): Promise<Hospital | undefined>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  
  // Ambulance related
  getAmbulances(): Promise<Ambulance[]>;
  getAmbulanceById(id: number): Promise<Ambulance | undefined>;
  getAmbulanceByDriverId(driverId: number): Promise<Ambulance | undefined>;
  getNearbyAmbulances(latitude: number, longitude: number): Promise<any[]>;
  createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance>;
  updateAmbulanceLocation(id: number, latitude: number, longitude: number): Promise<Ambulance>;
  assignAmbulanceToDriver(id: number, driverId: number): Promise<Ambulance>;
  
  // Booking related
  getAllBookings(): Promise<Booking[]>; // For admin to view all bookings
  getBookingById(id: number): Promise<Booking | undefined>;
  getBookingsByUserId(userId: number): Promise<Booking[]>;
  getActiveBookingByAmbulanceId(ambulanceId: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: number, status: string): Promise<Booking>;
  
  // Booking status updates
  getBookingStatusUpdates(bookingId: number): Promise<BookingStatusUpdate[]>;
  addBookingStatusUpdate(update: InsertBookingStatusUpdate): Promise<BookingStatusUpdate>;
  
  // Session store
  sessionStore: any;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private ambulanceTypes: Map<number, AmbulanceType>;
  private hospitals: Map<number, Hospital>;
  private ambulances: Map<number, Ambulance>;
  private bookings: Map<number, Booking>;
  private bookingStatusUpdates: Map<number, BookingStatusUpdate>;
  private userIdCounter: number;
  private ambulanceTypeIdCounter: number;
  private hospitalIdCounter: number;
  private ambulanceIdCounter: number;
  private bookingIdCounter: number;
  private bookingStatusUpdateIdCounter: number;
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.ambulanceTypes = new Map();
    this.hospitals = new Map();
    this.ambulances = new Map();
    this.bookings = new Map();
    this.bookingStatusUpdates = new Map();
    this.userIdCounter = 1;
    this.ambulanceTypeIdCounter = 1;
    this.hospitalIdCounter = 1;
    this.ambulanceIdCounter = 1;
    this.bookingIdCounter = 1;
    this.bookingStatusUpdateIdCounter = 1;
    
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.role === role)
      .sort((a, b) => a.id - b.id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      firstName: insertUser.firstName,
      lastName: insertUser.lastName,
      phoneNumber: insertUser.phoneNumber,
      role: insertUser.role || 'patient',
      createdAt: now
    };
    this.users.set(id, user);
    return user;
  }

  // Ambulance type related methods
  async getAmbulanceTypes(): Promise<AmbulanceType[]> {
    return Array.from(this.ambulanceTypes.values());
  }

  async getAmbulanceTypeById(id: number): Promise<AmbulanceType | undefined> {
    return this.ambulanceTypes.get(id);
  }

  async createAmbulanceType(insertType: InsertAmbulanceType): Promise<AmbulanceType> {
    const id = this.ambulanceTypeIdCounter++;
    const type: AmbulanceType = { ...insertType, id };
    this.ambulanceTypes.set(id, type);
    return type;
  }

  // Hospital related methods
  async getHospitals(): Promise<Hospital[]> {
    return Array.from(this.hospitals.values());
  }

  async getHospitalById(id: number): Promise<Hospital | undefined> {
    return this.hospitals.get(id);
  }

  async createHospital(insertHospital: InsertHospital): Promise<Hospital> {
    const id = this.hospitalIdCounter++;
    const hospital: Hospital = { ...insertHospital, id };
    this.hospitals.set(id, hospital);
    return hospital;
  }

  // Ambulance related methods
  async getAmbulances(): Promise<Ambulance[]> {
    return Array.from(this.ambulances.values());
  }

  async getAmbulanceById(id: number): Promise<Ambulance | undefined> {
    return this.ambulances.get(id);
  }

  async getAmbulanceByDriverId(driverId: number): Promise<Ambulance | undefined> {
    return Array.from(this.ambulances.values()).find(
      (ambulance) => ambulance.driverId === driverId,
    );
  }

  async getNearbyAmbulances(latitude: number, longitude: number): Promise<any[]> {
    // In a real app, this would use geospatial queries
    // Here, we'll just return all available ambulances with some mock distance/ETA data
    const availableAmbulances = Array.from(this.ambulances.values())
      .filter(ambulance => ambulance.status === 'available' && ambulance.latitude && ambulance.longitude)
      .map(ambulance => {
        const distance = this.calculateDistance(
          latitude, 
          longitude, 
          ambulance.latitude!, 
          ambulance.longitude!
        );
        
        // Find the ambulance type
        const ambulanceType = this.ambulanceTypes.get(ambulance.typeId);
        
        // Find the driver if assigned
        let driver = null;
        if (ambulance.driverId) {
          const driverUser = this.users.get(ambulance.driverId);
          if (driverUser) {
            driver = {
              id: driverUser.id,
              name: `${driverUser.firstName} ${driverUser.lastName}`,
              rating: 4.8 // Mock rating
            };
          }
        }
        
        // Calculate ETA (simple calculation, 30 km/h average speed)
        const etaMinutes = Math.round(distance * 2); // 2 minutes per km as a rough estimate
        
        return {
          id: ambulance.id,
          type: ambulanceType?.name || 'Unknown',
          typeId: ambulance.typeId,
          registrationNumber: ambulance.registrationNumber,
          distance: `${(distance).toFixed(1)} km`,
          distanceValue: distance,
          eta: `${etaMinutes} min`,
          etaMinutes: etaMinutes,
          driver: driver || { name: 'Unassigned', rating: 0 },
        };
      })
      .sort((a, b) => a.distanceValue - b.distanceValue) // Sort by distance
      .slice(0, 5); // Limit to 5 ambulances
    
    return availableAmbulances;
  }

  async createAmbulance(insertAmbulance: InsertAmbulance): Promise<Ambulance> {
    const id = this.ambulanceIdCounter++;
    const ambulance: Ambulance = { 
      id,
      registrationNumber: insertAmbulance.registrationNumber,
      typeId: insertAmbulance.typeId,
      status: insertAmbulance.status || 'available',
      latitude: insertAmbulance.latitude || null,
      longitude: insertAmbulance.longitude || null,
      driverId: insertAmbulance.driverId || null
    };
    this.ambulances.set(id, ambulance);
    return ambulance;
  }

  async updateAmbulanceLocation(id: number, latitude: number, longitude: number): Promise<Ambulance> {
    const ambulance = this.ambulances.get(id);
    
    if (!ambulance) {
      throw new Error(`Ambulance with ID ${id} not found`);
    }
    
    const updatedAmbulance: Ambulance = {
      ...ambulance,
      latitude,
      longitude
    };
    
    this.ambulances.set(id, updatedAmbulance);
    return updatedAmbulance;
  }

  async assignAmbulanceToDriver(id: number, driverId: number): Promise<Ambulance> {
    const ambulance = this.ambulances.get(id);
    
    if (!ambulance) {
      throw new Error(`Ambulance with ID ${id} not found`);
    }
    
    const updatedAmbulance: Ambulance = {
      ...ambulance,
      driverId
    };
    
    this.ambulances.set(id, updatedAmbulance);
    return updatedAmbulance;
  }

  // Booking related methods
  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .sort((a, b) => {
        // Sort by created date, newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }
  
  async getBookingById(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter(booking => booking.userId === userId)
      .sort((a, b) => {
        // Sort by created date, newest first
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  async getActiveBookingByAmbulanceId(ambulanceId: number): Promise<Booking | undefined> {
    return Array.from(this.bookings.values()).find(
      (booking) => 
        booking.ambulanceId === ambulanceId && 
        ['pending', 'confirmed', 'in_progress'].includes(booking.status)
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.bookingIdCounter++;
    const now = new Date();
    
    // For emergency bookings, auto-assign the nearest ambulance
    let assignedAmbulanceId = insertBooking.ambulanceId;
    
    if (insertBooking.bookingType === 'emergency' && !assignedAmbulanceId) {
      const nearbyAmbulances = await this.getNearbyAmbulances(
        insertBooking.pickupLatitude, 
        insertBooking.pickupLongitude
      );
      
      if (nearbyAmbulances.length > 0) {
        const closestAmbulance = nearbyAmbulances[0];
        assignedAmbulanceId = closestAmbulance.id;
        
        // Update ambulance status to assigned
        const ambulance = this.ambulances.get(assignedAmbulanceId);
        if (ambulance) {
          this.ambulances.set(assignedAmbulanceId, {
            ...ambulance,
            status: 'assigned'
          });
        }
      }
    }
    
    // Calculate estimated fare
    let estimatedFare = insertBooking.estimatedFare;
    
    if (!estimatedFare && insertBooking.ambulanceTypeId) {
      const ambulanceType = this.ambulanceTypes.get(insertBooking.ambulanceTypeId);
      
      if (ambulanceType) {
        const pickupLat = insertBooking.pickupLatitude;
        const pickupLng = insertBooking.pickupLongitude;
        const destLat = insertBooking.destinationLatitude || 0;
        const destLng = insertBooking.destinationLongitude || 0;
        
        if (destLat && destLng) {
          const distance = this.calculateDistance(pickupLat, pickupLng, destLat, destLng);
          estimatedFare = ambulanceType.basePrice + (distance * ambulanceType.pricePerKm);
        } else {
          // If no destination, use a minimum fare
          estimatedFare = ambulanceType.basePrice;
        }
      }
    }
    
    const booking: Booking = {
      ...insertBooking,
      id,
      ambulanceId: assignedAmbulanceId,
      estimatedFare,
      status: insertBooking.status || (insertBooking.bookingType === 'emergency' ? 'confirmed' : 'pending'),
      createdAt: now,
      updatedAt: now
    };
    
    this.bookings.set(id, booking);
    
    // Create initial status update for the booking
    await this.addBookingStatusUpdate({
      bookingId: id,
      status: booking.status,
      message: booking.bookingType === 'emergency' 
        ? 'Emergency booking created. Ambulance dispatched.'
        : 'Booking created successfully.'
    });
    
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const booking = this.bookings.get(id);
    
    if (!booking) {
      throw new Error(`Booking with ID ${id} not found`);
    }
    
    const now = new Date();
    const updatedBooking: Booking = {
      ...booking,
      status,
      updatedAt: now
    };
    
    // Handle status-specific updates
    if (status === 'completed' && booking.ambulanceId) {
      // Set ambulance back to available
      const ambulance = this.ambulances.get(booking.ambulanceId);
      if (ambulance) {
        this.ambulances.set(booking.ambulanceId, {
          ...ambulance,
          status: 'available'
        });
      }
    } else if (status === 'cancelled' && booking.ambulanceId) {
      // Set ambulance back to available
      const ambulance = this.ambulances.get(booking.ambulanceId);
      if (ambulance) {
        this.ambulances.set(booking.ambulanceId, {
          ...ambulance,
          status: 'available'
        });
      }
    }
    
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  // Booking status updates related methods
  async getBookingStatusUpdates(bookingId: number): Promise<BookingStatusUpdate[]> {
    return Array.from(this.bookingStatusUpdates.values())
      .filter(update => update.bookingId === bookingId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async addBookingStatusUpdate(insertUpdate: InsertBookingStatusUpdate): Promise<BookingStatusUpdate> {
    const id = this.bookingStatusUpdateIdCounter++;
    const now = new Date();
    
    const update: BookingStatusUpdate = {
      id,
      bookingId: insertUpdate.bookingId,
      status: insertUpdate.status,
      message: insertUpdate.message || null,
      latitude: insertUpdate.latitude || null,
      longitude: insertUpdate.longitude || null,
      eta: insertUpdate.eta || null,
      createdAt: now
    };
    
    this.bookingStatusUpdates.set(id, update);
    return update;
  }

  // Helper method to calculate distance between two points
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1); 
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  }
  
  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}

import { DatabaseStorage } from "./database-storage";

// Use DatabaseStorage for persistent database storage
export const storage = new DatabaseStorage();
