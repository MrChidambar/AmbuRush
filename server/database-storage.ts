import connectPg from "connect-pg-simple";
import { asc, desc, eq, and, or, like } from "drizzle-orm";
import session from "express-session";
import { db, pool } from "./db";
import {
  users, User, InsertUser,
  ambulanceTypes, AmbulanceType, InsertAmbulanceType,
  hospitals, Hospital, InsertHospital,
  ambulances, Ambulance, InsertAmbulance,
  bookings, Booking, InsertBooking,
  bookingStatusUpdates, BookingStatusUpdate, InsertBookingStatusUpdate
} from "@shared/schema";
import { IStorage } from "./storage";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: any; // Using any type for sessionStore

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users)
      .where(eq(users.role, role))
      .orderBy(asc(users.id));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      // Only include fields defined in the schema
      role: insertUser.role || 'patient',
      createdAt: new Date()
    }).returning();
    return user;
  }

  async getAmbulanceTypes(): Promise<AmbulanceType[]> {
    return await db.select().from(ambulanceTypes);
  }

  async getAmbulanceTypeById(id: number): Promise<AmbulanceType | undefined> {
    const [ambulanceType] = await db.select().from(ambulanceTypes).where(eq(ambulanceTypes.id, id));
    return ambulanceType;
  }

  async createAmbulanceType(insertType: InsertAmbulanceType): Promise<AmbulanceType> {
    const [ambulanceType] = await db.insert(ambulanceTypes).values(insertType).returning();
    return ambulanceType;
  }

  async getHospitals(): Promise<Hospital[]> {
    return await db.select().from(hospitals);
  }

  async getHospitalById(id: number): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return hospital;
  }

  async createHospital(insertHospital: InsertHospital): Promise<Hospital> {
    const [hospital] = await db.insert(hospitals).values(insertHospital).returning();
    return hospital;
  }

  async getAmbulances(): Promise<Ambulance[]> {
    return await db.select().from(ambulances);
  }

  async getAmbulanceById(id: number): Promise<Ambulance | undefined> {
    const [ambulance] = await db.select().from(ambulances).where(eq(ambulances.id, id));
    return ambulance;
  }

  async getAmbulanceByDriverId(driverId: number): Promise<Ambulance | undefined> {
    const [ambulance] = await db.select().from(ambulances).where(eq(ambulances.driverId, driverId));
    return ambulance;
  }

  async getNearbyAmbulances(latitude: number, longitude: number): Promise<any[]> {
    // Get all available ambulances
    const availableAmbulances = await db.select().from(ambulances)
      .where(eq(ambulances.status, 'available'));
    
    // Calculate distance for each ambulance from the pickup point
    return availableAmbulances.map(ambulance => {
      const distance = this.calculateDistance(
        latitude, 
        longitude, 
        ambulance.latitude!, 
        ambulance.longitude!
      );
      
      return {
        ...ambulance,
        distance: `${(distance).toFixed(1)} km`,
        distanceValue: distance,
        estimatedTimeMinutes: Math.round(distance / 0.5) // Assuming 0.5 km per minute
      };
    }).sort((a, b) => a.distanceValue - b.distanceValue);
  }

  async createAmbulance(insertAmbulance: InsertAmbulance): Promise<Ambulance> {
    const [ambulance] = await db.insert(ambulances).values({
      ...insertAmbulance,
      status: insertAmbulance.status || 'available',
      latitude: insertAmbulance.latitude || null,
      longitude: insertAmbulance.longitude || null,
      driverId: insertAmbulance.driverId || null
    }).returning();
    return ambulance;
  }

  async updateAmbulanceLocation(id: number, latitude: number, longitude: number): Promise<Ambulance> {
    const [updatedAmbulance] = await db.update(ambulances)
      .set({
        latitude,
        longitude
      })
      .where(eq(ambulances.id, id))
      .returning();
    
    if (!updatedAmbulance) {
      throw new Error(`Ambulance with ID ${id} not found`);
    }
    
    return updatedAmbulance;
  }

  async assignAmbulanceToDriver(id: number, driverId: number): Promise<Ambulance> {
    const [updatedAmbulance] = await db.update(ambulances)
      .set({ driverId })
      .where(eq(ambulances.id, id))
      .returning();
    
    if (!updatedAmbulance) {
      throw new Error(`Ambulance with ID ${id} not found`);
    }
    
    return updatedAmbulance;
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings)
      .orderBy(desc(bookings.createdAt));
  }
  
  async getBookingById(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getBookingsByUserId(userId: number): Promise<Booking[]> {
    return await db.select().from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async getActiveBookingByAmbulanceId(ambulanceId: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings)
      .where(
        and(
          eq(bookings.ambulanceId, ambulanceId),
          or(
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'in_progress')
          )
        )
      );
    return booking;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
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
        if (assignedAmbulanceId) {
          await db.update(ambulances)
            .set({ status: 'assigned' })
            .where(eq(ambulances.id, assignedAmbulanceId));
        }
      }
    }
    
    // Calculate estimated fare
    let estimatedFare = insertBooking.estimatedFare;
    
    if (!estimatedFare && insertBooking.ambulanceTypeId) {
      const [ambulanceType] = await db.select().from(ambulanceTypes)
        .where(eq(ambulanceTypes.id, insertBooking.ambulanceTypeId));
      
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
    
    const [booking] = await db.insert(bookings).values({
      userId: insertBooking.userId,
      ambulanceId: assignedAmbulanceId || null,
      ambulanceTypeId: insertBooking.ambulanceTypeId || null,
      bookingType: insertBooking.bookingType,
      status: insertBooking.status || (insertBooking.bookingType === 'emergency' ? 'confirmed' : 'pending'),
      pickupAddress: insertBooking.pickupAddress,
      pickupLatitude: insertBooking.pickupLatitude,
      pickupLongitude: insertBooking.pickupLongitude,
      destinationAddress: insertBooking.destinationAddress || null,
      destinationLatitude: insertBooking.destinationLatitude || null,
      destinationLongitude: insertBooking.destinationLongitude || null,
      patientDetails: insertBooking.patientDetails,
      emergencyContact: insertBooking.emergencyContact,
      estimatedFare: estimatedFare || null,
      scheduledTime: insertBooking.scheduledTime || null,
      notes: insertBooking.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Create initial status update for the booking
    await this.addBookingStatusUpdate({
      bookingId: booking.id,
      status: booking.status,
      message: booking.bookingType === 'emergency' 
        ? 'Emergency booking created. Ambulance dispatched.'
        : 'Booking created successfully.'
    });
    
    return booking;
  }

  async updateBookingStatus(id: number, status: string): Promise<Booking> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    
    if (!booking) {
      throw new Error(`Booking with ID ${id} not found`);
    }
    
    // Handle status-specific updates
    if ((status === 'completed' || status === 'cancelled') && booking.ambulanceId) {
      // Set ambulance back to available
      await db.update(ambulances)
        .set({ status: 'available' })
        .where(eq(ambulances.id, booking.ambulanceId));
    }
    
    const [updatedBooking] = await db.update(bookings)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, id))
      .returning();
    
    return updatedBooking;
  }

  async getBookingStatusUpdates(bookingId: number): Promise<BookingStatusUpdate[]> {
    return await db.select().from(bookingStatusUpdates)
      .where(eq(bookingStatusUpdates.bookingId, bookingId))
      .orderBy(asc(bookingStatusUpdates.createdAt));
  }

  async addBookingStatusUpdate(insertUpdate: InsertBookingStatusUpdate): Promise<BookingStatusUpdate> {
    const [update] = await db.insert(bookingStatusUpdates).values({
      bookingId: insertUpdate.bookingId,
      status: insertUpdate.status,
      message: insertUpdate.message || null,
      latitude: insertUpdate.latitude || null,
      longitude: insertUpdate.longitude || null,
      eta: insertUpdate.eta || null,
      createdAt: new Date()
    }).returning();
    return update;
  }

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