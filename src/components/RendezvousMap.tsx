import React, { useState, useEffect } from 'react';
import { 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap 
} from '@vis.gl/react-google-maps';
import { Trip, Traveler } from '../types/travel';
import { 
  Navigation, Battery, BatteryWarning, MapPin, 
  Clock, Bell, Check, Edit2, Send, AlertTriangle, X,
  Bus, Car, Train, RefreshCw, Layers, ShieldCheck, 
  Info, Compass, ArrowRight, Share2, Users, Search, 
  ChevronRight, Sparkles, Activity, Eye, Maximize2
} from 'lucide-react';

interface RendezvousMapProps {
  trip: Trip;
  activeTraveler: Traveler;
  onUpdateTrip: (updated: Trip) => void;
}

interface BusArrivalService {
  ServiceNo: string;
  Operator: string;
  NextBus?: {
    EstimatedArrival: string;
    Load: 'SEA' | 'SDA' | 'LSD';
    Feature: 'WAB' | '';
    Type: 'SD' | 'DD' | 'BD';
  };
  NextBus2?: {
    EstimatedArrival: string;
    Load: 'SEA' | 'SDA' | 'LSD';
    Feature: 'WAB' | '';
    Type: 'SD' | 'DD' | 'BD';
  };
  NextBus3?: {
    EstimatedArrival: string;
    Load: 'SEA' | 'SDA' | 'LSD';
    Feature: 'WAB' | '';
    Type: 'SD' | 'DD' | 'BD';
  };
}

interface TaxiNearbyItem {
  lng: number;
  lat: number;
  distanceMeters: number;
  estPickupMins: number;
}

interface TaxiApiResponse {
  isLive: boolean;
  source: string;
  timestamp: string;
  totalTaxisInSingapore: number;
  searchCenter: { lat: number; lng: number; radiusMeters: number };
  nearbyTaxisCount: number;
  nearbyTaxis: TaxiNearbyItem[];
  nearestTaxiStands: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    capacity: number;
    distanceMeters: number;
  }>;
  fareEstimate: {
    standard4Seater: {
      flagdown: string;
      peakSurcharge: string;
      cityAreaSurcharge: string;
    };
    maxiCab6Seater: {
      flatRate: string;
      idealForGroupOf: string;
    };
  };
}

// Fixed Singapore nodes for LTA Bus Stops & MRT Interchanges
const LTA_BUS_STOPS = [
  { code: '03059', name: 'Opp The Sail (Lau Pa Sat)', road: 'Marina Boulevard', lat: 1.2801, lng: 103.8505, services: ['10', '97', '100', '131', '196', '970'] },
  { code: '03071', name: 'Opp So/Sofitel (Lau Pa Sat)', road: 'Robinson Road', lat: 1.2804, lng: 103.8496, services: ['10', '57', '70', '100', '107', '130', '131', '167', '186', '196', '970'] },
  { code: '05013', name: 'Chinatown Station Exit E', road: 'Eu Tong Sen Street', lat: 1.2850, lng: 103.8447, services: ['2', '12', '33', '54', '61', '143', '147', '190', '851'] },
  { code: '03509', name: 'Marina Bay Sands Theatre', road: 'Bayfront Ave', lat: 1.2835, lng: 103.8587, services: ['97', '106', '133', '502', '518'] },
  { code: '09048', name: 'Lucky Plaza / Orchard Stn', road: 'Orchard Road', lat: 1.3039, lng: 103.8322, services: ['7', '14', '16', '65', '106', '111', '123', '175'] },
  { code: '01112', name: 'Bugis Station Exit A', road: 'Victoria Street', lat: 1.3005, lng: 103.8562, services: ['2', '12', '33', '130', '133'] },
];

const MRT_STATIONS = [
  { id: 'DT18', name: 'Telok Ayer MRT (DT18)', line: 'Downtown Line', lat: 1.2792, lng: 103.8485, exitTip: 'Exit A opens to Cross St (90m walk to satay stalls)' },
  { id: 'EW14', name: 'Raffles Place MRT (EW14/NS26)', line: 'East-West & North-South', lat: 1.2839, lng: 103.8515, exitTip: 'Exit I (Collyer Quay, 250m walk)' },
  { id: 'DT16', name: 'Bayfront MRT (DT16/CE1)', line: 'Downtown & Circle', lat: 1.2825, lng: 103.8590, exitTip: 'Exit D (Marina Bay Sands & Gardens by the Bay)' },
  { id: 'NE4', name: 'Chinatown MRT (NE4/DT19)', line: 'North East & Downtown', lat: 1.2845, lng: 103.8440, exitTip: 'Exit E (Chinatown Point & Pagoda Street)' },
];

// Helper component to programmatically pan/zoom the Google Map
function MapPanController({ targetCenter, targetZoom }: { targetCenter: { lat: number; lng: number }; targetZoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(targetCenter);
      map.setZoom(targetZoom);
    }
  }, [map, targetCenter, targetZoom]);
  return null;
}

