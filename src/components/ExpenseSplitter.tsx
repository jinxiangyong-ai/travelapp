import React, { useState } from 'react';
import { Trip, ExpenseItem, Traveler } from '../types/travel';
import { formatCurrency, simplifyDebts, calculateNetBalances } from '../utils/travelUtils';
import { 
  CreditCard, Plus, ArrowRight, CheckCircle2, 
  Trash2, DollarSign, Receipt, X 
} from 'lucide-react';

interface ExpenseSplitterProps {
  trip: Trip;
  activeTraveler: Traveler;
  onUpdateTrip: (updated: Trip) => void;
}

export const ExpenseSplitter: React.FC<ExpenseSplitterProps> = ({
  trip,
  activeTraveler,
  onUpdateTrip,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [settledTransfers, setSettledTransfers] = useState<string[]>([]);

  // Add Expense form state
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidById, setPaidById] = useState(activeTraveler.id);
  const [category, setCategory] = useState<ExpenseItem['category']>('Food & Drinks');
  const [splitWithIds, setSplitWithIds] = useState<string[]>(trip.members.map((m) => m.id));
  const [notes, setNotes] = useState('');

  const totalSpend = trip.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const perPersonAvg = trip.members.length > 0 ? totalSpend / trip.members.length : 0;

  const netBalances = calculateNetBalances(trip.members, trip.expenses);
  const activeBalance = netBalances[activeTraveler.id] || 0;

  const settlements = simplifyDebts(trip.members, trip.expenses);

  const handleToggleMemberSplit = (memberId: string) => {
    if (splitWithIds.includes(memberId)) {
      if (splitWithIds.length > 1) {
        setSplitWithIds(splitWithIds.filter((id) => id !== memberId));
      }
    } else {
      setSplitWithIds([...splitWithIds, memberId]);
    }
  };

  const handleSelectAllSplits = () => {
    setSplitWithIds(trip.members.map((m) => m.id));
  };

  const handleAddExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      amount: parsedAmount,
      currency: trip.currency,
      paidById,
      splitWithIds,
      category,
      date: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined,
    };

    onUpdateTrip({
      ...trip,
      expenses: [newExpense, ...trip.expenses],
    });

    setTitle('');
    setAmount('');
    setNotes('');
    setIsAddingExpense(false);
  };

  const handleDeleteExpense = (expId: string) => {
    onUpdateTrip({
      ...trip,
      expenses: trip.expenses.filter((e) => e.id !== expId),
    });
  };

  const handleToggleSettled = (transferKey: string) => {
    if (settledTransfers.includes(transferKey)) {
      setSettledTransfers(settledTransfers.filter((k) => k !== transferKey));
    } else {
      setSettledTransfers([...settledTransfers, transferKey]);
    }
  };

  const filteredExpenses = trip.expenses.filter((exp) => {
    if (filterCategory === 'all') return true;
    return exp.category.toLowerCase() === filterCategory.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Spend Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Spend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Total Group Expenditures</span>
          <div className="text-2xl font-bold font-tabular text-slate-900">
            {formatCurrency(totalSpend, trip.currency)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Across {trip.expenses.length} logged items
          </span>
        </div>

        {/* Per Person Avg */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">Average Share per Traveler</span>
          <div className="text-2xl font-bold font-tabular text-slate-900">
            {formatCurrency(perPersonAvg, trip.currency)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            Split across {trip.members.length} group members
          </span>
        </div>

        {/* Active Persona Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">
            Your Balance ({activeTraveler.name.split(' ')[0]})
          </span>
          <div
            className={`text-2xl font-bold font-tabular ${
              activeBalance > 0.05
                ? 'text-emerald-700'
                : activeBalance < -0.05
                ? 'text-amber-700'
                : 'text-slate-800'
            }`}
          >
            {activeBalance > 0.05
              ? `+${formatCurrency(activeBalance, trip.currency)}`
              : activeBalance < -0.05
              ? `-${formatCurrency(Math.abs(activeBalance), trip.currency)}`
              : 'All Settled'}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {activeBalance > 0.05
              ? 'You are owed money by others'
              : activeBalance < -0.05
              ? 'You owe money to the group'
              : 'You are completely even'}
          </span>
        </div>
      </div>

      {/* Simplified Debt Settlement Plan */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">FairShare Minimum Debt Settlement</h3>
            <p className="text-xs text-slate-500">
              Minimizes transactions so members don't make endless cross-payments.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-700 font-tabular bg-slate-100 px-2.5 py-1 rounded-md">
            {settlements.length} Transfers Required
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800">All expenses are balanced!</p>
            <p className="text-slate-400 mt-0.5">No outstanding transfers between members.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {settlements.map((s, idx) => {
              const from = trip.members.find((m) => m.id === s.fromMemberId);
              const to = trip.members.find((m) => m.id === s.toMemberId);
              const key = `${s.fromMemberId}-${s.toMemberId}-${s.amount}`;
              const isSettled = settledTransfers.includes(key);

              if (!from || !to) return null;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isSettled
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={from.avatar}
                      alt={from.name}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs text-slate-500">
                        <strong className="text-slate-900">{from.name}</strong> pays
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {to.name}
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                  <div className="text-right">
                    <div className="text-sm font-bold font-tabular text-slate-900">
                      {formatCurrency(s.amount, trip.currency)}
                    </div>
                    <button
                      onClick={() => handleToggleSettled(key)}
                      className={`text-[11px] font-medium transition-colors ${
                        isSettled ? 'text-slate-400 line-through' : 'text-emerald-700 hover:underline'
                      }`}
                    >
                      {isSettled ? 'Paid' : 'Mark Paid'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expense History Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          {['all', 'accommodation', 'food & drinks', 'transport', 'activities', 'supplies'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-md capitalize font-medium transition-colors ${
                filterCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsAddingExpense(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Group Expense</span>
        </button>
      </div>

      {/* Expense Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Expense & Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Paid By</th>
                <th className="py-3 px-4">Split Among</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => {
                const payer = trip.members.find((m) => m.id === exp.paidById);
                const isAll = exp.splitWithIds.length === trip.members.length;
                return (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{exp.title}</div>
                      <div className="text-[11px] text-slate-500 font-tabular">{exp.date}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">
                          {exp.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">{exp.category}</td>
                    <td className="py-3.5 px-4">
                      {payer && (
                        <div className="flex items-center gap-2">
                          <img
                            src={payer.avatar}
                            alt={payer.name}
                            className="w-5 h-5 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <span className="text-slate-800 font-medium">{payer.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {isAll ? 'All 5 Travelers' : `${exp.splitWithIds.length} Travelers`}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold font-tabular text-slate-900 text-sm">
                      {formatCurrency(exp.amount, exp.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                        title="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Log Group Expense</h3>
              <button onClick={() => setIsAddingExpense(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpenseSubmit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expense Title / Item *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Seafood Dinner at Miky Terrace"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Total Amount (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="120.00"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 font-tabular"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900 bg-white"
                  >
                    <option value="Food & Drinks">Food & Drinks</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Transport">Transport</option>
                    <option value="Activities">Activities</option>
                    <option value="Supplies">Supplies</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Paid By</label>
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700">Split Among Members</label>
                  <button
                    type="button"
                    onClick={handleSelectAllSplits}
                    className="text-[11px] text-slate-500 hover:text-slate-900 font-medium underline"
                  >
                    Select All
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {trip.members.map((m) => {
                    const isChecked = splitWithIds.includes(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => handleToggleMemberSplit(m.id)}
                        className={`px-2.5 py-1.5 rounded-lg border text-left flex items-center gap-2 transition-colors ${
                          isChecked
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-4 h-4 rounded-full object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <span className="truncate">{m.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Receipt Note / Invoice Reference</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Receipt #4492 saved in group Drive"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingExpense(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Save & Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
