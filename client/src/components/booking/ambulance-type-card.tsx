import { useState } from "react";
import { AmbulanceType } from "@shared/schema";
import { Ambulance, Heart, Baby, Building2, Brain, PawPrint } from "lucide-react";

interface AmbulanceTypeCardProps {
  ambulanceType: AmbulanceType;
  selected: boolean;
  onSelect: (id: number) => void;
}

const getIconForType = (iconName: string) => {
  switch (iconName) {
    case "ambulance":
      return <Ambulance className="h-5 w-5" />;
    case "heartbeat":
      return <Heart className="h-5 w-5" />;
    case "baby":
      return <Baby className="h-5 w-5" />;
    case "hospital":
      return <Building2 className="h-5 w-5" />;
    case "brain":
      return <Brain className="h-5 w-5" />;
    case "paw":
      return <PawPrint className="h-5 w-5" />;
    default:
      return <Ambulance className="h-5 w-5" />;
  }
};

export function AmbulanceTypeCard({ ambulanceType, selected, onSelect }: AmbulanceTypeCardProps) {
  const { id, name, description, basePrice, pricePerKm, icon } = ambulanceType;
  
  const handleClick = () => {
    onSelect(id);
  };

  const cardClasses = `
    border rounded-lg p-4 cursor-pointer transition-colors duration-150
    ${selected 
      ? 'border-primary bg-primary-50 dark:bg-primary-950 shadow-sm' 
      : 'border-border bg-white dark:bg-card hover:border-primary/60'}
  `;

  return (
    <div className={cardClasses} onClick={handleClick}>
      <div className="flex items-start">
        <div className={`w-10 h-10 rounded-full ${selected ? 'bg-primary' : 'bg-primary-100 dark:bg-primary-900'} flex items-center justify-center ${selected ? 'text-white' : 'text-primary'}`}>
          {getIconForType(icon)}
        </div>
        <div className="ml-4">
          <h4 className="font-medium text-foreground">{name}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-sm font-medium text-primary mt-1">
            ₹{basePrice.toFixed(2)} base + ₹{pricePerKm.toFixed(2)}/km
          </p>
        </div>
      </div>
    </div>
  );
}
