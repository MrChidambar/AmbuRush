import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { patientDetailsSchema, emergencyContactSchema, AmbulanceType, Hospital } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Map } from "@/components/ui/map";
import { AmbulanceTypeCard } from "@/components/booking/ambulance-type-card";
import { Loader2, MapPin, ArrowRight, ArrowLeft, CheckCircle, Calendar, Clock } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const nonEmergencyBookingSchema = z.object({
  scheduledTime: z.date({
    required_error: "Scheduled time is required",
  }).refine(date => date > new Date(), {
    message: "Scheduled time must be in the future"
  }),
  bookingPurpose: z.string().min(1, "Booking purpose is required"),
  isRecurring: z.boolean().default(false),
  recurringPattern: z.string().optional(),
  recurringEndDate: z.date().optional(),
  pickupAddress: z.string().min(1, "Pickup address is required"),
  pickupDetails: z.string().optional(),
  pickupLatitude: z.number(),
  pickupLongitude: z.number(),
  destinationType: z.string().min(1, "Destination type is required"),
  hospitalId: z.number().optional(),
  destinationAddress: z.string().optional(),
  destinationDetails: z.string().optional(),
  destinationLatitude: z.number().optional(),
  destinationLongitude: z.number().optional(),
  ambulanceTypeId: z.number({
    required_error: "Please select an ambulance type"
  }),
  patientDetails: patientDetailsSchema,
  emergencyContact: emergencyContactSchema.optional(),
  termsAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms to continue",
  }),
}).refine(
  data => {
    if (data.destinationType === 'hospital') {
      return !!data.hospitalId;
    } else {
      return !!(data.destinationAddress && data.destinationAddress.length > 0);
    }
  },
  {
    message: "Either hospital or destination address must be provided",
    path: ["destinationAddress"]
  }
);

type NonEmergencyBookingFormValues = z.infer<typeof nonEmergencyBookingSchema>;

interface NonEmergencyBookingFormProps {
  onBookingComplete: (bookingId: number) => void;
}

