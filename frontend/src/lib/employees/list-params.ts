import {
  DEPARTMENTS,
  SORT_FIELDS,
  SORT_ORDERS,
  STATUS_FILTERS,
  type Department,
  type SortField,
  type SortOrder,
  type StatusFilter,
} from '@/lib/api/employees';

/**
 * The employee list's entire view state lives in the URL. This module is the single place that
 * turns URL params into a validated ListState and back - and the same state maps to the API
 * query, whose param names are identical.
 */
export const PAGE_SIZES = [25, 50, 100] as const;
export const MAX_PAGE = 10_000;
export const MAX_SEARCH_LENGTH = 100;
export const MAX_SEARCH_WORDS = 6;
const MAX_MULTI = 20;

export interface ListState {
  page: number;
  pageSize: number;
  q: string;
  countries: string[];
  departments: Department[];
  jobTitles: string[];
  status: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
}

export const DEFAULT_LIST_STATE: ListState = {
  page: 1,
  pageSize: 25,
  q: '',
  countries: [],
  departments: [],
  jobTitles: [],
  status: 'ACTIVE',
  sortBy: 'fullName',
  sortOrder: 'asc',
};

interface ParamSource {
  get(name: string): string | null;
  getAll(name: string): string[];
}

const unique = <T>(items: T[]): T[] => [...new Set(items)];

function oneOf<T extends string>(allowed: readonly T[], value: string | null): T | undefined {
  return allowed.find((candidate) => candidate === value);
}

function commaList(source: ParamSource, name: string): string[] {
  return source
    .getAll(name)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Tolerant parse: anything invalid falls back to the default rather than producing an API 400. */
export function parseListState(params: ParamSource): ListState {
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));
  const q = (params.get('q') ?? '')
    .trim()
    .slice(0, MAX_SEARCH_LENGTH)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_SEARCH_WORDS)
    .join(' ');

  return {
    page:
      Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : DEFAULT_LIST_STATE.page,
    pageSize: PAGE_SIZES.find((size) => size === pageSize) ?? DEFAULT_LIST_STATE.pageSize,
    q,
    countries: unique(
      commaList(params, 'country')
        .map((code) => code.toUpperCase())
        .filter((code) => /^[A-Z]{2}$/.test(code)),
    ).slice(0, MAX_MULTI),
    departments: unique(
      commaList(params, 'department').flatMap((value) => oneOf(DEPARTMENTS, value) ?? []),
    ),
    // Job titles may legitimately contain commas, so they are never comma-split.
    jobTitles: unique(
      params
        .getAll('jobTitle')
        .map((title) => title.trim())
        .filter((title) => title !== '' && title.length <= 80),
    ).slice(0, MAX_MULTI),
    status: oneOf(STATUS_FILTERS, params.get('status')) ?? DEFAULT_LIST_STATE.status,
    sortBy: oneOf(SORT_FIELDS, params.get('sortBy')) ?? DEFAULT_LIST_STATE.sortBy,
    sortOrder: oneOf(SORT_ORDERS, params.get('sortOrder')) ?? DEFAULT_LIST_STATE.sortOrder,
  };
}

function serialize(state: ListState, includeDefaults: boolean): string {
  const params = new URLSearchParams();
  const d = DEFAULT_LIST_STATE;

  if (state.q) params.set('q', state.q);
  state.countries.forEach((code) => params.append('country', code));
  state.departments.forEach((department) => params.append('department', department));
  state.jobTitles.forEach((title) => params.append('jobTitle', title));
  if (includeDefaults || state.status !== d.status) params.set('status', state.status);
  if (includeDefaults || state.sortBy !== d.sortBy) params.set('sortBy', state.sortBy);
  if (includeDefaults || state.sortOrder !== d.sortOrder) params.set('sortOrder', state.sortOrder);
  if (includeDefaults || state.page !== d.page) params.set('page', String(state.page));
  if (includeDefaults || state.pageSize !== d.pageSize) {
    params.set('pageSize', String(state.pageSize));
  }
  return params.toString();
}

/** Query string for GET /employees: fully explicit, so the request never depends on server defaults. */
export function toApiQuery(state: ListState): string {
  return serialize(state, true);
}

/** Query string for the browser URL: defaults omitted so the plain list is just `/employees`. */
export function toUrlQuery(state: ListState): string {
  return serialize(state, false);
}

export function hasActiveFilters(state: ListState): boolean {
  return (
    state.q !== '' ||
    state.countries.length > 0 ||
    state.departments.length > 0 ||
    state.jobTitles.length > 0 ||
    state.status !== DEFAULT_LIST_STATE.status
  );
}

/** Same filters, sort and page size, back to the first page - used when clearing filters. */
export function clearFilters(state: ListState): ListState {
  return {
    ...DEFAULT_LIST_STATE,
    pageSize: state.pageSize,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
  };
}
