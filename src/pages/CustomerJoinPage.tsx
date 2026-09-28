import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Phone, User, Mail, Utensils, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { useRestaurantStore } from '../hooks/useRestaurantStore';

export function CustomerJoinPage() {
  const navigate = useNavigate();
  const { restaurant, joinQueue } = useRestaurantStore();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState<number>(2);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setErrorMessage('Please enter a valid phone number (at least 8 digits).');
      return;
    }

    if (partySize < 1 || partySize > restaurant.max_party_size) {
      setErrorMessage(`Party size must be between 1 and ${restaurant.max_party_size} people.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const entry = await joinQueue({
        customerName,
        phone,
        email: email.trim() || undefined,
        partySize,
        notes: notes.trim() || undefined,
      });

      // Save customer token in session for easy return
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('current_customer_token', entry.token_number);
        sessionStorage.setItem('current_customer_id', entry.id);
      }

      // Immediate redirect to customer status page
      navigate(`/customer/${entry.token_number}`);
    } catch (err) {
      console.error('Failed to join queue:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  const quickPartySizes = [1, 2, 3, 4, 5, 6, 8];

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        {/* Header / Restaurant Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-600/20 mb-3">
            <Utensils className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            {restaurant.name}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {restaurant.address || 'Authentic Pure Vegetarian Fine Dining'}
          </p>
        </div>

        {/* Join Queue Form Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200/80">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">JOIN QUEUE</h2>
            <p className="text-xs text-stone-500 mt-1">
              No account or password needed. Receive your live token and track your table in real time.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Jason Miller"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Phone Number (for SMS & WhatsApp) <span className="text-orange-600">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98400 12345"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-stone-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jason@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 bg-stone-50/50 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Number of People */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Number of People <span className="text-orange-600">*</span>
                </label>
                <span className="text-xs font-bold text-orange-600 font-mono-numbers">
                  {partySize} {partySize === 1 ? 'Person' : 'People'}
                </span>
              </div>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-7 gap-1.5 mb-2.5">
                {quickPartySizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPartySize(size)}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all font-mono-numbers ${
                      partySize === size
                        ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-600/30'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              {/* Stepper controls */}
              <div className="flex items-center justify-between gap-3 bg-stone-50 border border-stone-200 rounded-xl p-2">
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center font-bold text-base transition-colors"
                >
                  -
                </button>
                <div className="flex items-center gap-2 text-stone-800 font-medium text-sm">
                  <Users className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-base font-mono-numbers">{partySize}</span>
                  <span>{partySize === 1 ? 'guest' : 'guests'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPartySize((p) => Math.min(restaurant.max_party_size, p + 1))}
                  className="w-9 h-9 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 flex items-center justify-center font-bold text-base transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Special Request */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Special Requests <span className="text-stone-400 font-normal text-[11px]">(Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Baby high chair, wheelchair accessible"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-base tracking-wide shadow-md shadow-orange-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <span>Generating Token...</span>
              ) : (
                <>
                  <span>JOIN QUEUE</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-center gap-2 text-[11px] text-stone-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Instant token generation · Live updates · Zero spam</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-stone-400 mt-6">
        <span>QueueCraft Restaurant Technology</span>
        <span className="mx-2">·</span>
        <button
          onClick={() => navigate('/staff')}
          className="text-stone-500 hover:text-stone-700 underline underline-offset-2"
        >
          Staff Portal
        </button>
        <span className="mx-2">·</span>
        <button
          onClick={() => navigate('/tv')}
          className="text-stone-500 hover:text-stone-700 underline underline-offset-2"
        >
          TV Display
        </button>
      </div>
    </div>
  );
}
