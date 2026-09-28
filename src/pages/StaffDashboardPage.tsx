import { useState } from 'react';
import {
  Users,
  Utensils,
  Sparkles,
  Phone,
  Mail,
  UserX,
  Play,
  CheckCircle,
  Clock,
  Send,
  Calendar,
  Layers,
  Search,
  ExternalLink,
  Tv,
  QrCode,
  RotateCcw,
  Sliders,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { useRestaurantStore } from '../hooks/useRestaurantStore';
import { TableItem, QueueEntry, TableStatus } from '../types/database';

export function StaffDashboardPage() {
  const {
    restaurant,
    tables,
    queue,
    reservations,
    notifications,
    setTableStatus,
    allocatePartyToTable,
    seatCustomer,
    completeCustomer,
    cancelCustomer,
    releaseTable,
    resetToDemoData,
    addReservation,
    updateReservationStatus,
  } = useRestaurantStore();

  const [activeTab, setActiveTab] = useState<'queue' | 'tables' | 'reservations' | 'whatsapp'>('queue');
  const [tableFilter, setTableFilter] = useState<'ALL' | TableStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Allocation Modal State
  const [manualAllocQueueEntry, setManualAllocQueueEntry] = useState<QueueEntry | null>(null);

  // Reservation Form Modal State
  const [showAddResModal, setShowAddResModal] = useState(false);
  const [resName, setResName] = useState('');
  const [resPhone, setResPhone] = useState('');
  const [resPartySize, setResPartySize] = useState(4);
  const [resTime, setResTime] = useState('20:00');
  const [resDate, setResDate] = useState(new Date().toISOString().split('T')[0]);

  // Schema Viewer Modal
  const [showSchemaModal, setShowSchemaModal] = useState(false);

  // Table lookup map
  const tableMap = new Map<string, TableItem>(tables.map((t) => [t.id, t]));

  // Calculate waiting durations
  const getWaitDuration = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just joined';
    return `${diffMins} min${diffMins > 1 ? 's' : ''}`;
  };

  // Filtered queue entries
  const filteredQueue = queue.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      entry.customer_name.toLowerCase().includes(q) ||
      entry.token_number.includes(q) ||
      entry.phone.includes(q);
    return matchesSearch;
  });

  // Filtered tables
  const filteredTables = tables.filter((t) => {
    if (tableFilter !== 'ALL' && t.status !== tableFilter) return false;
    return true;
  });

  // Table status styles
  const getTableStatusBadge = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'ALLOCATED':
        return 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
      case 'OCCUPIED':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CLEANING':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  // Next Table State Helper
  const cycleTableStatus = (table: TableItem) => {
    // Lifecycle: AVAILABLE -> ALLOCATED -> OCCUPIED -> CLEANING -> AVAILABLE
    switch (table.status) {
      case 'AVAILABLE':
        setTableStatus(table.id, 'OCCUPIED');
        break;
      case 'ALLOCATED':
        setTableStatus(table.id, 'OCCUPIED');
        break;
      case 'OCCUPIED':
        setTableStatus(table.id, 'CLEANING');
        break;
      case 'CLEANING':
        // Moving from CLEANING to AVAILABLE triggers automatic allocation!
        setTableStatus(table.id, 'AVAILABLE');
        break;
    }
  };

  const handleManualAllocation = async (tableId: string) => {
    if (!manualAllocQueueEntry) return;
    await allocatePartyToTable(manualAllocQueueEntry.id, tableId, 'MANUAL_ALLOCATED');
    setManualAllocQueueEntry(null);
  };

  const handleCreateReservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim() || !resPhone.trim()) return;

    addReservation({
      restaurant_id: restaurant.id,
      customer_name: resName.trim(),
      phone: resPhone.trim(),
      party_size: resPartySize,
      reservation_date: resDate,
      reservation_time: resTime,
      assigned_table_id: null,
      special_requests: 'Logged via Waiter Portal',
    });

    setShowAddResModal(false);
    setResName('');
    setResPhone('');
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col font-sans">
      {/* Top Bar: Brand, Navigation tabs, Actions */}
      <header className="h-16 px-6 bg-white border-b border-stone-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-stone-900 tracking-tight block">
                {restaurant.name}
              </span>
              <span className="text-[11px] text-stone-400 font-medium">
                Host Stand & Floor Dashboard
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 p-1 bg-stone-100 rounded-xl">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Live Queue ({queue.filter((q) => q.status === 'WAITING' || q.status === 'ALLOCATED').length})
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tables'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tables Floor Plan ({tables.length})
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'reservations'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Reservations ({reservations.length})
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              WhatsApp Dispatches ({notifications.length})
            </button>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Quick TV Link */}
          <a
            href="/tv"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors"
          >
            <Tv className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Open TV Display</span>
            <ExternalLink className="w-3 h-3 text-stone-400" />
          </a>

          {/* Quick Join QR Link */}
          <a
            href="/join"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-orange-600" />
            <span className="hidden sm:inline">Customer QR</span>
          </a>

          {/* Demo Controls */}
          <button
            onClick={resetToDemoData}
            title="Reset to 20 tables & 15 demo guests"
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSchemaModal(true)}
            title="View Supabase Schema SQL & Config"
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Waiting in Queue
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-orange-600 font-mono-numbers">
                {queue.filter((q) => q.status === 'WAITING').length}
              </span>
              <span className="text-xs text-stone-500">parties</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Allocated (Pending Host)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-emerald-600 font-mono-numbers">
                {queue.filter((q) => q.status === 'ALLOCATED').length}
              </span>
              <span className="text-xs text-stone-500">called to stand</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Available Tables
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-stone-900 font-mono-numbers">
                {tables.filter((t) => t.status === 'AVAILABLE').length}
              </span>
              <span className="text-xs text-stone-500">of {tables.length} tables</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
              Tables in Cleaning
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-3xl font-black text-purple-600 font-mono-numbers">
                {tables.filter((t) => t.status === 'CLEANING').length}
              </span>
              <span className="text-xs text-stone-500">turnaround</span>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* TAB 1: LIVE QUEUE */}
        {/* ===================================================================== */}
        {activeTab === 'queue' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            {/* Queue Bar & Search */}
            <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Live Customer Queue</h2>
                <p className="text-xs text-stone-500">
                  Real-time party tracking, table allocation status, and seating actions
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search token, name, or phone..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Queue Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Token</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Party</th>
                    <th className="py-3 px-4">Wait Time</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned Table</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400">
                        No customers found matching current filters
                      </td>
                    </tr>
                  ) : (
                    filteredQueue.map((entry) => {
                      const assignedTable = entry.assigned_table_id
                        ? tableMap.get(entry.assigned_table_id)
                        : null;

                      const isAllocated = entry.status === 'ALLOCATED';
                      const isWaiting = entry.status === 'WAITING';
                      const isOccupied = entry.status === 'OCCUPIED';

                      return (
                        <tr
                          key={entry.id}
                          className={`hover:bg-stone-50/60 transition-colors ${
                            isAllocated ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          {/* Token */}
                          <td className="py-3.5 px-4 font-mono-numbers font-black text-sm text-stone-900">
                            #{entry.token_number}
                          </td>

                          {/* Customer */}
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-stone-900 block">
                              {entry.customer_name}
                            </span>
                            <span className="text-[11px] text-stone-400 font-mono-numbers">
                              {entry.phone}
                            </span>
                          </td>

                          {/* Party Size */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 font-mono-numbers font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                              <Users className="w-3 h-3 text-stone-500" />
                              {entry.party_size} {entry.party_size === 1 ? 'guest' : 'guests'}
                            </span>
                          </td>

                          {/* Wait Time */}
                          <td className="py-3.5 px-4 text-stone-600 font-mono-numbers">
                            {getWaitDuration(entry.joined_at)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {isWaiting && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-bold text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                WAITING (Pos #{entry.position || 1})
                              </span>
                            )}
                            {isAllocated && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                <Sparkles className="w-3 h-3 text-emerald-600" />
                                ALLOCATED
                              </span>
                            )}
                            {isOccupied && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                                <Utensils className="w-3 h-3 text-blue-600" />
                                SEATED
                              </span>
                            )}
                            {entry.status === 'COMPLETED' && (
                              <span className="text-stone-400 font-semibold">Completed</span>
                            )}
                            {entry.status === 'CANCELLED' && (
                              <span className="text-red-400 font-semibold">Cancelled</span>
                            )}
                          </td>

                          {/* Assigned Table */}
                          <td className="py-3.5 px-4">
                            {assignedTable ? (
                              <span className="font-bold text-emerald-700 font-mono-numbers text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                Table {assignedTable.table_number} ({assignedTable.capacity}p)
                              </span>
                            ) : (
                              <span className="text-stone-400 italic">None</span>
                            )}
                          </td>

                          {/* Staff Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {/* If ALLOCATED: button to mark customer as SEATED */}
                              {isAllocated && (
                                <button
                                  onClick={() => seatCustomer(entry.id)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Seat Guest</span>
                                </button>
                              )}

                              {/* If WAITING: Manual allocate option */}
                              {isWaiting && (
                                <button
                                  onClick={() => setManualAllocQueueEntry(entry)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Assign Table</span>
                                </button>
                              )}

                              {/* If OCCUPIED: complete meal */}
                              {isOccupied && (
                                <button
                                  onClick={() => completeCustomer(entry.id)}
                                  className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-semibold text-xs transition-colors cursor-pointer"
                                >
                                  Complete Dining
                                </button>
                              )}

                              {/* Cancel / No-show button */}
                              {(isWaiting || isAllocated) && (
                                <button
                                  onClick={() => cancelCustomer(entry.id, 'NO_SHOW')}
                                  title="Mark as No-Show / Cancel"
                                  className="p-1 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* View Customer Link */}
                              <a
                                href={`/customer/${entry.token_number}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open Customer View"
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: TABLES FLOOR PLAN */}
        {/* ===================================================================== */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            {/* Table Filter Tabs & Info */}
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Table Management & States</h2>
                <p className="text-xs text-stone-500">
                  Click any table card to cycle through lifecycle: Available ➔ Allocated ➔ Occupied ➔ Cleaning ➔ Available
                </p>
              </div>

              {/* Status Filter buttons */}
              <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl overflow-x-auto max-w-full">
                {(['ALL', 'AVAILABLE', 'ALLOCATED', 'OCCUPIED', 'CLEANING'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTableFilter(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      tableFilter === st
                        ? 'bg-white text-stone-900 shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredTables.map((tbl) => {
                const assignedCustomer = queue.find(
                  (q) => q.assigned_table_id === tbl.id && (q.status === 'ALLOCATED' || q.status === 'OCCUPIED')
                );

                return (
                  <div
                    key={tbl.id}
                    className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    {/* Table Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-black text-stone-900 font-mono-numbers">
                        Table {tbl.table_number}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-stone-100 text-stone-700 rounded-md font-mono-numbers">
                        {tbl.capacity} Seats
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-400 mb-3">
                      {tbl.section || 'Main Dining'}
                    </div>

                    {/* Assigned Guest Note */}
                    <div className="min-h-12 text-xs mb-3 p-2 rounded-xl bg-stone-50 border border-stone-100">
                      {assignedCustomer ? (
                        <div>
                          <span className="font-bold text-stone-900 block truncate">
                            #{assignedCustomer.token_number} · {assignedCustomer.customer_name}
                          </span>
                          <span className="text-[11px] text-stone-500 font-mono-numbers">
                            Party of {assignedCustomer.party_size}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">No guest assigned</span>
                      )}
                    </div>

                    {/* Status Badge & Fast Change Actions */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getTableStatusBadge(
                            tbl.status
                          )}`}
                        >
                          {tbl.status}
                        </span>

                        <span className="text-[10px] text-stone-400">Click to step</span>
                      </div>

                      {/* Lifecycle Cycle Button */}
                      <button
                        onClick={() => cycleTableStatus(tbl)}
                        className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          tbl.status === 'CLEANING'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : tbl.status === 'ALLOCATED'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : tbl.status === 'OCCUPIED'
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                        }`}
                      >
                        {tbl.status === 'AVAILABLE' && <span>Seat Walk-In ➔</span>}
                        {tbl.status === 'ALLOCATED' && <span>Seat Customer ➔</span>}
                        {tbl.status === 'OCCUPIED' && <span>Mark Cleaning ➔</span>}
                        {tbl.status === 'CLEANING' && <span>Mark Ready (Auto-Alloc) ⚡</span>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: RESERVATIONS */}
        {/* ===================================================================== */}
        {activeTab === 'reservations' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Reservations</h2>
                <p className="text-xs text-stone-500">
                  Staff-entered table reservations. Allocation service handles these ahead of walk-in queue.
                </p>
              </div>

              <button
                onClick={() => setShowAddResModal(true)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>+ New Reservation</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Guest</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Party</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Special Requests</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {reservations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-stone-400">
                        No active reservations logged
                      </td>
                    </tr>
                  ) : (
                    reservations.map((res) => (
                      <tr key={res.id} className="hover:bg-stone-50/60">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {res.customer_name}
                        </td>
                        <td className="py-3.5 px-4 font-mono-numbers text-stone-600">
                          {res.phone}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono-numbers font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                            {res.party_size} guests
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono-numbers text-stone-700">
                          {res.reservation_date} at {res.reservation_time}
                        </td>
                        <td className="py-3.5 px-4 text-stone-500 max-w-xs truncate">
                          {res.special_requests || 'None'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            {res.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex gap-1.5">
                            {res.status === 'CONFIRMED' && (
                              <button
                                onClick={() => updateReservationStatus(res.id, 'SEATED')}
                                className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Mark Seated
                              </button>
                            )}
                            <button
                              onClick={() => updateReservationStatus(res.id, 'CANCELLED')}
                              className="px-2 py-1 text-stone-400 hover:text-red-600 text-xs cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: WHATSAPP NOTIFICATIONS AUDIT LOG */}
        {/* ===================================================================== */}
        {activeTab === 'whatsapp' && (
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-stone-900">WhatsApp Notification Dispatches</h2>
                <p className="text-xs text-stone-500">
                  Formatted messages triggered automatically on table allocation
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-stone-400 text-sm">
                  No notifications logged yet
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-col sm:flex-row items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-stone-900 font-mono-numbers">
                            To: {notif.recipient}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {notif.status}
                          </span>
                        </div>
                        <pre className="text-xs text-stone-700 whitespace-pre-wrap font-sans bg-white p-3 rounded-xl border border-stone-200/60 mt-1 max-w-xl">
                          {notif.message}
                        </pre>
                      </div>
                    </div>

                    <span className="text-[11px] text-stone-400 font-mono-numbers whitespace-nowrap">
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MANUAL TABLE ALLOCATION MODAL (Safety Mechanism) */}
      {/* ========================================================================= */}
      {manualAllocQueueEntry && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">Manual Table Allocation</h3>
                <p className="text-xs text-stone-500">
                  Select a suitable available table for Token #{manualAllocQueueEntry.token_number}
                </p>
              </div>
              <button
                onClick={() => setManualAllocQueueEntry(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 flex items-center justify-between">
              <div>
                <span className="font-bold block">{manualAllocQueueEntry.customer_name}</span>
                <span className="text-orange-700">Token #{manualAllocQueueEntry.token_number}</span>
              </div>
              <span className="font-mono-numbers font-bold text-orange-900 bg-white px-2.5 py-1 rounded-lg border border-orange-200">
                {manualAllocQueueEntry.party_size} Guests
              </span>
            </div>

            {/* List of currently AVAILABLE tables that can fit party */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 mb-4">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                Available Tables (Capacity &gt;= {manualAllocQueueEntry.party_size})
              </span>

              {tables.filter(
                (t) => t.status === 'AVAILABLE' && t.capacity >= manualAllocQueueEntry.party_size
              ).length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl">
                  No currently available tables fit {manualAllocQueueEntry.party_size} guests.
                </div>
              ) : (
                tables
                  .filter(
                    (t) => t.status === 'AVAILABLE' && t.capacity >= manualAllocQueueEntry.party_size
                  )
                  .map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleManualAllocation(t.id)}
                      className="w-full p-3 rounded-xl border border-stone-200 hover:border-emerald-500 hover:bg-emerald-50/50 flex items-center justify-between transition-all text-left cursor-pointer"
                    >
                      <div>
                        <span className="font-black text-stone-900 font-mono-numbers text-sm block">
                          Table {t.table_number}
                        </span>
                        <span className="text-[11px] text-stone-500">{t.section}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 font-mono-numbers bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        {t.capacity} Seats (Fit Delta: +{t.capacity - manualAllocQueueEntry.party_size})
                      </span>
                    </button>
                  ))
              )}
            </div>

            <button
              onClick={() => setManualAllocQueueEntry(null)}
              className="w-full py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold text-xs hover:bg-stone-50 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD RESERVATION MODAL */}
      {/* ========================================================================= */}
      {showAddResModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-stone-900">New Staff Reservation</h3>
              <button
                onClick={() => setShowAddResModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  placeholder="e.g. Dr. Raghavan"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={resPhone}
                  onChange={(e) => setResPhone(e.target.value)}
                  placeholder="+91 98400 55555"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Party Size</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={resPartySize}
                    onChange={(e) => setResPartySize(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-stone-900"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddResModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold cursor-pointer"
                >
                  Save Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCHEMA & BACKEND SETTINGS MODAL */}
      {/* ========================================================================= */}
      {showSchemaModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">Supabase Schema & Configuration</h3>
                <p className="text-xs text-stone-500">
                  Ready-to-deploy PostgreSQL tables, RLS policies, and Realtime publications
                </p>
              </div>
              <button
                onClick={() => setShowSchemaModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                <strong>Realtime Status:</strong> Active. Sub-millisecond broadcast bus is syncing between TV, Customer, and Staff tabs.
              </div>

              <div>
                <span className="font-bold text-stone-800 block mb-1">
                  Database Schema (/supabase/schema.sql):
                </span>
                <pre className="p-3 bg-stone-900 text-stone-200 rounded-xl text-[11px] font-mono overflow-x-auto max-h-56">
{`-- Tables: restaurants, tables, queue_entries, reservations, allocation_events, notifications, staff
-- Features: Foreign keys, Check constraints, UUID generation, RLS policies, Realtime publication

ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries, public.tables, public.allocation_events;`}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setShowSchemaModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
