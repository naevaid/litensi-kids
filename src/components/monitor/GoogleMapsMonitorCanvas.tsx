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
  Smartphone, Battery, Wifi, ShieldCheck, MapPin, Check, Clock
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

          {/* InfoWindow for Clicked Child Marker (RAPI UI CUSTOM VERSION) */}
          {selectedMarkerChild && (
            <InfoWindow
              position={{
                lat: selectedMarkerChild.latitude,
                lng: selectedMarkerChild.longitude
              }}
              onCloseClick={() => setSelectedMarkerChild(null)}
              // Minimize default gm padding agar border radius + shadow custom tampil sempurna
              pixelOffset={new google.maps.Size(0, -28)}
              zIndex={9999}
            >
              <div className="min-w-[260px] max-w-[300px] p-0 text-slate-800 bg-transparent select-none pointer-events-auto">
                {/* HEADER: Avatar + Nama + Status Badge */}
                <div className="relative flex items-center gap-3 p-3 pb-2.5 bg-gradient-to-br from-indigo-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-950 rounded-t-2xl border-b border-slate-200/80 dark:border-slate-700/60">
                  {/* Avatar dengan ring status glow */}
                  <div className="relative shrink-0">
                    <div className={`absolute -inset-1 rounded-full blur-sm opacity-70 transition-all ${selectedMarkerChild.isOnline ? 'bg-emerald-400/40 animate-pulse' : 'bg-slate-400/30'}`} />
                    <div className={`relative w-11 h-11 rounded-full ring-2 overflow-hidden ${selectedMarkerChild.isOnline ? 'ring-emerald-400' : 'ring-slate-400'}`}>
                      <img
                        src={selectedMarkerChild.avatar}
                        alt={selectedMarkerChild.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Status dot absolute */}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${selectedMarkerChild.isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
                  </div>
                  {/* Nama + Status Pill */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white truncate mb-1">
                      {selectedMarkerChild.name}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        selectedMarkerChild.isOnline
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedMarkerChild.isOnline ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      {selectedMarkerChild.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {/* BODY: GRID 2 Kolom — ICON + LABEL + VALUE */}
                <div className="bg-white dark:bg-slate-900 p-3 space-y-2.5 rounded-b-2xl">
                  {/* Row 1: Smartphone (Perangkat) */}
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mt-0.5">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                        Perangkat
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={selectedMarkerChild.deviceModel}>
                        {selectedMarkerChild.deviceModel || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Battery — DENGAN WARNA DINAMIS + PROGRESS BAR MINI */}
                  {(() => {
                    const bat = Number(selectedMarkerChild.battery ?? 0);
                    let batColor = 'emerald';
                    if (bat < 20) batColor = 'rose';
                    else if (bat < 50) batColor = 'amber';
                    const colorMap = {
                      emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', bar: 'bg-gradient-to-r from-emerald-400 to-emerald-500' },
                      amber:   { text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/50',     bar: 'bg-gradient-to-r from-amber-400 to-amber-500' },
                      rose:    { text: 'text-rose-600 dark:text-rose-400',       bg: 'bg-rose-50 dark:bg-rose-950/50',       bar: 'bg-gradient-to-r from-rose-400 to-rose-500 animate-pulse' },
                    } as const;
                    const c = colorMap[batColor as keyof typeof colorMap];
                    return (
                      <div className="flex items-center gap-2.5">
                        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${c.bg} ${c.text}`}>
                          <Battery className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                              Baterai
                            </div>
                            <div className={`text-xs font-bold ${c.text}`}>
                              {bat > 0 ? `${bat}%` : '—'}
                            </div>
                          </div>
                          {bat > 0 && (
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${Math.min(100, Math.max(0, bat))}%` }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Row 3: Location (GPS Coord) — TANPA NOTES */}
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                        Lokasi
                      </div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-all leading-tight">
                        {selectedMarkerChild.locationName}
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Last Updated Relative Time */}
                  <div className="flex items-center gap-2.5">
                    <div className="shrink-0 w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 flex items-center justify-center text-sky-600 dark:text-sky-400 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">
                        Update Terakhir
                      </div>
                      <div className={`text-xs font-bold ${selectedMarkerChild.isOnline ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {selectedMarkerChild.lastUpdated}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER: Koordinat Raw + Copy Clipboard — MUTED SMALL */}
                {(Math.abs(Number(selectedMarkerChild.latitude)) > 0.001 || Math.abs(Number(selectedMarkerChild.longitude)) > 0.001) && (
                  <button
                    type="button"
                    onClick={() => {
                      const txt = `${Number(selectedMarkerChild.latitude).toFixed(6)}, ${Number(selectedMarkerChild.longitude).toFixed(6)}`;
                      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(txt).catch(() => {});
                      }
                    }}
                    className="w-full mt-1 px-3 py-1.5 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-t border-slate-200/50 dark:border-slate-700/40 rounded-b-2xl text-[10px] font-mono text-slate-500 dark:text-slate-400 text-left transition-colors cursor-pointer flex items-center justify-between group"
                    title="Klik untuk copy koordinat ke clipboard"
                  >
                    <span>
                      {Number(selectedMarkerChild.latitude).toFixed(6)},{' '}
                      {Number(selectedMarkerChild.longitude).toFixed(6)}
                    </span>
                    <Check className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-600 dark:text-emerald-400 transition-opacity ml-2 shrink-0" />
                  </button>
                )}
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
