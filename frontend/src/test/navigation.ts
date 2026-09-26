import { vi } from 'vitest';

/**
 * Stand-in for `next/navigation` in component tests. Use with:
 *   vi.mock('next/navigation', async () => (await import('@/test/navigation')).navigationModule);
 * then call setSearch('page=2') to choose the URL the component sees.
 */
export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};

let currentSearch = '';
let currentPath = '/employees';
export function setPathname(path: string) {
  currentPath = path;
}
let cached: { search: string; params: URLSearchParams } | null = null;

export function setSearch(search: string) {
  currentSearch = search;
}

export function resetNavigation() {
  Object.values(router).forEach((fn) => fn.mockReset());
  currentSearch = '';
  currentPath = '/employees';
  cached = null;
}

export const navigationModule = {
  useRouter: () => router,
  usePathname: () => currentPath,
  // Like Next, return a stable object until the URL changes.
  useSearchParams: () => {
    if (!cached || cached.search !== currentSearch) {
      cached = { search: currentSearch, params: new URLSearchParams(currentSearch) };
    }
    return cached.params;
  },
  redirect: vi.fn(),
  notFound: vi.fn(),
};
