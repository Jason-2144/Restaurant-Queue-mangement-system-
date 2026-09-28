/**
 * Table Allocation Service
 *
 * This service is deliberately isolated from UI components and database transport.
 * It encapsulates the allocation business logic and candidate selection rules.
 *
 * Current Prototype Strategy: "Best Fit" (Capacity Match with FIFO tie-breaker)
 * Rules:
 * 1. NEVER combine tables (party_size must be <= table.capacity).
 * 2. Candidates: Waiting parties whose party_size <= table.capacity.
 * 3. Best candidate: Party size closest to table capacity (minimizes wasted seats).
 * 4. Tie breaker: Earliest joined_at timestamp (FIFO fairness).
 */

import { QueueEntry, TableItem, TableAssignmentResult } from '../types/database';

export interface AllocationCandidate {
  entry: QueueEntry;
  capacityDelta: number; // capacity - party_size (0 = perfect tight fit)
  joinedAtTimestamp: number;
}

/**
 * Finds the single best waiting queue candidate for an available table.
 *
 * @param availableTable The table ready for allocation
 * @param waitingQueue All currently waiting queue entries
 * @returns The selected QueueEntry or null if no suitable party fits
 */
export function findBestCandidateForTable(
  availableTable: TableItem,
  waitingQueue: QueueEntry[]
): QueueEntry | null {
  // Guard against non-available tables or empty queue
  if (availableTable.status !== 'AVAILABLE' && (availableTable.status as string) !== 'AVAILABLE') {
    return null;
  }

  // Filter only active WAITING customers
  const activeWaiting = waitingQueue.filter((q) => q.status === 'WAITING');

  // Filter parties that strictly fit within the table capacity (NO TABLE COMBINING)
  const eligibleParties = activeWaiting.filter(
    (q) => q.party_size <= availableTable.capacity
  );

  if (eligibleParties.length === 0) {
    return null;
  }

  // Map into scored candidates
  const scoredCandidates: AllocationCandidate[] = eligibleParties.map((entry) => ({
    entry,
    capacityDelta: availableTable.capacity - entry.party_size, // 0 is best
    joinedAtTimestamp: new Date(entry.joined_at).getTime(),
  }));

  // Sort:
  // 1. capacityDelta ASC (tightest fit first: e.g. delta 0 beats delta 2)
  // 2. joinedAtTimestamp ASC (earlier arrival first)
  scoredCandidates.sort((a, b) => {
    if (a.capacityDelta !== b.capacityDelta) {
      return a.capacityDelta - b.capacityDelta;
    }
    return a.joinedAtTimestamp - b.joinedAtTimestamp;
  });

  return scoredCandidates[0]?.entry || null;
}

/**
 * Evaluates all currently available tables and calculates best-fit assignments
 * across the entire waiting queue.
 *
 * @param tables List of all tables (or just available tables)
 * @param queue List of all queue entries
 * @returns Array of assignment results
 */
export function planAutomaticAllocations(
  tables: TableItem[],
  queue: QueueEntry[]
): TableAssignmentResult[] {
  const availableTables = tables
    .filter((t) => t.status === 'AVAILABLE')
    // Prioritize smaller tables first to leave large tables for bigger groups,
    // or sort tables by capacity ascending
    .sort((a, b) => a.capacity - b.capacity);

  // Clone waiting queue to prevent assigning the same customer twice in one batch
  let remainingWaiting = queue
    .filter((q) => q.status === 'WAITING')
    .sort((a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime());

  const plannedAssignments: TableAssignmentResult[] = [];

  for (const table of availableTables) {
    const candidate = findBestCandidateForTable(table, remainingWaiting);
    if (candidate) {
      plannedAssignments.push({
        tableId: table.id,
        tableNumber: table.table_number,
        queueEntryId: candidate.id,
        tokenNumber: candidate.token_number,
        partySize: candidate.party_size,
        capacity: table.capacity,
        reason: `Matched party of ${candidate.party_size} to Table ${table.table_number} (capacity ${table.capacity}).`,
      });

      // Remove candidate from pool for subsequent tables in this evaluation pass
      remainingWaiting = remainingWaiting.filter((q) => q.id !== candidate.id);
    }
  }

  return plannedAssignments;
}
