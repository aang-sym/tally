import type { WatchlistItem } from '@tally/types';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage (replace with real database later)
// This is organized to make it easy to swap with actual database implementations

export interface User {
  id: string;
  email: string;
  passwordHash: string; // In real implementation, hash the password
}

export interface WaitlistEntry {
  id: string;
  email: string;
  country?: string;
  createdAt: string;
}

// In-memory stores
const users = new Map<string, User>();
const watchlists = new Map<string, WatchlistItem[]>(); // userId -> WatchlistItem[]
const waitlist = new Map<string, WaitlistEntry>();

// User operations
export const userStore = {
  async findByEmail(email: string): Promise<User | null> {
    for (const user of users.values()) {
      if (user.email === email) return user;
    }
    return null;
  },

  async create(email: string, password: string): Promise<User> {
    const user: User = {
      id: uuidv4(),
      email,
      passwordHash: password, // In real app: await bcrypt.hash(password, 10)
    };
    users.set(user.id, user);
    return user;
  },

  async findById(id: string): Promise<User | null> {
    return users.get(id) || null;
  },
};

// Watchlist operations
export const watchlistStore = {
  async getByUserId(userId: string): Promise<WatchlistItem[]> {
    return watchlists.get(userId) || [];
  },

  async addItem(userId: string, item: Omit<WatchlistItem, 'id' | 'createdAt'>): Promise<WatchlistItem> {
    const watchlistItem: WatchlistItem = {
      ...item,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };

    const userWatchlist = watchlists.get(userId) || [];
    userWatchlist.push(watchlistItem);
    watchlists.set(userId, userWatchlist);

    return watchlistItem;
  },

  async updateItem(userId: string, itemId: string, updatedItem: WatchlistItem): Promise<boolean> {
    const userWatchlist = watchlists.get(userId) || [];
    const index = userWatchlist.findIndex(item => item.id === itemId);
    
    if (index === -1) return false;
    
    userWatchlist[index] = updatedItem;
    watchlists.set(userId, userWatchlist);
    return true;
  },

  async removeItem(userId: string, itemId: string): Promise<boolean> {
    const userWatchlist = watchlists.get(userId) || [];
    const index = userWatchlist.findIndex(item => item.id === itemId);
    
    if (index === -1) return false;
    
    userWatchlist.splice(index, 1);
    watchlists.set(userId, userWatchlist);
    return true;
  },
};

// Waitlist operations
export const waitlistStore = {
  async add(email: string, country?: string): Promise<WaitlistEntry> {
    const entry: WaitlistEntry = {
      id: uuidv4(),
      email,
      ...(country && { country }),
      createdAt: new Date().toISOString(),
    };
    waitlist.set(entry.id, entry);
    return entry;
  },

  async findByEmail(email: string): Promise<WaitlistEntry | null> {
    for (const entry of waitlist.values()) {
      if (entry.email === email) return entry;
    }
    return null;
  },
};