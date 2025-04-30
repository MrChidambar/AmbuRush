/**
 * Server-side Route Optimization Service
 * Based on AmbuRouteAI principles for emergency vehicle routing
 */

// Interface for coordinates
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

// Interface for traffic signal status
interface TrafficSignal {
  id: string;
  location: GeoCoordinate;
  status: 'red' | 'green' | 'yellow';
  canOverride: boolean;
}

// Interface for routes
export interface RouteInfo {
  distance: string;
  durationSeconds: number;
  durationText: string;
  trafficDensity: 'low' | 'medium' | 'high';
  waypoints: GeoCoordinate[];
  trafficSignalsAvoided?: number;
}

// A map of active traffic signals (would integrate with city infrastructure)
const trafficSignals: Map<string, TrafficSignal> = new Map();

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
 * Format distance for display
 */
function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Format duration for display
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min${minutes > 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes > 1 ? 's' : ''}`;
}

/**
 * Get average speed based on traffic density and emergency status
 */
function getAverageSpeed(
  trafficDensity: 'low' | 'medium' | 'high',
  isEmergency: boolean
): number {
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
 * Generate waypoints between two locations
 */
function generateWaypoints(
  start: GeoCoordinate,
  end: GeoCoordinate,
  count: number
): GeoCoordinate[] {
  const waypoints: GeoCoordinate[] = [start];
  
  for (let i = 1; i < count; i++) {
    const ratio = i / count;
    waypoints.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio
    });
  }
  
  waypoints.push(end);
  return waypoints;
}

/**
 * Add some randomness to waypoints to simulate real roads
 */
function addRoadVariation(waypoints: GeoCoordinate[]): GeoCoordinate[] {
  return waypoints.map((point, index) => {
    // Don't modify first and last points
    if (index === 0 || index === waypoints.length - 1) {
      return point;
    }
    
    // Add slight random variation
    const variation = 0.002 * (Math.random() - 0.5);
    return {
      latitude: point.latitude + variation,
      longitude: point.longitude + variation
    };
  });
}

/**
 * Get potential traffic signals along a route
 */
function getTrafficSignalsOnRoute(waypoints: GeoCoordinate[]): TrafficSignal[] {
  const signals: TrafficSignal[] = [];
  
  // In a real implementation, this would query a traffic management system
  for (const signal of trafficSignals.values()) {
    // Check if signal is near any waypoint
    for (const waypoint of waypoints) {
      const distance = calculateDistance(
        waypoint.latitude,
        waypoint.longitude,
        signal.location.latitude,
        signal.location.longitude
      );
      
      // If signal is within 100 meters of the route
      if (distance < 0.1) {
        signals.push(signal);
        break;
      }
    }
  }
  
  return signals;
}

/**
 * Get the fastest route for an ambulance
 */
export async function getFastestRoute(
  startLocation: GeoCoordinate,
  endLocation: GeoCoordinate,
  isEmergency: boolean = false
): Promise<RouteInfo> {
  // Calculate direct distance
  const distanceKm = calculateDistance(
    startLocation.latitude,
    startLocation.longitude,
    endLocation.latitude,
    endLocation.longitude
  );
  
  // Determine traffic density (in a real system, this would come from traffic APIs)
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
  
  // Calculate duration in seconds
  const durationSeconds = Math.round((distanceKm / avgSpeed) * 3600);
  
  // Generate waypoints for the route
  const pointCount = Math.max(5, Math.round(distanceKm * 2));
  let waypoints = generateWaypoints(startLocation, endLocation, pointCount);
  
  // Add road variations to make it more realistic
  waypoints = addRoadVariation(waypoints);
  
  // For emergency vehicles, we can simulate traffic signal avoidance
  let trafficSignalsAvoided = 0;
  if (isEmergency) {
    const signalsOnRoute = getTrafficSignalsOnRoute(waypoints);
    trafficSignalsAvoided = signalsOnRoute.length;
    
    // In a real system, we would integrate with the traffic management system
    // to change signals to green for ambulances
  }
  
  return {
    distance: formatDistance(distanceKm),
    durationSeconds,
    durationText: formatDuration(durationSeconds),
    trafficDensity,
    waypoints,
    trafficSignalsAvoided: isEmergency ? trafficSignalsAvoided : undefined
  };
}

/**
 * Get alternative routes
 */
export async function getAlternativeRoutes(
  startLocation: GeoCoordinate,
  endLocation: GeoCoordinate,
  isEmergency: boolean = false
): Promise<RouteInfo[]> {
  // Get primary route first
  const primaryRoute = await getFastestRoute(startLocation, endLocation, isEmergency);
  
  // Generate alternative routes
  const alternatives: RouteInfo[] = [primaryRoute];
  
  // Add a slightly longer route with lower traffic
  const distanceKm = calculateDistance(
    startLocation.latitude,
    startLocation.longitude,
    endLocation.latitude,
    endLocation.longitude
  );
  
  // Alternative 1: Longer distance but lower traffic
  const altDistance1 = distanceKm * 1.2; // 20% longer
  const altTraffic1 = 'low';
  const altSpeed1 = getAverageSpeed(altTraffic1, isEmergency);
  const altDuration1 = Math.round((altDistance1 / altSpeed1) * 3600);
  
  // Generate waypoints with a different path
  const alt1MidPoint = {
    latitude: (startLocation.latitude + endLocation.latitude) / 2 + 0.01,
    longitude: (startLocation.longitude + endLocation.longitude) / 2 + 0.01
  };
  
  let waypoints1 = [
    startLocation,
    {
      latitude: startLocation.latitude + (alt1MidPoint.latitude - startLocation.latitude) * 0.3,
      longitude: startLocation.longitude + (alt1MidPoint.longitude - startLocation.longitude) * 0.3
    },
    alt1MidPoint,
    {
      latitude: alt1MidPoint.latitude + (endLocation.latitude - alt1MidPoint.latitude) * 0.7,
      longitude: alt1MidPoint.longitude + (endLocation.longitude - alt1MidPoint.longitude) * 0.7
    },
    endLocation
  ];
  
  waypoints1 = addRoadVariation(waypoints1);
  
  alternatives.push({
    distance: formatDistance(altDistance1),
    durationSeconds: altDuration1,
    durationText: formatDuration(altDuration1),
    trafficDensity: altTraffic1,
    waypoints: waypoints1,
    trafficSignalsAvoided: isEmergency ? 1 : undefined
  });
  
  // Alternative 2: Slightly shorter but higher traffic
  const altDistance2 = distanceKm * 0.9; // 10% shorter
  const altTraffic2 = 'medium';
  const altSpeed2 = getAverageSpeed(altTraffic2, isEmergency);
  const altDuration2 = Math.round((altDistance2 / altSpeed2) * 3600);
  
  // Generate waypoints with yet another different path
  const alt2MidPoint = {
    latitude: (startLocation.latitude + endLocation.latitude) / 2 - 0.008,
    longitude: (startLocation.longitude + endLocation.longitude) / 2 - 0.008
  };
  
  let waypoints2 = [
    startLocation,
    {
      latitude: startLocation.latitude + (alt2MidPoint.latitude - startLocation.latitude) * 0.4,
      longitude: startLocation.longitude + (alt2MidPoint.longitude - startLocation.longitude) * 0.4
    },
    alt2MidPoint,
    {
      latitude: alt2MidPoint.latitude + (endLocation.latitude - alt2MidPoint.latitude) * 0.6,
      longitude: alt2MidPoint.longitude + (endLocation.longitude - alt2MidPoint.longitude) * 0.6
    },
    endLocation
  ];
  
  waypoints2 = addRoadVariation(waypoints2);
  
  alternatives.push({
    distance: formatDistance(altDistance2),
    durationSeconds: altDuration2,
    durationText: formatDuration(altDuration2),
    trafficDensity: altTraffic2,
    waypoints: waypoints2,
    trafficSignalsAvoided: isEmergency ? 3 : undefined
  });
  
  return alternatives;
}

/**
 * Check if an ambulance is near a traffic signal
 */
export function isAmbulanceNearTrafficSignal(
  ambulanceLocation: GeoCoordinate,
  signalId?: string
): boolean {
  // If a specific signal ID is provided, check only that signal
  if (signalId && trafficSignals.has(signalId)) {
    const signal = trafficSignals.get(signalId)!;
    const distance = calculateDistance(
      ambulanceLocation.latitude,
      ambulanceLocation.longitude,
      signal.location.latitude,
      signal.location.longitude
    );
    return distance < 0.2; // Within 200 meters
  }
  
  // Otherwise check all signals
  for (const signal of trafficSignals.values()) {
    const distance = calculateDistance(
      ambulanceLocation.latitude,
      ambulanceLocation.longitude,
      signal.location.latitude,
      signal.location.longitude
    );
    
    if (distance < 0.2) { // Within 200 meters
      return true;
    }
  }
  
  return false;
}

/**
 * Override a traffic signal for an ambulance
 * In a real system, this would integrate with smart traffic systems
 */
export function overrideTrafficSignal(signalId: string, ambulanceId: string): boolean {
  if (!trafficSignals.has(signalId)) {
    return false;
  }
  
  const signal = trafficSignals.get(signalId)!;
  
  if (!signal.canOverride) {
    return false;
  }
  
  // Set signal to green for ambulance
  signal.status = 'green';
  
  // In a real system, we would trigger the actual light change
  // and schedule it to revert after ambulance passes
  
  console.log(`Traffic signal ${signalId} overridden to GREEN for ambulance ${ambulanceId}`);
  return true;
}

/**
 * Initialize some mock traffic signals for testing
 * In a real system, these would come from a city's traffic management API
 */
export function initializeMockTrafficSignals(locationCenter: GeoCoordinate, count: number = 10): void {
  // Clear existing signals
  trafficSignals.clear();
  
  // Create signals around the specified center
  for (let i = 0; i < count; i++) {
    // Generate random offsets (+/- ~5 km)
    const latOffset = (Math.random() - 0.5) * 0.09;
    const lngOffset = (Math.random() - 0.5) * 0.09;
    
    const signalId = `signal-${i + 1}`;
    
    trafficSignals.set(signalId, {
      id: signalId,
      location: {
        latitude: locationCenter.latitude + latOffset,
        longitude: locationCenter.longitude + lngOffset
      },
      status: Math.random() > 0.5 ? 'red' : 'green',
      canOverride: Math.random() > 0.3 // 70% of signals can be overridden
    });
  }
  
  console.log(`Initialized ${count} mock traffic signals around ${locationCenter.latitude}, ${locationCenter.longitude}`);
}