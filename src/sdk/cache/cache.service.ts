import { CACHE_MANAGER, Inject, Injectable } from '@nestjs/common';
import { Cache, CachingConfig, WrapArgsType } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  wrap<T>(...args: WrapArgsType<T>[]): Promise<T> {
    return this.cache.wrap(...args);
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
