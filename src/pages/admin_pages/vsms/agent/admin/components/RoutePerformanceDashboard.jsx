import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, MapPin, AlertCircle, CheckCircle2,
  ChevronRight, Search, RefreshCw, X, Bell, Activity,
  Filter, Clock, ShoppingBag, Maximize2, Minimize2
} from 'lucide-react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import * as routeService from '../../../services/routeService';
import * as locationService from '../../../services/locationService';
import toast from 'react-hot-toast';

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
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-gray-800">
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [perfRes, liveRes] = await Promise.all([
        routeService.getRoutePerformance({ storeId }),
        locationService.getLiveLocations(storeId)
      ]);
      setData(perfRes);
      setLiveLocations(liveRes || []);
      if (liveRes && liveRes.length > 0 && !selectedAssignment) {
        const first = liveRes.find(l => (l.lat || l.latitude) && (l.long || l.longitude || l.lon));
        if (first) {
          const lat = parseFloat(first.lat || first.latitude);
          const lng = parseFloat(first.long || first.longitude || first.lon);
          if (!isNaN(lat) && !isNaN(lng)) setMapCenter({ lat, lng });
        }
      }
    } catch (err) {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(async () => {
      try { setLiveLocations(await locationService.getLiveLocations(storeId)); } catch (_) {}
    }, 10000);
    return () => clearInterval(iv);
  }, [storeId]);

  const fetchDetail = async (id) => {
    setSelectedAssignment(id);
    setDetailLoading(true);
    try {
      const agent = data.performance.find(p => p.assignmentId === id) || filteredPerf.find(p => p.assignmentId === id);
      const targetUserId = agent?.userId;

      // Check live location
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

      const [detailRes, historyRes] = await Promise.all([
        routeService.getAssignmentPerformanceDetail(id).catch(() => null),
        targetUserId ? locationService.getLocationHistory({ userId: targetUserId }).catch(() => []) : Promise.resolve([])
      ]);

      if (detailRes) setAssignmentDetail(detailRes);

      const path = (Array.isArray(historyRes) ? historyRes : [])
        .map(l => ({ lat: parseFloat(l.lat || l.latitude), lng: parseFloat(l.long || l.longitude || l.lon) }))
        .filter(p => !isNaN(p.lat) && !isNaN(p.lng));

      setBreadcrumbPath(path);

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
          if (!isNaN(vLat) && !isNaN(vLng)) resolvedPos = { lat: vLat, lng: vLng };
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
    {
      label: 'Missed Villages',
      value: totalMissed,
      icon: <AlertCircle size={22} />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-500',
    },
  ];

  if (loading && (!data.performance || data.performance.length === 0)) return (
    <div className="space-y-4 p-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-white border border-gray-100 rounded-2xl p-4 shadow-xs" />
        ))}
      </div>
      <div className="h-64 bg-white border border-gray-100 rounded-2xl shadow-xs" />
    </div>
  );

  return (
    <div className="space-y-5 pb-20">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg} ${k.iconColor}`}>
              {k.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{k.label}</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Coverage Alerts ── */}
      {data.performance.some(p => p.missedVillages?.length > 0) && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-700 uppercase tracking-widest">Active Coverage Alerts</span>
            <span className="ml-1 px-2 py-0.5 bg-red-200 text-red-800 text-[9px] font-bold rounded-full">{totalMissed}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {data.performance.filter(p => p.missedVillages?.length > 0).map((p, i) => (
              <button
                key={i}
                onClick={() => fetchDetail(p.assignmentId)}
                className="flex items-center justify-between gap-4 bg-white rounded-xl border border-red-100 px-4 py-3 shadow-sm min-w-[200px] hover:border-red-300 transition-all"
              >
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 animate-pulse shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {p.agentName?.toUpperCase() || 'UNKNOWN AGENT'}
                    </p>
                    <p className="text-xs font-bold text-red-600">{p.missedVillages.length} Village Missed</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-red-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content: Agent List + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Agent List ── */}
        <div className="lg:col-span-8 space-y-3">

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input
                type="text"
                placeholder="Search agent by name or route..."
                className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-gray-700 placeholder-gray-300"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={fetchData} className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-emerald-600 transition-all shadow-sm">
              <RefreshCw size={17} />
            </button>
            <button className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition-all shadow-sm">
              <Filter size={17} />
            </button>
            {/* Active Only Toggle */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Active Only</span>
              <button
                onClick={() => setShowOnlyActive(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${showOnlyActive ? 'bg-emerald-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showOnlyActive ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          </div>

          {/* Agent Cards */}
          {filteredPerf.length === 0 && (
            <div className="py-16 bg-white rounded-lg border border-gray-200 flex flex-col items-center gap-3">
              <Users size={36} className="text-gray-200" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No agents found</p>
            </div>
          )}

          {filteredPerf.map((p) => {
            const live = isAgentLive(p.userId);
            const isSelected = selectedAssignment === p.assignmentId;
            return (
              <button
                key={p.assignmentId}
                onClick={() => fetchDetail(p.assignmentId)}
                className={`w-full bg-white rounded-lg border px-5 py-4 flex items-center justify-between gap-4 transition-all shadow-sm hover:shadow-md text-left ${isSelected ? 'border-emerald-400 ring-2 ring-emerald-400/10' : 'border-gray-200 hover:border-emerald-200'}`}
              >
                {/* Left: progress + name */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <ProgressRing percentage={p.completionRate || 0} size={48} stroke={4} />
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-white rounded-full ${
                      live ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">{p.agentName}</p>
                      <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase ${
                        live ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {live ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                      {p.routeName} • {p.assignedCount ?? 0} Assigned Villages
                    </p>
                  </div>
                </div>

                {/* Right: stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="hidden md:block text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Today's Sales</p>
                    <p className="text-sm font-bold text-gray-900">₹{(p.totalSales || 0).toLocaleString()}</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Coverage</p>
                    <p className="text-sm font-bold text-gray-900">{p.visitedCount ?? 0}/{p.assignedCount ?? 1}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-lg border ${
                    live
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}>
                    {live ? 'Online' : 'Offline'}
                  </span>
                  <ChevronRight size={16} className={`transition-colors ${isSelected ? 'text-emerald-500' : 'text-gray-300'}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

            {/* Sidebar Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between">
              <div>
                <p className="text-base font-bold text-gray-900 leading-none">
                  {selectedPerf?.agentName || 'All Agents (Live Map)'}
                </p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  {selectedPerf?.routeName || 'Click any agent from the list to filter map to that person'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedAssignment && (
                  <>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold rounded-lg border border-emerald-100 uppercase tracking-widest">
                      <Activity size={10} className="animate-pulse" /> Selected
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
                      className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[9px] font-bold rounded-lg transition-colors"
                      title="Show all agents on map"
                    >
                      Show All
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Map Container with Expandable In-Page Height */}
            <div 
              id="vsms-map-container-admin"
              className={`relative transition-all duration-500 overflow-hidden ${
                isMapFullscreen 
                  ? 'h-[650px] w-full bg-gray-100 ring-2 ring-emerald-500 shadow-2xl rounded-xl' 
                  : 'h-[300px] w-full bg-gray-100'
              }`}
            >
              {/* Action Buttons: Expand and Minimize Map Controls */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                {!isMapFullscreen ? (
                  <button
                    onClick={() => {
                      const elem = document.getElementById('vsms-map-container-admin');
                      if (elem && elem.requestFullscreen) {
                        elem.requestFullscreen().catch(() => setIsMapFullscreen(true));
                      }
                      setIsMapFullscreen(true);
                    }}
                    className="p-2.5 bg-gray-900/90 hover:bg-black text-white rounded-xl shadow-xl border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-bold"
                    title="Expand Map View"
                  >
                    <Maximize2 size={16} className="text-emerald-400" />
                    <span>Expand Map</span>
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
                    <span>Minimize Map</span>
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
                      
                      const perfMatch = data.performance.find(p => p.userId === (loc.userId || loc.id));
                      const fullName = (perfMatch?.agentName || loc.user?.name || loc.userName || 'Agent').trim();
                      const displayName = fullName.toUpperCase();
                      const pinColor = isLiveNow ? '#10b981' : '#f59e0b';
                      
                      const textWidth = Math.max(displayName.length * 8 + 36, 90);
                      const svgWidth = textWidth + 10;
                      const centerX = svgWidth / 2;
                      
                      const svgPin = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="64" viewBox="0 0 ${svgWidth} 64">
                          <rect x="5" y="4" width="${textWidth}" height="24" rx="12" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
                          <g transform="translate(10, 8) scale(0.65)" fill="${pinColor}">
                            <path d="M20 8h-3V4c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-5.5l1.96 2.5H17V11h2.5zM18 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                          </g>
                          <text x="30" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="#ffffff" letter-spacing="0.5">${displayName}</text>
                          <path d="M ${centerX} 28 L ${centerX + 6} 40 L ${centerX - 6} 40 Z" fill="#0f172a"/>
                          <circle cx="${centerX}" cy="50" r="7" fill="${pinColor}" stroke="#ffffff" stroke-width="2.5"/>
                        </svg>
                      `)}`;

                      return (
                        <MarkerF
                          key={`agent-marker-${loc.userId || loc.id}`}
                          position={{ lat: latNum, lng: lngNum }}
                          onClick={() => { const p = data.performance.find(x => x.userId === (loc.userId || loc.id)); if (p) fetchDetail(p.assignmentId); }}
                          icon={{
                            url: svgPin,
                            scaledSize: new window.google.maps.Size(svgWidth * 0.85, 54),
                            anchor: new window.google.maps.Point((svgWidth * 0.85) / 2, 50)
                          }}
                        />
                      );
                    })}

                  {/* If selected agent is offline and not in liveLocations list */}
                  {selectedAssignment && breadcrumbPath.length > 0 && !liveLocations.some(l => {
                    const selectedPerfItem = data.performance.find(p => p.assignmentId === selectedAssignment);
                    return selectedPerfItem && (l.userId === selectedPerfItem.userId || l.id === selectedPerfItem.userId) && (l.lat || l.latitude);
                  }) && (() => {
                    const selectedPerfItem = data.performance.find(p => p.assignmentId === selectedAssignment);
                    const displayName = (selectedPerfItem?.agentName || 'Agent').toUpperCase();
                    const textWidth = Math.max(displayName.length * 8 + 36, 110);
                    const svgWidth = textWidth + 10;
                    const centerX = svgWidth / 2;
                    const pinColor = '#94a3b8';
                    
                    const svgPin = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                      <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="64" viewBox="0 0 ${svgWidth} 64">
                        <rect x="5" y="4" width="${textWidth}" height="24" rx="12" fill="#1e293b" stroke="#ffffff" stroke-width="2"/>
                        <g transform="translate(10, 8) scale(0.65)" fill="${pinColor}">
                          <path d="M20 8h-3V4c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-5.5l1.96 2.5H17V11h2.5zM18 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                        </g>
                        <text x="30" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#ffffff" letter-spacing="0.5">${displayName} (OFFLINE)</text>
                        <path d="M ${centerX} 28 L ${centerX + 6} 40 L ${centerX - 6} 40 Z" fill="#1e293b"/>
                        <circle cx="${centerX}" cy="50" r="7" fill="${pinColor}" stroke="#ffffff" stroke-width="2.5"/>
                      </svg>
                    `)}`;

                    return (
                      <MarkerF
                        key="selected-offline-agent-marker"
                        position={breadcrumbPath[breadcrumbPath.length - 1]}
                        icon={{
                          url: svgPin,
                          scaledSize: new window.google.maps.Size(svgWidth * 0.85, 54),
                          anchor: new window.google.maps.Point((svgWidth * 0.85) / 2, 50)
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
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-0">
                    {assignmentDetail.breakdown.map((v, i) => (
                      <div key={i} className="flex gap-4 pl-1 py-3 border-b border-gray-200 last:border-0">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-1 z-10 ${v.visited ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-gray-900 leading-tight">{v.villageName}</p>
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
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[9px] font-bold text-gray-700 mb-1">Live Status</p>
                    <p className="text-[8px] text-gray-400 leading-relaxed">Agents with active GPS are shown live on the map.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[9px] font-bold text-gray-700 mb-1">Click to Drill</p>
                    <p className="text-[8px] text-gray-400 leading-relaxed">Click any agent row to see their village timeline.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
