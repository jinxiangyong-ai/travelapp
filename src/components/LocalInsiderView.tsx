import React, { useState } from 'react';
import { Trip, LocalGem, ActivityItem } from '../types/travel';
import { 
  Sparkles, MapPin, Clock, Plus, Compass, 
  Lightbulb, Check, RefreshCw, Coffee, ShieldCheck 
} from 'lucide-react';

interface LocalInsiderViewProps {
  trip: Trip;
  onUpdateTrip: (updated: Trip) => void;
  onNavigateToItinerary: () => void;
}

export const LocalInsiderView: React.FC<LocalInsiderViewProps> = ({
  trip,
  onUpdateTrip,
  onNavigateToItinerary,
}) => {
  const [destinationQuery, setDestinationQuery] = useState('Singapore');
  const [isLoading, setIsLoading] = useState(false);
  const [localData, setLocalData] = useState<{
    destination: string;
    localGreeting: string;
    culturalEtiquette: string;
    gems: LocalGem[];
  }>({
    destination: 'Singapore',
    localGreeting: 'Wah, welcome to Singapore lah! Makan already?',
    culturalEtiquette: "The Sacred 'Chope' Rule: If you spot a packet of tissue paper, umbrella, or lanyard resting on a hawker table, it is officially reserved! One member stays to chope while the rest fan out to queue.",
    gems: [
      {
        id: 'gem-sg-1',
        name: 'The Kaya House & Vintage Shophouse Roastery',
        category: 'Hawker Heritage',
        neighborhood: 'Tiong Bahru Historic Quarter (Eng Hoon St)',
        bestTime: '08:30 - 10:00am for freshly toasted bread',
        insiderTip: 'Order the signature charcoal-crisped Hainanese kaya toast with salted butter slabs and runny soft-boiled eggs splashed with dark caramel soy sauce and white pepper. Pair with a hot Kopi C Kosong.',
        priceLevel: '$ (Under S$6/pax)',
        groupSuitability: 'Round marble kopitiam tables fit 5-6 travelers',
        imageUrl: '/src/assets/images/singapore_shophouse_cafe_1792052404850.jpg',
      },
      {
        id: 'gem-sg-2',
        name: 'CapitaSpring 51st Floor Secret Sky Garden & Urban Farm',
        category: 'Scenic Viewpoint',
        neighborhood: 'CBD / Raffles Place MRT Exit A',
        bestTime: '17:30 - 18:45 for golden hour twilight breeze',
        insiderTip: 'Completely free public rooftop terrace 280 meters above ground with zero cover charge or drink minimum. Winding tropical gardens with views across Marina Bay and the Singapore Strait into the Indonesian islands.',
        priceLevel: 'Free Admission',
        groupSuitability: 'Spacious observation promenade, ideal for group skyline photography',
        imageUrl: '/src/assets/images/singapore_supertree_sunset_1792052403606.jpg',
      },
      {
        id: 'gem-sg-3',
        name: 'Old Airport Road Hawker Centre (The Group Feast Hub)',
        category: 'Hawker Heritage',
        neighborhood: 'Geylang / Dakota MRT Exit B',
        bestTime: '11:15am or 17:30pm (beats the 1-hour office peak)',
        insiderTip: 'Divide and conquer strategy: Send member A to queue for Dong Ji Char Kway Teow (#01-138), member B to Nam Sing Hokkien Fried Mee (#01-32), and member C for fresh sugarcane juice with sour plum.',
        priceLevel: '$ (S$5 - S$8 per dish)',
        groupSuitability: 'Large round stone banquet tables; share 6-8 dishes family style',
      },
      {
        id: 'gem-sg-4',
        name: 'Pulau Ubin Chek Jawa Coastal Mangrove Boardwalk',
        category: 'Secret Nature',
        neighborhood: 'Off Changi Point Ferry Terminal (15-min bumboat)',
        bestTime: 'Morning 08:30am bumboat ride before noon heat',
        insiderTip: 'Hop on the S$4 cash bumboat at Changi Point. Rent mountain bikes for S$10 at the rustic jetty and cycle through Singapore\'s last authentic 1960s rural kampong to see coastal hornbills and fiddler crabs.',
        priceLevel: '$ (S$14 total bumboat + bike)',
        groupSuitability: 'Paved flat trails with bicycle rental shops for groups',
      },
    ],
  });

  const [addedGemIds, setAddedGemIds] = useState<string[]>([]);

  const handleFetchGems = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/local-gems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: destinationQuery,
          groupType: 'Singapore foodie & heritage group',
          interests: ['Hawker Feast', 'Heritage Shophouses', 'Hidden Rooftops', 'Night Spots'],
        }),
      });
      const data = await res.json();
      if (data && data.gems) {
        setLocalData({
          destination: data.destination || 'Singapore',
          localGreeting: data.localGreeting || 'Welcome to Singapore!',
          culturalEtiquette: data.culturalEtiquette || 'Respect the tissue paper chope rule.',
          gems: data.gems.map((g: any, idx: number) => ({
            ...g,
            imageUrl: idx === 0 ? '/src/assets/images/singapore_shophouse_cafe_1792052404850.jpg' : idx === 1 ? '/src/assets/images/singapore_supertree_sunset_1792052403606.jpg' : undefined,
          })),
        });
      }
    } catch (err) {
      console.error('Error fetching Singapore local gems:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGemToItinerary = (gem: LocalGem) => {
    const targetDayId = trip.days[1]?.id || trip.days[0].id;
    const newAct: ActivityItem = {
      id: `act-gem-${Date.now()}`,
      dayId: targetDayId,
      time: gem.bestTime.includes('08:30') ? '08:30 - 10:00' : gem.bestTime.includes('17:30') ? '17:30 - 19:00' : '12:00 - 13:30',
      title: gem.name,
      category: gem.category.includes('Hawker') ? 'Dining' : 'Sightseeing',
      location: gem.neighborhood,
      costPerPerson: gem.priceLevel.includes('Free') ? 0 : gem.priceLevel.includes('$$') ? 25 : 8,
      assignedLeaderId: trip.members[1]?.id || trip.members[0].id,
      notes: `Singapore Local Insider Tip: ${gem.insiderTip}`,
      isConfirmed: true,
    };

    const updatedDays = trip.days.map((day) => {
      if (day.id === targetDayId) {
        return {
          ...day,
          activities: [...day.activities, newAct],
        };
      }
      return day;
    });

    onUpdateTrip({
      ...trip,
      days: updatedDays,
    });

    setAddedGemIds([...addedGemIds, gem.id]);
  };

  return (
    <div className="space-y-6">
      {/* Header and Query Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700">
            <Compass className="w-4 h-4" />
            <span>SINGAPORE LOCAL INSIDER & HAWKER INTEL</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Authentic Local Gems & Hidden Singapore Spots
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ditch the tourist traps. Uncover authentic Michelin-level hawker stalls, quiet Peranakan heritage courtyards, free skyscraper viewing decks, and island adventures tailored for groups.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={destinationQuery}
            onChange={(e) => setDestinationQuery(e.target.value)}
            placeholder="Search neighborhood (e.g. Katong, Geylang)..."
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 min-w-48"
          />
          <button
            onClick={handleFetchGems}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{isLoading ? 'Asking Locals...' : 'Generate New Gems'}</span>
          </button>
        </div>
      </div>

      {/* Singapore Cultural Etiquette & Local Lingo Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chope & Etiquette */}
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
            <ShieldCheck className="w-4 h-4" />
            <span>SINGAPORE HAWKER ETIQUETTE · THE "CHOPE" RULE</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {localData.culturalEtiquette}
          </p>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
            *Always return your dining trays to the designated tray return stations to avoid the S$300 statutory fine!
          </div>
        </div>

        {/* Kopitiam Coffee Cheat Sheet */}
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200 text-slate-900 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Coffee className="w-4 h-4 text-amber-700" />
            <span>KOPITIAM DRINK ORDERING CHEAT SHEET</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-amber-950">
            <div>• <strong>Kopi</strong>: Coffee with condensed milk</div>
            <div>• <strong>Kopi O</strong>: Black coffee + sugar</div>
            <div>• <strong>Kopi C</strong>: Coffee + evaporated milk</div>
            <div>• <strong>Kopi Kosong</strong>: No sugar at all</div>
            <div>• <strong>Kopi Peng</strong>: Iced version</div>
            <div>• <strong>Teh Tarik</strong>: Pulled fragrant milk tea</div>
          </div>
        </div>
      </div>

      {/* Hidden Gems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {localData.gems.map((gem) => {
          const isAdded = addedGemIds.includes(gem.id);

          return (
            <div
              key={gem.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              {/* Optional High Fidelity Image */}
              {gem.imageUrl && (
                <div className="h-48 w-full overflow-hidden relative">
                  <img
                    src={gem.imageUrl}
                    alt={gem.name}
                    className="w-full h-full object-cover hover:scale-102 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-white text-xs font-semibold px-2 py-0.5 rounded bg-black/40 backdrop-blur-xs">
                    {gem.neighborhood}
                  </span>
                </div>
              )}

              <div className="p-5 space-y-3 flex-1">
                {/* Meta line */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{gem.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-600">{gem.priceLevel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-medium">{gem.groupSuitability}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900">{gem.name}</h3>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{gem.neighborhood}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium">Best Crowd-Free Time: {gem.bestTime}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-700 space-y-1">
                  <div className="font-semibold text-slate-900 flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Insider Hawker Secret</span>
                  </div>
                  <p className="leading-relaxed">{gem.insiderTip}</p>
                </div>
              </div>

              {/* Action row */}
              <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Singapore Verified</span>
                <button
                  onClick={() => handleAddGemToItinerary(gem)}
                  disabled={isAdded}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isAdded
                      ? 'bg-emerald-50 text-emerald-700 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Added to Day 2</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Slot to Itinerary</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
