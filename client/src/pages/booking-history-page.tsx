import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Booking } from "@shared/schema";
import { CalendarIcon, ClockIcon, CheckCircle, XCircle, MapPin, MapIcon, Ambulance, RefreshCcw, Loader2 } from "lucide-react";

export default function BookingHistoryPage() {
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch user's bookings
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/secure/bookings"],
  });

  const filteredBookings = bookings?.filter(booking => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return ["pending", "confirmed", "in_progress"].includes(booking.status);
    if (activeTab === "completed") return booking.status === "completed";
    if (activeTab === "cancelled") return booking.status === "cancelled";
    return true;
  }).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const cancelBooking = async (bookingId: number) => {
    try {
      if (!confirm("Are you sure you want to cancel this booking?")) {
        return;
      }
      
      await apiRequest("POST", `/api/secure/bookings/${bookingId}/cancel`);
      
      queryClient.invalidateQueries({ queryKey: ["/api/secure/bookings"] });
      
      toast({
        title: "Booking cancelled",
        description: "Your booking has been cancelled successfully.",
      });
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: "There was an error cancelling your booking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "confirmed":
        return <Badge variant="primary">Confirmed</Badge>;
      case "in_progress":
        return <Badge variant="default">In Progress</Badge>;
      case "completed":
        return <Badge variant="success">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Booking History</h1>
            <Button onClick={() => navigate("/")} className="whitespace-nowrap">
              <RefreshCcw className="mr-2 h-4 w-4" /> Book New Ambulance
            </Button>
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {isLoading ? (
            <div className="flex justify-center items-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredBookings && filteredBookings.length > 0 ? (
            <div className="space-y-6">
              {filteredBookings.map((booking) => (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Booking #{booking.id}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {formatDate(booking.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(booking.status)}
                        <Badge variant={booking.bookingType === "emergency" ? "destructive" : "secondary"} className="capitalize">
                          {booking.bookingType}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Trip Details</h4>
                          <div className="flex items-start space-x-3">
                            <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">Pickup</p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{booking.pickupAddress}</p>
                              {booking.pickupDetails && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{booking.pickupDetails}</p>
                              )}
                            </div>
                          </div>
                          
                          {booking.destinationAddress && (
                            <div className="flex items-start space-x-3">
                              <MapPin className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium">Destination</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{booking.destinationAddress}</p>
                                {booking.destinationDetails && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{booking.destinationDetails}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Booking Information</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Ambulance Type</p>
                              <p className="font-medium">{booking.ambulanceTypeId ? `Type ${booking.ambulanceTypeId}` : "Standard"}</p>
                            </div>
                            
                            {booking.scheduledTime && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled Time</p>
                                <p className="font-medium flex items-center">
                                  <ClockIcon className="h-3 w-3 mr-1" />
                                  {formatDate(booking.scheduledTime)}
                                </p>
                              </div>
                            )}
                            
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Fare</p>
                              <p className="font-medium text-primary">
                                {booking.actualFare 
                                  ? `$${booking.actualFare.toFixed(2)}` 
                                  : booking.estimatedFare 
                                    ? `$${booking.estimatedFare.toFixed(2)} (est.)` 
                                    : "N/A"}
                              </p>
                            </div>
                            
                            {booking.rating && (
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Your Rating</p>
                                <p className="font-medium flex items-center">
                                  {Array(5).fill(0).map((_, i) => (
                                    <svg 
                                      key={i}
                                      className={`h-4 w-4 ${i < (booking.rating || 0) ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`}
                                      xmlns="http://www.w3.org/2000/svg" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                    </svg>
                                  ))}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      <div className="flex flex-wrap justify-end gap-3">
                        {["pending", "confirmed"].includes(booking.status) && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => cancelBooking(booking.id)}
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Cancel Booking
                          </Button>
                        )}
                        
                        {["confirmed", "in_progress"].includes(booking.status) && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => navigate(`/tracking/${booking.id}`)}
                          >
                            <MapIcon className="mr-2 h-4 w-4" /> Track Ambulance
                          </Button>
                        )}
                        
                        {booking.status === "completed" && !booking.rating && (
                          <Button variant="outline" size="sm">
                            <CheckCircle className="mr-2 h-4 w-4" /> Leave Feedback
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Create a simple text representation for sharing
                            const bookingDetails = `MediRush Ambulance Booking #${booking.id}\n` +
                              `Status: ${booking.status.replace('_', ' ')}\n` +
                              `Type: ${booking.bookingType}\n` +
                              `From: ${booking.pickupAddress.split(',')[0]}\n` +
                              (booking.destinationAddress ? `To: ${booking.destinationAddress.split(',')[0]}\n` : '') +
                              `Booked on: ${formatDate(booking.createdAt)}`;
                            
                            if (navigator.share) {
                              navigator.share({
                                title: `MediRush Booking #${booking.id}`,
                                text: bookingDetails
                              }).catch(() => {
                                navigator.clipboard.writeText(bookingDetails);
                                toast({
                                  title: "Copied to clipboard",
                                  description: "Booking details have been copied to your clipboard.",
                                });
                              });
                            } else {
                              navigator.clipboard.writeText(bookingDetails);
                              toast({
                                title: "Copied to clipboard",
                                description: "Booking details have been copied to your clipboard.",
                              });
                            }
                          }}
                        >
                          Share Details
                        </Button>
                        
                        <Button 
                          variant={booking.bookingType === "emergency" ? "destructive" : "secondary"}
                          size="sm"
                          onClick={() => navigate("/")}
                        >
                          <Ambulance className="mr-2 h-4 w-4" /> Book Similar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center p-8">
              <CardContent>
                <Ambulance className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="text-xl font-medium mb-2">No bookings found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  You haven't made any ambulance bookings yet.
                </p>
                <Button onClick={() => navigate("/")}>
                  Book Your First Ambulance
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
