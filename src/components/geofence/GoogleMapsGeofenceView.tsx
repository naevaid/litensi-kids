import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  MapPin, Shield, ShieldAlert, ShieldCheck, Navigation,
  Smartphone, Battery, Compass, Radio, Layers, Maximize2,
  ZoomIn, ZoomOut, Eye, RefreshCw, Key
} from 'lucide-react';
import { GeofenceZone } from '../../types';

interface ChildLocation {
  id: string;
  name: string;
  device: string;
  lat: number;
  lng: number;
  battery: string;
  accuracy: string;
  status: string;
  zone: string;
  color: string;
  avatar: string;
}

interface GoogleMapsGeofenceViewProps {
  zones: GeofenceZone[];
  selectedZone: GeofenceZone | null;
  onSelectZone: (zone: GeofenceZone) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Inner component to render Google Maps Circle overlays
const GeofenceCircles: React.FC<{
  zones: GeofenceZone[];
  selectedZone: GeofenceZone | null;
  onSelectZone: (zone: GeofenceZone) => void;
}> = ({ zones, selectedZone, onSelectZone }) => {
  const map = useMap();
  const circlesRef = useRef<Record<string, google.maps.Circle>>({});

  useEffect(() => {
    if (!map) return;

    // Clean up previous circles
    Object.values(circlesRef.current).forEach((circle: google.maps.Circle) => {
      if (circle && typeof circle.setMap === 'function') {
        circle.setMap(null);
      }
    });
    circlesRef.current = {};

    zones.forEach(zone => {
      const isSelected = selectedZone?.id === zone.id;
      const circle = new google.maps.Circle({
        map,
        center: { lat: zone.latitude, lng: zone.longitude },
        radius: zone.radiusMeters,
        strokeColor: zone.color,
        strokeOpacity: isSelected ? 0.95 : 0.7,
        strokeWeight: isSelected ? 3 : 1.5,
        fillColor: zone.color,
        fillOpacity: isSelected ? 0.28 : 0.16,
        clickable: true,
        zIndex: isSelected ? 10 : 2
      });

      circle.addListener('click', () => {
        onSelectZone(zone);
      });

      circlesRef.current[zone.id] = circle;
    });

    return () => {
      Object.values(circlesRef.current).forEach((circle: google.maps.Circle) => {
        if (circle && typeof circle.setMap === 'function') {
          circle.setMap(null);
        }
      });
      circlesRef.current = {};
    };
  }, [map, zones, selectedZone, onSelectZone]);

  return null;
};

// Inner component for auto-focusing / camera controls
const MapController: React.FC<{
  targetLocation: { lat: number; lng: number; zoom?: number } | null;
}> = ({ targetLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !targetLocation) return;
    map.panTo({ lat: targetLocation.lat, lng: targetLocation.lng });
    if (targetLocation.zoom) {
      map.setZoom(targetLocation.zoom);
    }
  }, [map, targetLocation]);

  return null;
};

