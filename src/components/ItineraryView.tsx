import React, { useState } from 'react';
import { Trip, DayPlan, ActivityItem, Traveler } from '../types/travel';
import { formatCurrency } from '../utils/travelUtils';
import { 
  Clock, MapPin, Plus, User, FileText, CheckCircle2, 
  Sun, CloudSun, Calendar, Navigation, Trash2, Edit3, X
} from 'lucide-react';

interface ItineraryViewProps {
  trip: Trip;
  activeTraveler: Traveler;
  onUpdateTrip: (updated: Trip) => void;
  onNavigateToRendezvous: () => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  trip,
  activeTraveler,
  onUpdateTrip,
  onNavigateToRendezvous,
}) => {
  const [selectedDayId, setSelectedDayId] = useState<string>(trip.days[0]?.id || 'day-1');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddingActivity, setIsAddingActivity] = useState<boolean>(false);

  // New activity form state
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('14:00 - 16:00');
  const [newCategory, setNewCategory] = useState<ActivityItem['category']>('Sightseeing');
  const [newLocation, setNewLocation] = useState('');
  const [newCost, setNewCost] = useState('15');
  const [newLeaderId, setNewLeaderId] = useState(activeTraveler.id);
  const [newBookingRef, setNewBookingRef] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const activeDay = trip.days.find((d) => d.id === selectedDayId) || trip.days[0];

  const handleAddActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      dayId: selectedDayId,
      time: newTime,
      title: newTitle.trim(),
      category: newCategory,
      location: newLocation.trim() || 'Central Meeting Point',
      costPerPerson: parseFloat(newCost) || 0,
      assignedLeaderId: newLeaderId,
      bookingRef: newBookingRef.trim() || undefined,
      notes: newNotes.trim() || undefined,
      isConfirmed: true,
    };

    const updatedDays = trip.days.map((day) => {
      if (day.id === selectedDayId) {
        return {
          ...day,
          activities: [...day.activities, newActivity],
        };
      }
      return day;
    });

    onUpdateTrip({
      ...trip,
      days: updatedDays,
    });

    // Reset form
    setNewTitle('');
    setNewLocation('');
    setNewNotes('');
    setNewBookingRef('');
    setIsAddingActivity(false);
  };

  const handleDeleteActivity = (actId: string) => {
    const updatedDays = trip.days.map((day) => {
      if (day.id === selectedDayId) {
        return {
          ...day,
          activities: day.activities.filter((a) => a.id !== actId),
        };
      }
      return day;
    });

    onUpdateTrip({
      ...trip,
      days: updatedDays,
    });
  };

  const handleToggleConfirmed = (actId: string) => {
    const updatedDays = trip.days.map((day) => {
      if (day.id === selectedDayId) {
        return {
          ...day,
          activities: day.activities.map((a) => (a.id === actId ? { ...a, isConfirmed: !a.isConfirmed } : a)),
        };
      }
      return day;
    });

    onUpdateTrip({
      ...trip,
      days: updatedDays,
    });
  };

  const filteredActivities = activeDay.activities.filter((act) => {
    if (filterCategory === 'all') return true;
    return act.category.toLowerCase() === filterCategory.toLowerCase();
  });

  const dayTotalCost = activeDay.activities.reduce((acc, curr) => acc + curr.costPerPerson, 0);

  return (
    <div className="space-y-6">
      {/* Trip Header Banner with high-fidelity generated travel photography */}
      <div className="relative rounded-2xl overflow-hidden bg-slate-900 text-white border border-slate-200/20 shadow-sm">
        <div className="absolute inset-0">
          <img
            src={trip.coverImage}
            alt={trip.title}
            className="w-full h-full object-cover opacity-35"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />
        </div>

        <div className="relative p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
              <span>{trip.destination}</span>
              <span aria-hidden="true">·</span>
              <span>Oct 18 – Oct 23</span>
              <span aria-hidden="true">·</span>
              <span>{trip.members.length} Explorers</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white text-balance">
              {trip.title}
            </h1>
            <p className="text-sm text-slate-300">
              Collaborative group plan, synchronized reservations, and daily meetup beacons.
            </p>
          </div>

          {/* Quick Meetup Beacon Strip */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/15 w-full md:w-auto shrink-0 flex items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <Navigation className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>Today's Rendezvous: {trip.meetupPoint.time}</span>
                </div>
                <div className="text-xs text-slate-300 max-w-xs truncate">{trip.meetupPoint.name}</div>
              </div>
            </div>
            <button
              onClick={onNavigateToRendezvous}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
            >
              Check-in
            </button>
          </div>
        </div>
      </div>

      {/* Day Selector & Category Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        {/* Day Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {trip.days.map((day) => {
            const isSelected = day.id === selectedDayId;
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Day {day.dayNumber}</span>
                <span className={`text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  ({day.date.split(',')[0]})
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto text-xs">
          {['all', 'dining', 'sightseeing', 'adventure', 'relaxation'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Active Day Meta Summary */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-800">
            {activeDay.weather.icon === 'Sun' ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <CloudSun className="w-5 h-5 text-amber-500" />
            )}
            <div>
              <span className="text-sm font-semibold text-slate-900">{activeDay.title}</span>
              <span className="text-xs text-slate-500 block">
                {activeDay.date} · Forecast: {activeDay.weather.temp} ({activeDay.weather.condition})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-slate-500 block">Est. Day Spend</span>
            <span className="text-sm font-semibold font-tabular text-slate-900">
              {formatCurrency(dayTotalCost, trip.currency)} / person
            </span>
          </div>
          <button
            onClick={() => setIsAddingActivity(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No activities match your filter</h3>
            <p className="text-xs text-slate-500 mt-1">Add a new activity or switch filters to view the schedule.</p>
            <button
              onClick={() => setIsAddingActivity(true)}
              className="mt-3 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg"
            >
              Add First Activity
            </button>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const leader = trip.members.find((m) => m.id === act.assignedLeaderId);
            return (
              <div
                key={act.id}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Unboxed metadata line */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-tabular">{act.time}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-600 font-medium">{act.category}</span>
                      {act.bookingRef && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-tabular font-medium flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Ref: {act.bookingRef}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{act.title}</h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{act.location}</span>
                    </div>

                    {act.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                        {act.notes}
                      </p>
                    )}
                  </div>

                  {/* Leader info, price & actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <div className="text-xs font-semibold font-tabular text-slate-900">
                        {act.costPerPerson === 0 ? 'Free' : `${formatCurrency(act.costPerPerson, trip.currency)}`}
                      </div>
                      <span className="text-[10px] text-slate-400 block">per person</span>
                    </div>

                    {leader && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600" title={`Activity Lead: ${leader.name}`}>
                        <img
                          src={leader.avatar}
                          alt={leader.name}
                          className="w-5 h-5 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-xs text-slate-700 font-medium">{leader.name.split(' ')[0]}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleConfirmed(act.id)}
                        className={`p-1.5 rounded-md transition-colors ${
                          act.isConfirmed
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={act.isConfirmed ? 'Confirmed plan' : 'Click to confirm'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteActivity(act.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Remove activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Activity Modal */}
      {isAddingActivity && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Group Activity</h3>
                <p className="text-xs text-slate-500">Day {activeDay.dayNumber} · {activeDay.date}</p>
              </div>
              <button
                onClick={() => setIsAddingActivity(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddActivitySubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Sunset Ferry to Portovenere"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="14:00 - 16:30"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-tabular text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 bg-white"
                  >
                    <option value="Sightseeing">Sightseeing</option>
                    <option value="Dining">Dining</option>
                    <option value="Adventure">Adventure</option>
                    <option value="Relaxation">Relaxation</option>
                    <option value="Transit">Transit</option>
                    <option value="Accommodation">Accommodation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Portovenere Harbor Quay"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Est. Cost / Person (€)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-tabular text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Activity Host / Lead</label>
                  <select
                    value={newLeaderId}
                    onChange={(e) => setNewLeaderId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 bg-white"
                  >
                    {trip.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Booking Ref / PIN (Optional)</label>
                  <input
                    type="text"
                    value={newBookingRef}
                    onChange={(e) => setNewBookingRef(e.target.value)}
                    placeholder="e.g. FER-IT-2819"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 font-tabular"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Meet 15 mins before boarding, bring windbreakers."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingActivity(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Add to Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
