import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap
} from '@vis.gl/react-google-maps';
import {
  Search, MapPin, Navigation, Crosshair,
  Layers, Check, RefreshCw
} from 'lucide-react';

interface GoogleMapsLocationPickerProps {
  initialLat: number;
  initialLng: number;
  initialAddress: string;
  radiusMeters: number;
  categoryColor: string;
  onLocationSelected: (data: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
  height?: string;
}

// Inner Circle Overlay Component for the picker
const PickerCircle: React.FC<{
  lat: number;
  lng: number;
  radius: number;
  color: string;
}> = ({ lat, lng, radius, color }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map,
        center: { lat, lng },
        radius,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.22,
        clickable: false
      });
    } else {
      circleRef.current.setCenter({ lat, lng });
      circleRef.current.setRadius(radius);
      circleRef.current.setOptions({
        strokeColor: color,
        fillColor: color
      });
    }

    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [map, lat, lng, radius, color]);

  return null;
};

// Map click & pan controller
const MapEventsHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  targetCenter: { lat: number; lng: number } | null;
}> = ({ onMapClick, targetCenter }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, onMapClick]);

  useEffect(() => {
    if (!map || !targetCenter) return;
    map.panTo({ lat: targetCenter.lat, lng: targetCenter.lng });
  }, [map, targetCenter]);

  return null;
};

