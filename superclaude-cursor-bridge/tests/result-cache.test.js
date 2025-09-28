/**
 * ResultCache Unit Tests
 * TDD implementation following Kent Beck's methodology
 */

import ResultCache from '../src/result-cache.js';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('ResultCache', () => {
  let cache;

  beforeEach(() => {
    cache = new ResultCache({
      maxSize: 5,
      defaultTTL: 1000 // 1 second for fast testing
    });
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    cache.cleanup();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const defaultCache = new ResultCache();

      expect(defaultCache.maxSize).toBe(100);
      expect(defaultCache.defaultTTL).toBe(5 * 60 * 1000); // 5 minutes
      expect(defaultCache.cache.size).toBe(0);
    });

    it('should initialize with custom options', () => {
      expect(cache.maxSize).toBe(5);
      expect(cache.defaultTTL).toBe(1000);
    });

    it('should setup cleanup interval', () => {
      expect(cache.cleanupInterval).toBeDefined();
      expect(typeof cache.cleanupInterval).toBe('object');
    });
  });

  describe('Key Generation', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = cache._generateKey('research', ['test query']);
      const key2 = cache._generateKey('research', ['test query']);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should generate different keys for different inputs', () => {
      const key1 = cache._generateKey('research', ['query1']);
      const key2 = cache._generateKey('research', ['query2']);
      const key3 = cache._generateKey('analyze', ['query1']);

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    it('should normalize arguments consistently', () => {
      const args1 = [' test query ', { b: 2, a: 1 }];
      const args2 = ['test query', { a: 1, b: 2 }];

      const key1 = cache._generateKey('research', args1);
      const key2 = cache._generateKey('research', args2);

      expect(key1).toBe(key2);
    });
  });

  describe('set and get', () => {
    const successResult = {
      success: true,
      output: 'Test result',
      timestamp: '2023-01-01T00:00:00Z'
    };

    it('should cache and retrieve successful results', () => {
      const cached = cache.set('research', ['test query'], successResult);
      expect(cached).toBe(true);

      const retrieved = cache.get('research', ['test query']);
      expect(retrieved).toEqual({
        ...successResult,
        _cacheInfo: {
          cached: true,
          hitCount: 1,
          cachedAt: expect.any(Number),
          lastAccessed: expect.any(Number)
        }
      });
    });

    it('should return null for cache miss', () => {
      const retrieved = cache.get('research', ['non-existent query']);
      expect(retrieved).toBeNull();
    });

    it('should not cache failed results', () => {
      const failedResult = { success: false, error: 'Command failed' };
      const cached = cache.set('research', ['test query'], failedResult);

      expect(cached).toBe(false);
      expect(cache.get('research', ['test query'])).toBeNull();
    });

    it('should not cache results that are too large', () => {
      const largeResult = {
        success: true,
        output: 'x'.repeat(2 * 1024 * 1024) // 2MB of data
      };

      const cached = cache.set('research', ['test query'], largeResult);
      expect(cached).toBe(false);
    });

    it('should not cache non-cacheable commands', () => {
      const cached = cache.set('non-cacheable-command', ['test'], successResult);
      expect(cached).toBe(false);
    });

    it('should track hit counts', () => {
      cache.set('research', ['test query'], successResult);

      const first = cache.get('research', ['test query']);
      const second = cache.get('research', ['test query']);
      const third = cache.get('research', ['test query']);

      expect(first._cacheInfo.hitCount).toBe(1);
      expect(second._cacheInfo.hitCount).toBe(2);
      expect(third._cacheInfo.hitCount).toBe(3);
    });
  });

  describe('TTL (Time To Live)', () => {
    const successResult = { success: true, output: 'Test result' };

    it('should return null for expired entries', () => {
      cache.set('research', ['test query'], successResult);

      // Advance time beyond TTL
      jest.advanceTimersByTime(1500);

      // Manually trigger time advancement in entry
      const key = cache._generateKey('research', ['test query']);
      const entry = cache.cache.get(key);
      if (entry) {
        entry.expiresAt = 500; // Force expiration in the past
      }

      const retrieved = cache.get('research', ['test query']);
      expect(retrieved).toBeNull();
    });

    it('should use command-specific TTLs', () => {
      cache.set('explain', ['test'], successResult); // explain has 30min TTL

      // Advance time by 10 minutes (should still be valid)
      jest.advanceTimersByTime(10 * 60 * 1000);

      const retrieved = cache.get('explain', ['test']);
      expect(retrieved).not.toBeNull();
    });

    it('should use custom TTL when provided', () => {
      cache.set('research', ['test query'], successResult, 2000); // 2 second TTL

      // Advance time by 1.5 seconds (should still be valid)
      jest.advanceTimersByTime(1500);
      expect(cache.get('research', ['test query'])).not.toBeNull();

      // Advance time by another 1 second (should be expired)
      jest.advanceTimersByTime(1000);
      expect(cache.get('research', ['test query'])).toBeNull();
    });
  });

  describe('Cache Eviction', () => {
    const createResult = (id) => ({ success: true, output: `Result ${id}` });

    it('should evict entries when cache is full', () => {
      // Fill cache to maxSize (5)
      for (let i = 0; i < 5; i++) {
        cache.set('research', [`query${i}`], createResult(i));
      }

      expect(cache.cache.size).toBe(5);

      // Add one more (should trigger eviction)
      cache.set('research', ['query5'], createResult(5));

      expect(cache.cache.size).toBeLessThanOrEqual(5);
    });

    it('should prioritize frequently accessed entries during eviction', () => {
      // Fill cache
      for (let i = 0; i < 5; i++) {
        cache.set('research', [`query${i}`], createResult(i));
      }

      // Access some entries multiple times
      cache.get('research', ['query0']); // Hit count: 1
      cache.get('research', ['query0']); // Hit count: 2
      cache.get('research', ['query1']); // Hit count: 1

      // Add new entry to trigger eviction
      cache.set('research', ['query5'], createResult(5));

      // Frequently accessed entries should still exist
      expect(cache.get('research', ['query0'])).not.toBeNull();
    });

    it('should evict expired entries first', () => {
      // Add entries
      cache.set('research', ['query1'], createResult(1));
      cache.set('research', ['query2'], createResult(2));

      // Advance time to expire first entry
      jest.advanceTimersByTime(1500);

      // Add more entries to fill cache
      for (let i = 3; i < 8; i++) {
        cache.set('research', [`query${i}`], createResult(i));
      }

      // Expired entry should be gone
      expect(cache.get('research', ['query1'])).toBeNull();
      // Non-expired entry should remain
      expect(cache.get('research', [`query7`])).not.toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should remove expired entries during periodic cleanup', () => {
      const result = { success: true, output: 'Test result' };
      cache.set('research', ['query1'], result);
      cache.set('analyze', ['query2'], result); // 異なるコマンド名を使用

      expect(cache.cache.size).toBe(2);

      // Manually expire entries
      for (const [key, entry] of cache.cache.entries()) {
        entry.expiresAt = 500; // Set to past time
      }

      // Trigger cleanup manually
      cache._cleanup();

      expect(cache.cache.size).toBe(0);
    });

    it('should run automatic cleanup on interval', () => {
      const result = { success: true, output: 'Test result' };
      cache.set('research', ['query1'], result);

      // Manually expire entry
      for (const [key, entry] of cache.cache.entries()) {
        entry.expiresAt = 500; // Set to past time
      }

      // Advance time to trigger automatic cleanup (60 seconds)
      jest.advanceTimersByTime(60 * 1000);

      expect(cache.cache.size).toBe(0);
    });
  });

  describe('invalidate', () => {
    const result = { success: true, output: 'Test result' };

    beforeEach(() => {
      cache.set('research', ['query1'], result);
      cache.set('research', ['query2'], result);
      cache.set('analyze', ['query1'], result);
    });

    it('should invalidate specific command and arguments', () => {
      cache.invalidate('research', ['query1']);

      expect(cache.get('research', ['query1'])).toBeNull();
      expect(cache.get('research', ['query2'])).not.toBeNull();
      expect(cache.get('analyze', ['query1'])).not.toBeNull();
    });

    it('should invalidate all entries for a command', () => {
      cache.invalidate('research');

      expect(cache.get('research', ['query1'])).toBeNull();
      expect(cache.get('research', ['query2'])).toBeNull();
      expect(cache.get('analyze', ['query1'])).not.toBeNull();
    });
  });

  describe('getStats', () => {
    const result = { success: true, output: 'Test result' };

    beforeEach(() => {
      cache.set('research', ['query1'], result);
      cache.set('research', ['query2'], result);
      cache.set('analyze', ['query1'], result);

      // Generate some hits
      cache.get('research', ['query1']);
      cache.get('research', ['query1']);
      cache.get('analyze', ['query1']);
    });

    it('should return comprehensive cache statistics', () => {
      const stats = cache.getStats();

      expect(stats).toEqual({
        totalEntries: 3,
        maxSize: 5,
        totalHits: 3,
        totalSize: expect.any(Number),
        averageHitsPerEntry: '1.00',
        memoryUsage: expect.stringMatching(/^\d+\.\d{2} MB$/),
        commandBreakdown: {
          research: {
            count: 2,
            hits: 2,
            size: expect.any(Number)
          },
          analyze: {
            count: 1,
            hits: 1,
            size: expect.any(Number)
          }
        },
        oldestEntry: expect.any(Number),
        newestEntry: expect.any(Number)
      });
    });

    it('should return default stats for empty cache', () => {
      cache.clear();
      const stats = cache.getStats();

      expect(stats.totalEntries).toBe(0);
      expect(stats.totalHits).toBe(0);
      expect(stats.averageHitsPerEntry).toBe(0);
      expect(stats.oldestEntry).toBeNull();
      expect(stats.newestEntry).toBeNull();
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      const result = { success: true, output: 'Test result' };
      cache.set('research', ['query1'], result);
      cache.set('research', ['query2'], result);

      expect(cache.cache.size).toBe(2);

      cache.clear();

      expect(cache.cache.size).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should clear cache and stop cleanup interval', () => {
      const result = { success: true, output: 'Test result' };
      cache.set('research', ['query1'], result);

      expect(cache.cache.size).toBe(1);
      expect(cache.cleanupInterval).toBeDefined();

      cache.cleanup();

      expect(cache.cache.size).toBe(0);
      expect(cache.cleanupInterval).toBeNull();
    });
  });

  describe('Size Estimation', () => {
    it('should estimate result size correctly', () => {
      const smallResult = { success: true, output: 'small' };
      const largeResult = { success: true, output: 'x'.repeat(1000) };

      const smallSize = cache._estimateSize(smallResult);
      const largeSize = cache._estimateSize(largeResult);

      expect(largeSize).toBeGreaterThan(smallSize);
      expect(smallSize).toBeGreaterThan(0);
    });

    it('should handle size estimation errors gracefully', () => {
      const circularRef = {};
      circularRef.self = circularRef;

      const size = cache._estimateSize(circularRef);
      expect(size).toBe(1024); // Default fallback
    });
  });

  describe('Result Cloning', () => {
    it('should clone results safely', () => {
      const original = { success: true, data: { nested: 'value' } };
      const cloned = cache._cloneResult(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.data).not.toBe(original.data);
    });

    it('should handle cloning errors gracefully', () => {
      const circularRef = {};
      circularRef.self = circularRef;

      const cloned = cache._cloneResult(circularRef);
      expect(cloned).toEqual(circularRef);
    });
  });

  describe('Integration Tests', () => {
    it('should handle full cache lifecycle', () => {
      const result = { success: true, output: 'Test result' };

      // Cache result
      expect(cache.set('research', ['test query'], result)).toBe(true);

      // Retrieve result
      const retrieved = cache.get('research', ['test query']);
      expect(retrieved.success).toBe(true);
      expect(retrieved._cacheInfo.cached).toBe(true);

      // Check statistics
      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(1);
      expect(stats.totalHits).toBe(1);

      // Invalidate
      cache.invalidate('research', ['test query']);
      expect(cache.get('research', ['test query'])).toBeNull();

      // Verify empty
      expect(cache.getStats().totalEntries).toBe(0);
    });

    it('should handle concurrent operations correctly', () => {
      const result = { success: true, output: 'Test result' };

      // Add multiple entries quickly
      cache.set('research', ['query1'], result);
      cache.set('research', ['query2'], result);
      cache.set('analyze', ['query1'], result);

      // Access them in different orders
      cache.get('analyze', ['query1']);
      cache.get('research', ['query1']);
      cache.get('research', ['query2']);
      cache.get('research', ['query1']); // Access again

      // Verify all operations worked
      expect(cache.cache.size).toBe(3);

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(4);
      expect(stats.commandBreakdown.research.hits).toBe(3);
      expect(stats.commandBreakdown.analyze.hits).toBe(1);
    });
  });
});