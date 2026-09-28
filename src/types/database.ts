export type TableStatus = 'AVAILABLE' | 'ALLOCATED' | 'OCCUPIED' | 'CLEANING';

export type QueueStatus = 'WAITING' | 'ALLOCATED' | 'OCCUPIED' | 'COMPLETED' | 'CANCELLED';

export type ReservationStatus = 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW';

export type AllocationEventType = 'AUTO_ALLOCATED' | 'MANUAL_ALLOCATED' | 'REALLOCATED' | 'RELEASED';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  max_party_size: number;
  created_at: string;
  updated_at?: string;
}

export interface TableItem {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  section?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QueueEntry {
  id: string;
  restaurant_id: string;
  token_number: string;
  queue_date: string;
  customer_name: string;
  phone: string;
  email?: string;
  party_size: number;
  status: QueueStatus;
  position?: number;
  assigned_table_id?: string | null;
  joined_at: string;
  allocated_at?: string | null;
  seated_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  // Join helper
  assigned_table?: TableItem | null;
}

export interface Reservation {
  id: string;
  restaurant_id: string;
  customer_name: string;
  phone: string;
  email?: string;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  assigned_table_id?: string | null;
  status: ReservationStatus;
  special_requests?: string;
  created_at?: string;
  assigned_table?: TableItem | null;
}

export interface AllocationEvent {
  id: string;
  restaurant_id: string;
  queue_entry_id: string;
  table_id: string;
  event_type: AllocationEventType;
  token_number: string;
  table_number: string;
  party_size: number;
  customer_name?: string;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  restaurant_id: string;
  queue_entry_id: string;
  channel: 'WHATSAPP' | 'SMS';
  recipient: string;
  message: string;
  status: 'SENT' | 'FAILED';
  created_at: string;
}

export interface StaffMember {
  id: string;
  restaurant_id: string;
  name: string;
  email: string;
  role: 'HEAD_HOST' | 'WAITER' | 'MANAGER';
  created_at: string;
}

export interface TableAssignmentResult {
  tableId: string;
  tableNumber: string;
  queueEntryId: string;
  tokenNumber: string;
  partySize: number;
  capacity: number;
  reason: string;
}
