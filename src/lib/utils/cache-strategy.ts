import { unstable_cache } from 'next/cache';

export function createCachedFunction<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyParts: string[],
  options?: {
    revalidate?: number;
    tags?: string[];
  }
): T {
  return unstable_cache(fn, keyParts, options);
}