export const GoogleMapsGeofenceView: React.FC<GoogleMapsGeofenceViewProps> = ({
  zones,
  selectedZone,
  onSelectZone,
  showToast
}) => {
  const apiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const mapId = ((import.meta as any).env?.VITE_GOOGLE_MAPS_MAP_ID as string) || 'DEMO_MAP_ID';

  const defaultCenter = { lat: -6.2445, lng: 106.8040 }; // Kebayoran Baru, Jakarta Selatan

  const [childrenLocations, setChildrenLocations] = useState<ChildLocation[]>([
    {
      id: 'child-1',
      name: 'Rayhan',
      device: 'Xiaomi Redmi 10',
      lat: -6.2415,
      lng: 106.8001,
      battery: '84%',
      accuracy: '±5m',
      status: 'Dalam Zona Aman',
      zone: 'Rumah Utama (Safe Zone)',
      color: '#10b981',
      avatar: 'R'
    },
    {
      id: 'child-2',
      name: 'Nadia',
      device: 'Samsung Tab A8',
      lat: -6.2490,
      lng: 106.8055,
      battery: '92%',
      accuracy: '±4m',
      status: 'Di Sekolah',
      zone: 'SD Bintang Kejora (Sekolah)',
      color: '#3b82f6',
      avatar: 'N'
    }
  ]);

  const [activeMarkerInfo, setActiveMarkerInfo] = useState<{
    type: 'child' | 'zone';
    data: any;
  } | null>(null);

  const [targetCamera, setTargetCamera] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);

  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [isSimulatingMove, setIsSimulatingMove] = useState(false);

  // Live location simulation
  const handleSimulateGPSMove = () => {
    setIsSimulatingMove(true);
    setTimeout(() => {
      setChildrenLocations(prev =>
        prev.map(c => {
          const deltaLat = (Math.random() - 0.5) * 0.0008;
          const deltaLng = (Math.random() - 0.5) * 0.0008;
          return {
            ...c,
            lat: Number((c.lat + deltaLat).toFixed(6)),
            lng: Number((c.lng + deltaLng).toFixed(6))
          };
        })
      );
      setIsSimulatingMove(false);
      showToast('Posisi GPS perangkat anak diperbarui secara real-time melalui satelit', 'success');
    }, 450);
  };

  const handleCenterOnChild = (child: ChildLocation) => {
    setTargetCamera({ lat: child.lat, lng: child.lng, zoom: 17 });
    setActiveMarkerInfo({ type: 'child', data: child });
    showToast(`Peta difokuskan ke posisi ${child.name}`, 'info');
  };

  const handleCenterOnZone = (zone: GeofenceZone) => {
    onSelectZone(zone);
    setTargetCamera({ lat: zone.latitude, lng: zone.longitude, zoom: 16 });
    setActiveMarkerInfo({ type: 'zone', data: zone });
    showToast(`Peta difokuskan ke ${zone.name}`, 'info');
  };

  const handleFitAll = () => {
    setTargetCamera({ lat: defaultCenter.lat, lng: defaultCenter.lng, zoom: 14 });
    setActiveMarkerInfo(null);
  };

  return (
    <div className="relative w-full h-[520px] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-900 shadow-md">
      <APIProvider
        apiKey={apiKey}
        libraries={['marker', 'geometry', 'places']}
      >
        <Map
          defaultCenter={defaultCenter}
          defaultZoom={15}
          mapId={mapId}
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {/* Geofence Circles */}
          <GeofenceCircles
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={handleCenterOnZone}
          />

          {/* Camera Controller */}
          <MapController targetLocation={targetCamera} />

          {/* Advanced Markers for Children */}
          {childrenLocations.map(child => (
            <AdvancedMarker
              key={child.id}
              position={{ lat: child.lat, lng: child.lng }}
              title={`${child.name} - ${child.status}`}
              onClick={() => setActiveMarkerInfo({ type: 'child', data: child })}
            >
              <div className="relative flex flex-col items-center cursor-pointer group">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-lg border-2 border-white ring-2 ring-emerald-500/50 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: child.color }}
                >
                  {child.avatar}
                </div>
                <div
                  className="absolute -inset-1 rounded-full animate-ping opacity-60 pointer-events-none"
                  style={{ backgroundColor: child.color }}
                ></div>
                <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-medium border border-slate-700 shadow-xs whitespace-nowrap">
                  {child.name}
                </span>
              </div>
            </AdvancedMarker>
          ))}

          {/* Zone Center Markers */}
          {zones.map(zone => (
            <AdvancedMarker
              key={zone.id}
              position={{ lat: zone.latitude, lng: zone.longitude }}
              title={zone.name}
              onClick={() => handleCenterOnZone(zone)}
            >
              <Pin
                background={zone.color}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                scale={0.9}
              />
            </AdvancedMarker>
          ))}

          {/* Active InfoWindow for Child */}
          {activeMarkerInfo?.type === 'child' && (
            <InfoWindow
              position={{
                lat: activeMarkerInfo.data.lat,
                lng: activeMarkerInfo.data.lng
              }}
              onCloseClick={() => setActiveMarkerInfo(null)}
            >
              <div className="p-1 max-w-xs text-slate-800 space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: activeMarkerInfo.data.color }}
                    ></span>
                    <span className="text-xs font-medium text-slate-900">
                      {activeMarkerInfo.data.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500">
                    {activeMarkerInfo.data.device}
                  </span>
                </div>

                <div className="text-[11px] font-normal text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Status Lokasi:</span>
                    <span className="font-medium text-emerald-700">
                      {activeMarkerInfo.data.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Zona:</span>
                    <span className="font-medium">{activeMarkerInfo.data.zone}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Baterai:</span>
                    <span className="font-medium">{activeMarkerInfo.data.battery}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Akurasi GPS:</span>
                    <span className="font-medium">{activeMarkerInfo.data.accuracy}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1">
                    Koordinat: {activeMarkerInfo.data.lat.toFixed(5)}, {activeMarkerInfo.data.lng.toFixed(5)}
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}

          {/* Active InfoWindow for Zone */}
          {activeMarkerInfo?.type === 'zone' && (
            <InfoWindow
              position={{
                lat: activeMarkerInfo.data.latitude,
                lng: activeMarkerInfo.data.longitude
              }}
              onCloseClick={() => setActiveMarkerInfo(null)}
            >
              <div className="p-1 max-w-xs text-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activeMarkerInfo.data.color }}
                  ></span>
                  <span className="text-xs font-medium text-slate-900">
                    {activeMarkerInfo.data.name}
                  </span>
                </div>
                <div className="text-[11px] font-normal text-slate-600 space-y-1">
                  <p className="text-slate-500">{activeMarkerInfo.data.address}</p>
                  <div className="flex items-center justify-between">
                    <span>Radius Geofence:</span>
                    <span className="font-medium">{activeMarkerInfo.data.radiusMeters} Meter</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Anak Terdaftar:</span>
                    <span className="font-medium">{activeMarkerInfo.data.assignedChildren.join(', ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status:</span>
                    <span className="font-medium text-emerald-700">
                      {activeMarkerInfo.data.status === 'active' ? 'Aktif Beroperasi' : 'Non-aktif'}
                    </span>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Top Floating Map Controls Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        {/* Left Badge: Live Radar Status */}
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md text-white pointer-events-auto">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div className="text-xs font-normal">
            <span>Google Maps GPS: </span>
            <span className="font-medium text-emerald-400">2 Perangkat Aktif</span>
          </div>
          <span className="text-slate-500">|</span>
          <div className="text-[11px] font-normal text-slate-300 flex items-center gap-1">
            <Compass className="w-3 h-3 text-indigo-400" />
            <span>Jakarta Selatan</span>
          </div>
        </div>

        {/* Right Action Quick Filters */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md pointer-events-auto">
          <button
            type="button"
            onClick={() => handleCenterOnChild(childrenLocations[0])}
            className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Fokus ke Rayhan"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Rayhan</span>
          </button>

          <button
            type="button"
            onClick={() => handleCenterOnChild(childrenLocations[1])}
            className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Fokus ke Nadia"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Nadia</span>
          </button>

          <button
            type="button"
            onClick={handleFitAll}
            className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            title="Tampilkan Semua Zona"
          >
            <Maximize2 className="w-3 h-3 text-indigo-400" />
            <span>Semua</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5"></div>

          {/* Map Layer Switcher */}
          <button
            type="button"
            onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              mapTypeId === 'hybrid'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Ganti Mode Peta Satelit / Jalan"
          >
            <Layers className="w-3 h-3" />
            <span>{mapTypeId === 'hybrid' ? 'Satelit' : 'Peta'}</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateGPSMove}
            disabled={isSimulatingMove}
            className="px-2.5 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-950/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Simulasikan pergerakan posisi anak di Google Maps"
          >
            <RefreshCw className={`w-3 h-3 ${isSimulatingMove ? 'animate-spin' : ''}`} />
            <span>Update Posisi</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none z-10">
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md text-xs pointer-events-auto">
          <span className="text-[11px] text-slate-300 font-normal flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Zona Rumah
          </span>
          <span className="text-[11px] text-slate-300 font-normal flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Sekolah
          </span>
          <span className="text-[11px] text-slate-300 font-normal flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Les / Bimbel
          </span>
          <span className="text-[11px] text-slate-300 font-normal flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Zona Bahaya
          </span>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md text-[11px] text-slate-300 font-normal pointer-events-auto flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Klik lingkaran radius untuk melihat info zona</span>
        </div>
      </div>
    </div>
  );
};
