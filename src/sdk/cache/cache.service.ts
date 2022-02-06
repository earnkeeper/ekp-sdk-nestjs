import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache, CachingConfig } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async wrap<T>(
    cacheKey: string,
    fn: () => Promise<T>,
    config?: CachingConfig,
  ): Promise<T> {
    const cached = await this.get<T>(cacheKey);

    if (cached === 'unknown') {
      return undefined;
    }

    if (cached === undefined || cached === null) {
      const result = await fn();

      if (result === undefined || result === null) {
        await this.set(cacheKey, 'unknown', config);
      } else {
        await this.set(cacheKey, result, config);
      }

      return result;
    } else {
      return cached;
    }
  }

  get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key);
  }

  set<T>(key: string, value: T, options?: CachingConfig): Promise<T> {
    return this.cache.set(key, value, options);
  }

  del(key: string): Promise<any> {
    return this.cache.del(key);
  }

  async reset(): Promise<void> {
    await this.cache.reset();
  }
}
