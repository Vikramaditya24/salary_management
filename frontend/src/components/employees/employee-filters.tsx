'use client';

import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { Department, FilterOptions, StatusFilter } from '@/lib/api/employees';
import { hasActiveFilters, type ListState } from '@/lib/employees/list-params';
import { formatDepartment } from '@/lib/format';

import { MultiSelectFilter } from './multi-select-filter';
import { SearchBox } from './search-box';

export interface FilterPatch {
  q?: string;
  countries?: string[];
  departments?: Department[];
  jobTitles?: string[];
  status?: StatusFilter;
}

interface EmployeeFiltersProps {
  state: ListState;
  /** undefined while loading or if the request failed - filters still work from the URL values. */
  options: FilterOptions | undefined;
  onChange: (patch: FilterPatch) => void;
  onSearch: (query: string) => void;
  onClear: () => void;
}

export function EmployeeFilters({
  state,
  options,
  onChange,
  onSearch,
  onClear,
}: EmployeeFiltersProps) {
  return (
    <div role="search" aria-label="Employee filters" className="flex flex-col gap-3">
      <SearchBox value={state.q} onSearch={onSearch} />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <MultiSelectFilter
          label="Country"
          options={(options?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
          selected={state.countries}
          onChange={(countries) => onChange({ countries })}
        />
        <MultiSelectFilter
          label="Department"
          options={(options?.departments ?? []).map((d) => ({
            value: d,
            label: formatDepartment(d),
          }))}
          selected={state.departments}
          onChange={(departments) => onChange({ departments: departments as Department[] })}
        />
        <MultiSelectFilter
          label="Job title"
          searchable
          options={(options?.jobTitles ?? []).map((title) => ({ value: title, label: title }))}
          selected={state.jobTitles}
          onChange={(jobTitles) => onChange({ jobTitles })}
        />
        <Select
          aria-label="Employment status"
          value={state.status}
          onChange={(event) => onChange({ status: event.target.value as StatusFilter })}
          className="sm:w-44"
        >
          <option value="ACTIVE">Active employees</option>
          <option value="TERMINATED">Terminated</option>
          <option value="ALL">All employees</option>
        </Select>
        {hasActiveFilters(state) && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
