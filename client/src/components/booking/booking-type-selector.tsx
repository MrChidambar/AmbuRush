import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar } from "lucide-react";

interface BookingTypeSelectorProps {
  bookingType: "emergency" | "non-emergency";
  onBookingTypeChange: (type: "emergency" | "non-emergency") => void;
}

export function BookingTypeSelector({ 
  bookingType, 
  onBookingTypeChange 
}: BookingTypeSelectorProps) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">Request an Ambulance</h2>
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <Button
            variant={bookingType === "emergency" ? "destructive" : "outline"}
            className={`flex-1 text-lg font-semibold py-6 px-6 h-auto justify-start ${
              bookingType === "emergency" ? "" : "text-gray-800 dark:text-gray-200"
            }`}
            onClick={() => onBookingTypeChange("emergency")}
          >
            <AlertTriangle className="mr-2 h-5 w-5" />
            Emergency
            <span className="ml-2 text-xs bg-white bg-opacity-20 dark:bg-black dark:bg-opacity-20 px-2 py-1 rounded">
              Immediate
            </span>
          </Button>
          
          <Button
            variant={bookingType === "non-emergency" ? "default" : "outline"}
            className={`flex-1 text-lg font-semibold py-6 px-6 h-auto justify-start ${
              bookingType === "non-emergency" ? "bg-secondary text-secondary-foreground" : "text-gray-800 dark:text-gray-200"
            }`}
            onClick={() => onBookingTypeChange("non-emergency")}
          >
            <Calendar className="mr-2 h-5 w-5" />
            Non-Emergency
            <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              Scheduled
            </span>
          </Button>
        </div>

        <div className="mt-6">
          {bookingType === "emergency" ? (
            <div className="text-sm text-gray-600 dark:text-gray-300 p-4 bg-primary-50 dark:bg-primary-950 rounded-md border border-primary-100 dark:border-primary-900">
              <p className="font-medium text-primary-800 dark:text-primary-300 mb-1">Emergency Service</p>
              <p>For immediate medical assistance in critical situations. Our closest ambulance will be dispatched right away with priority routing.</p>
              <p className="mt-2"><strong>Average response time:</strong> 5-10 minutes</p>
            </div>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Non-Emergency Service</p>
              <p>Schedule an ambulance for planned medical transport, hospital transfers, or non-urgent medical needs.</p>
              <p className="mt-2"><strong>Booking window:</strong> 2 hours to 7 days in advance</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
