import { pgTable, text, serial, integer, boolean, timestamp, json, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User related schemas
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  role: text("role").notNull().default("patient"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  role: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Ambulance types schema
export const ambulanceTypes = pgTable("ambulance_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  basePrice: real("base_price").notNull(),
  pricePerKm: real("price_per_km").notNull(),
  icon: text("icon").notNull(),
});

export const insertAmbulanceTypeSchema = createInsertSchema(ambulanceTypes).pick({
  name: true,
  description: true,
  basePrice: true,
  pricePerKm: true,
  icon: true,
});

export type InsertAmbulanceType = z.infer<typeof insertAmbulanceTypeSchema>;
export type AmbulanceType = typeof ambulanceTypes.$inferSelect;

// Ambulances schema
export const ambulances = pgTable("ambulances", {
  id: serial("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(),
  typeId: integer("type_id").notNull(),
  status: text("status").notNull().default("available"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  driverId: integer("driver_id"),
});

export const insertAmbulanceSchema = createInsertSchema(ambulances).pick({
  registrationNumber: true,
  typeId: true,
  status: true,
  latitude: true,
  longitude: true,
  driverId: true,
});

export type InsertAmbulance = z.infer<typeof insertAmbulanceSchema>;
export type Ambulance = typeof ambulances.$inferSelect;

// Hospitals schema
export const hospitals = pgTable("hospitals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  specialties: text("specialties").array().notNull(),
});

export const insertHospitalSchema = createInsertSchema(hospitals).pick({
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  specialties: true,
});

export type InsertHospital = z.infer<typeof insertHospitalSchema>;
export type Hospital = typeof hospitals.$inferSelect;

// Bookings schema
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ambulanceId: integer("ambulance_id"),
  ambulanceTypeId: integer("ambulance_type_id").notNull(),
  bookingType: text("booking_type").notNull(), // emergency, scheduled
  status: text("status").notNull().default("pending"), // pending, confirmed, in_progress, completed, cancelled
  pickupLatitude: real("pickup_latitude").notNull(),
  pickupLongitude: real("pickup_longitude").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  pickupDetails: text("pickup_details"),
  destinationLatitude: real("destination_latitude"),
  destinationLongitude: real("destination_longitude"),
  destinationAddress: text("destination_address"),
  destinationDetails: text("destination_details"),
  hospitalId: integer("hospital_id"),
  scheduledTime: timestamp("scheduled_time"),
  patientDetails: json("patient_details").notNull(),
  emergencyContact: json("emergency_contact"),
  estimatedFare: real("estimated_fare"),
  actualFare: real("actual_fare"),
  rating: integer("rating"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial({
    ambulanceId: true,
    destinationLatitude: true,
    destinationLongitude: true,
    destinationAddress: true,
    destinationDetails: true,
    hospitalId: true,
    scheduledTime: true,
    emergencyContact: true,
    estimatedFare: true,
    actualFare: true,
    rating: true,
    feedback: true,
  });

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Booking status updates schema
export const bookingStatusUpdates = pgTable("booking_status_updates", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  status: text("status").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  eta: integer("eta"), // in seconds
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingStatusUpdateSchema = createInsertSchema(bookingStatusUpdates).pick({
  bookingId: true,
  status: true,
  latitude: true,
  longitude: true,
  eta: true,
  message: true,
});

export type InsertBookingStatusUpdate = z.infer<typeof insertBookingStatusUpdateSchema>;
export type BookingStatusUpdate = typeof bookingStatusUpdates.$inferSelect;

// Patient details schema for form validation
export const patientDetailsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.string().min(1, "Age is required"),
  gender: z.enum(["male", "female", "other"]),
  condition: z.string().min(1, "Condition is required"),
  medicalHistory: z.array(z.string()).optional(),
});

export type PatientDetails = z.infer<typeof patientDetailsSchema>;

// Emergency contact schema for form validation
export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Emergency contact name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  relationship: z.string().optional(),
});

export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
