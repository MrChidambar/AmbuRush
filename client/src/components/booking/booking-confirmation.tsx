import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking, AmbulanceType, Hospital } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, MapPin, Calendar, Share2 } from "lucide-react";
import { Link } from "wouter";

interface BookingConfirmationProps {
  bookingId: number;
  onViewTracking: (bookingId: number) => void;
}

export function BookingConfirmation({ bookingId, onViewTracking }: BookingConfirmationProps) {
  // Fetch booking details
  const { data: booking, isLoading: isLoadingBooking } = useQuery<Booking>({
    queryKey: [`/api/secure/bookings/${bookingId}`],
  });

  // Fetch ambulance type details if we have the ambulanceTypeId
  const { data: ambulanceTypes } = useQuery<AmbulanceType[]>({
    queryKey: ["/api/ambulance-types"],
  });

  // Fetch hospital details if we have hospitalId
  const { data: hospitals } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

  if (isLoadingBooking || !booking) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-opacity-50 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  const ambulanceType = ambulanceTypes?.find(type => type.id === booking.ambulanceTypeId);
  const hospital = booking.hospitalId ? hospitals?.find(h => h.id === booking.hospitalId) : null;

  // Format scheduled time
  const formatScheduledTime = (dateString: string | null | undefined) => {
    if (!dateString) return "Immediate (Emergency)";
    
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleShare = () => {
    const bookingDetails = `MediRush Ambulance Booking #${booking.id}\n` +
      `Status: ${booking.status}\n` +
      `Pickup: ${booking.pickupAddress}\n` +
      (booking.destinationAddress ? `Destination: ${booking.destinationAddress}\n` : '') +
      (booking.scheduledTime ? `Time: ${formatScheduledTime(booking.scheduledTime)}\n` : '') +
      `Track at: ${window.location.origin}/tracking/${booking.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: `MediRush Ambulance Booking #${booking.id}`,
        text: bookingDetails,
        url: `${window.location.origin}/tracking/${booking.id}`
      }).catch(err => {
        // Fallback to clipboard if sharing fails
        navigator.clipboard.writeText(bookingDetails);
        alert("Booking details copied to clipboard!");
      });
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(bookingDetails);
      alert("Booking details copied to clipboard!");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="bg-green-600 dark:bg-green-700 px-6 py-8 text-white text-center">
        <div className="rounded-full h-16 w-16 bg-white bg-opacity-25 mx-auto flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold mb-1">Booking Confirmed!</h3>
        <p>Your ambulance has been {booking.bookingType === "emergency" ? "dispatched" : "scheduled"}.</p>
      </div>

      <div className="p-6">
        <div className="mb-6 text-center">
          <div className="text-gray-500 dark:text-gray-400 mb-1">Booking ID</div>
          <div className="text-2xl font-medium text-gray-900 dark:text-gray-100">#{booking.id}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Booking Type</div>
            <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
              {booking.bookingType}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ambulance Type</div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {ambulanceType?.name || "Standard"}
            </div>
          </div>
          {booking.scheduledTime && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                <Calendar className="h-3 w-3 mr-1" /> Scheduled Time
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {formatScheduledTime(booking.scheduledTime)}
              </div>
            </div>
          )}
          {booking.bookingType === "emergency" && (
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estimated Arrival</div>
              <div className="font-medium text-primary">5-10 minutes</div>
            </div>
          )}
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</div>
            <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
              {booking.status.replace('_', ' ')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estimated Fare</div>
            <div className="font-medium text-primary">
              ${booking.estimatedFare?.toFixed(2) || (ambulanceType ? ambulanceType.basePrice.toFixed(2) + "+" : "Calculating...")}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Trip Details</div>
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
                {(booking.destinationAddress || hospital) && (
                  <div className="flex">
                    <div className="flex-shrink-0 w-8 text-center relative">
                      <div className="h-8 w-8 rounded-full bg-secondary-100 dark:bg-secondary-900 flex items-center justify-center text-secondary">
                        <MapPin className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">Destination</div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {hospital ? hospital.name : booking.destinationAddress}
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

        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <Button 
            variant="default" 
            className="flex-1" 
            onClick={() => onViewTracking(booking.id)}
          >
            <MapPin className="mr-2 h-4 w-4" /> Track Ambulance
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" /> Share Booking Details
          </Button>
        </div>
      </div>
    </div>
  );
}
