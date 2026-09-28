import { useEffect, useState, useRef } from 'react';
import {
  QrCode,
  CheckCircle,
  Clock,
  User,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRestaurantStore } from '../hooks/useRestaurantStore';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { audioAnnouncementService } from '../services/speechService';
import { getSupabaseClient } from '../services/supabaseService';
import { AllocationEvent, QueueEntry } from '../types/database';

export function TvDisplayPage() {
  const {
    restaurant,
    allocatedQueue: storeAllocatedQueue,
    waitingQueue: storeWaitingQueue,
    tables,
    latestAllocationEvent,
    clearLatestAllocationEvent,
    customQrUrl,
  } = useRestaurantStore();

  // TV Queue React State (Updated in real time by Supabase Realtime)
  const [queueList, setQueueList] = useState<QueueEntry[]>(() => [
    ...storeAllocatedQueue,
    ...storeWaitingQueue,
  ]);

  const [activeAnnouncement, setActiveAnnouncement] = useState<AllocationEvent | null>(null);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const announcementTimeoutRef = useRef<number | null>(null);
  const lastHandledEventIdRef = useRef<string | null>(null);

  // 1. Initial page load: Supabase SELECT → React state
  // 2. Realtime subscription: Supabase Realtime → React state
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Initial SELECT from Supabase
    supabase
      .from('queue_entries')
      .select('*')
      .in('status', ['WAITING', 'ALLOCATED'])
      .order('joined_at', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setQueueList(data);
        }
      });

    // Supabase Realtime Channel: Listen to INSERT, UPDATE, DELETE
    const channel = supabase
      .channel('tv-queue')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'queue_entries',
        },
        (payload) => {
          const newEntry = payload.new as QueueEntry;
          setQueueList((prev) => {
            // Prevent duplicate entries if the same realtime event is received more than once
            if (prev.some((e) => e.id === newEntry.id || e.token_number === newEntry.token_number)) {
              return prev;
            }
            return [...prev, newEntry];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'queue_entries',
        },
        (payload) => {
          const updatedEntry = payload.new as QueueEntry;
          setQueueList((prev) => {
            // If customer finished dining or cancelled, remove from TV display
            if (['COMPLETED', 'CANCELLED'].includes(updatedEntry.status)) {
              return prev.filter((e) => e.id !== updatedEntry.id);
            }
            const exists = prev.some((e) => e.id === updatedEntry.id);
            if (exists) {
              return prev.map((e) => (e.id === updatedEntry.id ? updatedEntry : e));
            }
            if (['WAITING', 'ALLOCATED'].includes(updatedEntry.status)) {
              return [...prev, updatedEntry];
            }
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'queue_entries',
        },
        (payload) => {
          const deletedEntry = payload.old as { id?: string };
          if (deletedEntry?.id) {
            setQueueList((prev) => prev.filter((e) => e.id !== deletedEntry.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'allocation_events',
        },
        (payload) => {
          const event = payload.new as AllocationEvent;
          if (event && event.token_number && event.table_number) {
            setActiveAnnouncement(event);
            confetti({
              particleCount: 120,
              spread: 90,
              origin: { y: 0.4 },
              colors: ['#EB5A00', '#009A60', '#F59E0B', '#F97316', '#FFFFFF'],
            });
            if (audioEnabled) {
              audioAnnouncementService.speakAllocation(event.token_number, event.table_number);
            }
            if (announcementTimeoutRef.current) {
              window.clearTimeout(announcementTimeoutRef.current);
            }
            announcementTimeoutRef.current = window.setTimeout(() => {
              setActiveAnnouncement(null);
            }, 8500);
          }
        }
      )
      .subscribe();

    // Clean up channel subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [audioEnabled]);

  // Fallback for offline/local state when Supabase client is not connected
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setQueueList([...storeAllocatedQueue, ...storeWaitingQueue]);
    }
  }, [storeAllocatedQueue, storeWaitingQueue]);

  // Derived queues directly from TV React state
  const tvAllocatedQueue = queueList.filter((q) => q.status === 'ALLOCATED');
  const tvWaitingQueue = queueList.filter((q) => q.status === 'WAITING');

  // Live ticking clock in 12-hour format with AM/PM (e.g. 09:42 PM)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentTime(timeStr);
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute join URL for QR Code
  const baseUrl = customQrUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const joinUrl = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/join` : 'https://restaurant.app/join';

  // Map assigned table numbers for allocated queue
  const tableMap = new Map(tables.map((t) => [t.id, t.table_number]));

  // Watch for incoming allocation events from local store as well
  useEffect(() => {
    if (latestAllocationEvent && latestAllocationEvent.id !== lastHandledEventIdRef.current) {
      lastHandledEventIdRef.current = latestAllocationEvent.id;
      setActiveAnnouncement(latestAllocationEvent);

      // Trigger Confetti
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.4 },
        colors: ['#EB5A00', '#009A60', '#F59E0B', '#F97316', '#FFFFFF'],
      });

      // Trigger Chime & Text-to-Speech
      if (audioEnabled) {
        audioAnnouncementService.speakAllocation(
          latestAllocationEvent.token_number,
          latestAllocationEvent.table_number
        );
      }

      // Auto-dismiss announcement after 8.5 seconds
      if (announcementTimeoutRef.current) {
        window.clearTimeout(announcementTimeoutRef.current);
      }

      announcementTimeoutRef.current = window.setTimeout(() => {
        setActiveAnnouncement(null);
        clearLatestAllocationEvent();
      }, 8500);
    }
  }, [latestAllocationEvent, audioEnabled, clearLatestAllocationEvent]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        window.clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  const toggleAudio = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    audioAnnouncementService.setEnabled(next);
    if (next) {
      audioAnnouncementService.playChime();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F4F6F8] text-stone-900 overflow-hidden flex flex-col justify-between select-none relative font-sans">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Nice Restaurant branding) */}
      {/* ========================================================================= */}
      <header className="h-14 sm:h-16 shrink-0 px-6 sm:px-8 bg-white border-b border-stone-200/80 flex items-center justify-between shadow-2xs z-10">
        {/* Left spacer / quick actions */}
        <div className="w-1/4 flex items-center gap-2">
          {/* Subtle audio and fullscreen toggles for staff */}
          <button
            onClick={toggleAudio}
            title={audioEnabled ? 'Mute Audio Announcements' : 'Unmute Audio Announcements'}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              audioEnabled
                ? 'bg-orange-50 border-orange-200 text-[#EB5A00] hover:bg-orange-100'
                : 'bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-500 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Center: Brand Lockup */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5">
            {/* Fork & Spoon Icon in Orange */}
            <svg
              className="w-5 h-5 text-[#EB5A00]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm8-7c-1.66 0-3 1.34-3 3v5c0 1.66 1.34 3 3 3v9h2.5V2c-.83 0-1.72.34-2.5.83V2z" />
            </svg>
            <span className="text-xl sm:text-2xl font-black text-[#EB5A00] tracking-wider uppercase">
              {restaurant.name || 'Nice Restaurant'}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-[#EB5A00]/90 tracking-normal -mt-0.5">
            Restaurant Queue Management
          </span>
        </div>

        {/* Right: Clock, Live Queue Indicator */}
        <div className="w-1/4 flex items-center justify-end gap-3 sm:gap-4 text-xs font-semibold text-stone-600">
          <span className="font-bold text-stone-900 font-mono-numbers text-xs sm:text-sm">
            {currentTime || '09:42 PM'}
          </span>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#009A60] animate-pulse" />
            <span className="text-[#009A60] font-bold text-xs whitespace-nowrap">Live Queue</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN 2-COLUMN VIEWPORT (Fits 100% inside screen without overflow) */}
      {/* ========================================================================= */}
      <main className="flex-1 min-h-0 px-6 py-4 grid grid-cols-12 gap-5 overflow-hidden">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: SCAN TO JOIN OUR QUEUE */}
        {/* ======================================================================= */}
        <section className="col-span-12 lg:col-span-4 flex flex-col min-h-0 bg-white rounded-xl shadow-xs border border-stone-200/90 overflow-hidden">
          {/* Solid Orange Section Header */}
          <div className="bg-[#EB5A00] text-white px-4 py-2.5 flex items-center gap-2.5 shrink-0">
            <QrCode className="w-5 h-5 shrink-0" />
            <h2 className="font-bold text-sm sm:text-base tracking-wide uppercase">
              Scan to Join Our Queue
            </h2>
          </div>

          {/* Card Body */}
          <div className="flex-1 min-h-0 p-3 sm:p-4 flex flex-col justify-between items-center bg-white overflow-hidden">
            {/* High-Contrast Large QR Box */}
            <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 rounded-xl border border-stone-200 bg-white shadow-2xs">
              <QRCodeDisplay
                text={joinUrl}
                size={340}
                className="max-h-full max-w-full aspect-square object-contain"
              />
            </div>

            {/* Skip the Wait & 3 Steps */}
            <div className="w-full shrink-0 pt-2.5 text-center">
              <h3 className="text-[#EB5A00] font-extrabold text-sm sm:text-base tracking-tight mb-2">
                Skip the Wait!
              </h3>

              <div className="space-y-1.5 text-left text-xs text-stone-700 max-w-xs mx-auto">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#EB5A00] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="font-medium">Scan the QR code with your phone</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#EB5A00] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="font-medium">Enter your details</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#EB5A00] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="font-medium">Track your position in line</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: TOP (TABLE ALLOCATED) & BOTTOM (WAITING QUEUE) */}
        {/* ======================================================================= */}
        <section className="col-span-12 lg:col-span-8 flex flex-col min-h-0 gap-4 overflow-hidden">
          {/* ===================================================================== */}
          {/* TOP RIGHT: TABLE ALLOCATED (Green Header) */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200/90 overflow-hidden shrink-0 flex flex-col">
            {/* Solid Green Header */}
            <div className="bg-[#009A60] text-white px-4 py-2 flex items-center gap-2 shrink-0">
              <CheckCircle className="w-4 h-4 shrink-0 text-white" />
              <h3 className="font-bold text-sm sm:text-base tracking-wide">
                Table Allocated
              </h3>
            </div>

            {/* Allocated Cards Row */}
            <div className="p-3 sm:p-4 bg-white flex items-center gap-3 min-h-[120px] overflow-x-auto">
              {tvAllocatedQueue.length === 0 ? (
                <div className="w-full py-4 flex flex-col items-center justify-center text-center text-stone-400">
                  <LayoutGrid className="w-7 h-7 text-stone-300 mb-1" />
                  <span className="text-xs font-semibold text-stone-500">
                    No guests are currently seated
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  {tvAllocatedQueue.slice(0, 3).map((entry) => {
                    const tableNumber = entry.assigned_table_id
                      ? tableMap.get(entry.assigned_table_id) || 'Ready'
                      : 'Ready';

                    return (
                      <div
                        key={entry.id}
                        className="bg-[#EBF8F2] border border-[#A7F3D0] rounded-xl px-5 py-2.5 flex flex-col items-center justify-center text-center shadow-2xs min-w-[130px] sm:min-w-[150px]"
                      >
                        {/* Big Token */}
                        <span className="text-3xl sm:text-4xl font-black text-stone-900 font-mono-numbers tracking-tight">
                          {entry.token_number}
                        </span>

                        {/* Guest Count */}
                        <div className="flex items-center gap-1 text-xs font-semibold text-stone-600 mt-0.5">
                          <User className="w-3.5 h-3.5 text-stone-500" />
                          <span className="font-mono-numbers">{entry.party_size}</span>
                        </div>

                        {/* Status / Table Badge */}
                        <span className="mt-2 text-[10px] sm:text-[11px] font-black tracking-wide uppercase px-2 py-0.5 rounded bg-[#D1FAE5] text-[#047857]">
                          Table {tableNumber}
                        </span>
                      </div>
                    );
                  })}

                  {tvAllocatedQueue.length === 1 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-300 py-2">
                      <LayoutGrid className="w-6 h-6 text-stone-200 mb-0.5" />
                      <span className="text-[11px] text-stone-400">
                        Awaiting next allocation
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===================================================================== */}
          {/* BOTTOM RIGHT: WAITING QUEUE (Orange Header & Card Grid) */}
          {/* ===================================================================== */}
          <div className="bg-white rounded-xl shadow-xs border border-stone-200/90 overflow-hidden flex-1 min-h-0 flex flex-col">
            {/* Solid Orange Header */}
            <div className="bg-[#EB5A00] text-white px-4 py-2 flex items-center gap-2 shrink-0">
              <Clock className="w-4 h-4 shrink-0 text-white" />
              <h3 className="font-bold text-sm sm:text-base tracking-wide">
                Waiting Queue
              </h3>
            </div>

            {/* Waiting Grid Cards */}
            <div className="flex-1 min-h-0 p-3 sm:p-4 bg-white flex flex-col justify-between overflow-hidden">
              {tvWaitingQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-stone-400">
                  <Clock className="w-8 h-8 text-stone-300 mb-1" />
                  <span className="text-xs font-medium text-stone-500">
                    No customers currently waiting in queue
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 overflow-hidden">
                  {tvWaitingQueue.slice(0, 16).map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white border border-stone-200/90 rounded-xl p-2 sm:p-2.5 flex flex-col items-center justify-center text-center shadow-2xs hover:border-orange-300 transition-colors"
                    >
                      {/* Token Number */}
                      <span className="text-xl sm:text-2xl font-black text-stone-900 font-mono-numbers tracking-tight">
                        {entry.token_number}
                      </span>

                      {/* Guest Count */}
                      <div className="flex items-center gap-1 text-[11px] font-medium text-stone-500 mt-0.5">
                        <User className="w-3 h-3 text-stone-400" />
                        <span className="font-mono-numbers">{entry.party_size}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination capsules at bottom (matches reference UI) */}
              <div className="pt-2 flex items-center justify-start gap-1.5 shrink-0">
                <span className="w-8 h-2 bg-[#EB5A00] rounded-full" />
                <span className="w-8 h-2 bg-[#FDBA74]/50 rounded-full" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FOOTER BAR (Deep Navy Blue Bar with White / Sky Text) */}
      {/* ========================================================================= */}
      <footer className="h-12 sm:h-13 shrink-0 bg-[#17365D] text-white px-6 flex flex-col items-center justify-center text-center shadow-inner z-10">
        <h4 className="font-bold text-xs sm:text-sm tracking-wide">
          {restaurant.name || 'Nice Restaurant'}
        </h4>
        <p className="text-[11px] text-blue-200/90 font-normal">
          Please approach the front desk for assistance
        </p>
      </footer>

      {/* ========================================================================= */}
      {/* 4. TEMPORARY CELEBRATION ANNOUNCEMENT OVERLAY */}
      {/* ========================================================================= */}
      {activeAnnouncement && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 sm:p-10 shadow-2xl border-4 border-[#009A60] text-center relative overflow-hidden">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EBF8F2] text-[#009A60] font-bold text-xs tracking-wider uppercase mb-4">
              <Sparkles className="w-4 h-4 text-[#009A60]" />
              <span>TABLE READY</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              🎉 TOKEN #{activeAnnouncement.token_number}
            </h2>
            <p className="text-sm text-stone-500 mt-1 font-medium">
              Please proceed to the host stand
            </p>

            <div className="my-6 p-6 bg-[#EBF8F2] rounded-2xl border-2 border-[#A7F3D0] flex items-center justify-around shadow-inner">
              <div>
                <span className="text-[11px] font-bold text-[#009A60] uppercase tracking-widest block mb-0.5">
                  YOUR TOKEN
                </span>
                <span className="text-5xl sm:text-6xl font-black text-stone-900 font-mono-numbers">
                  {activeAnnouncement.token_number}
                </span>
              </div>

              <div className="text-[#009A60] font-black text-3xl sm:text-4xl animate-pulse">
                ➔
              </div>

              <div>
                <span className="text-[11px] font-bold text-[#009A60] uppercase tracking-widest block mb-0.5">
                  ASSIGNED TABLE
                </span>
                <span className="text-5xl sm:text-6xl font-black text-[#009A60] font-mono-numbers">
                  {activeAnnouncement.table_number}
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-400">
              Party of {activeAnnouncement.party_size} guests · Resuming display in a few seconds...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
