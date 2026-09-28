/**
 * Supabase Client & Realtime Integration Service
 *
 * Provides real PostgreSQL persistence and Supabase Realtime subscriptions
 * for queue_entries, tables, allocation_events, and reservations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { QueueEntry, TableItem, Reservation, AllocationEvent } from '../types/database';

let supabaseInstance: SupabaseClient | null = null;
let currentConfig = {
  url: '',
  anonKey: '',
};

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  // Check stored config or env vars
  let url = '';
  let anonKey = '';

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('queuecraft_supabase_config_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        url = parsed.url || '';
        anonKey = parsed.anonKey || '';
      }
    } catch {
      // ignore
    }
  }

  if (!url || !anonKey) {
    url = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
  }

  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      currentConfig = { url, anonKey };
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }

  return supabaseInstance;
}

export function initSupabase(url: string, anonKey: string): { success: boolean; error?: string } {
  if (!url || !anonKey) {
    supabaseInstance = null;
    currentConfig = { url: '', anonKey: '' };
    return { success: false, error: 'URL and Anon Key are required' };
  }

  try {
    supabaseInstance = createClient(url.trim(), anonKey.trim(), {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentConfig = { url: url.trim(), anonKey: anonKey.trim() };
    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Tests if the Supabase project is reachable and tables exist
 */
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{
  connected: boolean;
  hasTables: boolean;
  message: string;
}> {
  const client = url && anonKey ? createClient(url.trim(), anonKey.trim()) : getSupabaseClient();

  if (!client) {
    return {
      connected: false,
      hasTables: false,
      message: 'Supabase credentials not configured.',
    };
  }

  try {
    // Check if tables table exists
    const { data, error } = await client.from('tables').select('id').limit(1);

    if (error) {
      // If code 42P01: relation "tables" does not exist (schema needs to be run)
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return {
          connected: true,
          hasTables: false,
          message: 'Connected to Supabase, but tables are not created yet. Please run the schema.sql in your Supabase SQL Editor.',
        };
      }
      return {
        connected: false,
        hasTables: false,
        message: `Connection error: ${error.message}`,
      };
    }

    return {
      connected: true,
      hasTables: true,
      message: 'Successfully connected to Supabase with tables ready!',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      hasTables: false,
      message: `Failed to connect: ${message}`,
    };
  }
}

/**
 * Seed initial restaurant and tables into Supabase if empty
 */
export async function seedSupabaseDatabase(params: {
  restaurant: any;
  tables: TableItem[];
  queue: QueueEntry[];
}): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, message: 'Supabase not connected' };

  try {
    // 1. Upsert Restaurant
    const { error: restError } = await client
      .from('restaurants')
      .upsert({
        id: 'rest_geetham_001',
        name: params.restaurant.name,
        slug: params.restaurant.slug,
        address: params.restaurant.address,
        phone: params.restaurant.phone,
        max_party_size: params.restaurant.max_party_size,
      });

    if (restError) throw restError;

    // 2. Upsert Tables
    const dbTables = params.tables.map((t) => ({
      id: t.id,
      restaurant_id: 'rest_geetham_001',
      table_number: t.table_number,
      capacity: t.capacity,
      status: t.status,
      section: t.section,
    }));

    const { error: tableError } = await client.from('tables').upsert(dbTables);
    if (tableError) throw tableError;

    return {
      success: true,
      message: `Successfully seeded ${params.tables.length} tables to Supabase!`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, message };
  }
}
