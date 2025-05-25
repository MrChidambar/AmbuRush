import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { ambulanceTypes, hospitals, insertBookingSchema, patientDetailsSchema, emergencyContactSchema } from "@shared/schema";
import { sendBookingNotification } from "./services/notification";
import { z } from "zod";

// WebSocket clients storage
const wsClients = new Set<WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Seed initial data
  await seedInitialData();

  // API routes
  app.get("/api/ambulance-types", async (req, res) => {
    try {
      const types = await storage.getAmbulanceTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ambulance types" });
    }
  });

  app.get("/api/hospitals", async (req, res) => {
    try {
      // If latitude and longitude are provided, fetch nearby hospitals
      if (req.query.latitude && req.query.longitude) {
        const latitude = parseFloat(req.query.latitude as string);
        const longitude = parseFloat(req.query.longitude as string);
        
        if (isNaN(latitude) || isNaN(longitude)) {
          return res.status(400).json({ message: "Invalid latitude or longitude" });
        }
        
        // Get all hospitals and calculate distance to each
        const allHospitals = await storage.getHospitals();
        const hospitalsWithDistance = allHospitals.map(hospital => {
          const distance = calculateDistance(
            latitude,
            longitude,
            hospital.latitude,
            hospital.longitude
          );
          return { ...hospital, distance };
        });

        // Sort by distance and return closest hospitals
        const sortedHospitals = hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
        res.json(sortedHospitals);
      } else {
        // Return all hospitals
        const hospitals = await storage.getHospitals();
        res.json(hospitals);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch hospitals" });
    }
  });

  app.get("/api/ambulances/nearby", async (req, res) => {
    try {
      const { latitude, longitude } = req.query;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }

      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid latitude or longitude" });
      }

      const nearbyAmbulances = await storage.getNearbyAmbulances(lat, lng);
      res.json(nearbyAmbulances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nearby ambulances" });
    }
  });

  const bookingRequestSchema = z.object({
    bookingData: insertBookingSchema,
    patientDetails: patientDetailsSchema,
    emergencyContact: emergencyContactSchema.optional()
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const validatedData = bookingRequestSchema.parse(req.body);
      const { bookingData, patientDetails, emergencyContact } = validatedData;

      // Create the booking with patient details and emergency contact
      const bookingWithDetails = {
        ...bookingData,
        userId: req.user.id,
        patientDetails,
        emergencyContact,
        status: bookingData.bookingType === "emergency" ? "confirmed" : "pending"
      };

      const booking = await storage.createBooking(bookingWithDetails);

      // Send notification
      try {
        await sendBookingNotification(booking, req.user);
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't fail the booking if notification fails
      }

      // Add initial status update
      await storage.addBookingStatusUpdate({
        bookingId: booking.id,
        status: booking.status,
        message: `Booking ${booking.status}`,
        updatedBy: req.user.id
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error('Booking creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid booking data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/bookings", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      let bookings;
      if (req.user.role === 'admin') {
        // Admin can see all bookings
        bookings = await storage.getAllBookings();
      } else {
        // Regular users can only see their own bookings
        bookings = await storage.getBookingsByUserId(req.user.id);
      }

      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check if user has permission to view this booking
      if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.get("/api/bookings/:id/status-updates", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      // Check if booking exists and user has permission
      const booking = await storage.getBookingById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      if (req.user.role !== 'admin' && booking.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const statusUpdates = await storage.getBookingStatusUpdates(bookingId);
      res.json(statusUpdates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch status updates" });
    }
  });

  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Admin access required" });
      }

      const bookingId = parseInt(req.params.id);
      if (isNaN(bookingId)) {
        return res.status(400).json({ message: "Invalid booking ID" });
      }

      const { status, message } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const updatedBooking = await storage.updateBookingStatus(bookingId, status);
      
      // Add status update record
      await storage.addBookingStatusUpdate({
        bookingId,
        status,
        message: message || `Status updated to ${status}`,
        updatedBy: req.user.id
      });

      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Admin access required" });
      }

      const { role } = req.query;
      let users;
      
      if (role) {
        users = await storage.getUsersByRole(role as string);
      } else {
        // For now, we'll get all users by getting each role separately
        const patients = await storage.getUsersByRole('patient');
        const drivers = await storage.getUsersByRole('driver');
        const admins = await storage.getUsersByRole('admin');
        users = [...patients, ...drivers, ...admins];
      }

      // Remove password from response
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      res.json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/ambulances", async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Admin access required" });
      }

      const ambulances = await storage.getAmbulances();
      res.json(ambulances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ambulances" });
    }
  });

  // Driver routes
  app.post("/api/driver/location", async (req, res) => {
    if (!req.user || req.user.role !== 'driver') {
      return res.status(401).json({ message: "Unauthorized - Driver access required" });
    }

    try {
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      // Get driver's ambulance
      const ambulance = await storage.getAmbulanceByDriverId(req.user.id);
      
      if (!ambulance) {
        return res.status(404).json({ message: "No ambulance assigned to this driver" });
      }
      
      // Update ambulance location
      const updatedAmbulance = await storage.updateAmbulanceLocation(ambulance.id, latitude, longitude);
      
      res.json(updatedAmbulance);
    } catch (error) {
      console.error('Error updating driver location:', error);
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.get("/api/driver/assigned-bookings", async (req, res) => {
    if (!req.user || req.user.role !== 'driver') {
      return res.status(401).json({ message: "Unauthorized - Driver access required" });
    }

    try {
      // Get driver's ambulance
      const ambulance = await storage.getAmbulanceByDriverId(req.user.id);
      
      if (!ambulance) {
        return res.status(404).json({ message: "No ambulance assigned to this driver" });
      }
      
      // Get active booking for this ambulance
      const activeBooking = await storage.getActiveBookingByAmbulanceId(ambulance.id);
      
      res.json(activeBooking ? [activeBooking] : []);
    } catch (error) {
      console.error('Error fetching assigned bookings:', error);
      res.status(500).json({ message: "Failed to fetch assigned bookings" });
    }
  });

  // Create HTTP server
  const server = createServer(app);

  // Setup WebSocket server for real-time communication between platforms
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection established');
    wsClients.add(ws);

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('WebSocket message received:', message);

        // Broadcast to all connected clients (including driver platform)
        wsClients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  console.log('WebSocket server configured on /ws');
  return server;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in kilometers
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

async function seedInitialData() {
  // Create admin user if it doesn't exist
  const adminUsername = "admin";
  const existingAdmin = await storage.getUserByUsername(adminUsername);
  
  if (!existingAdmin) {
    const adminUser = {
      username: adminUsername,
      password: await hashPassword("admin"),
      firstName: "System",
      lastName: "Administrator",
      email: "admin@ambulanceapp.com",
      phoneNumber: "9999999999",
      role: "admin"
    };
    await storage.createUser(adminUser);
    console.log("Admin user created with username: admin and password: admin");
  }
  
  // Seed ambulance types
  const ambulanceTypesData = [
    {
      name: "Basic Life Support",
      description: "For non-critical transport with basic medical care",
      basePrice: 1500,
      pricePerKm: 25,
      icon: "ambulance"
    },
    {
      name: "Advanced Life Support",
      description: "For critical patients requiring advanced care",
      basePrice: 3000,
      pricePerKm: 45,
      icon: "heartbeat"
    },
    {
      name: "Neonatal",
      description: "Specialized transport for newborns",
      basePrice: 4000,
      pricePerKm: 60,
      icon: "baby"
    },
    {
      name: "ICU on Wheels",
      description: "Mobile intensive care unit for critical patients",
      basePrice: 5000,
      pricePerKm: 75,
      icon: "hospital"
    },
    {
      name: "Mental Health",
      description: "Specialized transport with mental health professionals",
      basePrice: 2500,
      pricePerKm: 35,
      icon: "brain"
    }
  ];

  // Only seed if no ambulance types exist
  const existingTypes = await storage.getAmbulanceTypes();
  if (existingTypes.length === 0) {
    for (const type of ambulanceTypesData) {
      await storage.createAmbulanceType(type);
    }
  }

  // Seed hospitals
  const hospitalsData = [
    {
      name: "BGS Gleneagles Global Hospitals",
      address: "67, Uttarahalli Rd, Kengeri, Bengaluru, Karnataka 560060",
      latitude: 12.9158,
      longitude: 77.4854,
      specialties: ["Emergency Care", "Cardiology", "Neurology", "Oncology"]
    },
    {
      name: "Apollo Hospitals Bannerghatta",
      address: "154/11, Opp. IIM-B, Bannerghatta Rd, Bengaluru, Karnataka 560076",
      latitude: 12.9279,
      longitude: 77.5965,
      specialties: ["Emergency Care", "Orthopedics", "Gastroenterology", "Pediatrics"]
    },
    {
      name: "Fortis Hospital Bannerghatta Road",
      address: "154/9, Bannerghatta Rd, Opposite IIM-B, Bengaluru, Karnataka 560076",
      latitude: 12.9308,
      longitude: 77.5968,
      specialties: ["Emergency Care", "Nephrology", "Urology", "Dermatology"]
    }
  ];

  // Only seed if no hospitals exist
  const existingHospitals = await storage.getHospitals();
  if (existingHospitals.length === 0) {
    for (const hospital of hospitalsData) {
      await storage.createHospital(hospital);
    }
  }

  // Seed ambulances
  const ambulancesData = [
    {
      registrationNumber: "KA-05-AB-1234",
      typeId: 1, // Basic Life Support
      status: "available",
      latitude: 12.9716,
      longitude: 77.5946,
      driverId: null
    },
    {
      registrationNumber: "KA-05-AB-5678",
      typeId: 2, // Advanced Life Support
      status: "available", 
      latitude: 12.9352,
      longitude: 77.6245,
      driverId: null
    },
    {
      registrationNumber: "KA-05-AB-9012",
      typeId: 1, // Basic Life Support
      status: "available",
      latitude: 12.9279,
      longitude: 77.5965,
      driverId: null
    }
  ];

  // Only seed if no ambulances exist
  const existingAmbulances = await storage.getAmbulances();
  if (existingAmbulances.length === 0) {
    for (const ambulance of ambulancesData) {
      await storage.createAmbulance(ambulance);
    }
  }
}