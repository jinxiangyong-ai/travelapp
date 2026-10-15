export interface Traveler {
  id: string;
  name: string;
  role: 'Organizer' | 'Navigator' | 'Foodie' | 'Budget Master' | 'Photographer';
  avatar: string;
  phone: string;
  status: string;
  locationName: string;
  battery: number;
  lastActive: string;
  isAtMeetup: boolean;
}

export interface ActivityItem {
  id: string;
  dayId: string;
  time: string;
  title: string;
  category: 'Dining' | 'Sightseeing' | 'Transit' | 'Relaxation' | 'Adventure' | 'Accommodation';
  location: string;
  costPerPerson: number;
  assignedLeaderId: string;
  notes?: string;
  isConfirmed: boolean;
  bookingRef?: string;
}

export interface DayPlan {
  id: string;
  dayNumber: number;
  date: string;
  title: string;
  weather: {
    temp: string;
    condition: string;
    icon: string;
  };
  activities: ActivityItem[];
}

export interface VotingProposal {
  id: string;
  title: string;
  description: string;
  category: string;
  proposedById: string;
  estCostPerPerson: number;
  duration: string;
  location: string;
  upvotes: string[]; // member ids
  downvotes: string[];
  status: 'voting' | 'consensus' | 'rejected' | 'added_to_itinerary';
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paidById: string;
  splitWithIds: string[]; // all or subset
  category: 'Accommodation' | 'Food & Drinks' | 'Transport' | 'Activities' | 'Supplies';
  date: string;
  notes?: string;
}

export interface DebtSettlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  settled: boolean;
}

export interface PackingItem {
  id: string;
  title: string;
  category: 'Shared Gear' | 'Documents' | 'Electronics' | 'Medical & Safety' | 'Clothing';
  isShared: boolean;
  assignedToId?: string;
  completed: boolean;
}

export interface LocalGem {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  bestTime: string;
  insiderTip: string;
  priceLevel: string;
  groupSuitability: string;
  imageUrl?: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  coverImage: string;
  meetupPoint: {
    name: string;
    time: string;
    notes: string;
    updatedAt: string;
  };
  members: Traveler[];
  days: DayPlan[];
  proposals: VotingProposal[];
  expenses: ExpenseItem[];
  packingItems: PackingItem[];
}
