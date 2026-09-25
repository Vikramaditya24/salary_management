'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { SalaryAnalyticsFilters } from '@/lib/api/analytics';

interface SalaryFiltersProps {
  filters: SalaryAnalyticsFilters;
  /** Countries/departments available to filter by - derived from the unfiltered analytics response. */
  countryOptions: string[];
  departmentOptions: string[];
  onChange: (patch: Partial<SalaryAnalyticsFilters>) => void;
  onClear: () => void;
}

export function SalaryFilters({
  filters,
  countryOptions,
  departmentOptions,
  onChange,
  onClear,
}: SalaryFiltersProps) {
  const hasActiveFilters = Boolean(filters.country || filters.department);

  return (
    <div role="search" aria-label="Salary insights filters" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex flex-col gap-1">
          <Label htmlFor="salary-filter-country">Country</Label>
          <Select
            id="salary-filter-country"
            value={filters.country ?? ''}
            onChange={(event) => onChange({ country: event.target.value || undefined })}
            className="sm:w-48"
          >
            <option value="">All countries</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor="salary-filter-department">Department</Label>
          <Select
            id="salary-filter-department"
            value={filters.department ?? ''}
            onChange={(event) => onChange({ department: event.target.value || undefined })}
            className="sm:w-48"
          >
            <option value="">All departments</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </Select>
        </div>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