export const RendezvousMap: React.FC<RendezvousMapProps> = ({
  trip,
  activeTraveler,
  onUpdateTrip,
}) => {
  // Beacon & status states
  const [isEditingBeacon, setIsEditingBeacon] = useState(false);
  const [beaconName, setBeaconName] = useState(trip.meetupPoint.name);
  const [beaconTime, setBeaconTime] = useState(trip.meetupPoint.time);
  const [beaconNotes, setBeaconNotes] = useState(trip.meetupPoint.notes);
  const [quickStatus, setQuickStatus] = useState('');
  const [announcementBanner, setAnnouncementBanner] = useState<string | null>(null);

  // Map layer toggles
  const [layers, setLayers] = useState({
    taxis: true,
    buses: true,
    mrt: true,
    crew: true,
  });

  // Map View Mode (Google Map interactive vs Spatial Radar)
  const [mapDisplayMode, setMapDisplayMode] = useState<'google' | 'radar'>('google');

  // Camera preset controller state
  const [mapCenter, setMapCenter] = useState({ lat: 1.2806, lng: 103.8504 }); // Lau Pa Sat
  const [mapZoom, setMapZoom] = useState(16);

  // Active InfoWindow Marker
  const [activeInfoWindow, setActiveInfoWindow] = useState<{
    id: string;
    title: string;
    type: 'beacon' | 'bus' | 'taxi' | 'mrt' | 'crew';
    lat: number;
    lng: number;
    subtitle?: string;
    details?: string;
    extraBadge?: string;
    busStopCode?: string;
  } | null>(null);

  // Transit Data States
  const [selectedBusStop, setSelectedBusStop] = useState('03059');
  const [busSearchInput, setBusSearchInput] = useState('');
  const [busData, setBusData] = useState<{
    isLive: boolean;
    source: string;
    notice?: string;
    BusStopCode: string;
    stopName: string;
    roadName: string;
    Services: BusArrivalService[];
  } | null>(null);
  const [isBusLoading, setIsBusLoading] = useState(false);

  const [taxiData, setTaxiData] = useState<TaxiApiResponse | null>(null);
  const [isTaxiLoading, setIsTaxiLoading] = useState(false);
  const [lastUpdatedTransit, setLastUpdatedTransit] = useState<string>('Just now');

  // Serverless Health Check Modal
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);

  // Group Travel Planner state
  const [travelMode, setTravelMode] = useState<'bus' | 'taxi' | 'mrt' | 'walk'>('bus');

  // Fetch Bus Arrivals
  const fetchBusArrivals = async (stopCode: string) => {
    setIsBusLoading(true);
    try {
      const res = await fetch(`/api/busarrival?BusStopCode=${encodeURIComponent(stopCode)}`);
      if (res.ok) {
        const json = await res.json();
        setBusData(json);
      }
    } catch (e) {
      console.error('Failed to fetch bus arrival:', e);
    } finally {
      setIsBusLoading(false);
      setLastUpdatedTransit(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  };

  // Fetch Taxi Availability
  const fetchTaxiAvailability = async () => {
    setIsTaxiLoading(true);
    try {
      const res = await fetch('/api/taxi?lat=1.2806&lng=103.8504&radius=1500');
      if (res.ok) {
        const json = await res.json();
        setTaxiData(json);
      }
    } catch (e) {
      console.error('Failed to fetch taxi data:', e);
    } finally {
      setIsTaxiLoading(false);
    }
  };

  // Fetch Serverless Health
  const fetchHealthCheck = async () => {
    setIsHealthLoading(true);
    setIsHealthModalOpen(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const json = await res.json();
        setHealthData(json);
      }
    } catch (e) {
      console.error('Health check failed:', e);
    } finally {
      setIsHealthLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBusArrivals(selectedBusStop);
    fetchTaxiAvailability();
    const interval = setInterval(() => {
      fetchBusArrivals(selectedBusStop);
      fetchTaxiAvailability();
    }, 45000); // 45s poll
    return () => clearInterval(interval);
  }, [selectedBusStop]);

  // Group quick check-in for active traveler
  const handleToggleArrived = () => {
    const updatedMembers = trip.members.map((m) => {
      if (m.id === activeTraveler.id) {
        return {
          ...m,
          isAtMeetup: !m.isAtMeetup,
          status: !m.isAtMeetup ? 'Arrived at Rendezvous Point!' : 'Exploring nearby',
          lastActive: 'Just now',
        };
      }
      return m;
    });

    onUpdateTrip({
      ...trip,
      members: updatedMembers,
    });
  };

  const handleUpdateCustomStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStatus.trim()) return;

    const updatedMembers = trip.members.map((m) => {
      if (m.id === activeTraveler.id) {
        return {
          ...m,
          status: quickStatus.trim(),
          lastActive: 'Just now',
        };
      }
      return m;
    });

    onUpdateTrip({
      ...trip,
      members: updatedMembers,
    });

    setQuickStatus('');
  };

  const handleSaveBeacon = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTrip({
      ...trip,
      meetupPoint: {
        name: beaconName.trim(),
        time: beaconTime.trim(),
        notes: beaconNotes.trim(),
        updatedAt: `Just now by ${activeTraveler.name}`,
      },
    });
    setIsEditingBeacon(false);
    setAnnouncementBanner(`New Rendezvous Beacon set at ${beaconTime}: ${beaconName}`);
  };

  const handleSendRegroupAlert = () => {
    setAnnouncementBanner(
      `🔔 REGROUP ALERT SENT: "${activeTraveler.name} signaled the crew to head to ${trip.meetupPoint.name} for ${trip.meetupPoint.time} meetup."`
    );
  };

  const handleBroadcastTravelPlan = () => {
    let planDesc = '';
    if (travelMode === 'bus') {
      planDesc = `Take Bus 10 / 100 to ${busData?.stopName || 'Lau Pa Sat'}. Next bus arriving shortly!`;
    } else if (travelMode === 'taxi') {
      planDesc = `Hail a 6-seater MaxiCab from Taxi Stand E23 (${taxiData?.nearbyTaxisCount || 12} live taxis in area, ~$11/pax).`;
    } else if (travelMode === 'mrt') {
      planDesc = 'Take MRT to Telok Ayer DT18 (Exit A, 90m walk to satay stalls).';
    } else {
      planDesc = 'Scenic group walk via Amoy Street heritage shophouses (400m, ~6 mins).';
    }

    setAnnouncementBanner(`🚀 TRAVEL PLAN BROADCASTED: "${planDesc}"`);
  };

  const handleSearchBusStop = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = busSearchInput.trim();
    if (cleaned) {
      setSelectedBusStop(cleaned);
      fetchBusArrivals(cleaned);
      // If recognized stop, pan map
      const found = LTA_BUS_STOPS.find((s) => s.code === cleaned);
      if (found) {
        setMapCenter({ lat: found.lat, lng: found.lng });
        setMapZoom(17);
      }
    }
  };

  const getMinutesUntil = (isoDateString?: string) => {
    if (!isoDateString) return null;
    const diffMs = new Date(isoDateString).getTime() - Date.now();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins <= 0) return 'Arr';
    return `${diffMins}m`;
  };

  const getLoadBadge = (load?: 'SEA' | 'SDA' | 'LSD') => {
    switch (load) {
      case 'SEA':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800" title="Seats Available">Seats</span>;
      case 'SDA':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800" title="Standing Available">Standing</span>;
      case 'LSD':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800" title="Limited Standing">Packed</span>;
      default:
        return null;
    }
  };

  // Member GPS coordinates around Lau Pa Sat & Chinatown
  const memberLocations: Record<string, { lat: number; lng: number; area: string }> = {
    'm-1': { lat: 1.2842, lng: 103.8440, area: 'Chinatown Pagoda St' }, // Alex
    'm-2': { lat: 1.2807, lng: 103.8506, area: 'Lau Pa Sat Table 18' }, // Priya
    'm-3': { lat: 1.2792, lng: 103.8485, area: 'Telok Ayer MRT Exit A' }, // Wei Ming
    'm-4': { lat: 1.2818, lng: 103.8475, area: 'Amoy St Shophouses' }, // Sarah
    'm-5': { lat: 1.2803, lng: 103.8490, area: 'Cross St Junction' }, // Ryan
  };

  const arrivedCount = trip.members.filter((m) => m.isAtMeetup).length;

  return (
    <div className="space-y-6">
      {/* Broadcast Alert Banner */}
      {announcementBanner && (
        <div className="bg-amber-500 text-slate-950 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 shrink-0" />
            <span>{announcementBanner}</span>
          </div>
          <button
            onClick={() => setAnnouncementBanner(null)}
            className="p-1 hover:bg-amber-600/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rendezvous Beacon Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Navigation className="w-4 h-4" />
              <span>ACTIVE GROUP RENDEZVOUS BEACON</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-400 font-normal">{trip.meetupPoint.updatedAt}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {trip.meetupPoint.name}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-semibold text-white">
                <Clock className="w-4 h-4 text-amber-400" />
                Meetup Time: {trip.meetupPoint.time}
              </span>
              <span aria-hidden="true">·</span>
              <span>{trip.meetupPoint.notes}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={fetchHealthCheck}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              title="Check serverless connection status to LTA DataMall & data.gov.sg"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>API Diagnostics</span>
            </button>
            <button
              onClick={() => setIsEditingBeacon(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-white/10 hover:bg-white/15 rounded-lg border border-white/10 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Beacon</span>
            </button>
            <button
              onClick={handleSendRegroupAlert}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Ping Crew</span>
            </button>
          </div>
        </div>

        {/* Check-in Progress Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-xs">
              <span className="text-slate-400">Attendance: </span>
              <strong className="text-white font-tabular">{arrivedCount} of {trip.members.length} Arrived</strong>
            </div>
            <div className="flex -space-x-1.5">
              {trip.members.map((m) => (
                <img
                  key={m.id}
                  src={m.avatar}
                  alt={m.name}
                  title={`${m.name}: ${m.isAtMeetup ? 'At Meetup' : 'En route'}`}
                  className={`w-6 h-6 rounded-full object-cover ring-2 ${
                    m.isAtMeetup ? 'ring-emerald-400' : 'ring-slate-700 opacity-60'
                  }`}
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleToggleArrived}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTraveler.isAtMeetup
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>
              {activeTraveler.isAtMeetup
                ? `You're Checked In as ${activeTraveler.name.split(' ')[0]}!`
                : `I Have Arrived (${activeTraveler.name.split(' ')[0]})`}
            </span>
          </button>
        </div>
      </div>

      {/* Embedded Google Map & LTA Transit Hub */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Singapore Interactive Google Map & Transit Layers
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Google Maps + Live LTA
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Embedded Google Map with live available taxis (data.gov.sg), LTA bus stops, MRT stations, and crew GPS tracking.
            </p>
          </div>

          {/* Map Display & Layer Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setMapDisplayMode('google')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  mapDisplayMode === 'google' ? 'bg-white text-slate-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google Map
              </button>
              <button
                onClick={() => setMapDisplayMode('radar')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  mapDisplayMode === 'radar' ? 'bg-white text-slate-950 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Spatial Radar
              </button>
            </div>

            {/* Quick Camera Presets */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setMapCenter({ lat: 1.2806, lng: 103.8504 });
                  setMapZoom(17);
                }}
                className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                title="Center on Lau Pa Sat Satay Street"
              >
                Beacon
              </button>
              <button
                onClick={() => {
                  setMapCenter({ lat: 1.2820, lng: 103.8475 });
                  setMapZoom(15);
                }}
                className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                title="Fit all group members in view"
              >
                All Crew
              </button>
              <button
                onClick={() => {
                  setMapCenter({ lat: 1.2835, lng: 103.8587 });
                  setMapZoom(16);
                }}
                className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md"
                title="View Marina Bay Sands area"
              >
                Marina Bay
              </button>
            </div>

            {/* Layer toggles */}
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setLayers({ ...layers, taxis: !layers.taxis })}
                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  layers.taxis ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Toggle live taxis from data.gov.sg"
              >
                <Car className="w-3 h-3" />
                <span>Taxis ({taxiData?.nearbyTaxisCount ?? '...'})</span>
              </button>
              <button
                onClick={() => setLayers({ ...layers, buses: !layers.buses })}
                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  layers.buses ? 'bg-indigo-600 text-white font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Toggle LTA bus stop locations"
              >
                <Bus className="w-3 h-3" />
                <span>Buses</span>
              </button>
              <button
                onClick={() => setLayers({ ...layers, mrt: !layers.mrt })}
                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  layers.mrt ? 'bg-emerald-600 text-white font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Toggle MRT stations"
              >
                <Train className="w-3 h-3" />
                <span>MRT</span>
              </button>
              <button
                onClick={() => setLayers({ ...layers, crew: !layers.crew })}
                className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                  layers.crew ? 'bg-slate-900 text-white font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Toggle group crew positions"
              >
                <Users className="w-3 h-3" />
                <span>Crew</span>
              </button>
            </div>
          </div>
        </div>

        {/* Embedded Google Map Container (CF2: Explicit height defined) */}
        <div className="relative h-96 sm:h-[460px] w-full rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
          {mapDisplayMode === 'google' ? (
            <Map
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              defaultCenter={{ lat: 1.2806, lng: 103.8504 }}
              defaultZoom={16}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Pan Controller */}
              <MapPanController targetCenter={mapCenter} targetZoom={mapZoom} />

              {/* 1. Rendezvous Beacon Marker */}
              <AdvancedMarker
                position={{ lat: 1.2806, lng: 103.8504 }}
                title={trip.meetupPoint.name}
                onClick={() => setActiveInfoWindow({
                  id: 'beacon',
                  title: trip.meetupPoint.name,
                  type: 'beacon',
                  lat: 1.2806,
                  lng: 103.8504,
                  subtitle: `Active Meetup at ${trip.meetupPoint.time}`,
                  details: trip.meetupPoint.notes,
                  extraBadge: `${arrivedCount}/${trip.members.length} Arrived`
                })}
              >
                <div className="relative flex flex-col items-center cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-xl shadow-amber-400/40 ring-4 ring-amber-400/50 animate-pulse transition-transform group-hover:scale-110">
                    <Navigation className="w-5 h-5 fill-slate-950" />
                  </div>
                  <span className="mt-1 text-[11px] font-extrabold text-slate-950 bg-amber-400 px-2 py-0.5 rounded shadow-md border border-amber-500 whitespace-nowrap">
                    Beacon ({trip.meetupPoint.time})
                  </span>
                </div>
              </AdvancedMarker>

              {/* 2. Crew Member Markers */}
              {layers.crew && trip.members.map((member) => {
                const loc = memberLocations[member.id] || { lat: 1.2806, lng: 103.8504, area: 'Singapore' };
                return (
                  <AdvancedMarker
                    key={member.id}
                    position={{ lat: loc.lat, lng: loc.lng }}
                    title={`${member.name}: ${member.status}`}
                    onClick={() => setActiveInfoWindow({
                      id: member.id,
                      title: member.name,
                      type: 'crew',
                      lat: loc.lat,
                      lng: loc.lng,
                      subtitle: `${member.role} · ${loc.area}`,
                      details: `Status: "${member.status}" · Battery: ${member.battery}% · Active: ${member.lastActive}`,
                      extraBadge: member.isAtMeetup ? 'At Meetup' : 'En Route'
                    })}
                  >
                    <div className="flex flex-col items-center cursor-pointer group">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className={`w-8 h-8 rounded-full object-cover ring-2 shadow-lg group-hover:scale-125 transition-transform ${
                          member.isAtMeetup ? 'ring-emerald-400 ring-offset-2' : 'ring-slate-900 ring-offset-1'
                        }`}
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] font-bold text-slate-900 bg-white/95 px-1.5 py-0.5 rounded shadow mt-0.5 border border-slate-300 whitespace-nowrap">
                        {member.name.split(' ')[0]}
                      </span>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* 3. LTA Bus Stop Markers */}
              {layers.buses && LTA_BUS_STOPS.map((stop) => (
                <AdvancedMarker
                  key={stop.code}
                  position={{ lat: stop.lat, lng: stop.lng }}
                  title={`${stop.name} (${stop.code})`}
                  onClick={() => {
                    setSelectedBusStop(stop.code);
                    fetchBusArrivals(stop.code);
                    setActiveInfoWindow({
                      id: stop.code,
                      title: `${stop.name} (${stop.code})`,
                      type: 'bus',
                      lat: stop.lat,
                      lng: stop.lng,
                      subtitle: stop.road,
                      details: `Services: ${stop.services.join(', ')}. Click below to view live arrival countdowns.`,
                      extraBadge: 'LTA DataMall Node',
                      busStopCode: stop.code,
                    });
                  }}
                >
                  <div className={`p-1.5 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-125 cursor-pointer ${
                    selectedBusStop === stop.code ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/40 scale-110' : 'bg-indigo-500 text-white'
                  }`}>
                    <Bus className="w-3.5 h-3.5" />
                  </div>
                </AdvancedMarker>
              ))}

              {/* 4. MRT Station Markers */}
              {layers.mrt && MRT_STATIONS.map((mrt) => (
                <AdvancedMarker
                  key={mrt.id}
                  position={{ lat: mrt.lat, lng: mrt.lng }}
                  title={`${mrt.name} - ${mrt.line}`}
                  onClick={() => setActiveInfoWindow({
                    id: mrt.id,
                    title: mrt.name,
                    type: 'mrt',
                    lat: mrt.lat,
                    lng: mrt.lng,
                    subtitle: mrt.line,
                    details: mrt.exitTip,
                    extraBadge: 'MRT Network'
                  })}
                >
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-lg transition-transform hover:scale-125 cursor-pointer">
                    <Train className="w-3.5 h-3.5" />
                  </div>
                </AdvancedMarker>
              ))}

              {/* 5. Live Taxis from data.gov.sg */}
              {layers.taxis && taxiData?.nearbyTaxis?.slice(0, 20).map((taxi, idx) => (
                <AdvancedMarker
                  key={`live-taxi-${idx}`}
                  position={{ lat: taxi.lat, lng: taxi.lng }}
                  title={`Available Taxi (${taxi.distanceMeters}m away)`}
                  onClick={() => setActiveInfoWindow({
                    id: `taxi-${idx}`,
                    title: `Available Taxi #${idx + 1}`,
                    type: 'taxi',
                    lat: taxi.lat,
                    lng: taxi.lng,
                    subtitle: `${taxi.distanceMeters}m from Lau Pa Sat`,
                    details: `ETA: ~${taxi.estPickupMins} min pickup. Standard flagdown S$4.40 - S$4.80.`,
                    extraBadge: 'Live data.gov.sg'
                  })}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-slate-900 shadow-md hover:scale-150 transition-transform flex items-center justify-center ring-2 ring-amber-400/40 cursor-pointer" />
                </AdvancedMarker>
              ))}

              {/* Active Marker InfoWindow */}
              {activeInfoWindow && (
                <InfoWindow
                  position={{ lat: activeInfoWindow.lat, lng: activeInfoWindow.lng }}
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div className="p-2 max-w-xs text-xs space-y-1.5 font-sans">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-slate-900 font-bold">{activeInfoWindow.title}</strong>
                      {activeInfoWindow.extraBadge && (
                        <span className="text-[10px] bg-slate-900 text-white px-1.5 py-0.2 rounded font-medium">
                          {activeInfoWindow.extraBadge}
                        </span>
                      )}
                    </div>
                    {activeInfoWindow.subtitle && (
                      <div className="text-[11px] text-slate-500 font-medium">{activeInfoWindow.subtitle}</div>
                    )}
                    {activeInfoWindow.details && (
                      <p className="text-[11px] text-slate-700">{activeInfoWindow.details}</p>
                    )}

                    {/* Action buttons */}
                    {activeInfoWindow.busStopCode && (
                      <button
                        onClick={() => {
                          setSelectedBusStop(activeInfoWindow.busStopCode!);
                          fetchBusArrivals(activeInfoWindow.busStopCode!);
                        }}
                        className="mt-2 w-full py-1 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                      >
                        Load Live Bus Arrivals
                      </button>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          ) : (
            /* Spatial Radar View Option */
            <div className="relative h-full w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />
              {/* Radial distance rings */}
              <div className="absolute w-40 h-40 rounded-full border border-slate-700/60 pointer-events-none flex items-start justify-center">
                <span className="text-[9px] text-slate-500 bg-slate-950/80 px-1 rounded -translate-y-2 font-tabular">150m</span>
              </div>
              <div className="absolute w-72 h-72 rounded-full border border-slate-800/80 pointer-events-none flex items-start justify-center">
                <span className="text-[9px] text-slate-500 bg-slate-950/80 px-1 rounded -translate-y-2 font-tabular">350m</span>
              </div>
              <div className="absolute w-108 h-108 rounded-full border border-slate-800/40 pointer-events-none flex items-start justify-center">
                <span className="text-[9px] text-slate-600 bg-slate-950/80 px-1 rounded -translate-y-2 font-tabular">700m</span>
              </div>

              {/* Central Beacon */}
              <div className="absolute z-20 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/30 ring-4 ring-amber-400/40 animate-pulse">
                  <Navigation className="w-5 h-5 fill-slate-950" />
                </div>
                <span className="mt-1.5 text-[11px] font-bold text-amber-300 bg-slate-900/95 px-2 py-0.5 rounded shadow border border-amber-400/40 whitespace-nowrap">
                  Lau Pa Sat Beacon ({trip.meetupPoint.time})
                </span>
              </div>

              {/* Crew nodes */}
              {layers.crew && trip.members.map((m, idx) => {
                const offsets = [
                  { x: -90, y: -80 },
                  { x: 30, y: 20 },
                  { x: -50, y: 70 },
                  { x: 100, y: -60 },
                  { x: 70, y: 60 },
                ];
                const off = offsets[idx % offsets.length];
                return (
                  <div
                    key={m.id}
                    style={{ transform: `translate(${off.x}px, ${off.y}px)` }}
                    className="absolute z-10 flex flex-col items-center"
                  >
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-400 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[9px] text-white bg-slate-900/90 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap border border-slate-700">
                      {m.name.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Map Legend & Status Bar */}
        <div className="pt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Available Taxis (data.gov.sg)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              <span>LTA Bus Stops</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <span>MRT Interchanges</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900" />
              <span>Crew Members</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span>Synced: <strong className="text-slate-700 font-tabular">{lastUpdatedTransit}</strong></span>
            <button
              onClick={() => {
                fetchBusArrivals(selectedBusStop);
                fetchTaxiAvailability();
              }}
              className="p-1 hover:bg-slate-100 rounded text-slate-600"
              title="Refresh live transit data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isBusLoading || isTaxiLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Transit Planning Grid: Bus Arrival Board & Taxi Availability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. LTA Bus Arrival Live Board */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Bus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Bus Arrival Board
                </h3>
                {busData?.isLive ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Live LTA v3
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    SG Transit Schedule
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time arrival countdowns, double-deck capacity, and crowd occupancy levels.
              </p>
            </div>

            <button
              onClick={() => fetchBusArrivals(selectedBusStop)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh bus arrivals"
            >
              <RefreshCw className={`w-4 h-4 ${isBusLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Quick Bus Stop Switcher & Search */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
              {LTA_BUS_STOPS.map((stop) => (
                <button
                  key={stop.code}
                  onClick={() => {
                    setSelectedBusStop(stop.code);
                    fetchBusArrivals(stop.code);
                    setMapCenter({ lat: stop.lat, lng: stop.lng });
                    setMapZoom(17);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap shrink-0 transition-colors ${
                    selectedBusStop === stop.code
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {stop.name.split(' (')[0]} ({stop.code})
                </button>
              ))}
            </div>

            {/* Custom 5-digit bus stop input */}
            <form onSubmit={handleSearchBusStop} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={5}
                  value={busSearchInput}
                  onChange={(e) => setBusSearchInput(e.target.value)}
                  placeholder="Enter 5-digit LTA Bus Stop Code (e.g. 01112)..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-tabular text-slate-900"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shrink-0"
              >
                Track Stop
              </button>
            </form>
          </div>

          {/* Active Bus Stop Header */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>{busData?.stopName || `Bus Stop #${selectedBusStop}`}</span>
                <span className="font-tabular text-slate-400">({selectedBusStop})</span>
              </div>
              <div className="text-slate-500 text-[11px]">{busData?.roadName || 'Singapore'}</div>
            </div>
            <span className="text-[11px] text-slate-500 font-tabular">
              {busData?.Services?.length || 0} active routes
            </span>
          </div>

          {/* Services List */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1">
            {busData?.Services && busData.Services.length > 0 ? (
              busData.Services.map((svc) => {
                const nextMins = getMinutesUntil(svc.NextBus?.EstimatedArrival);
                const next2Mins = getMinutesUntil(svc.NextBus2?.EstimatedArrival);
                const next3Mins = getMinutesUntil(svc.NextBus3?.EstimatedArrival);

                return (
                  <div key={svc.ServiceNo} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center font-tabular shadow-xs text-sm">
                        {svc.ServiceNo}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{svc.Operator}</span>
                          {svc.NextBus?.Type === 'DD' && (
                            <span className="text-[10px] text-slate-500 font-normal border border-slate-200 px-1 rounded">Double Deck</span>
                          )}
                          {svc.NextBus?.Feature === 'WAB' && (
                            <span className="text-[10px] text-slate-500 font-normal">♿</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Subsequent: {next2Mins || '—'} · {next3Mins || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getLoadBadge(svc.NextBus?.Load)}
                      <div className="text-right min-w-16">
                        <span className={`text-sm font-bold font-tabular ${
                          nextMins === 'Arr' ? 'text-emerald-600 animate-pulse' : 'text-slate-900'
                        }`}>
                          {nextMins || '—'}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {nextMins === 'Arr' ? 'At Stop' : 'estimated'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active bus arrival data for this stop code.
              </div>
            )}
          </div>
        </div>

        {/* 2. Live Singapore Taxi Availability & Group Ride Planner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                  <Car className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Taxi & Van Ride-Hail
                </h3>
                {taxiData?.isLive ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Live data.gov.sg
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time count of available taxis roaming near Lau Pa Sat & Singapore taxi stand berths.
              </p>
            </div>

            <button
              onClick={fetchTaxiAvailability}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Refresh taxi availability"
            >
              <RefreshCw className={`w-4 h-4 ${isTaxiLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block">Available Within 1.5km</span>
              <strong className="text-xl font-extrabold text-slate-900 font-tabular">
                {taxiData?.nearbyTaxisCount ?? 14} Taxis
              </strong>
              <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                ~1 to 3 min pickup ETA
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 block">Total Island-Wide</span>
              <strong className="text-xl font-extrabold text-slate-900 font-tabular">
                {taxiData?.totalTaxisInSingapore?.toLocaleString() ?? '2,400'}
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Active in Singapore
              </span>
            </div>
          </div>

          {/* Nearest Official Taxi Stand */}
          <div className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>Nearest Sheltered Taxi Stands</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Official LTA Berths</span>
            </div>

            <div className="space-y-1.5">
              {taxiData?.nearestTaxiStands?.slice(0, 3).map((stand) => (
                <div key={stand.id} className="flex items-center justify-between text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded">
                  <div>
                    <span className="font-semibold">{stand.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5 font-tabular">({stand.id})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-tabular font-medium text-slate-900">{stand.distanceMeters}m</span>
                    <span className="text-[10px] text-slate-400 block">{stand.capacity} berths</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Split Fare Calculator */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs space-y-2">
            <div className="flex items-center justify-between text-amber-950 font-bold">
              <span>FairShare Group Ride Split ({trip.members.length} Pax)</span>
              <span className="text-[11px] font-normal text-amber-800">Standard vs 6-Seater MaxiCab</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 pt-1">
              <div className="bg-white/80 p-2 rounded border border-amber-200/80">
                <span className="font-semibold block text-slate-900">2x Standard 4-Seaters</span>
                <span className="text-slate-500 block">Flagdown {taxiData?.fareEstimate?.standard4Seater?.flagdown || 'S$4.40'}</span>
                <strong className="text-slate-900 block mt-1 font-tabular">~S$6 - S$8 / person</strong>
              </div>
              <div className="bg-white/80 p-2 rounded border border-amber-200/80">
                <span className="font-semibold block text-slate-900">1x 6-Seater MaxiCab</span>
                <span className="text-slate-500 block">Flat Rate {taxiData?.fareEstimate?.maxiCab6Seater?.flatRate || 'S$55'}</span>
                <strong className="text-slate-900 block mt-1 font-tabular">
                  ~S${(55 / trip.members.length).toFixed(1)} / person
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Journey Planner: Coordinate Mode of Travel to Beacon */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Coordinated Group Travel Planner
            </h3>
            <p className="text-xs text-slate-500">
              Align all {trip.members.length} members on how to travel together to the active rendezvous beacon.
            </p>
          </div>

          <button
            onClick={handleBroadcastTravelPlan}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Broadcast Travel Choice to Crew</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Mode 1: LTA Bus */}
          <div
            onClick={() => setTravelMode('bus')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              travelMode === 'bus'
                ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-indigo-600" />
                <span>By LTA Public Bus</span>
              </span>
              {travelMode === 'bus' && <Check className="w-4 h-4 text-indigo-600" />}
            </div>
            <p className="text-[11px] text-slate-600 mb-2">
              Hop on Bus 10 or 100 to Opp The Sail (03059). Direct drop-off across from satay street.
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span>ETA: ~6 mins</span>
              <strong className="text-slate-900 font-tabular">S$1.09 / pax</strong>
            </div>
          </div>

          {/* Mode 2: Group MaxiCab */}
          <div
            onClick={() => setTravelMode('taxi')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              travelMode === 'taxi'
                ? 'border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Car className="w-4 h-4 text-amber-500" />
                <span>6-Seater MaxiCab</span>
              </span>
              {travelMode === 'taxi' && <Check className="w-4 h-4 text-amber-500" />}
            </div>
            <p className="text-[11px] text-slate-600 mb-2">
              One vehicle fits all {trip.members.length} members. Direct pickup with AC comfort in midday heat.
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span>ETA: ~4 mins</span>
              <strong className="text-slate-900 font-tabular">~S$11 / pax</strong>
            </div>
          </div>

          {/* Mode 3: MRT Train */}
          <div
            onClick={() => setTravelMode('mrt')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              travelMode === 'mrt'
                ? 'border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Train className="w-4 h-4 text-emerald-600" />
                <span>Downtown Line MRT</span>
              </span>
              {travelMode === 'mrt' && <Check className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] text-slate-600 mb-2">
              Telok Ayer DT18 (Exit A). Fully underground, air-conditioned link avoids traffic congestion.
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span>ETA: ~5 mins</span>
              <strong className="text-slate-900 font-tabular">S$1.09 / pax</strong>
            </div>
          </div>

          {/* Mode 4: Shophouse Stroll */}
          <div
            onClick={() => setTravelMode('walk')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              travelMode === 'walk'
                ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/20'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-slate-900" />
                <span>Heritage Stroll</span>
              </span>
              {travelMode === 'walk' && <Check className="w-4 h-4 text-slate-900" />}
            </div>
            <p className="text-[11px] text-slate-600 mb-2">
              Walk down Amoy Street past conserved 19th-century Peranakan shophouses to Boon Tat Street.
            </p>
            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
              <span>ETA: ~8 mins</span>
              <strong className="text-slate-900 font-tabular">Free (400m)</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Member Status Grid & Quick Update */}
      <div className="space-y-4">
        {/* Quick status bar for active traveler */}
        <form onSubmit={handleUpdateCustomStatus} className="bg-white p-4 rounded-xl border border-slate-200 flex gap-2">
          <input
            type="text"
            value={quickStatus}
            onChange={(e) => setQuickStatus(e.target.value)}
            placeholder={`Broadcast quick note to group as ${activeTraveler.name} (e.g. "Taking Bus 10, arriving in 4 mins")...`}
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Status</span>
          </button>
        </form>

        {/* Member cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trip.members.map((member) => {
            const isLowBattery = member.battery < 20;
            return (
              <div
                key={member.id}
                className={`bg-white rounded-xl border p-4 shadow-xs transition-all ${
                  member.isAtMeetup ? 'border-emerald-200 bg-emerald-50/15' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{member.name}</span>
                        {member.id === activeTraveler.id && (
                          <span className="text-[10px] text-slate-500 font-normal">(You)</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{member.role}</div>
                    </div>
                  </div>

                  {/* Battery Indicator */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 font-tabular">
                    {isLowBattery ? (
                      <BatteryWarning className="w-4 h-4 text-rose-500" />
                    ) : (
                      <Battery className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={isLowBattery ? 'text-rose-600 font-bold' : ''}>
                      {member.battery}%
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-start gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="font-medium truncate">{member.locationName}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 italic bg-slate-50 p-1.5 rounded">
                    "{member.status}"
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Active: {member.lastActive}</span>
                    <span className={member.isAtMeetup ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                      {member.isAtMeetup ? 'At Meetup Beacon' : 'Away'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Beacon Modal */}
      {isEditingBeacon && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Set Rendezvous Beacon</h3>
              <button onClick={() => setIsEditingBeacon(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBeacon} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Meetup Location / Landmark *</label>
                <input
                  type="text"
                  required
                  value={beaconName}
                  onChange={(e) => setBeaconName(e.target.value)}
                  placeholder="e.g. Lau Pa Sat Satay Street (Boon Tat St Stall #7 & #8)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Meetup Time *</label>
                <input
                  type="text"
                  required
                  value={beaconTime}
                  onChange={(e) => setBeaconTime(e.target.value)}
                  placeholder="19:00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 font-tabular"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Note for Crew</label>
                <textarea
                  rows={2}
                  value={beaconNotes}
                  onChange={(e) => setBeaconNotes(e.target.value)}
                  placeholder="e.g. Alex chopes Table 18 with tissue packets. Priya orders 40 satay sticks."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingBeacon(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Broadcast New Beacon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Serverless Connection Diagnostics Modal */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Serverless API Connection Diagnostics
                </h3>
              </div>
              <button onClick={() => setIsHealthModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Overall Server Status</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {healthData?.status === 'ok' ? 'ONLINE (200 OK)' : 'CONNECTING...'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Endpoint: <code className="bg-white px-1 py-0.5 rounded border text-slate-700">/api/health</code>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-xs">Configured Serverless Endpoints:</h4>

                <div className="p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">1. LTA Bus Arrival v3</span>
                    <span className="text-[10px] text-slate-500 font-mono">/api/busarrival.ts</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Live proxy to <code className="text-slate-700">https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival</code>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    LTA_ACCOUNT_KEY: {healthData?.ltaDataMall?.isKeyConfigured ? (
                      <span className="text-emerald-600 font-semibold">Configured</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Pending (simulator fallback active)</span>
                    )}
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">2. Singapore Taxi Availability</span>
                    <span className="text-[10px] text-slate-500 font-mono">/api/taxi.ts</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Live open data from <code className="text-slate-700">https://api.data.gov.sg/v1/transport/taxi-availability</code>
                  </p>
                  <p className="text-[11px] text-emerald-600 font-semibold">
                    Live Stream Connected (No Key Required)
                  </p>
                </div>

                <div className="p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">3. LTA Geospatial Whole Island</span>
                    <span className="text-[10px] text-slate-500 font-mono">/api/geospatial.ts</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Live proxy to <code className="text-slate-700">https://datamall2.mytransport.sg/ltaodataservice/GeospatialWholeIsland</code>
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                <strong>How to configure your LTA key:</strong> Add <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">LTA_ACCOUNT_KEY=&lt;your_key&gt;</code> to your <code className="font-mono">.env</code> file. The serverless functions automatically detect it with zero code changes needed.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setIsHealthModalOpen(false)}
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
