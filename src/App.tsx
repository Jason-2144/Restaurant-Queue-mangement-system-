import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { CustomerJoinPage } from './pages/CustomerJoinPage';
import { CustomerStatusPage } from './pages/CustomerStatusPage';
import { StaffDashboardPage } from './pages/StaffDashboardPage';
import { TvDisplayPage } from './pages/TvDisplayPage';
import { Utensils, Tv, Users, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useRestaurantStore } from './hooks/useRestaurantStore';

function PrototypePortal() {
  const { restaurant } = useRestaurantStore();

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-900 flex flex-col justify-between p-6 sm:p-10 font-sans">
      <div className="max-w-4xl w-full mx-auto">
        {/* Brand Lockup */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-600/20 mb-3">
            <Utensils className="w-7 h-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
            {restaurant.name}
          </h1>
          <p className="text-stone-500 text-sm mt-1 max-w-lg mx-auto">
            Production-quality real-time restaurant queue and table allocation prototype with connected TV display, waiter dashboard, and customer status.
          </p>
        </div>

        {/* 3 Core Interfaces Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Interface 1: Customer Join */}
          <Link
            to="/join"
            className="group bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs hover:shadow-md hover:border-orange-500 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider block">
                INTERFACE 1
              </span>
              <h3 className="text-xl font-bold text-stone-900 mt-1 mb-2">
                Customer Mobile Page
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Scan QR code, enter name, phone, &amp; party size to get an instant digital token with real-time status.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-orange-600">
              <span>Open Customer Join</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Interface 2: Staff Dashboard */}
          <Link
            to="/staff"
            className="group bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs hover:shadow-md hover:border-orange-500 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                INTERFACE 2
              </span>
              <h3 className="text-xl font-bold text-stone-900 mt-1 mb-2">
                Staff &amp; Waiter Dashboard
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Floor management, table states (Available, Allocated, Occupied, Cleaning), seat guests, &amp; automatic table allocation triggers.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-900">
              <span>Open Staff Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Interface 3: TV Display */}
          <Link
            to="/tv"
            className="group bg-white rounded-3xl p-6 border border-stone-200 shadow-2xs hover:shadow-md hover:border-emerald-500 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-4 group-hover:scale-105 transition-transform">
                <Tv className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                INTERFACE 3
              </span>
              <h3 className="text-xl font-bold text-stone-900 mt-1 mb-2">
                Landscape TV Display
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed">
                Large scannable QR on left, allocated tables on right top, waiting queue on right bottom, plus audio chime and celebration overlay.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Open TV Display</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Quick Testing Callout */}
        <div className="bg-orange-50/70 border border-orange-200/80 rounded-3xl p-6 text-xs text-stone-700">
          <div className="flex items-center gap-2 mb-2 font-bold text-orange-950 text-sm">
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>How to test the connected real-time prototype in 30 seconds:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-stone-600">
            <li>Open the <strong>TV Display (/tv)</strong> in one window/tab.</li>
            <li>Open the <strong>Staff Dashboard (/staff)</strong> in a second window/tab side-by-side.</li>
            <li>In Staff Dashboard &gt; Table Management, find any table in <strong>CLEANING</strong> state (e.g. Table 63) and click <strong>Mark Ready (Auto-Alloc)</strong>.</li>
            <li>Watch the automatic best-fit table allocation engine run: the waiting party is instantly assigned, the TV displays the animated banner with chime &amp; speech synthesis, and mock WhatsApp is logged!</li>
            <li>Open <strong>/customer/517</strong> to view the live customer ticket state.</li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-stone-400 mt-10">
        QueueCraft · Geetham Veg Prototype · Realtime PostgreSQL Architecture
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PrototypePortal />} />
        <Route path="/join" element={<CustomerJoinPage />} />
        <Route path="/customer/:token" element={<CustomerStatusPage />} />
        <Route path="/staff" element={<StaffDashboardPage />} />
        <Route path="/tv" element={<TvDisplayPage />} />
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