export function NonEmergencyBookingForm({ onBookingComplete }: NonEmergencyBookingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);

  // Fetch ambulance types
  const { data: ambulanceTypes, isLoading: isLoadingTypes } = useQuery<AmbulanceType[]>({
    queryKey: ["/api/ambulance-types"],
  });

  // Fetch hospitals
  const { data: hospitals, isLoading: isLoadingHospitals } = useQuery<Hospital[]>({
    queryKey: ["/api/hospitals"],
  });

  // Calculate minimum date and time
  const now = new Date();
  const minDate = new Date();
  minDate.setHours(now.getHours() + 2); // Minimum 2 hours from now
  
  const formattedMinDate = minDate.toISOString().split('T')[0];
  
  // Define form with default values
  const form = useForm<NonEmergencyBookingFormValues>({
    resolver: zodResolver(nonEmergencyBookingSchema),
    defaultValues: {
      scheduledTime: new Date(minDate.getTime() + 24 * 60 * 60 * 1000), // Default to 24 hours from now
      bookingPurpose: "medical-appointment",
      isRecurring: false,
      pickupAddress: "",
      pickupDetails: "",
      pickupLatitude: 0,
      pickupLongitude: 0,
      destinationType: "hospital",
      patientDetails: {
        name: user ? `${user.firstName} ${user.lastName}` : "",
        age: "",
        gender: "male",
        condition: "",
        medicalHistory: [],
      },
      termsAccepted: false
    },
  });

  // Watch for form value changes
  const isRecurring = form.watch("isRecurring");
  const destinationType = form.watch("destinationType");
  
  // Create booking mutation
  const bookingMutation = useMutation({
    mutationFn: async (data: NonEmergencyBookingFormValues) => {
      // Create a JSON-serializable version of the booking data
      // with all dates properly formatted as ISO strings
      const bookingData = {
        userId: user?.id,
        bookingType: "scheduled",
        ambulanceTypeId: data.ambulanceTypeId,
        pickupLatitude: data.pickupLatitude,
        pickupLongitude: data.pickupLongitude,
        pickupAddress: data.pickupAddress,
        pickupDetails: data.pickupDetails,
        destinationLatitude: data.destinationLatitude,
        destinationLongitude: data.destinationLongitude,
        destinationAddress: data.destinationAddress,
        destinationDetails: data.destinationDetails,
        hospitalId: data.hospitalId,
        // Convert Date to proper format for server
        scheduledTime: new Date(data.scheduledTime), 
        emergencyContact: data.emergencyContact,
        // Enhanced patient details with booking metadata
        patientDetails: {
          ...data.patientDetails,
          bookingPurpose: data.bookingPurpose,
          isRecurring: data.isRecurring,
          recurringPattern: data.recurringPattern,
          recurringEndDate: data.recurringEndDate ? new Date(data.recurringEndDate) : null,
        }
      };
      
      const res = await apiRequest("POST", "/api/secure/bookings", bookingData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/secure/bookings"] });
      onBookingComplete(data.id);
      toast({
        title: "Booking confirmed",
        description: "Your non-emergency ambulance has been scheduled successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const useCurrentLocation = () => {
    setIsUsingCurrentLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Get reverse geocoding using Nominatim OpenStreetMap API
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`)
            .then(response => response.json())
            .then(data => {
              form.setValue("pickupLatitude", position.coords.latitude);
              form.setValue("pickupLongitude", position.coords.longitude);
              form.setValue("pickupAddress", data.display_name || "Current Location");
              setIsUsingCurrentLocation(false);
            })
            .catch(() => {
              // If reverse geocoding fails, just set coordinates
              form.setValue("pickupLatitude", position.coords.latitude);
              form.setValue("pickupLongitude", position.coords.longitude);
              form.setValue("pickupAddress", "Current Location");
              setIsUsingCurrentLocation(false);
            });
        },
        (error) => {
          setIsUsingCurrentLocation(false);
          toast({
            title: "Location error",
            description: "Failed to get your current location. Please enter it manually.",
            variant: "destructive",
          });
        }
      );
    } else {
      setIsUsingCurrentLocation(false);
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation. Please enter your location manually.",
        variant: "destructive",
      });
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    form.setValue("pickupLatitude", lat);
    form.setValue("pickupLongitude", lng);
    
    // Get address from coordinates using Nominatim
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(response => response.json())
      .then(data => {
        form.setValue("pickupAddress", data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      })
      .catch(() => {
        form.setValue("pickupAddress", `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });
  };

  const handleDestinationMapClick = (lat: number, lng: number) => {
    form.setValue("destinationLatitude", lat);
    form.setValue("destinationLongitude", lng);
    
    // Get address from coordinates using Nominatim
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then(response => response.json())
      .then(data => {
        form.setValue("destinationAddress", data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      })
      .catch(() => {
        form.setValue("destinationAddress", `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });
  };

  const handleSelectHospital = (hospitalId: number) => {
    form.setValue("hospitalId", hospitalId);
    
    // Find the selected hospital to set destination coordinates
    const selectedHospital = hospitals?.find(h => h.id === hospitalId);
    if (selectedHospital) {
      form.setValue("destinationLatitude", selectedHospital.latitude);
      form.setValue("destinationLongitude", selectedHospital.longitude);
      form.setValue("destinationAddress", selectedHospital.address);
    }
  };

  const onSubmit = (data: NonEmergencyBookingFormValues) => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      bookingMutation.mutate(data);
    }
  };

  const medicalHistoryOptions = [
    { id: "diabetes", label: "Diabetes" },
    { id: "heart-disease", label: "Heart Disease" },
    { id: "hypertension", label: "Hypertension" },
    { id: "asthma", label: "Asthma" },
    { id: "allergies", label: "Allergies" },
  ];

  // Determine if the current step is valid
  const isStepValid = () => {
    if (step === 1) {
      return form.getValues("scheduledTime") > new Date();
    }
    if (step === 2) {
      return (
        form.getValues("pickupLatitude") !== 0 &&
        form.getValues("pickupLongitude") !== 0 &&
        form.getValues("pickupAddress") !== ""
      );
    }
    return true;
  };

  // Format the date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Selected hospital data
  const selectedHospitalId = form.watch("hospitalId");
  const selectedHospital = hospitals?.find(h => h.id === selectedHospitalId);
  
  // Selected ambulance type data
  const selectedAmbulanceTypeId = form.watch("ambulanceTypeId");
  const selectedAmbulanceType = ambulanceTypes?.find(t => t.id === selectedAmbulanceTypeId);
  
  // Calculate estimated fare if we have the necessary data
  let estimatedFare = "Not available";
  if (selectedAmbulanceType && form.getValues("pickupLatitude") && form.getValues("destinationLatitude")) {
    const pickupLat = form.getValues("pickupLatitude");
    const pickupLng = form.getValues("pickupLongitude");
    const destLat = form.getValues("destinationLatitude") || 0;
    const destLng = form.getValues("destinationLongitude") || 0;
    
    if (destLat && destLng) {
      // Calculate distance (crude approximation)
      const R = 6371; // Earth's radius in km
      const dLat = (destLat - pickupLat) * Math.PI / 180;
      const dLon = (destLng - pickupLng) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(pickupLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      const distance = R * c;
      
      const baseFare = selectedAmbulanceType.basePrice;
      const distanceFare = distance * selectedAmbulanceType.pricePerKm;
      estimatedFare = `₹${(baseFare + distanceFare).toFixed(2)}`;
    } else {
      estimatedFare = `₹${selectedAmbulanceType.basePrice.toFixed(2)}+`;
    }
  }

  return (
    <div className="mb-8">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        {/* Progress Indicator */}
        <div className="bg-gray-100 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="font-medium text-gray-800 dark:text-gray-200 flex-shrink-0">Scheduled Booking</div>
            <div className="ml-4 flex items-center overflow-x-auto py-2">
              <div className="flex-shrink-0 flex items-center">
                <div className={`w-8 h-8 rounded-full ${step >= 1 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'} text-white flex items-center justify-center font-medium`}>1</div>
                <div className={`mx-2 h-1 w-12 ${step >= 2 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                <div className={`w-8 h-8 rounded-full ${step >= 2 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'} text-white flex items-center justify-center font-medium`}>2</div>
                <div className={`mx-2 h-1 w-12 ${step >= 3 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                <div className={`w-8 h-8 rounded-full ${step >= 3 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'} text-white flex items-center justify-center font-medium`}>3</div>
                <div className={`mx-2 h-1 w-12 ${step >= 4 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                <div className={`w-8 h-8 rounded-full ${step >= 4 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'} text-white flex items-center justify-center font-medium`}>4</div>
                <div className={`mx-2 h-1 w-12 ${step >= 5 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
                <div className={`w-8 h-8 rounded-full ${step >= 5 ? 'bg-secondary' : 'bg-gray-300 dark:bg-gray-700'} text-white flex items-center justify-center font-medium`}>5</div>
              </div>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Step 1: Schedule */}
            {step === 1 && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Schedule Your Transport</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please select your preferred date and time for the ambulance service.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <FormField
                    control={form.control}
                    name="scheduledTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date & Time</FormLabel>
                        <div className="flex space-x-2">
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                              <Input
                                type="datetime-local"
                                className="pl-10"
                                min={minDate.toISOString().slice(0, 16)}
                                value={field.value ? field.value.toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  const date = new Date(e.target.value);
                                  field.onChange(date);
                                }}
                              />
                            </div>
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mb-6">
                  <FormField
                    control={form.control}
                    name="bookingPurpose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Booking Purpose</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select booking purpose" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="medical-appointment">Medical Appointment</SelectItem>
                            <SelectItem value="hospital-discharge">Hospital Discharge</SelectItem>
                            <SelectItem value="hospital-transfer">Hospital to Hospital Transfer</SelectItem>
                            <SelectItem value="dialysis">Dialysis Transport</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mb-6">
                  <FormField
                    control={form.control}
                    name="isRecurring"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            This is a recurring transport
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Check this box if you need regular transport on a schedule
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {isRecurring && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <FormField
                      control={form.control}
                      name="recurringPattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recurring Pattern</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recurring pattern" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="biweekly">Bi-weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="recurringEndDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                              <Input
                                type="date"
                                className="pl-10"
                                min={formattedMinDate}
                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                  const date = new Date(e.target.value);
                                  field.onChange(date);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(2)}
                    disabled={!isStepValid()}
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Pickup Location */}
            {step === 2 && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Pickup Location</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please provide the pickup address for your scheduled transport.</p>

                <div className="mb-6">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full justify-start h-12"
                    onClick={useCurrentLocation}
                    disabled={isUsingCurrentLocation}
                  >
                    {isUsingCurrentLocation ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MapPin className="h-4 w-4 mr-2" />
                    )}
                    {isUsingCurrentLocation
                      ? "Getting Your Location..."
                      : "Use My Current Location"}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    This will use your device's GPS to pinpoint your exact location
                  </p>
                </div>

                <div className="mb-6">
                  <FormField
                    control={form.control}
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Or Enter Address Manually</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter pickup address..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mb-6">
                  <FormLabel>Location Preview</FormLabel>
                  <div className="w-full h-48 rounded-md overflow-hidden">
                    <Map
                      center={[40.7128, -74.0060]}
                      markerPosition={
                        form.getValues("pickupLatitude") !== 0
                          ? [form.getValues("pickupLatitude"), form.getValues("pickupLongitude")]
                          : undefined
                      }
                      onMapClick={handleMapClick}
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <FormField
                    control={form.control}
                    name="pickupDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Pickup Details</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Building name, floor, room number, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(3)}
                    disabled={!isStepValid()}
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Destination */}
            {step === 3 && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Destination</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please provide the destination details for your scheduled transport.</p>

                <div className="mb-6">
                  <FormField
                    control={form.control}
                    name="destinationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hospital">Hospital</SelectItem>
                            <SelectItem value="clinic">Medical Clinic</SelectItem>
                            <SelectItem value="residence">Residence</SelectItem>
                            <SelectItem value="nursing-home">Nursing Home</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {destinationType === 'hospital' && (
                  <div className="mb-6">
                    <FormLabel>Select Hospital</FormLabel>
                    {isLoadingHospitals ? (
                      <div className="flex justify-center p-4">
                        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="p-4">
                          <FormField
                            control={form.control}
                            name="hospitalId"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="space-y-4">
                                    {hospitals?.map((hospital) => (
                                      <div key={hospital.id} className="flex items-start">
                                        <RadioGroup
                                          value={field.value?.toString()}
                                          onValueChange={(value) => field.onChange(parseInt(value))}
                                        >
                                          <div className="flex items-start">
                                            <RadioGroupItem 
                                              value={hospital.id.toString()} 
                                              id={`hospital-${hospital.id}`} 
                                              className="mt-1"
                                            />
                                            <div className="ml-3">
                                              <FormLabel 
                                                htmlFor={`hospital-${hospital.id}`}
                                                className="text-base font-medium cursor-pointer"
                                              >
                                                {hospital.name}
                                              </FormLabel>
                                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                                <span className="text-secondary">
                                                  <MapPin className="inline-block h-3 w-3 mr-1" />
                                                  {hospital.address}
                                                </span> • 
                                                {hospital.specialties.map((specialty, i) => (
                                                  <span key={i} className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                    {specialty}
                                                  </span>
                                                ))}
                                              </p>
                                            </div>
                                          </div>
                                        </RadioGroup>
                                      </div>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {destinationType !== 'hospital' && (
                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="destinationAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination Address</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter destination address..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <FormLabel>Location Preview</FormLabel>
                      <div className="w-full h-48 rounded-md overflow-hidden">
                        <Map
                          center={
                            form.getValues("destinationLatitude") !== undefined && form.getValues("destinationLatitude") !== 0
                              ? [form.getValues("destinationLatitude")!, form.getValues("destinationLongitude")!]
                              : [40.7128, -74.0060]
                          }
                          markerPosition={
                            form.getValues("destinationLatitude") !== undefined && form.getValues("destinationLatitude") !== 0
                              ? [form.getValues("destinationLatitude")!, form.getValues("destinationLongitude")!]
                              : undefined
                          }
                          onMapClick={handleDestinationMapClick}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="destinationDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Destination Details</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Department, floor, room number, etc."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(4)}
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {/* Step 4: Patient Information */}
            {step === 4 && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Patient Information</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Please provide information about the patient for this scheduled transport.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="patientDetails.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="patientDetails.age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Age in years" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="patientDetails.gender"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Gender</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex space-x-4"
                          >
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="male" />
                              </FormControl>
                              <FormLabel className="font-normal">Male</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="female" />
                              </FormControl>
                              <FormLabel className="font-normal">Female</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="other" />
                              </FormControl>
                              <FormLabel className="font-normal">Other</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <FormField
                    control={form.control}
                    name="patientDetails.condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical Condition / Reason for Transport</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the patient's condition or reason for transport"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <FormLabel>Relevant Medical History</FormLabel>
                    <span className="text-xs text-gray-500 dark:text-gray-400">(Optional)</span>
                  </div>
                  <div className="mt-2 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {medicalHistoryOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={form.control}
                          name="patientDetails.medicalHistory"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={option.id}
                                className="flex items-center px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, option.id]);
                                      } else {
                                        field.onChange(
                                          currentValue.filter((value) => value !== option.id)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="ml-2 font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <FormLabel>Emergency Contact</FormLabel>
                  </div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContact.name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Contact Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContact.phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Contact Phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(3)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(5)}
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Ambulance Type & Confirmation */}
            {step === 5 && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Ambulance Selection & Confirmation</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Select the appropriate ambulance type and confirm your booking.</p>

                <div className="mb-6">
                  <FormLabel>Available Ambulance Types</FormLabel>
                  {isLoadingTypes ? (
                    <div className="flex justify-center p-4">
                      <Loader2 className="h-8 w-8 animate-spin text-secondary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {ambulanceTypes?.map((type) => (
                        <FormField
                          key={type.id}
                          control={form.control}
                          name="ambulanceTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <AmbulanceTypeCard
                                  ambulanceType={type}
                                  selected={field.value === type.id}
                                  onSelect={() => field.onChange(type.id)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-6 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Booking Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Service Type:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Scheduled</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Date & Time:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {form.getValues("scheduledTime") ? formatDate(form.getValues("scheduledTime")) : "Not selected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Pickup Location:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {form.getValues("pickupAddress")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Destination:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {destinationType === 'hospital' 
                          ? selectedHospital?.name 
                          : form.getValues("destinationAddress")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ambulance Type:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedAmbulanceType?.name || "Not selected"}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                      <span className="text-gray-600 dark:text-gray-400">Estimated Fare:</span>
                      <span className="font-medium text-secondary">{estimatedFare}</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <FormField
                    control={form.control}
                    name="termsAccepted"
                    render={({ field }) => (
                      <FormItem className="flex items-start space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            I confirm that the information provided is accurate and I agree to the terms of service.
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(4)}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="submit"
                    variant="secondary"
                    className="text-base py-6 px-8 h-auto"
                    disabled={bookingMutation.isPending}
                  >
                    {bookingMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Confirm Booking
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
