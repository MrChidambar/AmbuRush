import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Map } from "@/components/ui/map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Booking, BookingStatusUpdate, Hospital } from "@shared/schema";
import { Phone, MessageSquare, MapPin, ChevronRight, Ambulance, Star, Clock, X, RefreshCw, Share2, Maximize2, LocateFixed } from "lucide-react";

interface AmbulanceTrackingProps {
  bookingId: number;
}

export function AmbulanceTracking({ bookingId }: AmbulanceTrackingProps) {
  const { toast } = useToast();
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]);
  const [ambulanceLocation, setAmbulanceLocation] = useState<[number, number] | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Fetch booking details
  const { data: booking, isLoading: isLoadingBooking } = useQuery<Booking>({
    queryKey: [`/api/secure/bookings/${bookingId}`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch booking status updates
  const { data: statusUpdates, isLoading: isLoadingStatusUpdates } = useQuery<BookingStatusUpdate[]>({
    queryKey: [`/api/secure/bookings/${bookingId}/status-updates`],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch hospital if needed
  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
    enabled: !!booking?.hospitalId,
  });

  // Get latest status update with location
  const latestStatusUpdate = statusUpdates?.filter(update => 
    update.latitude !== null && update.longitude !== null
  ).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  // Set ambulance location and map center when data changes
  useEffect(() => {
    if (latestStatusUpdate?.latitude && latestStatusUpdate?.longitude) {
      const location: [number, number] = [latestStatusUpdate.latitude, latestStatusUpdate.longitude];
      setAmbulanceLocation(location);
      setMapCenter(location);
    } else if (booking?.pickupLatitude && booking?.pickupLongitude) {
      setMapCenter([booking.pickupLatitude, booking.pickupLongitude]);
    }
  }, [latestStatusUpdate, booking]);

  const refreshTracking = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: [`/api/secure/bookings/${bookingId}`] });
      await queryClient.invalidateQueries({ queryKey: [`/api/secure/bookings/${bookingId}/status-updates`] });
      toast({
        title: "Tracking refreshed",
        description: "Latest tracking information has been loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Unable to fetch the latest tracking data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const cancelBooking = async () => {
    if (!confirm("Are you sure you want to cancel this booking?")) {
      return;
    }
    
    try {
      await apiRequest("POST", `/api/secure/bookings/${bookingId}/cancel`);
      queryClient.invalidateQueries({ queryKey: [`/api/secure/bookings/${bookingId}`] });
      toast({
        title: "Booking cancelled",
        description: "Your ambulance booking has been cancelled successfully.",
      });
    } catch (error) {
      toast({
        title: "Cancellation failed",
        description: "Unable to cancel the booking. Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'confirmed': return 'default';
      case 'in_progress': return 'default';
      case 'completed': return 'success';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const formatEta = (etaSeconds: number | null | undefined) => {
    if (!etaSeconds) return "Unknown";
    
    const minutes = Math.round(etaSeconds / 60);
    if (minutes < 1) return "Less than a minute";
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const goToCurrentLocation = () => {
    if (ambulanceLocation) {
      setMapCenter(ambulanceLocation);
    }
  };

  // Get the selected hospital
  const selectedHospital = booking?.hospitalId ? hospitals?.find(h => h.id === booking.hospitalId) : null;

  if (isLoadingBooking || !booking) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-opacity-50 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="bg-primary px-6 py-4 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Ambulance {booking.status === 'confirmed' ? 'on the way' : booking.status.replace('_', ' ')}</h3>
          <div className="text-primary-100 dark:text-primary-300">
            <span>Booking ID: </span>
            <span className="font-medium">#{booking.id}</span>
          </div>
        </div>
        <p className="mt-1 text-primary-100 dark:text-primary-300">
          {booking.bookingType === 'emergency' 
            ? 'Your emergency ambulance has been dispatched and is en route.' 
            : `Your scheduled ambulance ${booking.status === 'confirmed' ? 'is on the way' : `is ${booking.status.replace('_', ' ')}`}.`}
        </p>
      </div>

      <div className="p-6">
        <div className="bg-primary-50 dark:bg-primary-950 border border-primary-100 dark:border-primary-900 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary text-2xl">
              <Ambulance className="h-8 w-8" />
            </div>
            <div className="ml-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                {booking.ambulanceType || "Ambulance"} {booking.registrationNumber && `(${booking.registrationNumber})`}
              </h4>
              <div className="flex items-center mt-1">
                <div className="flex items-center text-yellow-500">
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4 fill-current" />
                  <Star className="h-4 w-4" />
                  <span className="ml-1 text-gray-600 dark:text-gray-400 text-sm">4.8</span>
                </div>
                {booking.driverName && (
                  <>
                    <span className="mx-2 text-gray-300 dark:text-gray-700">|</span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">Driver: {booking.driverName}</span>
                  </>
                )}
              </div>
              <div className="flex items-center mt-2">
                <Badge variant={getStatusBadgeVariant(booking.status)} className="capitalize">
                  <span className="flex-shrink-0 h-2 w-2 bg-current rounded-full mr-1.5"></span>
                  {booking.status.replace('_', ' ')}
                </Badge>
                {latestStatusUpdate?.eta && (
                  <span className="ml-3 text-sm font-medium text-primary">
                    <Clock className="h-3 w-3 inline mr-1" />
                    ETA: {formatEta(latestStatusUpdate.eta)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800 dark:text-gray-200">Live Tracking</h4>
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-secondary hover:text-secondary"
                onClick={refreshTracking}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-secondary hover:text-secondary"
                onClick={goToCurrentLocation}
                disabled={!ambulanceLocation}
              >
                <LocateFixed className="h-4 w-4 mr-1" />
                Center
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-secondary hover:text-secondary"
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                Full Screen
              </Button>
            </div>
          </div>
          <div className="w-full h-64 bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden">
            <Map
              center={mapCenter}
              markerPosition={[booking.pickupLatitude, booking.pickupLongitude]}
              destinationPosition={
                booking.destinationLatitude && booking.destinationLongitude 
                  ? [booking.destinationLatitude, booking.destinationLongitude]
                  : undefined
              }
              showRoute={true}
              ambulanceMarkers={ambulanceLocation ? [{
                position: ambulanceLocation,
                tooltip: "Ambulance"
              }] : []}
            />
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Distance</div>
            <div className="font-medium text-lg">
              {latestStatusUpdate?.message?.match(/([0-9.]+) km/) 
                ? latestStatusUpdate.message.match(/([0-9.]+) km/)![1] + ' km away'
                : 'Calculating...'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Estimated Arrival</div>
            <div className="font-medium text-lg">
              {latestStatusUpdate?.eta ? formatEta(latestStatusUpdate.eta) : 'Calculating...'}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">Driver</div>
            <div className="font-medium text-lg">
              {booking.driverName || 'Assigning driver...'}
              {booking.driverId && <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">(ID: {booking.driverId})</span>}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Trip Details</h4>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex">
                  <div className="flex-shrink-0 w-8 text-center">
                    <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Pickup Location</div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">{booking.pickupAddress}</div>
                    {booking.pickupDetails && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{booking.pickupDetails}</div>
                    )}
                  </div>
                </div>
                
                {(booking.destinationAddress || selectedHospital) && (
                  <div className="flex">
                    <div className="flex-shrink-0 w-8 text-center relative">
                      <div className="h-8 w-8 rounded-full bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center text-secondary">
                        <MapPin className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Destination</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedHospital ? selectedHospital.name : booking.destinationAddress}
                      </div>
                      {booking.destinationDetails && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{booking.destinationDetails}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {statusUpdates && statusUpdates.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Status Updates</h4>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {statusUpdates
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((update, index) => (
                      <div key={update.id} className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <div className={`h-3 w-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center">
                            <span className="text-sm font-medium capitalize">
                              {update.status.replace('_', ' ')}
                            </span>
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(update.createdAt)}
                            </span>
                          </div>
                          {update.message && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{update.message}</p>
                          )}
                        </div>
                      </div>
                    ))
                  }
                  {statusUpdates.length > 5 && (
                    <Button variant="ghost" size="sm" className="w-full text-secondary">
                      View all updates <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-800 dark:text-gray-200">Driver Contact</h4>
            <div className="flex space-x-2">
              <Button
                variant="success"
                size="sm"
                className="text-white"
                disabled={!booking.driverPhone}
                onClick={() => booking.driverPhone && window.open(`tel:${booking.driverPhone}`)}
              >
                <Phone className="h-4 w-4 mr-1.5" /> Call Driver
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!booking.driverPhone}
              >
                <MessageSquare className="h-4 w-4 mr-1.5" /> Message
              </Button>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
          <Button
            variant="outline"
            className="sm:w-auto"
            onClick={cancelBooking}
            disabled={!['pending', 'confirmed'].includes(booking.status)}
          >
            <X className="mr-2 h-4 w-4" /> Cancel Booking
          </Button>
          <Button
            variant="outline"
            className="sm:w-auto"
            onClick={() => {
              const shareUrl = `${window.location.origin}/tracking/${booking.id}`;
              
              if (navigator.share) {
                navigator.share({
                  title: "Track My Ambulance",
                  text: "Follow my ambulance in real-time!",
                  url: shareUrl
                }).catch(err => {
                  navigator.clipboard.writeText(shareUrl);
                  toast({
                    title: "Link copied",
                    description: "Tracking link copied to clipboard.",
                  });
                });
              } else {
                navigator.clipboard.writeText(shareUrl);
                toast({
                  title: "Link copied",
                  description: "Tracking link copied to clipboard.",
                });
              }
            }}
          >
            <Share2 className="mr-2 h-4 w-4" /> Share Tracking Link
          </Button>
        </div>
      </div>
    </div>
  );
}
