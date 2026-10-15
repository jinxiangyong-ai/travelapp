import React, { useState } from 'react';
import { Trip, VotingProposal, Traveler, ActivityItem } from '../types/travel';
import { formatCurrency } from '../utils/travelUtils';
import { 
  ThumbsUp, ThumbsDown, Plus, Sparkles, Check, 
  MapPin, Clock, ArrowRight, X, AlertCircle 
} from 'lucide-react';

interface VotingHubProps {
  trip: Trip;
  activeTraveler: Traveler;
  onUpdateTrip: (updated: Trip) => void;
}

export const VotingHub: React.FC<VotingHubProps> = ({
  trip,
  activeTraveler,
  onUpdateTrip,
}) => {
  const [filter, setFilter] = useState<'all' | 'voting' | 'consensus' | 'rejected'>('all');
  const [isProposing, setIsProposing] = useState(false);
  const [mediatingProposal, setMediatingProposal] = useState<VotingProposal | null>(null);
  const [mediationResult, setMediationResult] = useState<any | null>(null);
  const [isMediatingLoading, setIsMediatingLoading] = useState(false);

  // Proposal form state
  const [propTitle, setPropTitle] = useState('');
  const [propDesc, setPropDesc] = useState('');
  const [propCategory, setPropCategory] = useState('Adventure');
  const [propCost, setPropCost] = useState('30');
  const [propDuration, setPropDuration] = useState('2 hours');
  const [propLocation, setPropLocation] = useState('');

  const totalMembers = trip.members.length;

  const handleVote = (proposalId: string, type: 'up' | 'down') => {
    const updatedProposals = trip.proposals.map((prop) => {
      if (prop.id !== proposalId) return prop;

      let upvotes = [...prop.upvotes];
      let downvotes = [...prop.downvotes];

      if (type === 'up') {
        if (upvotes.includes(activeTraveler.id)) {
          // toggle off
          upvotes = upvotes.filter((id) => id !== activeTraveler.id);
        } else {
          upvotes.push(activeTraveler.id);
          downvotes = downvotes.filter((id) => id !== activeTraveler.id);
        }
      } else {
        if (downvotes.includes(activeTraveler.id)) {
          // toggle off
          downvotes = downvotes.filter((id) => id !== activeTraveler.id);
        } else {
          downvotes.push(activeTraveler.id);
          upvotes = upvotes.filter((id) => id !== activeTraveler.id);
        }
      }

      // Check consensus logic (>= 60% upvotes)
      let status = prop.status;
      if (upvotes.length / totalMembers >= 0.6) {
        status = 'consensus';
      } else if (downvotes.length / totalMembers > 0.5) {
        status = 'rejected';
      } else {
        status = 'voting';
      }

      return {
        ...prop,
        upvotes,
        downvotes,
        status,
      };
    });

    onUpdateTrip({
      ...trip,
      proposals: updatedProposals,
    });
  };

  const handleAddToItinerary = (prop: VotingProposal, targetDayId: string) => {
    const newAct: ActivityItem = {
      id: `act-vote-${Date.now()}`,
      dayId: targetDayId,
      time: '15:00 - 17:30',
      title: prop.title,
      category: (prop.category as any) || 'Adventure',
      location: prop.location,
      costPerPerson: prop.estCostPerPerson,
      assignedLeaderId: prop.proposedById,
      notes: `Voted into itinerary by group consensus (${prop.upvotes.length}/${totalMembers} votes). ${prop.description}`,
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

    const updatedProposals = trip.proposals.map((p) =>
      p.id === prop.id ? { ...p, status: 'added_to_itinerary' as const } : p
    );

    onUpdateTrip({
      ...trip,
      days: updatedDays,
      proposals: updatedProposals,
    });
  };

  const handleProposeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propTitle.trim()) return;

    const newProp: VotingProposal = {
      id: `prop-${Date.now()}`,
      title: propTitle.trim(),
      description: propDesc.trim() || 'Exciting experience pitched for our crew!',
      category: propCategory,
      proposedById: activeTraveler.id,
      estCostPerPerson: parseFloat(propCost) || 0,
      duration: propDuration,
      location: propLocation.trim() || trip.destination,
      upvotes: [activeTraveler.id], // auto-upvote by author
      downvotes: [],
      status: 'voting',
    };

    onUpdateTrip({
      ...trip,
      proposals: [newProp, ...trip.proposals],
    });

    setPropTitle('');
    setPropDesc('');
    setPropLocation('');
    setIsProposing(false);
  };

  const handleTriggerMediation = async (proposal: VotingProposal) => {
    setMediatingProposal(proposal);
    setIsMediatingLoading(true);
    setMediationResult(null);

    try {
      const res = await fetch('/api/gemini/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: proposal.title,
          options: [
            `Option A: Do ${proposal.title} (${proposal.duration}, €${proposal.estCostPerPerson})`,
            `Option B: Relax or alternate activity for members preferring downtime or lower budget`,
          ],
          memberNotes: `Group size: ${totalMembers}. Current Upvotes: ${proposal.upvotes.length}, Downvotes: ${proposal.downvotes.length}. Description: ${proposal.description}`,
        }),
      });

      const data = await res.json();
      setMediationResult(data);
    } catch (err) {
      console.error('Error fetching mediator compromise:', err);
    } finally {
      setIsMediatingLoading(false);
    }
  };

  const filteredProposals = trip.proposals.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Group Decision Hub & Activity Polls</h2>
          <p className="text-xs text-slate-500 mt-1">
            Democratic decision-making for our crew. Proposals with $\ge 60\%$ upvotes reach consensus and can be slotted directly into the schedule.
          </p>
          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
            <span>Active Persona: <strong className="text-slate-800">{activeTraveler.name}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Total Crew Quorum: <strong className="text-slate-800">{totalMembers} members</strong></span>
          </div>
        </div>

        <button
          onClick={() => setIsProposing(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Pitch New Activity</span>
        </button>
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Ideas ({trip.proposals.length})
        </button>
        <button
          onClick={() => setFilter('voting')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filter === 'voting' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Active Polls
        </button>
        <button
          onClick={() => setFilter('consensus')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filter === 'consensus' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Consensus Reached
        </button>
      </div>

      {/* Proposals List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProposals.map((prop) => {
          const author = trip.members.find((m) => m.id === prop.proposedById);
          const hasUpvoted = prop.upvotes.includes(activeTraveler.id);
          const hasDownvoted = prop.downvotes.includes(activeTraveler.id);
          const upPercentage = Math.round((prop.upvotes.length / totalMembers) * 100);

          return (
            <div
              key={prop.id}
              className={`bg-white rounded-xl border p-5 transition-all shadow-xs flex flex-col justify-between ${
                prop.status === 'consensus'
                  ? 'border-emerald-200 bg-emerald-50/15'
                  : prop.status === 'added_to_itinerary'
                  ? 'border-slate-200 bg-slate-50/40 opacity-80'
                  : 'border-slate-200'
              }`}
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-medium text-slate-700">{prop.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {prop.duration}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-tabular font-medium text-slate-800">
                        {formatCurrency(prop.estCostPerPerson, trip.currency)} / person
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{prop.title}</h3>
                  </div>

                  {/* Status Indicator */}
                  <div className="text-right shrink-0">
                    {prop.status === 'consensus' && (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Consensus ({upPercentage}%)
                      </span>
                    )}
                    {prop.status === 'added_to_itinerary' && (
                      <span className="text-xs font-semibold text-slate-600">
                        Added to Schedule
                      </span>
                    )}
                    {prop.status === 'voting' && (
                      <span className="text-xs font-medium text-amber-700">
                        Active Poll ({prop.upvotes.length}/{totalMembers} votes)
                      </span>
                    )}
                    {prop.status === 'rejected' && (
                      <span className="text-xs font-medium text-rose-600">
                        Declined
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{prop.description}</p>

                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{prop.location}</span>
                </div>

                {/* Progress bar showing voting support */}
                <div className="space-y-1 pt-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${upPercentage}%` }}
                    />
                    <div
                      className="bg-rose-400 h-full transition-all duration-300"
                      style={{ width: `${Math.round((prop.downvotes.length / totalMembers) * 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-tabular">
                    <span>{prop.upvotes.length} yes</span>
                    <span>{totalMembers - prop.upvotes.length - prop.downvotes.length} undecided</span>
                    <span>{prop.downvotes.length} no</span>
                  </div>
                </div>

                {/* Member avatars who voted */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400">Voters:</span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {prop.upvotes.map((id) => {
                      const m = trip.members.find((member) => member.id === id);
                      return m ? (
                        <img
                          key={id}
                          src={m.avatar}
                          alt={m.name}
                          title={`${m.name}: Voted YES`}
                          className="inline-block h-5 w-5 rounded-full ring-2 ring-emerald-500 object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : null;
                    })}
                    {prop.downvotes.map((id) => {
                      const m = trip.members.find((member) => member.id === id);
                      return m ? (
                        <img
                          key={id}
                          src={m.avatar}
                          alt={m.name}
                          title={`${m.name}: Voted NO`}
                          className="inline-block h-5 w-5 rounded-full ring-2 ring-rose-400 object-cover opacity-60"
                          referrerPolicy="no-referrer"
                        />
                      ) : null;
                    })}
                  </div>
                  {author && (
                    <span className="text-[11px] text-slate-400 ml-auto">
                      Pitched by {author.name.split(' ')[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleVote(prop.id, 'up')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      hasUpvoted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Support ({prop.upvotes.length})</span>
                  </button>

                  <button
                    onClick={() => handleVote(prop.id, 'down')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      hasDownvoted
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>Pass</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* AI mediator button if votes are split or contested */}
                  <button
                    onClick={() => handleTriggerMediation(prop)}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
                    title="Ask AI to suggest a compromise or pod split"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Mediate</span>
                  </button>

                  {/* Add to schedule button if consensus reached */}
                  {prop.status === 'consensus' && (
                    <button
                      onClick={() => handleAddToItinerary(prop, trip.days[1]?.id || 'day-2')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs"
                    >
                      <span>Slot to Day 2</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pitch Activity Modal */}
      {isProposing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Pitch Activity for Group Vote</h3>
              <button onClick={() => setIsProposing(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposeSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Activity Concept *</label>
                <input
                  type="text"
                  required
                  value={propTitle}
                  onChange={(e) => setPropTitle(e.target.value)}
                  placeholder="e.g. Sunset Cliffside Wine & Bruschetta Picnic"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pitch Details & Why Group Will Love It</label>
                <textarea
                  rows={3}
                  value={propDesc}
                  onChange={(e) => setPropDesc(e.target.value)}
                  placeholder="Describe the experience, why it's great for our vibe, and what to bring..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={propCategory}
                    onChange={(e) => setPropCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 bg-white"
                  >
                    <option value="Adventure">Adventure</option>
                    <option value="Sightseeing">Sightseeing</option>
                    <option value="Food & Culture">Food & Culture</option>
                    <option value="Relaxation">Relaxation</option>
                    <option value="Nightlife">Nightlife</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Est. Duration</label>
                  <input
                    type="text"
                    value={propDuration}
                    onChange={(e) => setPropDuration(e.target.value)}
                    placeholder="2.5 hours"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Est. Cost / Person (€)</label>
                  <input
                    type="number"
                    value={propCost}
                    onChange={(e) => setPropCost(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 font-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Location</label>
                  <input
                    type="text"
                    value={propLocation}
                    onChange={(e) => setPropLocation(e.target.value)}
                    placeholder="e.g. Manarola Coastal Cliffs"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProposing(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Publish to Polls
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Mediation Modal */}
      {mediatingProposal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">AI Group Consensus Mediator</h3>
              </div>
              <button
                onClick={() => setMediatingProposal(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">Mediating Decision For</span>
                <p className="text-sm font-bold text-slate-900">{mediatingProposal.title}</p>
              </div>

              {isMediatingLoading ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-600">Analyzing group schedule and synthesizing a win-win compromise...</p>
                </div>
              ) : mediationResult ? (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs">
                    <Check className="w-4 h-4" />
                    <span>{mediationResult.compromiseTitle}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{mediationResult.recommendedStrategy}</p>

                  {mediationResult.suggestedSchedule && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-800 block text-[11px]">Suggested Timing Flow:</span>
                      {mediationResult.suggestedSchedule.map((step: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-slate-200/60">
                          <span className="font-tabular font-semibold text-slate-900 shrink-0">{step.time}</span>
                          <div>
                            <span className="text-slate-700">{step.plan}</span>
                            <span className="text-[10px] text-slate-400 block">Audience: {step.forWhom}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {mediationResult.conciliatoryNote && (
                    <div className="p-2.5 bg-amber-50 rounded-lg text-amber-900 text-[11px] border border-amber-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <span>{mediationResult.conciliatoryNote}</span>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setMediatingProposal(null)}
                  className="px-4 py-2 font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  Close & Apply to Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
