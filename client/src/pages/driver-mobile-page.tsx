import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, User, Navigation } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export default function DriverMobilePage() {
  const { user } = useAuth();
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const queryClient = useQueryClient();

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setLocation(newLocation);
          
          // Update location on server if online
          if (isOnline) {
            updateLocationMutation.mutate(newLocation);
          }
        },
        (error) => {
          console.error("Location error:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your location. Please enable GPS.",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isOnline]);

  // Fetch active bookings
  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["/api/bookings/driver", user?.id],
    enabled: !!user?.id && isOnline
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: async (coords: { latitude: number; longitude: number }) => {
      return apiRequest(`/api/ambulances/location`, "PATCH", coords);
    }
  });

  // Toggle online status
  const toggleOnlineMutation = useMutation({
    mutationFn: async (online: boolean) => {
      return apiRequest(`/api/drivers/availability`, "PATCH", { available: online });
    },
    onSuccess: () => {
      setIsOnline(!isOnline);
      toast({
        title: isOnline ? "Gone Offline" : "Now Online",
        description: isOnline ? "You won't receive new bookings" : "Ready to receive bookings!"
      });
    }
  });

  // Accept booking mutation
  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return apiRequest(`/api/bookings/${bookingId}/accept`, "PATCH");
    },
    onSuccess: () => {
      refetchBookings();
      toast({
        title: "Booking Accepted",
        description: "Navigate to pickup location"
      });
    }
  });

  // Update booking status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: number; status: string }) => {
      return apiRequest(`/api/bookings/${bookingId}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      refetchBookings();
      toast({
        title: "Status Updated",
        description: "Booking status has been updated"
      });
    }
  });

  if (!user || user.role !== 'driver') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This page is only accessible to registered drivers.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-red-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6" />
            <div>
              <h1 className="font-bold">Driver Dashboard</h1>
              <p className="text-sm opacity-90">Welcome, {user.firstName}</p>
            </div>
          </div>
          <Badge variant={isOnline ? "default" : "secondary"} className="bg-white text-red-600">
            {isOnline ? "ONLINE" : "OFFLINE"}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Control */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium">Driver Status</p>
                  <p className="text-sm text-gray-600">
                    {location ? "Location tracked" : "Getting location..."}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => toggleOnlineMutation.mutate(!isOnline)}
                variant={isOnline ? "destructive" : "default"}
                disabled={!location || toggleOnlineMutation.isPending}
              >
                {isOnline ? "Go Offline" : "Go Online"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Location Info */}
        {location && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Navigation className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Current Location</p>
                  <p className="text-sm text-gray-600">
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Bookings */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center">
            <Clock className="h-5 w-5 mr-2 text-red-600" />
            Active Bookings ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  {isOnline ? "Waiting for bookings..." : "Go online to receive bookings"}
                </p>
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking: any) => (
              <Card key={booking.id} className="border-l-4 border-l-red-600">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">Booking #{booking.id}</h3>
                        <Badge variant={booking.emergencyLevel === 'emergency' ? 'destructive' : 'default'}>
                          {booking.emergencyLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <Badge variant="outline">{booking.status}</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{booking.pickupAddress}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{booking.contactNumber}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      {booking.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => acceptBookingMutation.mutate(booking.id)}
                          disabled={acceptBookingMutation.isPending}
                          className="flex-1"
                        >
                          Accept Booking
                        </Button>
                      )}
                      
                      {booking.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'en_route' })}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1"
                        >
                          En Route
                        </Button>
                      )}
                      
                      {booking.status === 'en_route' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'arrived' })}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1"
                        >
                          Arrived
                        </Button>
                      )}
                      
                      {booking.status === 'arrived' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'in_transit' })}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1"
                        >
                          In Transit
                        </Button>
                      )}
                      
                      {booking.status === 'in_transit' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ bookingId: booking.id, status: 'completed' })}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1"
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}