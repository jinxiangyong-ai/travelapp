import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Trip, Traveler } from './types/travel';
import { INITIAL_TRIP, INITIAL_MEMBERS } from './data/mockData';
import { Header } from './components/Header';
import { ItineraryView } from './components/ItineraryView';
import { VotingHub } from './components/VotingHub';
import { ExpenseSplitter } from './components/ExpenseSplitter';
import { RendezvousMap } from './components/RendezvousMap';
import { LocalInsiderView } from './components/LocalInsiderView';
import { PackingList } from './components/PackingList';
import { WhatsAppExportModal } from './components/WhatsAppExportModal';
import { 
  Users, Sparkles, Shield, HeartHandshake, 
  MapPin, Calendar, Check 
} from 'lucide-react';

export default function App() {
  const [trip, setTrip] = useState<Trip>(() => {
    const saved = localStorage.getItem('crewvoyage_trip');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse cached trip:', e);
      }
    }
    return INITIAL_TRIP;
  });

  const [activeTraveler, setActiveTraveler] = useState<Traveler>(() => {
    return trip.members[0] || INITIAL_MEMBERS[0];
  });

  const [currentTab, setCurrentTab] = useState<string>('itinerary');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [activeSegmentMode, setActiveSegmentMode] = useState<'friends' | 'family' | 'agency'>('friends');
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Tier 2: Quota defense listener
  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('crewvoyage_trip', JSON.stringify(trip));
  }, [trip]);

  // Keep activeTraveler in sync if trip members change
  useEffect(() => {
    const found = trip.members.find((m) => m.id === activeTraveler.id);
    if (found) {
      setActiveTraveler(found);
    }
  }, [trip.members]);

  const handleSelectTraveler = (traveler: Traveler) => {
    setActiveTraveler(traveler);
  };

  const handleUpdateTrip = (updated: Trip) => {
    setTrip(updated);
  };

  const handleSwitchSegment = (mode: 'friends' | 'family' | 'agency') => {
    setActiveSegmentMode(mode);
    if (mode === 'family') {
      setTrip({
        ...trip,
        title: 'Singapore Multigen Family Discovery (6 Pax)',
        destination: 'Singapore (Family Friendly & Accessible)',
        meetupPoint: {
          name: 'Gardens by the Bay Children’s Garden Water Play',
          time: '16:30',
          notes: 'Family regroup before Supertree light show. Shaded benches, stroller parking & baby changing nearby.',
          updatedAt: 'Just now by Family Lead',
        },
      });
    } else if (mode === 'agency') {
      setTrip({
        ...trip,
        title: 'Singapore MICE & Heritage Incentive Group (#SG-2026)',
        destination: 'Singapore (Marina Bay & Sentosa)',
        meetupPoint: {
          name: 'Sands Expo & Convention Centre Concierge',
          time: '18:00',
          notes: 'Agent briefing: VIP 24-seater coach departing for Chilli Crab banquet at Riverside Quay.',
          updatedAt: 'Managed via Travel Agent Portal (Freemium Tier Active)',
        },
      });
    } else {
      setTrip(INITIAL_TRIP);
    }
  };

  const activeDay = trip.days[0];
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={mapsApiKey} libraries={['places', 'marker', 'routes']}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
        {/* Tier 2: Required In-App Quota Banner */}
        {quotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}

        {/* Top Bar following Top Bar Contract */}
        <Header
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          activeTraveler={activeTraveler}
          allMembers={trip.members}
          onSelectTraveler={handleSelectTraveler}
          onOpenExportModal={() => setIsExportModalOpen(true)}
        />

      {/* Target Audience Segment Strip (from Canvas: Private Friends | Family Group | Travel Agency) */}
      <div className="bg-slate-900 text-white text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Group Travel Mode:</span>
            <span className="font-semibold text-white">
              {activeSegmentMode === 'friends' && 'Private Friends Trip (5 members)'}
              {activeSegmentMode === 'family' && 'Multigenerational Family (All ages & paces)'}
              {activeSegmentMode === 'agency' && 'Travel Agent Managed Tour (Pro Group Hub)'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg">
            <button
              onClick={() => handleSwitchSegment('friends')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activeSegmentMode === 'friends' ? 'bg-white text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Friends Crew
            </button>
            <button
              onClick={() => handleSwitchSegment('family')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activeSegmentMode === 'family' ? 'bg-white text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Family Group
            </button>
            <button
              onClick={() => handleSwitchSegment('agency')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activeSegmentMode === 'agency' ? 'bg-white text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Agency View
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'itinerary' && (
          <ItineraryView
            trip={trip}
            activeTraveler={activeTraveler}
            onUpdateTrip={handleUpdateTrip}
            onNavigateToRendezvous={() => setCurrentTab('rendezvous')}
          />
        )}

        {currentTab === 'voting' && (
          <VotingHub
            trip={trip}
            activeTraveler={activeTraveler}
            onUpdateTrip={handleUpdateTrip}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpenseSplitter
            trip={trip}
            activeTraveler={activeTraveler}
            onUpdateTrip={handleUpdateTrip}
          />
        )}

        {currentTab === 'rendezvous' && (
          <RendezvousMap
            trip={trip}
            activeTraveler={activeTraveler}
            onUpdateTrip={handleUpdateTrip}
          />
        )}

        {currentTab === 'local-gems' && (
          <LocalInsiderView
            trip={trip}
            onUpdateTrip={handleUpdateTrip}
            onNavigateToItinerary={() => setCurrentTab('itinerary')}
          />
        )}

        {currentTab === 'packing' && (
          <PackingList
            trip={trip}
            activeTraveler={activeTraveler}
            onUpdateTrip={handleUpdateTrip}
          />
        )}
      </main>

      {/* WhatsApp Export Modal */}
      <WhatsAppExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        trip={trip}
        activeDay={activeDay}
      />

      {/* Subtle Minimalist Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">CrewVoyage</span>
            <span aria-hidden="true">·</span>
            <span>Collaborative Group Travel Workspace</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Logged in as {activeTraveler.name}</span>
            <span aria-hidden="true">·</span>
            <span>{trip.members.length} Active Travelers</span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => {
                localStorage.removeItem('crewvoyage_trip');
                setTrip(INITIAL_TRIP);
              }}
              className="text-slate-500 hover:text-slate-900 underline"
            >
              Reset Demo State
            </button>
          </div>
        </div>
      </footer>
      </div>
    </APIProvider>
  );
}
