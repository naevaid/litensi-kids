import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap
} from '@vis.gl/react-google-maps';
import {
  Layers, Compass, ZoomIn, ZoomOut, RefreshCw, Radio,
  Smartphone, Battery, Wifi, ShieldCheck, MapPin, Check
} from 'lucide-react';

export interface ChildDeviceMonitor {
  id: string;
  name: string;
  age: string;
  avatar: string;
  deviceModel: string;
  battery: number;
  isOnline: boolean;
  status: string;
  locationName: string;
  latitude: number;
  longitude: number;
  lastUpdated: string;
  isLocked: boolean;
}

interface GoogleMapsMonitorCanvasProps {
  childrenList: ChildDeviceMonitor[];
  activeChild: ChildDeviceMonitor;
  onSelectChild: (childId: string) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  // (G5.3) Props Live GPS update polling real 30 detik high frequency 5s
  onForceLiveUpdate: () => void;
  forceLiveActive: boolean;
  childrenOverlay?: React.ReactNode;
}

// Inner Controller to manage Map Camera pan / zoom programmatically
const MapCameraController: React.FC<{
  target: { lat: number; lng: number; zoom?: number } | null;
}> = ({ target }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom) {
      map.setZoom(target.zoom);
    }
  }, [map, target]);

  return null;
};

// Inner Safe Geofence Radius Circle around Active Child
const ActiveChildGeofenceCircle: React.FC<{
  center: { lat: number; lng: number };
  radiusMeters?: number;
}> = ({ center, radiusMeters = 300 }) => {
  const map = useMap();
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    if (circleRef.current && typeof circleRef.current.setMap === 'function') {
      circleRef.current.setMap(null);
    }

    const circle = new google.maps.Circle({
      map,
      center,
      radius: radiusMeters,
      strokeColor: '#6366f1',
      strokeOpacity: 0.85,
      strokeWeight: 2,
      fillColor: '#6366f1',
      fillOpacity: 0.12,
      clickable: false,
      zIndex: 1
    });

    circleRef.current = circle;

    return () => {
      if (circleRef.current && typeof circleRef.current.setMap === 'function') {
        circleRef.current.setMap(null);
      }
    };
  }, [map, center.lat, center.lng, radiusMeters]);

  return null;
};

