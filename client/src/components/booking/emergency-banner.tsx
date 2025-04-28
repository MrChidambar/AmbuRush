import { AlertTriangle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmergencyBanner() {
  const callEmergency = () => {
    window.open('tel:108');
  };

  return (
    <div className="bg-primary-50 dark:bg-primary-950 border-l-4 border-primary p-4 mb-8 rounded-md shadow-sm">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-6 w-6 text-primary" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-primary-700 dark:text-primary-300">Emergency Services Available 24/7</h3>
          <div className="mt-1 text-sm text-primary-600 dark:text-primary-400">
            For life-threatening emergencies, please call emergency services directly at <strong>108</strong> or use the emergency booking option below.
          </div>
        </div>
        <div className="ml-auto">
          <Button 
            variant="destructive" 
            className="shadow-md" 
            onClick={callEmergency}
          >
            <Phone className="h-4 w-4 mr-2" /> Call 108
          </Button>
        </div>
      </div>
    </div>
  );
}
