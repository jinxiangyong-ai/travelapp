import React, { useState } from 'react';
import { Trip, PackingItem, Traveler } from '../types/travel';
import { Check, Plus, Trash2, Shield, User, Package } from 'lucide-react';

interface PackingListProps {
  trip: Trip;
  activeTraveler: Traveler;
  onUpdateTrip: (updated: Trip) => void;
}

export const PackingList: React.FC<PackingListProps> = ({
  trip,
  activeTraveler,
  onUpdateTrip,
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<PackingItem['category']>('Shared Gear');
  const [isNewShared, setIsNewShared] = useState(true);

  const handleToggleComplete = (itemId: string) => {
    const updated = trip.packingItems.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    onUpdateTrip({
      ...trip,
      packingItems: updated,
    });
  };

  const handleClaimItem = (itemId: string, memberId: string) => {
    const updated = trip.packingItems.map((item) =>
      item.id === itemId ? { ...item, assignedToId: memberId } : item
    );
    onUpdateTrip({
      ...trip,
      packingItems: updated,
    });
  };

  const handleDeleteItem = (itemId: string) => {
    const updated = trip.packingItems.filter((item) => item.id !== itemId);
    onUpdateTrip({
      ...trip,
      packingItems: updated,
    });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    const newItem: PackingItem = {
      id: `pack-${Date.now()}`,
      title: newItemTitle.trim(),
      category: newItemCategory,
      isShared: isNewShared,
      assignedToId: isNewShared ? activeTraveler.id : activeTraveler.id,
      completed: false,
    };

    onUpdateTrip({
      ...trip,
      packingItems: [...trip.packingItems, newItem],
    });

    setNewItemTitle('');
  };

  const filteredItems = trip.packingItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'shared') return item.isShared;
    if (filter === 'mine') return item.assignedToId === activeTraveler.id;
    return item.category.toLowerCase() === filter.toLowerCase();
  });

  const totalItems = trip.packingItems.length;
  const completedItems = trip.packingItems.filter((i) => i.completed).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Package className="w-4 h-4 text-amber-500" />
            <span>GROUP PRE-TRIP GEAR & PACKING</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Shared Essentials & Responsibility Roster
          </h2>
          <p className="text-xs text-slate-500">
            Assign bulky shared items (first aid kits, speakers, power hubs) to one traveler to avoid packing redundant gear.
          </p>
        </div>

        {/* Progress KPI */}
        <div className="w-full md:w-64 space-y-1.5 shrink-0 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Gear Readiness</span>
            <span className="font-tabular font-bold text-slate-900">{progressPct}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-400 block text-right font-tabular">
            {completedItems} of {totalItems} packed
          </span>
        </div>
      </div>

      {/* Add Item Bar */}
      <form onSubmit={handleAddItem} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          required
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder="Add gear (e.g. GoPro Hero + extra batteries, mosquito spray)..."
          className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
        />

        <select
          value={newItemCategory}
          onChange={(e) => setNewItemCategory(e.target.value as any)}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 bg-white"
        >
          <option value="Shared Gear">Shared Gear</option>
          <option value="Medical & Safety">Medical & Safety</option>
          <option value="Electronics">Electronics</option>
          <option value="Documents">Documents</option>
          <option value="Clothing">Clothing</option>
        </select>

        <label className="flex items-center gap-2 text-xs text-slate-700 shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={isNewShared}
            onChange={(e) => setIsNewShared(e.target.checked)}
            className="rounded border-slate-300 text-slate-900"
          />
          <span>Shared Group Item</span>
        </label>

        <button
          type="submit"
          className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Gear</span>
        </button>
      </form>

      {/* Segmented Filter */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-fit text-xs">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Items ({trip.packingItems.length})
        </button>
        <button
          onClick={() => setFilter('shared')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filter === 'shared' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Shared Group Gear
        </button>
        <button
          onClick={() => setFilter('mine')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filter === 'mine' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Assigned to You ({activeTraveler.name.split(' ')[0]})
        </button>
      </div>

      {/* Item Checklist Table / List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
        {filteredItems.map((item) => {
          const assignee = trip.members.find((m) => m.id === item.assignedToId);
          return (
            <div
              key={item.id}
              className={`p-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-slate-50/60 ${
                item.completed ? 'bg-slate-50/40 opacity-75' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() => handleToggleComplete(item.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                    item.completed
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {item.completed && <Check className="w-3.5 h-3.5" />}
                </button>

                <div>
                  <div className={`text-xs font-semibold ${item.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>{item.category}</span>
                    {item.isShared && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 font-medium">Shared for group</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Traveler Selector */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 hidden sm:inline">Carried by:</span>
                  <select
                    value={item.assignedToId || ''}
                    onChange={(e) => handleClaimItem(item.id, e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800"
                  >
                    <option value="">Unassigned</option>
                    {trip.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name.split(' ')[0]} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
