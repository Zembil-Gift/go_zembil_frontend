import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Sparkles, Users, Gift, Clock } from 'lucide-react';
import { GiftExperienceModal } from './GiftExperienceModal';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom animated marker icons
const createCustomIcon = (type: 'event' | 'service', count: number) => {
  const size = Math.min(40 + count * 2, 60); // Size based on count
  const color = type === 'event' ? '#F59E0B' : '#10B981'; // Amber for events, green for services
  
  return L.divIcon({
    html: `
      <div class="animate-pulse">
        <div style="
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          animation: bounce 2s infinite;
        ">
          <span style="color: white; font-weight: bold; font-size: ${Math.max(12, size/4)}px;">
            ${count}
          </span>
        </div>
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${size + 20}px;
          height: ${size + 20}px;
          border: 2px solid ${color};
          border-radius: 50%;
          opacity: 0.3;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Animation styles component
const MapAnimations = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0,-8px,0);
        }
        70% {
          transform: translate3d(0,-4px,0);
        }
        90% {
          transform: translate3d(0,-2px,0);
        }
      }
      
      @keyframes ping {
        75%, 100% {
          transform: translate(-50%, -50%) scale(2);
          opacity: 0;
        }
      }
      
      .leaflet-popup-content-wrapper {
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      }
      
      .leaflet-popup-tip {
        border: none;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
};

// Map updater component to handle center changes
const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  
  return null;
};

interface LocationData {
  id: number;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  events: any[];
  services: any[];
}

interface InteractiveLocationMapProps {
  locations: any[];
  events: any[];
  services: any[];
  onLocationSelect: (locationId: number | null) => void;
  selectedLocationId: number | null;
}

export default function InteractiveLocationMap({
  locations,
  events,
  services,
  onLocationSelect,
  selectedLocationId
}: InteractiveLocationMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]); // World view
  const [mapZoom, setMapZoom] = useState(2);
  const [locationData, setLocationData] = useState<LocationData[]>([]);

  // Process location data with events and services
  useEffect(() => {
    const processedLocations = locations
      .filter(loc => loc.latitude && loc.longitude)
      .map(location => {
        const locationEvents = events.filter(event => event.locationId === location.id);
        const locationServices = services.filter(service => 
          service.locationIds && service.locationIds.includes(location.id)
        );
        
        return {
          ...location,
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          events: locationEvents,
          services: locationServices
        };
      });
    
    setLocationData(processedLocations);
  }, [locations, events, services]);

  // Focus on selected location
  useEffect(() => {
    if (selectedLocationId) {
      const location = locationData.find(loc => loc.id === selectedLocationId);
      if (location) {
        setMapCenter([location.latitude, location.longitude]);
        setMapZoom(10);
      }
    } else {
      setMapCenter([20, 0]);
      setMapZoom(2);
    }
  }, [selectedLocationId, locationData]);

  const handleMarkerClick = (locationId: number) => {
    if (selectedLocationId === locationId) {
      onLocationSelect(null); // Deselect if already selected
    } else {
      onLocationSelect(locationId);
    }
  };

  return (
    <div className="space-y-4">
      <MapAnimations />
      
      {/* Map Container */}
      <Card className="overflow-hidden border-amber-200 shadow-lg">
        <div className="h-96 w-full relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
          >
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {locationData.map((location) => {
              const totalCount = location.events.length + location.services.length;
              const hasEvents = location.events.length > 0;
              const hasServices = location.services.length > 0;
              
              // Determine marker type based on what's available
              const markerType = hasEvents ? 'event' : 'service';
              
              return (
                <Marker
                  key={location.id}
                  position={[location.latitude, location.longitude]}
                  icon={createCustomIcon(markerType, totalCount)}
                  eventHandlers={{
                    click: () => handleMarkerClick(location.id)
                  }}
                >
                  <Popup className="custom-popup" maxWidth={300}>
                    <div className="p-3 space-y-3">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-amber-600" />
                        <h3 className="font-bold text-lg text-gray-800">
                          {location.name}, {location.country}
                        </h3>
                      </div>
                      
                      {/* Events Section */}
                      {location.events.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-amber-600" />
                            <span className="font-semibold text-amber-800">
                              {location.events.length} Cultural Events
                            </span>
                          </div>
                          {location.events.slice(0, 2).map((event: any) => (
                            <div key={event.id} className="bg-amber-50 p-2 rounded-lg">
                              <div className="font-medium text-sm text-gray-800">{event.name}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                                <Badge variant="secondary" className="text-xs">
                                  ${event.ticketPrice}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {location.events.length > 2 && (
                            <p className="text-xs text-gray-500">
                              +{location.events.length - 2} more events
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Services Section */}
                      {location.services.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-green-800">
                              {location.services.length} Professional Services
                            </span>
                          </div>
                          {location.services.slice(0, 2).map((service: any) => (
                            <div key={service.id} className="bg-green-50 p-2 rounded-lg">
                              <div className="font-medium text-sm text-gray-800">{service.name}</div>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <Users className="w-3 h-3" />
                                <span>{service.category}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {service.priceType}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {location.services.length > 2 && (
                            <p className="text-xs text-gray-500">
                              +{location.services.length - 2} more services
                            </p>
                          )}
                        </div>
                      )}
                      
                      <Button
                        onClick={() => onLocationSelect(location.id)}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        View All Experiences
                      </Button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </Card>
      
      {/* Location Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {locationData.map((location) => {
          const isSelected = selectedLocationId === location.id;
          return (
            <Card
              key={location.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isSelected
                  ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md'
                  : 'border-gray-200 hover:border-amber-300'
              }`}
              onClick={() => handleMarkerClick(location.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-gray-500'}`} />
                  <span className="font-medium text-sm">{location.name}</span>
                </div>
                <div className="space-y-1">
                  {location.events.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-700">
                      <Calendar className="w-3 h-3" />
                      <span>{location.events.length} events</span>
                    </div>
                  )}
                  {location.services.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-700">
                      <Sparkles className="w-3 h-3" />
                      <span>{location.services.length} services</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}