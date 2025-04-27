import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { AmbulanceTracking } from "@/components/tracking/ambulance-tracking";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Booking } from "@shared/schema";
import { Loader2, SearchIcon } from "lucide-react";

export default function TrackingPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [trackingId, setTrackingId] = useState<string>(bookingId || "");
  const [activeBookingId, setActiveBookingId] = useState<number | null>(bookingId ? parseInt(bookingId) : null);

  // Fetch user's bookings to show active ones
  const { data: bookings, isLoading: isLoadingBookings } = useQuery<Booking[]>({
    queryKey: ["/api/secure/bookings"],
  });

  // Filter for active bookings (confirmed, in_progress)
  const activeBookings = bookings?.filter(booking => 
    ['confirmed', 'in_progress'].includes(booking.status)
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // If bookingId is provided in the URL, validate it and set it as active
  useEffect(() => {
    if (bookingId) {
      const parsedId = parseInt(bookingId);
      if (!isNaN(parsedId)) {
        setActiveBookingId(parsedId);
        setTrackingId(bookingId);
      } else {
        toast({
          title: "Invalid booking ID",
          description: "The booking ID provided is not valid.",
          variant: "destructive",
        });
      }
    }
  }, [bookingId, toast]);

  const handleTrack = () => {
    if (!trackingId || isNaN(parseInt(trackingId))) {
      toast({
        title: "Invalid tracking ID",
        description: "Please enter a valid booking ID to track.",
        variant: "destructive",
      });
      return;
    }
    
    const id = parseInt(trackingId);
    setActiveBookingId(id);
    navigate(`/tracking/${id}`);
  };

  const handleSelectBooking = (id: number) => {
    setActiveBookingId(id);
    setTrackingId(id.toString());
    navigate(`/tracking/${id}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tracking Form */}
          {!activeBookingId && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Track Your Ambulance</h2>
              <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Enter your booking ID to track the status and location of your ambulance.
                  </p>
                  <div className="flex gap-4">
                    <Input
                      placeholder="Enter booking ID"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      className="flex-grow"
                    />
                    <Button onClick={handleTrack} className="whitespace-nowrap">
                      <SearchIcon className="mr-2 h-4 w-4" /> Track Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Active Bookings */}
          {!activeBookingId && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Your Active Bookings</h2>
              
              {isLoadingBookings ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : activeBookings && activeBookings.length > 0 ? (
                <div className="space-y-4">
                  {activeBookings.map(booking => (
                    <Card key={booking.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectBooking(booking.id)}>
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-lg">Booking #{booking.id}</h3>
                            <p className="text-gray-500 dark:text-gray-400">Status: <span className="capitalize text-primary font-medium">{booking.status.replace('_', ' ')}</span></p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                              From: {booking.pickupAddress.split(',')[0]}
                              {booking.destinationAddress && (
                                <> • To: {booking.destinationAddress.split(',')[0]}</>
                              )}
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            <SearchIcon className="mr-2 h-4 w-4" /> Track
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <h3 className="text-lg font-medium mb-2">No active bookings found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      You don't have any active ambulance bookings to track at the moment.
                    </p>
                    <Button variant="outline" onClick={() => navigate("/")}>
                      Book an Ambulance
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Tracking View */}
          {activeBookingId && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Ambulance Tracking</h2>
                <Button variant="outline" onClick={() => {
                  setActiveBookingId(null);
                  navigate("/tracking");
                }}>
                  View All Bookings
                </Button>
              </div>
              <AmbulanceTracking bookingId={activeBookingId} />
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