export const GoogleMapsMonitorCanvas: React.FC<GoogleMapsMonitorCanvasProps> = ({
  childrenList,
  activeChild,
  onSelectChild,
  showToast,
  onForceLiveUpdate,
  forceLiveActive,
  childrenOverlay
}) => {
  const apiKey = ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const mapId = ((import.meta as any).env?.VITE_GOOGLE_MAPS_MAP_ID as string) || 'DEMO_MAP_ID';

  const [mapTypeId, setMapTypeId] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('roadmap');
  const [selectedMarkerChild, setSelectedMarkerChild] = useState<ChildDeviceMonitor | null>(null);
  const [targetCamera, setTargetCamera] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Auto focus to active child when activeChild changes
  useEffect(() => {
    if (activeChild) {
      setTargetCamera({
        lat: activeChild.latitude,
        lng: activeChild.longitude,
        zoom: 16
      });
    }
  }, [activeChild.id, activeChild.latitude, activeChild.longitude]);

  // (FIX MONITOR 2) SINKRONISASI STATE selectedMarkerChild DENGAN DATA POLLING TERBARU:
  // SEBELUMNYA: selectedMarkerChild = STATE SNAPSHOT yang disimpan SAAT KLIK MARKER.
  //   Setelah polling refresh data (tiap 5s), activeChild (top left floating card) menampilkan
  //   lastUpdated TERBARU (mis "5 mnt lalu"), tapi InfoWindow marker tetap menampilkan
  //   selectedMarkerChild.state KLIK AWAL (mis "11 mnt lalu"). → KLIK USER BINGUNG beda timestamp
  //   card vs tooltip marker.
  // SOLUSI: useEffect dependency = [activeChild, childrenList]. Setiap childrenList berubah
  //   (polling selesai) atau activeChild berubah (dipilih via dropdown/marker),
  //   JIKA selectedMarkerChild ada dan ID-nya MATCH → UPDATE state selectedMarkerChild
  //   dengan DATA TERBARU dari childrenList polling (bukan snapshot lama).
  useEffect(() => {
    if (!selectedMarkerChild) return;
    // Prioritas 1: activeChild.id sama dengan selectedMarkerChild.id → pakai activeChild (pasti terbaru polling)
    if (activeChild?.id && activeChild.id === selectedMarkerChild.id) {
      // Hanya update jika ada field lastUpdated yang berbeda (hindari re-render tak perlu)
      if (
        activeChild.lastUpdated !== selectedMarkerChild.lastUpdated ||
        activeChild.battery !== selectedMarkerChild.battery ||
        activeChild.status !== selectedMarkerChild.status ||
        activeChild.latitude !== selectedMarkerChild.latitude ||
        activeChild.longitude !== selectedMarkerChild.longitude ||
        activeChild.locationName !== selectedMarkerChild.locationName
      ) {
        setSelectedMarkerChild(activeChild);
      }
      return;
    }
    // Prioritas 2: selected bukan active tapi ada di childrenList (ada marker lain yang diklik user)
    // → cari di childrenList polling terbaru dengan ID match → update value latest
    const latestFromPoll = childrenList?.find((c: ChildDeviceMonitor) => c.id === selectedMarkerChild.id);
    if (latestFromPoll) {
      if (
        latestFromPoll.lastUpdated !== selectedMarkerChild.lastUpdated ||
        latestFromPoll.battery !== selectedMarkerChild.battery ||
        latestFromPoll.isOnline !== selectedMarkerChild.isOnline ||
        latestFromPoll.latitude !== selectedMarkerChild.latitude ||
        latestFromPoll.longitude !== selectedMarkerChild.longitude
      ) {
        setSelectedMarkerChild(latestFromPoll);
      }
    }
  // Dependensi SEMUA trigger polling: anak aktif diganti (top card) ATAU list semua anak di-refresh
  }, [activeChild, childrenList, selectedMarkerChild?.id]);

  const handleCenterOnActiveChild = () => {
    setTargetCamera({
      lat: activeChild.latitude,
      lng: activeChild.longitude,
      zoom: 17
    });
    setSelectedMarkerChild(activeChild);
    showToast(`Google Maps dipusatkan ke posisi ${activeChild.name}`, 'info');
  };

  return (
    <div className="relative w-full h-[600px] sm:h-[680px] lg:h-[740px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-md select-none">
      <APIProvider
        apiKey={apiKey}
        libraries={['marker', 'geometry', 'places']}
      >
        <Map
          defaultCenter={{ lat: activeChild.latitude, lng: activeChild.longitude }}
          defaultZoom={16}
          mapId={mapId}
          mapTypeId={mapTypeId}
          gestureHandling="greedy"
          disableDefaultUI={false}
          className="w-full h-full"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          {/* Camera Controller */}
          <MapCameraController target={targetCamera} />

          {/* Safe Geofence Zone Circle around Active Child */}
          <ActiveChildGeofenceCircle
            center={{ lat: activeChild.latitude, lng: activeChild.longitude }}
            radiusMeters={320}
          />

          {/* Advanced Markers for All Registered Children */}
          {childrenList.map((child) => {
            const isActive = child.id === activeChild.id;
            return (
              <AdvancedMarker
                key={child.id}
                position={{ lat: child.latitude, lng: child.longitude }}
                title={`${child.name} (${child.deviceModel})`}
                onClick={() => {
                  onSelectChild(child.id);
                  setSelectedMarkerChild(child);
                  setTargetCamera({ lat: child.latitude, lng: child.longitude, zoom: 16 });
                }}
              >
                <div className="relative flex flex-col items-center cursor-pointer group">
                  {/* Floating Status Pill */}
                  <div className={`mb-1 px-2 py-0.5 rounded-full text-[10px] font-normal shadow-md flex items-center gap-1 whitespace-nowrap backdrop-blur-xs transition-transform group-hover:scale-105 ${
                    isActive
                      ? 'bg-slate-900/95 text-white border border-slate-700'
                      : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${child.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
                    <span className="truncate max-w-[100px]">{child.name}</span>
                  </div>

                  {/* Pin Avatar with Radar Rings */}
                  <div className="relative flex items-center justify-center">
                    {isActive && (
                      <>
                        <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-400 opacity-60" />
                        <span className="animate-pulse absolute inline-flex h-9 w-9 rounded-full bg-indigo-500 opacity-40" />
                      </>
                    )}
                    <div className={`relative w-9 h-9 rounded-full p-0.5 bg-white shadow-xl ring-2 transition-transform group-hover:scale-110 overflow-hidden ${
                      isActive ? 'ring-indigo-600' : 'ring-slate-300 dark:ring-slate-600'
                    }`}>
                      <img
                        src={child.avatar}
                        alt={child.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </AdvancedMarker>
            );
          })}

          {/* InfoWindow for Clicked Child Marker */}
          {selectedMarkerChild && (
            <InfoWindow
              position={{
                lat: selectedMarkerChild.latitude,
                lng: selectedMarkerChild.longitude
              }}
              onCloseClick={() => setSelectedMarkerChild(null)}
            >
              <div className="p-1 max-w-xs text-slate-800 space-y-1.5 text-left">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={selectedMarkerChild.avatar}
                      alt={selectedMarkerChild.name}
                      className="w-5 h-5 rounded-full object-cover ring-1 ring-slate-300"
                    />
                    <span className="text-xs font-medium text-slate-900">
                      {selectedMarkerChild.name}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-medium uppercase ${
                    selectedMarkerChild.isOnline
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {selectedMarkerChild.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                <div className="text-[11px] font-normal text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Perangkat:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[130px]">
                      {selectedMarkerChild.deviceModel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Lokasi:</span>
                    <span className="font-medium text-slate-800">
                      {selectedMarkerChild.locationName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Baterai:</span>
                    <span className="font-medium text-slate-800">{selectedMarkerChild.battery}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Update:</span>
                    <span className="font-medium text-slate-800">{selectedMarkerChild.lastUpdated}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    Koordinat: {selectedMarkerChild.latitude.toFixed(5)}, {selectedMarkerChild.longitude.toFixed(5)}
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Floating Children Layers (Child Profile card, Live Stream modal, etc.) */}
      {childrenOverlay}

      {/* Floating Map Controls Toolbar (Top Right / Bottom Controls) */}
      <div className="absolute top-3 right-3 sm:right-auto sm:left-[340px] lg:left-[356px] flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-md text-white z-20 pointer-events-auto">
        {/* Layer Switcher (Roadmap / Satellite) */}
        <button
          type="button"
          onClick={() => setMapTypeId(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap')}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
            mapTypeId === 'hybrid'
              ? 'bg-emerald-600 text-white'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title="Ganti Mode Peta Google (Satelit / Jalan)"
        >
          <Layers className="w-3 h-3" />
          <span>{mapTypeId === 'hybrid' ? 'Satelit' : 'Peta Jalan'}</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* Center on Active Child */}
        <button
          type="button"
          onClick={handleCenterOnActiveChild}
          className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          title="Pusatkan peta ke lokasi anak terpilih"
        >
          <Compass className="w-3 h-3 text-indigo-400" />
          <span>Pusatkan ke {activeChild.name.split(' ')[0]}</span>
        </button>

        <div className="h-4 w-px bg-slate-700 mx-0.5" />

        {/* (G5.3) Force Live GPS Update High Frequency 5s polling 30 detik */}
        <button
          type="button"
          onClick={onForceLiveUpdate}
          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer
            ${forceLiveActive
              ? 'bg-rose-950/70 text-rose-300 border border-rose-700/60 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.25)]'
              : 'text-orange-300 hover:bg-orange-950/60'}
          `}
          title={forceLiveActive
            ? 'MODE LIVE AKTIF! Polling tiap 5 detik selama 30 detik. Marker maps bergerak realtime untuk perjalanan mobil/motor.'
            : 'Aktifkan Mode Live GPS! 30 detik polling maps tiap 5 detik realtime. Cocok untuk track perjalanan anak.'}
        >
          <Radio className={`w-3 h-3 ${forceLiveActive ? 'text-rose-400 animate-ping' : 'text-orange-400'}`} />
          <span className={`${forceLiveActive ? 'font-bold' : ''}`}>
            {forceLiveActive ? '● LIVE 5s (30d)' : '🚀 Live GPS 30d'}
          </span>
        </button>
      </div>

      {/* Bottom Floating Google Maps Status & Accuracy Pill */}
      <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto flex flex-wrap items-center gap-2 z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 shadow-md text-white text-xs pointer-events-auto">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span className="text-[11px] font-normal text-slate-300">
            Google Maps GPS: <span className="font-medium text-emerald-400">{activeChild.latitude.toFixed(4)}, {activeChild.longitude.toFixed(4)}</span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] font-normal text-slate-400">
            Radius Aman: <span className="text-indigo-300 font-medium">320m</span>
          </span>
        </div>
      </div>
    </div>
  );
};
