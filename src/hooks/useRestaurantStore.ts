import { useEffect, useState, useCallback } from 'react';
import { restaurantStore } from '../services/store';
import { TableStatus } from '../types/database';

export function useRestaurantStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = restaurantStore.subscribe(() => {
      setTick((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  const restaurant = restaurantStore.getRestaurant();
  const tables = restaurantStore.getTables();
  const queue = restaurantStore.getQueue();
  const reservations = restaurantStore.getReservations();
  const notifications = restaurantStore.getNotifications();
  const latestAllocationEvent = restaurantStore.getLatestAllocationEvent();
  const supabaseConfig = restaurantStore.getSupabaseConfig();

  // Helper selectors
  const waitingQueue = queue
    .filter((q) => q.status === 'WAITING')
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

  const allocatedQueue = queue
    .filter((q) => q.status === 'ALLOCATED')
    .sort((a, b) => new Date(b.allocated_at || 0).getTime() - new Date(a.allocated_at || 0).getTime());

  const occupiedQueue = queue.filter((q) => q.status === 'OCCUPIED');

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE');
  const allocatedTables = tables.filter((t) => t.status === 'ALLOCATED');
  const occupiedTables = tables.filter((t) => t.status === 'OCCUPIED');
  const cleaningTables = tables.filter((t) => t.status === 'CLEANING');

  // Actions
  const joinQueue = useCallback((params: Parameters<typeof restaurantStore.joinQueue>[0]) => {
    return restaurantStore.joinQueue(params);
  }, []);

  const setTableStatus = useCallback((tableId: string, status: TableStatus) => {
    return restaurantStore.setTableStatus(tableId, status);
  }, []);

  const allocatePartyToTable = useCallback(
    (queueEntryId: string, tableId: string, eventType?: 'AUTO_ALLOCATED' | 'MANUAL_ALLOCATED') => {
      return restaurantStore.allocatePartyToTable(queueEntryId, tableId, eventType);
    },
    []
  );

  const seatCustomer = useCallback((queueEntryId: string) => {
    restaurantStore.seatCustomer(queueEntryId);
  }, []);

  const completeCustomer = useCallback((queueEntryId: string) => {
    restaurantStore.completeCustomer(queueEntryId);
  }, []);

  const cancelCustomer = useCallback((queueEntryId: string, reason?: 'CANCELLED' | 'NO_SHOW') => {
    return restaurantStore.cancelCustomer(queueEntryId, reason);
  }, []);

  const releaseTable = useCallback((tableId: string) => {
    return restaurantStore.releaseTable(tableId);
  }, []);

  const addReservation = useCallback((data: Parameters<typeof restaurantStore.addReservation>[0]) => {
    return restaurantStore.addReservation(data);
  }, []);

  const updateReservationStatus = useCallback(
    (id: string, status: Parameters<typeof restaurantStore.updateReservationStatus>[1]) => {
      restaurantStore.updateReservationStatus(id, status);
    },
    []
  );

  const resetToDemoData = useCallback(() => {
    restaurantStore.resetToDemoData();
  }, []);

  const clearQueue = useCallback(() => {
    restaurantStore.clearQueue();
  }, []);

  const clearLatestAllocationEvent = useCallback(() => {
    restaurantStore.clearLatestAllocationEvent();
  }, []);

  const setSupabaseConfig = useCallback((url: string, anonKey: string) => {
    restaurantStore.setSupabaseConfig(url, anonKey);
  }, []);

  const customQrUrl = restaurantStore.getCustomQrUrl();
  const setCustomQrUrl = useCallback((url: string) => {
    restaurantStore.setCustomQrUrl(url);
  }, []);

  return {
    restaurant,
    tables,
    queue,
    reservations,
    notifications,
    latestAllocationEvent,
    supabaseConfig,
    customQrUrl,
    setCustomQrUrl,

    // Slices
    waitingQueue,
    allocatedQueue,
    occupiedQueue,
    availableTables,
    allocatedTables,
    occupiedTables,
    cleaningTables,

    // Actions
    joinQueue,
    setTableStatus,
    allocatePartyToTable,
    seatCustomer,
    completeCustomer,
    cancelCustomer,
    releaseTable,
    addReservation,
    updateReservationStatus,
    resetToDemoData,
    clearQueue,
    clearLatestAllocationEvent,
    setSupabaseConfig,
  };
}
