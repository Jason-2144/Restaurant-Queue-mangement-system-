/**
 * Unified Restaurant Realtime Store
 *
 * Coordinates state, Realtime broadcasts, Supabase connectivity,
 * and executes the decoupled tableAllocationService and notificationService.
 */

import {
  Restaurant,
  TableItem,
  QueueEntry,
  Reservation,
  NotificationRecord,
  AllocationEvent,
  TableStatus,
} from '../types/database';
import {
  DEFAULT_RESTAURANT,
  INITIAL_TABLES,
  INITIAL_QUEUE,
  INITIAL_RESERVATIONS,
  INITIAL_NOTIFICATIONS,
} from './initialData';
import { findBestCandidateForTable } from './tableAllocationService';
import { sendTableAllocationWhatsApp } from './notificationService';

const STORAGE_KEY_TABLES = 'queuecraft_tables_v1';
const STORAGE_KEY_QUEUE = 'queuecraft_queue_v1';
const STORAGE_KEY_RESERVATIONS = 'queuecraft_reservations_v1';
const STORAGE_KEY_NOTIFS = 'queuecraft_notifications_v1';
const STORAGE_KEY_RESTAURANT = 'queuecraft_restaurant_v1';
const STORAGE_KEY_SUPABASE = 'queuecraft_supabase_config_v1';

// BroadcastChannel for sub-millisecond tab-to-tab realtime sync (TV <-> Staff <-> Customer)
const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('queuecraft_realtime_channel')
  : null;

interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

class RestaurantStore {
  private restaurant: Restaurant = DEFAULT_RESTAURANT;
  private tables: TableItem[] = INITIAL_TABLES;
  private queue: QueueEntry[] = INITIAL_QUEUE;
  private reservations: Reservation[] = INITIAL_RESERVATIONS;
  private notifications: NotificationRecord[] = INITIAL_NOTIFICATIONS;
  private latestAllocationEvent: AllocationEvent | null = null;
  private listeners: Set<() => void> = new Set();
  private supabaseConfig: SupabaseConfig = {
    url: '',
    anonKey: '',
    connected: false,
  };

