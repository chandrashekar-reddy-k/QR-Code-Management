// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, MapPin, AlertCircle, CheckCircle2,
  ChevronRight, Search, RefreshCw, X, Bell, Activity,
  Filter, Clock, ShoppingBag, Maximize2, Minimize2,
  PowerOff, Loader2
} from 'lucide-react';
import { GoogleMap, MarkerF, PolylineF, OverlayViewF } from '@react-google-maps/api';
import * as routeService from '../services/routeService';
import * as locationService from '../services/locationService';
import { usePerformanceQuery } from '../hooks/useVsmsCache';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { VEHICLE_POINTER_PNG } from './vehiclePointerBase64';

// ── Circular Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ percentage = 0, size = 48, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percentage, 100) / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#10b981" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-800">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

export default function RoutePerformanceDashboard({ storeId, isLoaded }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: { totalRoutes: 0, activeRoutes: 0, avgCompletion: 0, totalSales: 0 }, performance: [] });
  const [liveLocations, setLiveLocations] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [closureLoading, setClosureLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);
  const [mapRef, setMapRef] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });
  const [mapZoom, setMapZoom] = useState(10);

  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [turningOffAll, setTurningOffAll] = useState(false);

  const handleTurnOffAllLocations = async () => {
    if (!window.confirm('Are you sure you want to turn off live tracking for ALL agents? This will mark all agents offline in the database.')) {
      return;
    }
    setTurningOffAll(true);
    try {
      await locationService.deactivateAllAgents(storeId);
      toast.success('All agent live locations turned OFF successfully');
      setLiveLocations(prev => prev.map(l => ({ ...l, isOnDuty: false, isOnline: false })));
      fetchData();
    } catch (err) {
      toast.error('Failed to turn off agent locations');
    } finally {
      setTurningOffAll(false);
    }
  };

  const { data: cachedPerf, isLoading, isFetching, refetch } = usePerformanceQuery(storeId);

  useEffect(() => {
    if (cachedPerf) {
      setData(cachedPerf.performanceData);
      setLiveLocations(cachedPerf.liveLocations);
      if (cachedPerf.liveLocations && cachedPerf.liveLocations.length > 0 && !selectedAssignment) {
        const firstWithCoords = cachedPerf.liveLocations.find(l => (l.lat || l.latitude) && (l.long || l.longitude || l.lon));
        if (firstWithCoords) {
          const lat = parseFloat(firstWithCoords.lat || firstWithCoords.latitude);
          const lng = parseFloat(firstWithCoords.long || firstWithCoords.longitude || firstWithCoords.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            setMapCenter({ lat, lng });
          }
        }
      }
      setLoading(false);
    }
  }, [cachedPerf]);

  const fetchData = async () => {
    try {
      await refetch();
    } catch (err) {
      toast.error('Failed to load performance data');
    }
  };

  useEffect(() => {
    const fetchLive = async () => {
      try { setLiveLocations(await locationService.getLiveLocations(storeId)); } catch (_) {}
    };
    fetchLive();

    // Connect to live WebSocket for real-time location stream
    let socket;
    try {
      const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:3004' : window.location.origin;
      const token = localStorage.getItem('partnerToken') || localStorage.getItem('token') || localStorage.getItem('authToken');
      socket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      socket.on('location:update', (data) => {
        if (!data || !data.userId) return;
        setLiveLocations((prev) => {
          const isDuty = data.isOnDuty !== undefined ? Boolean(data.isOnDuty) : true;
          const existingIndex = prev.findIndex((l) => l.userId === data.userId || l.id === data.userId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...data, isOnDuty: isDuty, updatedAt: new Date().toISOString() };
            return updated;
          }
          return [...prev, { ...data, isOnDuty: isDuty, updatedAt: new Date().toISOString() }];
        });
      });
    } catch (_) {}

    const iv = setInterval(fetchLive, 5000);
    return () => {
      clearInterval(iv);
      if (socket) socket.disconnect();
    };
  }, [storeId]);

  const fetchDetail = async (id) => {
    setSelectedAssignment(id);
    setDetailLoading(true);
    try {
      const agent = data.performance.find(p => p.assignmentId === id) || filteredPerf.find(p => p.assignmentId === id);
      const targetUserId = agent?.userId;

      // 1. Immediately pan to live location if available
      const liveLoc = liveLocations.find(l => targetUserId && (l.userId === targetUserId || l.id === targetUserId));
      let initialTarget = null;
      if (liveLoc && (liveLoc.lat || liveLoc.latitude) && (liveLoc.long || liveLoc.longitude || liveLoc.lon)) {
        const lat = parseFloat(liveLoc.lat || liveLoc.latitude);
        const lng = parseFloat(liveLoc.long || liveLoc.longitude || liveLoc.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          initialTarget = { lat, lng };
          setMapCenter(initialTarget);
          setMapZoom(14);
          if (mapRef) {
            mapRef.panTo(initialTarget);
            mapRef.setZoom(14);
          }
        }
      }

      // 2. Fetch detailed route performance and history
      const [detailRes, historyRes] = await Promise.all([
        routeService.getAssignmentPerformanceDetail(id).catch(() => null),
        targetUserId ? locationService.getLocationHistory({ userId: targetUserId }).catch(() => []) : Promise.resolve([])
      ]);

      if (detailRes) {
        setAssignmentDetail(detailRes);
      }

      const path = (Array.isArray(historyRes) ? historyRes : [])
        .map(l => ({ lat: parseFloat(l.lat || l.latitude), lng: parseFloat(l.long || l.longitude || l.lon) }))
        .filter(p => !isNaN(p.lat) && !isNaN(p.lng));

      setBreadcrumbPath(path);

      // 3. Focus map on most relevant coordinates
      let resolvedPos = null;
      if (path.length > 0) {
        resolvedPos = path[path.length - 1];
      } else if (initialTarget) {
        resolvedPos = initialTarget;
      } else if (detailRes?.breakdown && detailRes.breakdown.length > 0) {
        const validVillage = detailRes.breakdown.find(v => v.latitude && v.longitude);
        if (validVillage) {
          const vLat = parseFloat(validVillage.latitude);
          const vLng = parseFloat(validVillage.longitude);
          if (!isNaN(vLat) && !isNaN(vLng)) {
            resolvedPos = { lat: vLat, lng: vLng };
          }
        }
      }

      if (resolvedPos) {
        setMapCenter(resolvedPos);
        setMapZoom(14);
        if (mapRef) {
          mapRef.panTo(resolvedPos);
          mapRef.setZoom(14);
        }
      }
    } catch (_) {
      toast.error('Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedAssignment) return;
    setClosureLoading(true);
    try {
      await routeService.getRouteClosureSummary(selectedAssignment);
      toast.success('Summary generated!');
    } catch (_) {
      toast.error('Failed to generate summary');
    } finally {
      setClosureLoading(false);
    }
  };

  const isAgentLive = (userId) => {
    const loc = liveLocations.find(l => l.userId === userId || l.id === userId);
    if (!loc) return false;
    if (loc.isOnDuty !== undefined) return Boolean(loc.isOnDuty);
    if (loc.isOnline !== undefined) return Boolean(loc.isOnline);
    const timeVal = loc.timestamp || loc.updatedAt || loc.createdAt;
    if (!timeVal) return false;
    const age = new Date().getTime() - new Date(timeVal).getTime();
    return age >= 0 && age < 300 * 1000;
  };

  const filteredPerf = data.performance.filter(p => {
    const q = searchQuery.toLowerCase();
    const matches = p.agentName?.toLowerCase().includes(q) || p.routeName?.toLowerCase().includes(q);
    if (showOnlyActive) return matches && isAgentLive(p.userId);
    return matches;
  });

  const totalMissed = data.performance.reduce((a, p) => a + (p.missedVillages?.length || 0), 0);
  const selectedPerf = data.performance.find(p => p.assignmentId === selectedAssignment);

  // ── KPI Cards config ────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Today's Sales",
      value: `₹${(data.summary.totalSales || 0).toLocaleString()}`,
      icon: <TrendingUp size={22} />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Coverage Rate',
      value: `${isNaN(data.summary.avgCompletion) ? 0 : Math.round(data.summary.avgCompletion)}%`,
      icon: <Activity size={22} />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Active Agents',
      value: data.performance.filter(p => isAgentLive(p.userId)).length,
      icon: <Users size={22} />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  if (isLoading && !cachedPerf && (!data.performance || data.performance.length === 0)) return (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl p-4 shadow-xs" />
        ))}
      </div>
      <div className="h-64 bg-white border border-gray-100 rounded-2xl shadow-xs" />
    </div>
  );

  return (
    <div className="space-y-5 pb-20">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg} ${k.iconColor}`}>
              {k.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{k.value}</p>
            </div>
          </div>
        ))}
      </div>


      {/* ── Main content: Map (70%) + Agent Listing (30%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* ── Map & Route Timeline (70% on desktop) ── */}
        <div className="lg:col-span-8 order-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Map Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-base font-bold text-gray-900 dark:text-white leading-none">
                  {selectedPerf?.agentName || 'All Active Agents (Live GPS Tracking)'}
                </p>
                <p className="text-xs font-medium text-gray-400 mt-1">
                  {selectedPerf?.routeName
                    ? `Tracking Route: ${selectedPerf.routeName}`
                    : 'Real-time GPS markers of field agents broadcasting from agent portal'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Turn Off All Agents button hidden as requested */}
                {/* <button
                  onClick={handleTurnOffAllLocations}
                  disabled={turningOffAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  title="Turn off live tracking for all agents"
                >
                  {turningOffAll ? (
                    <Loader2 size={13} className="animate-spin text-rose-600" />
                  ) : (
                    <PowerOff size={13} className="text-rose-600" />
                  )}
                  <span>Turn Off All Agents</span>
                </button> */}

                {selectedAssignment ? (
                  <>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg border border-emerald-100 uppercase tracking-widest">
                      <Activity size={12} className="animate-pulse" /> Selected
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAssignment(null);
                        setAssignmentDetail(null);
                        setBreadcrumbPath([]);
                        setMapZoom(isMapFullscreen ? 12 : 10);
                        const validLocs = liveLocations
                          .map(l => ({ lat: parseFloat(l.lat || l.latitude), lng: parseFloat(l.long || l.longitude || l.lon) }))
                          .filter(l => !isNaN(l.lat) && !isNaN(l.lng));
                        if (validLocs.length > 0) {
                          if (mapRef && window.google?.maps?.LatLngBounds) {
                            const bounds = new window.google.maps.LatLngBounds();
                            validLocs.forEach(c => bounds.extend(c));
                            mapRef.fitBounds(bounds);
                          } else {
                            setMapCenter(validLocs[0]);
                          }
                        }
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                      title="Show all agents on map"
                    >
                      Show All Agents
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                    Live View
                  </span>
                )}
              </div>
            </div>

            {/* Map Container with High Height for 70% Layout */}
            <div 
              id="vsms-map-container"
              className={`relative transition-all duration-500 overflow-hidden ${
                isMapFullscreen 
                  ? 'h-[750px] w-full bg-gray-100 ring-2 ring-emerald-500 shadow-2xl rounded-xl' 
                  : 'h-[520px] w-full bg-gray-100'
              }`}
            >
              {/* Action Buttons: Expand and Minimize Map Controls */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {!isMapFullscreen ? (
                  <button
                    onClick={() => {
                      const elem = document.getElementById('vsms-map-container');
                      if (elem && elem.requestFullscreen) {
                        elem.requestFullscreen().catch(() => setIsMapFullscreen(true));
                      }
                      setIsMapFullscreen(true);
                    }}
                    className="p-2.5 bg-gray-900/90 hover:bg-black text-white rounded-xl shadow-xl border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-bold"
                    title="Expand Map View"
                  >
                    <Maximize2 size={16} className="text-emerald-400" />
                    <span>Expand</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => setIsMapFullscreen(false));
                      }
                      setIsMapFullscreen(false);
                    }}
                    className="p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xl border border-rose-400 backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-bold"
                    title="Minimize Map View"
                  >
                    <Minimize2 size={16} className="text-white" />
                    <span>Minimize</span>
                  </button>
                )}
              </div>

              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={mapZoom}
                  onLoad={(mapInstance) => setMapRef(mapInstance)}
                  onUnmount={() => setMapRef(null)}
                  options={{ 
                    disableDefaultUI: false, 
                    zoomControl: true,
                    styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }] 
                  }}
                >
                  {/* Render Live Agent Markers */}
                  {liveLocations
                    .filter(l => (l.lat || l.latitude) && (l.long || l.longitude || l.lon))
                    .filter(loc => {
                      if (!selectedAssignment) return true;
                      const selectedPerfItem = data.performance.find(p => p.assignmentId === selectedAssignment);
                      return selectedPerfItem && (selectedPerfItem.userId === loc.userId || selectedPerfItem.userId === loc.id);
                    })
                    .map(loc => {
                      const latNum = parseFloat(loc.lat || loc.latitude);
                      const lngNum = parseFloat(loc.long || loc.longitude || loc.lon);
                      if (isNaN(latNum) || isNaN(lngNum)) return null;
                      const isLiveNow = isAgentLive(loc.userId || loc.id);
                      
                      // Match with performance array to ensure complete full name
                      const perfMatch = data.performance.find(p => p.userId === (loc.userId || loc.id));
                      const fullName = (perfMatch?.agentName || loc.user?.name || loc.userName || 'Agent').trim();
                      const displayName = fullName.toUpperCase();
                      const pinColor = isLiveNow ? '#10b981' : '#f59e0b';
                      
                      // Dynamically calculate badge width based on text length
                      const textWidth = Math.max(displayName.length * 8 + 36, 100);
                      const svgWidth = textWidth + 10;
                      const centerX = svgWidth / 2;
                      
                      const svgPin = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="86" viewBox="0 0 ${svgWidth} 86">
                          <!-- Agent Name Header Pill -->
                          <rect x="5" y="4" width="${textWidth}" height="24" rx="12" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
                          <circle cx="17" cy="16" r="4.5" fill="${pinColor}"/>
                          <text x="28" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="#ffffff" letter-spacing="0.5">${displayName}</text>
                          <!-- Pointer Arrow -->
                          <path d="M ${centerX} 28 L ${centerX + 5} 36 L ${centerX - 5} 36 Z" fill="#0f172a"/>
                          <!-- Embedded Base64 Vehicle Pointer Image -->
                          <image href="${VEHICLE_POINTER_PNG}" x="${centerX - 24}" y="36" width="48" height="48"/>
                        </svg>
                      `)}`;

                      return (
                        <MarkerF
                          key={`agent-marker-${loc.userId || loc.id}`}
                          position={{ lat: latNum, lng: lngNum }}
                          onClick={() => { const p = data.performance.find(x => x.userId === (loc.userId || loc.id)); if (p) fetchDetail(p.assignmentId); }}
                          icon={{
                            url: svgPin,
                            scaledSize: new window.google.maps.Size(svgWidth * 0.9, 78),
                            anchor: new window.google.maps.Point((svgWidth * 0.9) / 2, 76)
                          }}
                        />
                      );
                    })}

                  {/* If selected agent is offline and not in liveLocations list, but has breadcrumb position */}
                  {selectedAssignment && breadcrumbPath.length > 0 && !liveLocations.some(l => {
                    const selectedPerfItem = data.performance.find(p => p.assignmentId === selectedAssignment);
                    return selectedPerfItem && (l.userId === selectedPerfItem.userId || l.id === selectedPerfItem.userId) && (l.lat || l.latitude);
                  }) && (() => {
                    const selectedPerfItem = data.performance.find(p => p.assignmentId === selectedAssignment);
                    const displayName = (selectedPerfItem?.agentName || 'Agent').toUpperCase();
                    const textWidth = Math.max(displayName.length * 8 + 36, 120);
                    const svgWidth = textWidth + 10;
                    const centerX = svgWidth / 2;
                    const pinColor = '#94a3b8';
                    
                    const svgPin = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="86" viewBox="0 0 ${svgWidth} 86">
                        <!-- Offline Name Header Pill -->
                        <rect x="5" y="4" width="${textWidth}" height="24" rx="12" fill="#1e293b" stroke="#ffffff" stroke-width="2"/>
                        <circle cx="17" cy="16" r="4.5" fill="${pinColor}"/>
                        <text x="28" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#ffffff" letter-spacing="0.5">${displayName} (OFFLINE)</text>
                        <!-- Pointer Arrow -->
                        <path d="M ${centerX} 28 L ${centerX + 5} 36 L ${centerX - 5} 36 Z" fill="#1e293b"/>
                        <!-- Embedded Base64 Vehicle Pointer Image (grayscale) -->
                        <image href="${VEHICLE_POINTER_PNG}" x="${centerX - 24}" y="36" width="48" height="48" style="filter: grayscale(100%) opacity(0.8);"/>
                      </svg>
                    `)}`;

                    return (
                      <MarkerF
                        key="selected-offline-agent-marker"
                        position={breadcrumbPath[breadcrumbPath.length - 1]}
                        icon={{
                          url: svgPin,
                          scaledSize: new window.google.maps.Size(svgWidth * 0.9, 78),
                          anchor: new window.google.maps.Point((svgWidth * 0.9) / 2, 76)
                        }}
                      />
                    );
                  })()}

                  {/* Polyline path for selected agent breadcrumb trail */}
                  {selectedAssignment && breadcrumbPath.length > 1 && (
                    <PolylineF
                      path={breadcrumbPath}
                      options={{
                        strokeColor: '#10b981',
                        strokeOpacity: 0.85,
                        strokeWeight: 4,
                        geodesic: true
                      }}
                    />
                  )}

                  {/* Assigned Route Villages for Selected Agent */}
                  {selectedAssignment && assignmentDetail?.breakdown && assignmentDetail.breakdown.filter(v => v.latitude && v.longitude).map((v, i) => {
                    const lat = parseFloat(v.latitude);
                    const lng = parseFloat(v.longitude);
                    if (isNaN(lat) || isNaN(lng)) return null;
                    return (
                      <MarkerF
                        key={`village-breakdown-${i}`}
                        position={{ lat, lng }}
                        title={`${v.villageName} (${v.visited ? 'Visited' : 'Pending'})`}
                        icon={{
                          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                          fillColor: v.visited ? '#10b981' : '#ef4444',
                          fillOpacity: 1,
                          strokeColor: '#ffffff',
                          strokeWeight: 2,
                          scale: 1.3,
                          anchor: new window.google.maps.Point(12, 24)
                        }}
                      />
                    );
                  })}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <RefreshCw className="animate-spin text-gray-300" size={28} />
                </div>
              )}
            </div>

            {/* Village Visit Timeline */}
            {selectedAssignment && assignmentDetail ? (
              <div className="p-5 space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Village Visit Timeline</p>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-0">
                    {assignmentDetail.breakdown.map((v, i) => (
                      <div key={i} className="flex gap-4 pl-1 py-3 border-b border-gray-200 last:border-0">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-1 z-10 ${v.visited ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{v.villageName}</p>
                            {v.visited ? (
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <span className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-bold text-gray-400">Orders: {v.orderCount ?? '-'}</p>
                            <span className="text-gray-200">•</span>
                            <p className="text-[10px] font-bold text-gray-400">
                              Time: {v.visitTime ? new Date(v.visitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                          <p className={`text-[10px] font-bold mt-1 ${v.visited ? 'text-emerald-600' : 'text-red-500'}`}>
                            Status: {v.visited ? 'Visited' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate Summary Button */}
                <div className="pt-3">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={closureLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm tracking-tight shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    {closureLoading ? <RefreshCw size={16} className="animate-spin" /> : <>Generate Summary <ChevronRight size={16} /></>}
                  </button>
                  <button
                    onClick={() => { setSelectedAssignment(null); setAssignmentDetail(null); }}
                    className="w-full mt-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors py-1"
                  >
                    ← Back to Global View
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] text-center mb-3">Command Center</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200">
                    <p className="text-[9px] font-bold text-gray-700 mb-1">Live Status</p>
                    <p className="text-[8px] text-gray-400 leading-relaxed">Agents broadcasting live GPS are shown on map.</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200">
                    <p className="text-[9px] font-bold text-gray-700 mb-1">Click to Drill</p>
                    <p className="text-[8px] text-gray-400 leading-relaxed">Click any agent in list to focus their live position.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Agent Listing (30% on desktop) ── */}
        <div className="lg:col-span-4 order-2 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Agent Directory</h3>
                <p className="text-[10px] font-medium text-gray-400">Select an agent to track route & timeline</p>
              </div>
              {/* Active Only Toggle */}
              <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Active</span>
                <button
                  type="button"
                  onClick={() => setShowOnlyActive(v => !v)}
                  className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${showOnlyActive ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200 ${showOnlyActive ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search agent / route..."
                className="w-full bg-gray-50 border border-gray-200 pl-8 pr-8 py-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs font-medium text-gray-700 placeholder-gray-400"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={fetchData}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                title="Refresh list"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {/* Agent Cards List with Custom Scrollbar */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredPerf.length === 0 && (
              <div className="py-12 bg-white rounded-2xl border border-gray-200 flex flex-col items-center gap-2 text-center p-4">
                <Users size={32} className="text-gray-300" />
                <p className="text-xs font-bold text-gray-400">No agents found</p>
              </div>
            )}

            {filteredPerf.map((p) => {
              const live = isAgentLive(p.userId);
              const isSelected = selectedAssignment === p.assignmentId;
              return (
                <button
                  key={p.assignmentId}
                  onClick={() => fetchDetail(p.assignmentId)}
                  className={`w-full bg-white rounded-2xl border p-3.5 flex items-center justify-between gap-3 transition-all shadow-sm hover:shadow-md text-left ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/10 bg-emerald-50/20' : 'border-gray-200 hover:border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <ProgressRing percentage={p.completionRate || 0} size={42} stroke={3.5} />
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                        live ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                      }`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-gray-900 truncate">{p.agentName}</p>
                      </div>
                      <p className="text-[10px] font-medium text-gray-400 truncate mt-0.5">
                        {p.routeName || 'No Route'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-semibold text-gray-500">
                        <span>Sales: ₹{(p.totalSales || 0).toLocaleString()}</span>
                        <span>•</span>
                        <span>{p.visitedCount ?? 0}/{p.assignedCount ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-wider ${
                      live ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {live ? 'Live' : 'Off'}
                    </span>
                    <ChevronRight size={14} className={`transition-colors ${isSelected ? 'text-emerald-600' : 'text-gray-300'}`} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
