import { get, set, del, keys, clear } from 'idb-keyval';

// Cache keys
const CACHE_KEYS = {
  TRANSACTIONS: 'neura_transactions',
  ACCOUNTS: 'neura_accounts',
  CATEGORIES: 'neura_categories',
  CREDIT_CARDS: 'neura_credit_cards',
  PENDING_MUTATIONS: 'neura_pending_mutations',
  LAST_SYNC: 'neura_last_sync',
} as const;

export interface PendingMutation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: 'transactions' | 'accounts' | 'categories' | 'credit_cards';
  data: Record<string, unknown>;
  createdAt: string;
}

// Generic cache operations
export async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    const data = await get(key);
    return data || null;
  } catch (error) {
    console.error(`Error getting cached data for ${key}:`, error);
    return null;
  }
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    await set(key, data);
  } catch (error) {
    console.error(`Error setting cached data for ${key}:`, error);
  }
}

export async function clearCachedData(key: string): Promise<void> {
  try {
    await del(key);
  } catch (error) {
    console.error(`Error clearing cached data for ${key}:`, error);
  }
}

// Transactions cache
export async function cacheTransactions(transactions: unknown[]): Promise<void> {
  await setCachedData(CACHE_KEYS.TRANSACTIONS, transactions);
}

export async function getCachedTransactions<T>(): Promise<T[] | null> {
  return getCachedData<T[]>(CACHE_KEYS.TRANSACTIONS);
}

// Accounts cache
export async function cacheAccounts(accounts: unknown[]): Promise<void> {
  await setCachedData(CACHE_KEYS.ACCOUNTS, accounts);
}

export async function getCachedAccounts<T>(): Promise<T[] | null> {
  return getCachedData<T[]>(CACHE_KEYS.ACCOUNTS);
}

// Categories cache
export async function cacheCategories(categories: unknown[]): Promise<void> {
  await setCachedData(CACHE_KEYS.CATEGORIES, categories);
}

export async function getCachedCategories<T>(): Promise<T[] | null> {
  return getCachedData<T[]>(CACHE_KEYS.CATEGORIES);
}

// Credit cards cache
export async function cacheCreditCards(cards: unknown[]): Promise<void> {
  await setCachedData(CACHE_KEYS.CREDIT_CARDS, cards);
}

export async function getCachedCreditCards<T>(): Promise<T[] | null> {
  return getCachedData<T[]>(CACHE_KEYS.CREDIT_CARDS);
}

// Pending mutations queue
export async function getPendingMutations(): Promise<PendingMutation[]> {
  const mutations = await getCachedData<PendingMutation[]>(CACHE_KEYS.PENDING_MUTATIONS);
  return mutations || [];
}

export async function addPendingMutation(mutation: Omit<PendingMutation, 'id' | 'createdAt'>): Promise<void> {
  const mutations = await getPendingMutations();
  const newMutation: PendingMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  mutations.push(newMutation);
  await setCachedData(CACHE_KEYS.PENDING_MUTATIONS, mutations);
}

export async function removePendingMutation(id: string): Promise<void> {
  const mutations = await getPendingMutations();
  const filtered = mutations.filter(m => m.id !== id);
  await setCachedData(CACHE_KEYS.PENDING_MUTATIONS, filtered);
}

export async function clearPendingMutations(): Promise<void> {
  await clearCachedData(CACHE_KEYS.PENDING_MUTATIONS);
}

// Last sync timestamp
export async function getLastSyncTime(): Promise<string | null> {
  return getCachedData<string>(CACHE_KEYS.LAST_SYNC);
}

export async function setLastSyncTime(): Promise<void> {
  await setCachedData(CACHE_KEYS.LAST_SYNC, new Date().toISOString());
}

// Clear all offline data
export async function clearAllOfflineData(): Promise<void> {
  try {
    await clear();
  } catch (error) {
    console.error('Error clearing all offline data:', error);
  }
}

// Get offline data summary
export async function getOfflineDataSummary(): Promise<{
  pendingMutations: number;
  lastSync: string | null;
  hasCachedData: boolean;
}> {
  const mutations = await getPendingMutations();
  const lastSync = await getLastSyncTime();
  const transactions = await getCachedTransactions();
  
  return {
    pendingMutations: mutations.length,
    lastSync,
    hasCachedData: !!transactions && transactions.length > 0,
  };
}