  constructor() {
    this.loadFromStorage();

    // Listen to cross-tab updates
    if (broadcast) {
      broadcast.onmessage = (event) => {
        if (event.data?.type === 'STATE_UPDATED') {
          this.loadFromStorage();
          if (event.data?.allocationEvent) {
            this.latestAllocationEvent = event.data.allocationEvent;
          }
          this.notify();
        }
      };
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('queuecraft_')) {
          this.loadFromStorage();
          this.notify();
        }
      });
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const storedRest = localStorage.getItem(STORAGE_KEY_RESTAURANT);
      if (storedRest) this.restaurant = JSON.parse(storedRest);

      const storedTables = localStorage.getItem(STORAGE_KEY_TABLES);
      if (storedTables) this.tables = JSON.parse(storedTables);

      const storedQueue = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (storedQueue) this.queue = JSON.parse(storedQueue);

      const storedRes = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
      if (storedRes) this.reservations = JSON.parse(storedRes);

      const storedNotifs = localStorage.getItem(STORAGE_KEY_NOTIFS);
      if (storedNotifs) this.notifications = JSON.parse(storedNotifs);

      const storedSupabase = localStorage.getItem(STORAGE_KEY_SUPABASE);
      if (storedSupabase) {
        this.supabaseConfig = JSON.parse(storedSupabase);
      } else {
        const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        if (envUrl && envKey) {
          this.supabaseConfig = { url: envUrl, anonKey: envKey, connected: true };
        }
      }
    } catch (err) {
      console.error('Error loading restaurant store from storage:', err);
    }
  }

  private saveToStorage(allocationEvent?: AllocationEvent | null) {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY_RESTAURANT, JSON.stringify(this.restaurant));
      localStorage.setItem(STORAGE_KEY_TABLES, JSON.stringify(this.tables));
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(this.queue));
      localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(this.reservations));
      localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(this.notifications));
      localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(this.supabaseConfig));

      if (broadcast) {
        broadcast.postMessage({
          type: 'STATE_UPDATED',
          allocationEvent: allocationEvent || null,
        });
      }
    } catch (err) {
      console.error('Error saving restaurant store to storage:', err);
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(allocationEvent?: AllocationEvent | null) {
    if (allocationEvent !== undefined) {
      this.latestAllocationEvent = allocationEvent;
    }
    this.listeners.forEach((listener) => listener());
  }

  // Getters
  public getRestaurant(): Restaurant {
    return this.restaurant;
  }

  public getTables(): TableItem[] {
    return [...this.tables];
  }

  public getQueue(): QueueEntry[] {
    return [...this.queue];
  }

  public getReservations(): Reservation[] {
    return [...this.reservations];
  }

  public getNotifications(): NotificationRecord[] {
    return [...this.notifications];
  }

  public getLatestAllocationEvent(): AllocationEvent | null {
    return this.latestAllocationEvent;
  }

  public clearLatestAllocationEvent() {
    this.latestAllocationEvent = null;
    this.notify();
  }

  public getSupabaseConfig(): SupabaseConfig {
    return { ...this.supabaseConfig };
  }

  public setSupabaseConfig(url: string, anonKey: string) {
    this.supabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      connected: !!(url.trim() && anonKey.trim()),
    };
    this.saveToStorage();
    this.notify();
  }

  /**
   * Helper to recalculate waiting queue positions
   */
  private recalculatePositions() {
    let currentPos = 1;
    this.queue = this.queue.map((entry) => {
      if (entry.status === 'WAITING') {
        const updated = { ...entry, position: currentPos };
        currentPos += 1;
        return updated;
      }
      return entry;
    });
  }

  /**
   * Customer joins the queue
   */
  public async joinQueue(params: {
    customerName: string;
    phone: string;
    email?: string;
    partySize: number;
    notes?: string;
  }): Promise<QueueEntry> {
    const today = new Date().toISOString().split('T')[0];

    // Compute next daily token number
    const todayTokens = this.queue
      .filter((q) => q.queue_date === today)
      .map((q) => parseInt(q.token_number, 10))
      .filter((n) => !isNaN(n));

    const highestToken = todayTokens.length > 0 ? Math.max(...todayTokens) : 500;
    const nextTokenNumber = (highestToken + 1).toString();

    const waitingCount = this.queue.filter((q) => q.status === 'WAITING').length;
    const nowIso = new Date().toISOString();

    const newEntry: QueueEntry = {
      id: 'q_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
      restaurant_id: this.restaurant.id,
      token_number: nextTokenNumber,
      queue_date: today,
      customer_name: params.customerName.trim(),
      phone: params.phone.trim(),
      email: params.email?.trim() || undefined,
      party_size: params.partySize,
      status: 'WAITING',
      position: waitingCount + 1,
      joined_at: nowIso,
      notes: params.notes,
    };

    this.queue.push(newEntry);
    this.recalculatePositions();
    this.saveToStorage();
    this.notify();

    // Check if an available table can immediately seat this party!
    this.evaluateAutomaticAllocation();

    return newEntry;
  }

  /**
   * Evaluates available tables and triggers allocation logic
   */
  public async evaluateAutomaticAllocation(): Promise<AllocationEvent | null> {
    const availableTables = this.tables.filter((t) => t.status === 'AVAILABLE');
    if (availableTables.length === 0) return null;

    let triggeredEvent: AllocationEvent | null = null;

    // Check each available table for best waiting candidate
    for (const table of availableTables) {
      const candidate = findBestCandidateForTable(table, this.queue);
      if (candidate) {
        triggeredEvent = await this.allocatePartyToTable(candidate.id, table.id, 'AUTO_ALLOCATED');
        // Break after one allocation per cycle to allow staggered announcements, or proceed
        break;
      }
    }

    return triggeredEvent;
  }

  /**
   * Allocates a specific party to a specific table (used by auto and manual allocation)
   */
  public async allocatePartyToTable(
    queueEntryId: string,
    tableId: string,
    eventType: 'AUTO_ALLOCATED' | 'MANUAL_ALLOCATED' = 'AUTO_ALLOCATED'
  ): Promise<AllocationEvent | null> {
    const tableIndex = this.tables.findIndex((t) => t.id === tableId);
    const queueIndex = this.queue.findIndex((q) => q.id === queueEntryId);

    if (tableIndex === -1 || queueIndex === -1) return null;

    const table = this.tables[tableIndex];
    const queueItem = this.queue[queueIndex];

    const nowIso = new Date().toISOString();

    // 1. Update Table
    this.tables[tableIndex] = {
      ...table,
      status: 'ALLOCATED',
      updated_at: nowIso,
    };

    // 2. Update Queue Entry
    this.queue[queueIndex] = {
      ...queueItem,
      status: 'ALLOCATED',
      assigned_table_id: table.id,
      allocated_at: nowIso,
      position: 0,
    };

    this.recalculatePositions();

    // 3. Create Allocation Event for TV & Audio
    const allocationEvent: AllocationEvent = {
      id: 'evt_' + Math.random().toString(36).substring(2, 9),
      restaurant_id: this.restaurant.id,
      queue_entry_id: queueItem.id,
      table_id: table.id,
      event_type: eventType,
      token_number: queueItem.token_number,
      table_number: table.table_number,
      party_size: queueItem.party_size,
      customer_name: queueItem.customer_name,
      created_at: nowIso,
    };

    // 4. Trigger WhatsApp Notification Service
    try {
      const { record } = await sendTableAllocationWhatsApp(
        {
          restaurantName: this.restaurant.name,
          customerName: queueItem.customer_name,
          phone: queueItem.phone,
          tokenNumber: queueItem.token_number,
          tableNumber: table.table_number,
          partySize: queueItem.party_size,
        },
        queueItem.id,
        this.restaurant.id
      );
      this.notifications.unshift(record);
    } catch (err) {
      console.error('Failed to trigger WhatsApp notification:', err);
    }

    // Save and notify all tabs
    this.saveToStorage(allocationEvent);
    this.notify(allocationEvent);

    return allocationEvent;
  }

  /**
   * Update Table State through lifecycle:
   * AVAILABLE -> ALLOCATED -> OCCUPIED -> CLEANING -> AVAILABLE
   */
  public async setTableStatus(tableId: string, newStatus: TableStatus) {
    const tableIndex = this.tables.findIndex((t) => t.id === tableId);
    if (tableIndex === -1) return;

    const table = this.tables[tableIndex];
    const oldStatus = table.status;
    const nowIso = new Date().toISOString();

    this.tables[tableIndex] = {
      ...table,
      status: newStatus,
      updated_at: nowIso,
    };

    // If changing from CLEANING (or anything) to AVAILABLE:
    // AUTOMATIC ALLOCATION RUNS!
    if (newStatus === 'AVAILABLE' && oldStatus !== 'AVAILABLE') {
      this.saveToStorage();
      this.notify();
      // Run allocation engine
      await this.evaluateAutomaticAllocation();
      return;
    }

    this.saveToStorage();
    this.notify();
  }

  /**
   * Waiter marks customer as seated
   */
  public seatCustomer(queueEntryId: string) {
    const queueIndex = this.queue.findIndex((q) => q.id === queueEntryId);
    if (queueIndex === -1) return;

    const entry = this.queue[queueIndex];
    const nowIso = new Date().toISOString();

    this.queue[queueIndex] = {
      ...entry,
      status: 'OCCUPIED',
      seated_at: nowIso,
    };

    if (entry.assigned_table_id) {
      const tableIndex = this.tables.findIndex((t) => t.id === entry.assigned_table_id);
      if (tableIndex !== -1) {
        this.tables[tableIndex] = {
          ...this.tables[tableIndex],
          status: 'OCCUPIED',
          updated_at: nowIso,
        };
      }
    }

    this.saveToStorage();
    this.notify();
  }

  /**
   * Waiter marks customer as completed (dining finished)
   */
  public completeCustomer(queueEntryId: string) {
    const queueIndex = this.queue.findIndex((q) => q.id === queueEntryId);
    if (queueIndex === -1) return;

    const entry = this.queue[queueIndex];
    const nowIso = new Date().toISOString();

    this.queue[queueIndex] = {
      ...entry,
      status: 'COMPLETED',
      completed_at: nowIso,
    };

    // Table enters CLEANING state
    if (entry.assigned_table_id) {
      const tableIndex = this.tables.findIndex((t) => t.id === entry.assigned_table_id);
      if (tableIndex !== -1) {
        this.tables[tableIndex] = {
          ...this.tables[tableIndex],
          status: 'CLEANING',
          updated_at: nowIso,
        };
      }
    }

    this.saveToStorage();
    this.notify();
  }

  /**
   * Cancel customer or mark as No-Show
   */
  public async cancelCustomer(queueEntryId: string, reason: 'CANCELLED' | 'NO_SHOW' = 'CANCELLED') {
    const queueIndex = this.queue.findIndex((q) => q.id === queueEntryId);
    if (queueIndex === -1) return;

    const entry = this.queue[queueIndex];
    const nowIso = new Date().toISOString();

    this.queue[queueIndex] = {
      ...entry,
      status: 'CANCELLED',
      cancelled_at: nowIso,
      notes: reason === 'NO_SHOW' ? 'Customer marked as No-Show' : entry.notes,
    };

    // If customer had an assigned table that wasn't yet occupied, release it back to AVAILABLE
    if (entry.assigned_table_id && entry.status === 'ALLOCATED') {
      const tableIndex = this.tables.findIndex((t) => t.id === entry.assigned_table_id);
      if (tableIndex !== -1) {
        this.tables[tableIndex] = {
          ...this.tables[tableIndex],
          status: 'AVAILABLE',
          updated_at: nowIso,
        };
      }
    }

    this.recalculatePositions();
    this.saveToStorage();
    this.notify();

    // Check if released table can be allocated to another waiting party
    await this.evaluateAutomaticAllocation();
  }

  /**
   * Release Table back to AVAILABLE
   */
  public async releaseTable(tableId: string) {
    await this.setTableStatus(tableId, 'AVAILABLE');
  }

  /**
   * Add a new staff reservation
   */
  public addReservation(data: Omit<Reservation, 'id' | 'created_at' | 'status'>) {
    const newRes: Reservation = {
      ...data,
      id: 'res_' + Math.random().toString(36).substring(2, 9),
      status: 'CONFIRMED',
      created_at: new Date().toISOString(),
    };
    this.reservations.unshift(newRes);
    this.saveToStorage();
    this.notify();
    return newRes;
  }

  /**
   * Update reservation status
   */
  public updateReservationStatus(id: string, status: Reservation['status']) {
    const idx = this.reservations.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.reservations[idx] = {
        ...this.reservations[idx],
        status,
      };
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * Reset database back to default demonstration dataset
   */
  public resetToDemoData() {
    this.restaurant = DEFAULT_RESTAURANT;
    this.tables = [...INITIAL_TABLES];
    this.queue = [...INITIAL_QUEUE];
    this.reservations = [...INITIAL_RESERVATIONS];
    this.notifications = [...INITIAL_NOTIFICATIONS];
    this.latestAllocationEvent = null;
    this.saveToStorage();
    this.notify();
  }

  /**
   * Clear queue for fresh live testing
   */
  public clearQueue() {
    this.queue = [];
    this.tables = this.tables.map((t) => ({ ...t, status: 'AVAILABLE' }));
    this.saveToStorage();
    this.notify();
  }
}

export const restaurantStore = new RestaurantStore();
