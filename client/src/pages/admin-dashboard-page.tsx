import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, Ambulance, Calendar, CheckCircle, XCircle, Clock, 
  PlusCircle, Pencil, Trash2, UserCog, Phone 
} from "lucide-react";
import { Booking, Ambulance as AmbulanceType, User } from "@shared/schema";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("bookings");

  // Redirect if not an admin
  if (user?.role !== "admin") {
    toast({
      title: "Access Denied",
      description: "You don't have permission to access the admin dashboard.",
      variant: "destructive",
    });
    return <Redirect to="/" />;
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Admin Dashboard
      </h1>
      
      <Tabs defaultValue="bookings" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Bookings
          </TabsTrigger>
          <TabsTrigger value="ambulances" className="flex items-center gap-2">
            <Ambulance className="h-4 w-4" />
            Ambulances
          </TabsTrigger>
          <TabsTrigger value="drivers" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Drivers
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Patients
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="bookings">
          <BookingsPanel />
        </TabsContent>
        
        <TabsContent value="ambulances">
          <AmbulancesPanel />
        </TabsContent>
        
        <TabsContent value="drivers">
          <DriversPanel />
        </TabsContent>
        
        <TabsContent value="patients">
          <PatientsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookingsPanel() {
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Fetch all bookings
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/admin/bookings"],
  });
  
  // Filter bookings based on tab
  const filteredBookings = bookings?.filter(booking => {
    if (activeTab === "upcoming") {
      return ["pending", "confirmed", "in_progress"].includes(booking.status);
    } else if (activeTab === "completed") {
      return booking.status === "completed";
    } else if (activeTab === "cancelled") {
      return booking.status === "cancelled";
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      confirmed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      in_progress: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    
    return (
      <Badge className={`${statusColors[status] || ''}`}>
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Manage Bookings</span>
          <div className="flex gap-2">
            <Button 
              variant={activeTab === "upcoming" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab("upcoming")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Upcoming
            </Button>
            <Button 
              variant={activeTab === "completed" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab("completed")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Completed
            </Button>
            <Button 
              variant={activeTab === "cancelled" ? "default" : "outline"} 
              size="sm"
              onClick={() => setActiveTab("cancelled")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancelled
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredBookings && filteredBookings.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.id}</TableCell>
                    <TableCell>
                      {typeof booking.patientDetails === 'object' && booking.patientDetails && 'name' in booking.patientDetails
                        ? (booking.patientDetails as any).name
                        : 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={booking.bookingType === "emergency" ? "destructive" : "secondary"}>
                        {booking.bookingType}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{booking.pickupAddress}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{booking.destinationAddress || "N/A"}</TableCell>
                    <TableCell>
                      {booking.scheduledTime 
                        ? new Date(booking.scheduledTime).toLocaleString() 
                        : new Date(booking.createdAt!).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No {activeTab} bookings found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AmbulancesPanel() {
  // Fetch all ambulances
  const { data: ambulances, isLoading } = useQuery<AmbulanceType[]>({
    queryKey: ["/api/admin/ambulances"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Manage Ambulances</span>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Ambulance
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : ambulances && ambulances.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Location</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ambulances.map((ambulance) => (
                  <TableRow key={ambulance.id}>
                    <TableCell>{ambulance.id}</TableCell>
                    <TableCell>{ambulance.registrationNumber}</TableCell>
                    <TableCell>{ambulance.typeId}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={ambulance.status === "available" ? "success" : 
                          (ambulance.status === "assigned" ? "secondary" : "default")}
                      >
                        {ambulance.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ambulance.latitude && ambulance.longitude ? 
                        `${ambulance.latitude.toFixed(4)}, ${ambulance.longitude.toFixed(4)}` : 
                        "N/A"}
                    </TableCell>
                    <TableCell>{ambulance.driverId || "Unassigned"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No ambulances found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DriversPanel() {
  // Fetch all drivers
  const { data: drivers, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/drivers"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Manage Drivers</span>
          <Button size="sm">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Driver
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : drivers && drivers.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>{driver.id}</TableCell>
                    <TableCell>{`${driver.firstName} ${driver.lastName}`}</TableCell>
                    <TableCell>{driver.username}</TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>{driver.phoneNumber}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No drivers found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PatientsPanel() {
  // Fetch all patients
  const { data: patients, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/patients"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Patient Records</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : patients && patients.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Total Bookings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>{patient.id}</TableCell>
                    <TableCell>{`${patient.firstName} ${patient.lastName}`}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>{patient.phoneNumber}</TableCell>
                    <TableCell>{new Date(patient.createdAt!).toLocaleDateString()}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No patients found.
          </div>
        )}
      </CardContent>
    </Card>
  );
}