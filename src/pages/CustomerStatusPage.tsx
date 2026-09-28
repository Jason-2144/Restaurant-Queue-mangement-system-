import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Utensils,
  MapPin,
  RefreshCw,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRestaurantStore } from '../hooks/useRestaurantStore';

export function CustomerStatusPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { queue, tables, restaurant, cancelCustomer } = useRestaurantStore();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  // Find customer entry by token_number or by id
  const entry = queue.find(
    (q) => q.token_number === token || q.id === token
  );

  // Assigned table details
  const assignedTable = entry?.assigned_table_id
    ? tables.find((t) => t.id === entry.assigned_table_id)
    : null;

  // Trigger celebration confetti when status switches to ALLOCATED!
  useEffect(() => {
    if (entry) {
      if (prevStatusRef.current === 'WAITING' && entry.status === 'ALLOCATED') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#EA580C', '#16A34A', '#F59E0B', '#F97316'],
        });
      }
      prevStatusRef.current = entry.status;
    }
  }, [entry?.status]);

  if (!entry) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
          <Utensils className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">Token Not Found</h2>
        <p className="text-sm text-stone-500 max-w-sm mb-6">
          We could not locate queue token #{token}. It may have expired or was completed.
        </p>
        <button
          onClick={() => navigate('/join')}
          className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-all shadow-sm"
        >
          Join the Queue Again
        </button>
      </div>
    );
  }

  const isAllocated = entry.status === 'ALLOCATED';
  const isOccupied = entry.status === 'OCCUPIED';
  const isCompleted = entry.status === 'COMPLETED';
  const isCancelled = entry.status === 'CANCELLED';

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleConfirmCancel = async () => {
    await cancelCustomer(entry.id, 'CANCELLED');
    setShowCancelModal(false);
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        {/* Restaurant Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/70 text-orange-900 text-xs font-semibold mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Queue Status</span>
          </div>
          <h1 className="text-xl font-bold text-stone-900 tracking-tight">
            {restaurant.name}
          </h1>
          <p className="text-stone-500 text-xs mt-0.5 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 text-stone-400" />
            <span>{restaurant.address || 'Dining Room'}</span>
          </p>
        </div>

        {/* Status Callout Banner if Allocated */}
        {isAllocated && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 text-center animate-bounce-short">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 mb-1.5">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-extrabold tracking-wide uppercase">Table Ready!</h3>
            <p className="text-xs text-emerald-100 mt-0.5">
              Please proceed to the host stand. Show your token to the host.
            </p>
          </div>
        )}

        {/* Main Customer Ticket Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200/80 relative overflow-hidden">
          {/* Decorative subtle header background */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

          {/* Ticket Header */}
          <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest block">
                YOUR TOKEN
              </span>
              <span className="text-4xl sm:text-5xl font-black text-stone-900 tracking-tight font-mono-numbers">
                {entry.token_number}
              </span>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold font-mono-numbers">
                <Users className="w-4 h-4 text-orange-600" />
                <span>{entry.party_size} {entry.party_size === 1 ? 'PERSON' : 'PEOPLE'}</span>
              </div>
              <span className="text-[11px] text-stone-400 block mt-1">
                Party of {entry.customer_name}
              </span>
            </div>
          </div>

          {/* Status Section */}
          <div className="mb-6">
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
              CURRENT STATUS
            </div>

            {/* WAITING STATE */}
            {entry.status === 'WAITING' && (
              <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-orange-500 animate-ping"></div>
                  <div>
                    <span className="text-base font-extrabold text-orange-950 uppercase tracking-wide block">
                      WAITING
                    </span>
                    <span className="text-xs text-orange-700">
                      We are preparing an ideal table for you
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-orange-700 font-semibold uppercase block">Position</span>
                  <span className="text-xl font-black text-orange-950 font-mono-numbers">
                    #{entry.position || 1}
                  </span>
                </div>
              </div>
            )}

            {/* ALLOCATED STATE */}
            {isAllocated && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-lg font-black text-emerald-900 uppercase tracking-wider block">
                      ALLOCATED
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">
                      Table assigned successfully
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-200/70 text-emerald-900">
                  Ready Now
                </span>
              </div>
            )}

            {/* OCCUPIED / SEATED STATE */}
            {isOccupied && (
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-center gap-3">
                <Utensils className="w-5 h-5 text-blue-600" />
                <div>
                  <span className="text-sm font-bold text-blue-900 uppercase block">Seated & Dining</span>
                  <span className="text-xs text-blue-700">Hope you are enjoying your meal!</span>
                </div>
              </div>
            )}

            {/* COMPLETED STATE */}
            {isCompleted && (
              <div className="p-4 rounded-2xl bg-stone-100 border border-stone-200 text-center">
                <span className="text-sm font-bold text-stone-700 block">Dining Completed</span>
                <span className="text-xs text-stone-500">Thank you for visiting {restaurant.name}!</span>
              </div>
            )}

            {/* CANCELLED STATE */}
            {isCancelled && (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
                <XCircle className="w-5 h-5 text-red-600" />
                <div>
                  <span className="text-sm font-bold text-red-900 block">Queue Spot Cancelled</span>
                  <span className="text-xs text-red-600">You may rejoin anytime from the entrance QR.</span>
                </div>
              </div>
            )}
          </div>

          {/* Table Allocation Box */}
          <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200/80 mb-6">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
              ASSIGNED TABLE
            </span>

            {isAllocated || isOccupied ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl sm:text-4xl font-black text-emerald-700 font-mono-numbers tracking-tight block">
                    Table {assignedTable?.table_number || 'Ready'}
                  </span>
                  <span className="text-xs text-stone-500 mt-0.5 block">
                    {assignedTable?.section || 'Dining Room'} · Seats up to {assignedTable?.capacity || entry.party_size}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Utensils className="w-6 h-6" />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1">
                <div>
                  <span className="text-lg font-bold text-stone-600 block">
                    Not allocated yet
                  </span>
                  <span className="text-xs text-stone-400">
                    We will notify you immediately when a table opens
                  </span>
                </div>
                <Clock className="w-5 h-5 text-stone-400" />
              </div>
            )}
          </div>

          {/* Real-time Indicator */}
          <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-stone-700 font-medium">Live Supabase Realtime active</span>
            </div>
            <span className="text-stone-400 text-[11px]">No refresh required</span>
          </div>

          {/* Actions */}
          <div className="mt-6 pt-5 border-t border-stone-100 flex items-center justify-between gap-3">
            <button
              onClick={handleCopyLink}
              className="flex-1 py-2.5 px-3 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Link Copied!' : 'Share Status'}</span>
            </button>

            {entry.status === 'WAITING' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="py-2.5 px-3 rounded-xl text-stone-400 hover:text-red-600 font-medium text-xs transition-colors"
              >
                Leave Queue
              </button>
            )}
          </div>
        </div>

        {/* Helpful instructions card */}
        <div className="mt-4 p-4 rounded-2xl bg-white/70 border border-stone-200/60 text-xs text-stone-500 space-y-2">
          <p className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">1.</span>
            <span>Watch the restaurant TV screen or this live screen for your token number.</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">2.</span>
            <span>You will also receive a WhatsApp notification at <strong className="text-stone-800 font-mono-numbers">{entry.phone}</strong>.</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-orange-600 font-bold">3.</span>
            <span>When called, please reach the host stand within 5 minutes.</span>
          </p>
        </div>
      </div>

      {/* Confirmation Modal for Leaving Queue */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-2">Leave the Queue?</h3>
            <p className="text-xs text-stone-500 mb-6">
              Are you sure you want to cancel your spot? You will lose Token #{entry.token_number} and need to rejoin.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50"
              >
                Keep My Spot
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer */}
      <div className="text-center text-xs text-stone-400 mt-6">
        <span>Questions? Speak with the host stand</span>
        <span className="mx-2">·</span>
        <button
          onClick={() => navigate('/join')}
          className="text-orange-600 font-medium hover:underline"
        >
          Join New Party
        </button>
      </div>
    </div>
  );
}
