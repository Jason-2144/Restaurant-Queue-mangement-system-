-- ==============================================================================
-- QueueCraft Restaurant Queue & Table Allocation System
-- Supabase / PostgreSQL Schema Definition
-- Multi-tenant ready, Realtime enabled, RLS protected
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    address TEXT,
    phone TEXT,
    max_party_size INT DEFAULT 12,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.tables (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ALLOCATED', 'OCCUPIED', 'CLEANING')),
    section TEXT DEFAULT 'Main Dining',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- 3. QUEUE ENTRIES
CREATE TABLE IF NOT EXISTS public.queue_entries (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    token_number TEXT NOT NULL,
    queue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    party_size INT NOT NULL CHECK (party_size > 0),
    status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'ALLOCATED', 'OCCUPIED', 'COMPLETED', 'CANCELLED')),
    position INT DEFAULT 1,
    assigned_table_id TEXT REFERENCES public.tables(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    allocated_at TIMESTAMPTZ,
    seated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RESERVATIONS (for staff)
CREATE TABLE IF NOT EXISTS public.reservations (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    party_size INT NOT NULL CHECK (party_size > 0),
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    assigned_table_id TEXT REFERENCES public.tables(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW')),
    special_requests TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ALLOCATION EVENTS (audit & TV announcements)
CREATE TABLE IF NOT EXISTS public.allocation_events (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    queue_entry_id TEXT NOT NULL REFERENCES public.queue_entries(id) ON DELETE CASCADE,
    table_id TEXT NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL DEFAULT 'AUTO_ALLOCATED' CHECK (event_type IN ('AUTO_ALLOCATED', 'MANUAL_ALLOCATED', 'REALLOCATED', 'RELEASED')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. NOTIFICATIONS (WhatsApp / SMS audit log)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    queue_entry_id TEXT NOT NULL REFERENCES public.queue_entries(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'WHATSAPP' CHECK (channel IN ('WHATSAPP', 'SMS')),
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STAFF
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'WAITER' CHECK (role IN ('HEAD_HOST', 'WAITER', 'MANAGER')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR HIGH-THROUGHPUT REALTIME QUERIES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_status ON public.tables(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_restaurant_date_status ON public.queue_entries(restaurant_id, queue_date, status);
CREATE INDEX IF NOT EXISTS idx_queue_token ON public.queue_entries(token_number);
CREATE INDEX IF NOT EXISTS idx_queue_assigned_table ON public.queue_entries(assigned_table_id);
CREATE INDEX IF NOT EXISTS idx_alloc_events_restaurant ON public.allocation_events(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_queue_entry ON public.notifications(queue_entry_id);

-- ==============================================================================
-- REALTIME REPLICA IDENTITY (Allows UPDATE & DELETE events to deliver full payloads)
-- ==============================================================================
ALTER TABLE public.queue_entries REPLICA IDENTITY FULL;
ALTER TABLE public.tables REPLICA IDENTITY FULL;
ALTER TABLE public.allocation_events REPLICA IDENTITY FULL;

-- ==============================================================================
-- REALTIME SUBSCRIPTIONS CONFIGURATION
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.allocation_events;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allocation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

-- 1. RESTAURANTS: Anyone can read, anyone can upsert initial restaurant info
DROP POLICY IF EXISTS "Public can view restaurant details" ON public.restaurants;
CREATE POLICY "Public can view restaurant details" ON public.restaurants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can upsert restaurant details" ON public.restaurants;
CREATE POLICY "Public can upsert restaurant details" ON public.restaurants FOR ALL USING (true);

-- 2. TABLES: Anyone can read and update tables
DROP POLICY IF EXISTS "Public and staff can view tables" ON public.tables;
CREATE POLICY "Public and staff can view tables" ON public.tables FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can update tables" ON public.tables;
CREATE POLICY "Staff can update tables" ON public.tables FOR ALL USING (true);

-- 3. QUEUE ENTRIES: Public can read, insert, update
DROP POLICY IF EXISTS "Public can join queue" ON public.queue_entries;
CREATE POLICY "Public can join queue" ON public.queue_entries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Public can view their own queue entry" ON public.queue_entries;
CREATE POLICY "Public can view their own queue entry" ON public.queue_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff can manage queue entries" ON public.queue_entries;
CREATE POLICY "Staff can manage queue entries" ON public.queue_entries FOR ALL USING (true);

-- 4. ALLOCATION EVENTS: Anyone can insert & read
DROP POLICY IF EXISTS "Public can view allocation events" ON public.allocation_events;
CREATE POLICY "Public can view allocation events" ON public.allocation_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can insert allocation events" ON public.allocation_events;
CREATE POLICY "Anyone can insert allocation events" ON public.allocation_events FOR INSERT WITH CHECK (true);

-- 5. NOTIFICATIONS
DROP POLICY IF EXISTS "Public can view notifications" ON public.notifications;
CREATE POLICY "Public can view notifications" ON public.notifications FOR ALL USING (true);
