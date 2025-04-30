/**
 * Route Optimizer for Ambulance Services
 * Inspired by AmbuRouteAI system
 */

// Types for locations and route data
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance: string;
  duration: string;
  trafficDensity: 'low' | 'medium' | 'high';
  avoidTrafficSignals: boolean;
}

export interface OptimizedRoute {
  startLocation: GeoCoordinate;
  endLocation: GeoCoordinate;
  routeInfo: RouteInfo;
  waypoints: GeoCoordinate[];
  alternativeRoutes?: {
    routeInfo: RouteInfo;
    waypoints: GeoCoordinate[];
  }[];
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Convert distance in kilometers to appropriate format
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Estimate travel time based on distance and average speed
 * @param distanceKm Distance in kilometers
 * @param avgSpeedKmh Average speed in km/h, varies based on traffic density
 */
export function estimateTravelTime(distanceKm: number, avgSpeedKmh: number): string {
  // Calculate time in minutes
  const timeMinutes = (distanceKm / avgSpeedKmh) * 60;
  
  if (timeMinutes < 1) {
    return 'Less than a minute';
  }
  
  if (timeMinutes < 60) {
    return `${Math.round(timeMinutes)} mins`;
  }
  
  const hours = Math.floor(timeMinutes / 60);
  const mins = Math.round(timeMinutes % 60);
  
  if (mins === 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  
  return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} mins`;
}

/**
 * Get average speed based on traffic density and whether it's an emergency
 */
function getAverageSpeed(trafficDensity: 'low' | 'medium' | 'high', isEmergency: boolean): number {
  // Base speeds in km/h
  const speeds = {
    low: 50,
    medium: 30,
    high: 15
  };
  
  // Emergency vehicles can move faster
  const emergencyMultiplier = isEmergency ? 1.4 : 1;
  
  return speeds[trafficDensity] * emergencyMultiplier;
}

/**
 * Generate waypoints along a path
 */
function generateWaypoints(start: GeoCoordinate, end: GeoCoordinate, count: number): GeoCoordinate[] {
  const waypoints: GeoCoordinate[] = [];
  
  for (let i = 0; i <= count; i++) {
    const ratio = i / count;
    waypoints.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio
    });
  }
  
  return waypoints;
}

/**
 * Get fastest route between two points
 * In a real implementation, this would use Google Maps or other routing APIs
 */
export async function getFastestRoute(
  startLocation: GeoCoordinate,
  endLocation: GeoCoordinate,
  isEmergency: boolean = false,
  includeAlternatives: boolean = false
): Promise<OptimizedRoute> {
  // Calculate direct distance
  const distanceKm = calculateDistance(
    startLocation.latitude,
    startLocation.longitude,
    endLocation.latitude,
    endLocation.longitude
  );
  
  // Simulate traffic density based on distance (in a real app, this would come from an API)
  let trafficDensity: 'low' | 'medium' | 'high';
  
  if (distanceKm < 3) {
    trafficDensity = 'high'; // Urban areas tend to have higher traffic
  } else if (distanceKm < 10) {
    trafficDensity = 'medium';
  } else {
    trafficDensity = 'low'; // Highway/rural areas
  }
  
  // Get average speed based on traffic and emergency status
  const avgSpeed = getAverageSpeed(trafficDensity, isEmergency);
  
  // Estimate travel time
  const duration = estimateTravelTime(distanceKm, avgSpeed);
  
  // For emergency vehicles, we'll assume traffic signals are avoided
  const avoidTrafficSignals = isEmergency;
  
  // Generate route info
  const routeInfo: RouteInfo = {
    distance: formatDistance(distanceKm),
    duration,
    trafficDensity,
    avoidTrafficSignals
  };
  
  // Generate waypoints (simulate a realistic route)
  const numWaypoints = Math.max(3, Math.round(distanceKm * 1.5));
  const waypoints = generateWaypoints(startLocation, endLocation, numWaypoints);
  
  // For alternative routes (if requested)
  const alternativeRoutes = includeAlternatives ? [
    // Slightly longer alternative
    {
      routeInfo: {
        distance: formatDistance(distanceKm * 1.15),
        duration: estimateTravelTime(distanceKm * 1.15, getAverageSpeed('low', isEmergency)),
        trafficDensity: 'low',
        avoidTrafficSignals: true
      },
      waypoints: generateWaypoints(
        startLocation,
        {
          latitude: (startLocation.latitude + endLocation.latitude) / 2 + 0.01,
          longitude: (startLocation.longitude + endLocation.longitude) / 2 + 0.01
        },
        Math.round(numWaypoints / 2)
      ).concat(
        generateWaypoints(
          {
            latitude: (startLocation.latitude + endLocation.latitude) / 2 + 0.01,
            longitude: (startLocation.longitude + endLocation.longitude) / 2 + 0.01
          },
          endLocation,
          Math.round(numWaypoints / 2)
        )
      )
    },
    // Another alternative with medium traffic
    {
      routeInfo: {
        distance: formatDistance(distanceKm * 0.95),
        duration: estimateTravelTime(distanceKm * 0.95, getAverageSpeed('medium', isEmergency)),
        trafficDensity: 'medium',
        avoidTrafficSignals: isEmergency
      },
      waypoints: generateWaypoints(
        startLocation,
        {
          latitude: (startLocation.latitude + endLocation.latitude) / 2 - 0.005,
          longitude: (startLocation.longitude + endLocation.longitude) / 2 - 0.005
        },
        Math.round(numWaypoints / 2)
      ).concat(
        generateWaypoints(
          {
            latitude: (startLocation.latitude + endLocation.latitude) / 2 - 0.005,
            longitude: (startLocation.longitude + endLocation.longitude) / 2 - 0.005
          },
          endLocation,
          Math.round(numWaypoints / 2)
        )
      )
    }
  ] : undefined;
  
  return {
    startLocation,
    endLocation,
    routeInfo,
    waypoints,
    alternativeRoutes
  };
}

/**
 * Check if an ambulance is near a traffic signal
 * This would interface with traffic management systems in a real implementation
 */
export function isAmbulanceNearTrafficSignal(
  ambulanceLocation: GeoCoordinate,
  trafficSignalLocation: GeoCoordinate
): boolean {
  const distanceKm = calculateDistance(
    ambulanceLocation.latitude,
    ambulanceLocation.longitude,
    trafficSignalLocation.latitude,
    trafficSignalLocation.longitude
  );
  
  // Consider ambulance near if within 200 meters
  return distanceKm < 0.2;
}

/**
 * Translate route to a format usable by mapping libraries like Leaflet
 */
export function convertToLeafletPath(waypoints: GeoCoordinate[]): [number, number][] {
  return waypoints.map(point => [point.latitude, point.longitude]);
}

/**
 * Calculate ETA to hospital
 */
export function calculateETA(
  currentLocation: GeoCoordinate,
  hospitalLocation: GeoCoordinate,
  isEmergency: boolean = true
): Promise<string> {
  return getFastestRoute(currentLocation, hospitalLocation, isEmergency)
    .then(route => route.routeInfo.duration);
}