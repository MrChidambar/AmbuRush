import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapProps {
  center: [number, number];
  zoom?: number;
  markerPosition?: [number, number];
  destinationPosition?: [number, number];
  showRoute?: boolean;
  className?: string;
  height?: string;
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  ambulanceMarkers?: {
    position: [number, number];
    icon?: string;
    tooltip?: string;
  }[];
}

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const ambulanceIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/ambulance.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const destinationIcon = L.icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/@mdi/svg@7.2.96/svg/hospital-marker.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

export function Map({
  center,
  zoom = 13,
  markerPosition,
  destinationPosition,
  showRoute = false,
  className = '',
  height = '400px',
  interactive = true,
  onMapClick,
  ambulanceMarkers = []
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const ambulanceMarkersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map
    mapRef.current = L.map(mapContainerRef.current, {
      center,
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapRef.current);

    // Add click handler
    if (interactive && onMapClick) {
      mapRef.current.on('click', (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Initialize map only once

  // Handle marker position changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker if position is provided
    if (markerPosition) {
      markerRef.current = L.marker(markerPosition, { icon: defaultIcon })
        .addTo(mapRef.current)
        .bindTooltip('Pickup Location');
      
      // Center map on marker if interactive
      if (interactive) {
        mapRef.current.setView(markerPosition, mapRef.current.getZoom());
      }
    }
  }, [markerPosition, interactive]);

  // Handle destination position changes
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing destination marker
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Add new destination marker if position is provided
    if (destinationPosition) {
      destinationMarkerRef.current = L.marker(destinationPosition, { icon: destinationIcon })
        .addTo(mapRef.current)
        .bindTooltip('Destination');
    }

    // Update route if both markers are present and route should be shown
    if (showRoute && markerPosition && destinationPosition) {
      if (routeRef.current) {
        routeRef.current.remove();
      }

      // Simple straight line route
      routeRef.current = L.polyline([markerPosition, destinationPosition], {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10'
      }).addTo(mapRef.current);

      // Fit map to show both markers
      if (interactive) {
        const bounds = L.latLngBounds([markerPosition, destinationPosition]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [destinationPosition, markerPosition, showRoute, interactive]);

  // Handle ambulance markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing ambulance markers
    ambulanceMarkersRef.current.forEach(marker => marker.remove());
    ambulanceMarkersRef.current = [];

    // Add new ambulance markers
    ambulanceMarkers.forEach(marker => {
      const newMarker = L.marker(marker.position, { 
        icon: ambulanceIcon 
      })
      .addTo(mapRef.current!);
      
      if (marker.tooltip) {
        newMarker.bindTooltip(marker.tooltip);
      }
      
      ambulanceMarkersRef.current.push(newMarker);
    });
  }, [ambulanceMarkers]);

  return (
    <div 
      ref={mapContainerRef} 
      className={`rounded-md overflow-hidden ${className}`} 
      style={{ height }}
    />
  );
}