export const GoogleMapsLocationPicker: React.FC<GoogleMapsLocationPickerProps> = ({
  initialLat,
  initialLng,
  initialAddress,
  radiusMeters,
  categoryColor,
  onLocationSelected,
  height = '320px'
}) => {
  const apiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const mapId = ((import.meta as any).env?.VITE_GOOGLE_MAPS_MAP_ID as string) || '';

  // ZERO HARDCODE: JIKA initial 0,0 TIDAK BOLEH DI OVERRIDE JAKARTA MONAS.
  // Solusi: Tengah Indonesia (-2.5, 118) sebagai default netral, lalu coba geolocate user.
  const isInitialZero = Number(initialLat) === 0 && Number(initialLng) === 0;
  const INITIAL_DEFAULT_FALLBACK = { lat: -2.5, lng: 118 };
  const resolveInitialCoords = (): { lat: number; lng: number } => {
    if (Number(initialLat) === 0 && Number(initialLng) === 0) return INITIAL_DEFAULT_FALLBACK;
    return { lat: Number(initialLat || INITIAL_DEFAULT_FALLBACK.lat), lng: Number(initialLng || INITIAL_DEFAULT_FALLBACK.lng) };
  };

  const [currentLat, setCurrentLat] = useState<number>(() => resolveInitialCoords().lat);
  const [currentLng, setCurrentLng] = useState<number>(() => resolveInitialCoords().lng);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [targetCenter, setTargetCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [addressPreview, setAddressPreview] = useState<string>(initialAddress || '');
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Jika initial = 0,0 → otomatis coba geolocate user saat component mount
  useEffect(() => {
    if (!isInitialZero || typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLat(lat);
        setCurrentLng(lng);
        setTargetCenter({ lat, lng });
        handleReverseGeocode(lat, lng);
        setIsLocating(false);
      },
      (_err) => {
        if (cancelled) return;
        setIsLocating(false);
        // User tidak izinkan / error → tetap default Tengah Indonesia (jangan override ke Jakarta)
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 60_000 }
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialZero]);

  // Reverse geocode helper using native Maps API Geocoder or fallback
  const handleReverseGeocode = useCallback((lat: number, lng: number) => {
    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const formatted = results[0].formatted_address;
          setAddressPreview(formatted);
          onLocationSelected({ lat, lng, address: formatted });
        } else {
          const fallback = `Lokasi Geofence (${lat.toFixed(5)}, ${lng.toFixed(5)})`;
          setAddressPreview(fallback);
          onLocationSelected({ lat, lng, address: fallback });
        }
      });
    } else {
      const fallback = `Titik Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddressPreview(fallback);
      onLocationSelected({ lat, lng, address: fallback });
    }
  }, [onLocationSelected]);

  // When user clicks map
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
    setTargetCenter({ lat, lng });
    handleReverseGeocode(lat, lng);
  }, [handleReverseGeocode]);

  // When marker is dragged
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentLat(lat);
      setCurrentLng(lng);
      handleReverseGeocode(lat, lng);
    }
  };

  // Search address or place query
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);

    if (typeof google !== 'undefined' && google.maps && google.maps.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: searchQuery, region: 'id' }, (results, status) => {
        setIsSearching(false);
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const lat = loc.lat();
          const lng = loc.lng();
          const formatted = results[0].formatted_address;

          setCurrentLat(lat);
          setCurrentLng(lng);
          setAddressPreview(formatted);
          setTargetCenter({ lat, lng });
          onLocationSelected({ lat, lng, address: formatted });
        }
      });
    } else {
      setTimeout(() => {
        setIsSearching(false);
      }, 300);
    }
  };

  // Browser HTML5 Geolocation
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentLat(lat);
          setCurrentLng(lng);
          setTargetCenter({ lat, lng });
          handleReverseGeocode(lat, lng);
        },
        (err) => {
          setIsLocating(false);
          console.warn('Geolocation error:', err);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Search Input & Action Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ketik nama tempat, sekolah, jalan, atau patokan di Google Maps..."
            className="w-full pl-8 pr-20 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-normal text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {isSearching ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <span>Cari Lokasi</span>
            )}
          </button>
        </form>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="px-2.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Deteksi posisi GPS saya saat ini"
          >
            <Crosshair className={`w-3.5 h-3.5 text-indigo-500 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Lokasi Saya</span>
          </button>

          <button
            type="button"
            onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
            className="px-2.5 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
            title="Ubah tipe peta"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>{mapTypeId === 'hybrid' ? 'Satelit' : 'Peta'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas Container */}
      <div
        className="relative w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 shadow-inner"
        style={{ height }}
      >
        <APIProvider
          apiKey={apiKey}
          libraries={['marker', 'geometry', 'places']}
        >
          <Map
            defaultCenter={{ lat: currentLat, lng: currentLng }}
            defaultZoom={16}
            mapId={mapId}
            mapTypeId={mapTypeId}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          >
            {/* Click & Pan handler */}
            <MapEventsHandler
              onMapClick={handleMapClick}
              targetCenter={targetCenter}
            />

            {/* Geofence Perimeter Radius Circle */}
            <PickerCircle
              lat={currentLat}
              lng={currentLng}
              radius={radiusMeters}
              color={categoryColor}
            />

            {/* Interactive Draggable Center Pin */}
            <AdvancedMarker
              position={{ lat: currentLat, lng: currentLng }}
              title="Geser atau klik peta untuk menentukan titik pusat geofence"
            >
              <div className="relative flex flex-col items-center cursor-move group">
                <Pin
                  background={categoryColor}
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                  scale={1.1}
                />
                <span className="mt-1 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-medium border border-slate-700 shadow-md whitespace-nowrap">
                  Pusat Radius ({radiusMeters}m)
                </span>
              </div>
            </AdvancedMarker>
          </Map>
        </APIProvider>

        {/* Top Floating Helper Overlay */}
        <div className="absolute top-2 left-2 right-2 pointer-events-none flex items-center justify-between gap-2">
          <div className="bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700 text-white text-[11px] font-normal shadow-md pointer-events-auto flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Klik di area peta mana saja untuk memindahkan pin lokasi</span>
          </div>
        </div>

        {/* Bottom Coordinates & Radius HUD Overlay */}
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none flex flex-wrap items-center justify-between gap-2">
          <div className="bg-slate-900/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-700 text-white text-[11px] font-normal shadow-md pointer-events-auto flex items-center gap-2">
            <span className="text-emerald-400 font-medium">GPS:</span>
            <span>{currentLat.toFixed(5)}, {currentLng.toFixed(5)}</span>
            <span className="text-slate-500">|</span>
            <span>Radius: <span className="text-amber-300 font-medium">{radiusMeters}m</span></span>
          </div>

          <div className="bg-emerald-950/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-emerald-700/80 text-emerald-200 text-[11px] font-medium shadow-md pointer-events-auto flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-400" />
            <span>Pin Terpasang</span>
          </div>
        </div>
      </div>

      {/* Selected Location Address Feedback */}
      {addressPreview && (
        <div className="p-2.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-xs flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 flex-1">
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
              Alamat Terpilih dari Google Maps:
            </div>
            <div className="text-slate-700 dark:text-slate-300 font-normal text-[11px]">
              {addressPreview}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
