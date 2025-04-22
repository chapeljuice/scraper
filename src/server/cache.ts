import { Results, ClientDataType } from '../types/types.ts';
import fs from 'fs';
import path from 'path';

interface CacheEntry {
  timestamp: number;
  data: Results[];
}

interface Cache {
  [key: string]: CacheEntry;
}

const CACHE_FILE = path.join(process.cwd(), 'cache.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class ScraperCache {
  private cache: Cache = {};

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const cacheData = fs.readFileSync(CACHE_FILE, 'utf-8');
        this.cache = JSON.parse(cacheData);
      }
    } catch (error) {
      console.error('Error loading cache:', error);
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  private generateCacheKey(client: ClientDataType): string {
    return `${client.id}-${client.listingsUrl}`;
  }

  public getCachedData(client: ClientDataType): Results[] | null {
    const key = this.generateCacheKey(client);
    const entry = this.cache[key];

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > CACHE_DURATION) {
      delete this.cache[key];
      this.saveCache();
      return null;
    }

    return entry.data;
  }

  public setCachedData(client: ClientDataType, data: Results[]): void {
    const key = this.generateCacheKey(client);
    this.cache[key] = {
      timestamp: Date.now(),
      data
    };
    this.saveCache();
  }

  public clearCache(): void {
    this.cache = {};
    this.saveCache();
  }

  public clearExpiredCache(): void {
    const now = Date.now();
    let hasChanges = false;

    for (const key in this.cache) {
      if (now - this.cache[key].timestamp > CACHE_DURATION) {
        delete this.cache[key];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.saveCache();
    }
  }
} 