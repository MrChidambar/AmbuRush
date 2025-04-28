import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { ambulanceTypes, hospitals, insertBookingSchema, patientDetailsSchema, emergencyContactSchema } from "@shared/schema";
import { sendBookingNotification } from "./services/notification";
import { z } from "zod";

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
        
        // Sort by distance and return
        hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
        res.json(hospitalsWithDistance);
      } else {
        // Just return all hospitals if no coordinates provided
        const allHospitals = await storage.getHospitals();
        res.json(allHospitals);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch hospitals" });
    }
  });

  app.get("/api/nearby-ambulances", (req, res) => {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ message: "Invalid latitude or longitude" });
    }
    
    try {
      const nearbyAmbulances = storage.getNearbyAmbulances(latitude, longitude);
      res.json(nearbyAmbulances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch nearby ambulances" });
    }
  });

  // Admin API routes
  app.get("/api/admin/bookings", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      // Get all bookings for admin view
      const allBookings = await storage.getAllBookings();
      res.json(allBookings);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/admin/ambulances", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      const allAmbulances = await storage.getAmbulances();
      res.json(allAmbulances);
    } catch (error) {
      console.error("Error fetching ambulances:", error);
      res.status(500).json({ message: "Failed to fetch ambulances" });
    }
  });

  app.get("/api/admin/drivers", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      // Get all drivers (users with role 'driver')
      const drivers = await storage.getUsersByRole("driver");
      res.json(drivers);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      res.status(500).json({ message: "Failed to fetch drivers" });
    }
  });

  app.get("/api/admin/patients", async (req, res) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized. Admin access required." });
      }
      
      // Get all patients (users with role 'patient')
      const patients = await storage.getUsersByRole("patient");
      res.json(patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
      res.status(500).json({ message: "Failed to fetch patients" });
    }
  });

  // Secure routes - require authentication
  app.post("/api/secure/bookings", async (req, res) => {
    try {
      // Log the received data for debugging
      console.log("Received booking data:", JSON.stringify(req.body));

      // Validate booking data
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Validate patient details
      const patientDetails = patientDetailsSchema.parse(bookingData.patientDetails);
      
      // Validate emergency contact if provided
      if (bookingData.emergencyContact) {
        emergencyContactSchema.parse(bookingData.emergencyContact);
      }
      
      // Add user ID from authenticated user if not already provided
      const booking = await storage.createBooking({
        ...bookingData,
        userId: bookingData.userId || req.user!.id,
      });
      
      // Send booking confirmation notification
      if (booking.status === 'confirmed' || booking.status === 'pending') {
        try {
          await sendBookingNotification(booking, req.user);
        } catch (notificationError) {
          console.error('Failed to send booking notification:', notificationError);
          // Continue even if notification fails
        }
      }
      
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("ZodError details:", JSON.stringify(error.errors));
        return res.status(400).json({ 
          message: "Invalid booking data", 
          errors: error.errors 
        });
      }
      console.error("Booking creation error:", error);
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/secure/bookings", async (req, res) => {
    try {
      const bookings = await storage.getBookingsByUserId(req.user!.id);
      res.json(bookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get("/api/secure/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBookingById(parseInt(req.params.id));
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is authorized to access this booking
      if (booking.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.role !== "driver") {
        return res.status(403).json({ message: "Unauthorized to access this booking" });
      }
      
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.get("/api/secure/bookings/:id/status-updates", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is authorized to access this booking
      if (booking.userId !== req.user!.id && req.user!.role !== "admin" && req.user!.role !== "driver") {
        return res.status(403).json({ message: "Unauthorized to access this booking" });
      }
      
      const statusUpdates = await storage.getBookingStatusUpdates(bookingId);
      res.json(statusUpdates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch booking status updates" });
    }
  });

  app.post("/api/secure/bookings/:id/cancel", async (req, res) => {
    try {
      const bookingId = parseInt(req.params.id);
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check if user is authorized to cancel this booking
      if (booking.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Unauthorized to cancel this booking" });
      }
      
      // Check if booking can be cancelled
      if (["completed", "cancelled"].includes(booking.status)) {
        return res.status(400).json({ message: `Booking cannot be cancelled in ${booking.status} state` });
      }
      
      const updatedBooking = await storage.updateBookingStatus(bookingId, "cancelled");
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  app.post("/api/driver/updateLocation", async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      // Get driver's ambulance
      const ambulance = await storage.getAmbulanceByDriverId(req.user!.id);
      
      if (!ambulance) {
        return res.status(404).json({ message: "No ambulance assigned to this driver" });
      }
      
      // Update ambulance location
      const updatedAmbulance = await storage.updateAmbulanceLocation(ambulance.id, latitude, longitude);
      
      // If ambulance is assigned to a booking, update the ETA
      if (ambulance.status === "assigned") {
        // Find active booking for this ambulance
        const activeBooking = await storage.getActiveBookingByAmbulanceId(ambulance.id);
        
        if (activeBooking) {
          // Calculate ETA (simplified version - in a real app this would use distance/traffic info)
          const distanceToPickup = calculateDistance(
            latitude, 
            longitude, 
            activeBooking.pickupLatitude, 
            activeBooking.pickupLongitude
          );
          
          const etaInSeconds = Math.round(distanceToPickup * 60); // Simple estimation
          
          // Add status update
          await storage.addBookingStatusUpdate({
            bookingId: activeBooking.id,
            status: activeBooking.status,
            latitude,
            longitude,
            eta: etaInSeconds,
            message: `Driver is ${Math.round(distanceToPickup * 10) / 10} km away`,
          });
        }
      }
      
      res.json(updatedAmbulance);
    } catch (error) {
      res.status(500).json({ message: "Failed to update location" });
    }
  });

  app.post("/api/driver/updateBookingStatus", async (req, res) => {
    try {
      const { bookingId, status, latitude, longitude, message } = req.body;
      
      if (!bookingId || !status) {
        return res.status(400).json({ message: "Booking ID and status are required" });
      }
      
      const booking = await storage.getBookingById(bookingId);
      
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Get driver's ambulance
      const ambulance = await storage.getAmbulanceByDriverId(req.user!.id);
      
      if (!ambulance) {
        return res.status(404).json({ message: "No ambulance assigned to this driver" });
      }
      
      // Ensure the driver is assigned to this booking
      if (booking.ambulanceId !== ambulance.id) {
        return res.status(403).json({ message: "Driver not assigned to this booking" });
      }
      
      // Update booking status
      const updatedBooking = await storage.updateBookingStatus(bookingId, status);
      
      // Add status update
      await storage.addBookingStatusUpdate({
        bookingId,
        status,
        latitude,
        longitude,
        message,
      });
      
      // If booking status changed to important state (picked up, arrived, completed)
      // send a notification to the user
      if (['picked_up', 'arrived', 'completed'].includes(status)) {
        try {
          // Get the booking user
          const user = await storage.getUser(updatedBooking.userId);
          if (user) {
            await sendBookingNotification(updatedBooking, user);
          }
        } catch (notificationError) {
          console.error('Failed to send status update notification:', notificationError);
          // Continue even if notification fails
        }
      }
      
      res.json(updatedBooking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking status" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Helper function to calculate distance between two points (in km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI/180);
}

// Seed initial data for ambulance types and hospitals
async function seedInitialData() {
  // Seed admin user
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
    },
    {
      name: "Pet Ambulance",
      description: "Emergency transport for pets",
      basePrice: 2000,
      pricePerKm: 30,
      icon: "paw"
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
      name: "AIIMS Bangalore",
      address: "Bengaluru Urban, Karnataka 560016",
      latitude: 12.9174,
      longitude: 77.5990,
      specialties: ["Emergency", "Trauma", "Cardiac", "Neurology"]
    },
    {
      name: "Manipal Hospital",
      address: "Old Airport Road, Bengaluru 560017",
      latitude: 12.9558,
      longitude: 77.6491,
      specialties: ["Pediatric", "Emergency", "Oncology", "Cardiology"]
    },
    {
      name: "Fortis Hospital",
      address: "Bannerghatta Road, Bengaluru 560076",
      latitude: 12.8911,
      longitude: 77.5962,
      specialties: ["Cardiac", "Orthopedic", "Emergency", "Transplant"]
    },
    {
      name: "Narayana Hrudayalaya",
      address: "Electronic City, Bengaluru 560100",
      latitude: 12.8429,
      longitude: 77.6474,
      specialties: ["Cardiac", "Emergency", "Pediatric", "Neurosurgery"]
    },
    {
      name: "Columbia Asia Hospital",
      address: "Whitefield, Bengaluru 560066",
      latitude: 12.9697,
      longitude: 77.7499,
      specialties: ["Emergency", "General Surgery", "Orthopedic"]
    }
  ];

  // Only seed if no hospitals exist
  const existingHospitals = await storage.getHospitals();
  if (existingHospitals.length === 0) {
    for (const hospital of hospitalsData) {
      await storage.createHospital(hospital);
    }
  }

  // Seed available ambulances
  const ambulancesData = [
    {
      registrationNumber: "KA-01-AB-1234",
      typeId: 1,
      status: "available",
      latitude: 12.9280,
      longitude: 77.6090,
      driverId: null
    },
    {
      registrationNumber: "KA-01-CD-5678",
      typeId: 2,
      status: "available",
      latitude: 12.9350,
      longitude: 77.6245,
      driverId: null
    },
    {
      registrationNumber: "KA-01-EF-9012",
      typeId: 1,
      status: "available",
      latitude: 12.9080,
      longitude: 77.5932,
      driverId: null
    },
    {
      registrationNumber: "KA-02-GH-3456",
      typeId: 3,
      status: "available",
      latitude: 12.9767,
      longitude: 77.5713,
      driverId: null
    },
    {
      registrationNumber: "KA-03-IJ-7890",
      typeId: 4,
      status: "available",
      latitude: 12.8845,
      longitude: 77.6040,
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
