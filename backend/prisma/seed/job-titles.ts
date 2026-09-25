/**
 * Mirrors the `Department` enum in schema.prisma. Defined locally (rather
 * than imported from the generated Prisma client) so this module — and
 * everything that depends on it in generate-employees.ts — has no
 * dependency on `prisma generate` having been run, and can be unit tested
 * in complete isolation from the database.
 */
export type Department =
  | 'ENGINEERING'
  | 'PRODUCT'
  | 'DESIGN'
  | 'SALES'
  | 'MARKETING'
  | 'FINANCE'
  | 'HUMAN_RESOURCES'
  | 'OPERATIONS'
  | 'CUSTOMER_SUPPORT'
  | 'LEGAL';

/**
 * A six-rung seniority ladder shared by every department. `baseUsdAnnual` is
 * the illustrative US-baseline annual salary for that rung before the
 * per-department and per-country adjustments in the generator are applied.
 */
export interface SeniorityLevel {
  code: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD' | 'MANAGER' | 'DIRECTOR';
  baseUsdAnnual: number;
}

export const SENIORITY_LEVELS: readonly SeniorityLevel[] = [
  { code: 'JUNIOR', baseUsdAnnual: 65_000 },
  { code: 'MID', baseUsdAnnual: 85_000 },
  { code: 'SENIOR', baseUsdAnnual: 115_000 },
  { code: 'LEAD', baseUsdAnnual: 145_000 },
  { code: 'MANAGER', baseUsdAnnual: 155_000 },
  { code: 'DIRECTOR', baseUsdAnnual: 195_000 },
];

/**
 * Job titles per department, indexed to line up with SENIORITY_LEVELS
 * (titles[i] is that department's title for SENIORITY_LEVELS[i]).
 */
export const JOB_TITLES_BY_DEPARTMENT: Record<Department, readonly string[]> = {
  ENGINEERING: [
    'Software Engineer I',
    'Software Engineer II',
    'Senior Software Engineer',
    'Staff Engineer',
    'Engineering Manager',
    'Director of Engineering',
  ],
  PRODUCT: [
    'Associate Product Manager',
    'Product Manager',
    'Senior Product Manager',
    'Principal Product Manager',
    'Group Product Manager',
    'Director of Product',
  ],
  DESIGN: [
    'Junior Product Designer',
    'Product Designer',
    'Senior Product Designer',
    'Lead Product Designer',
    'Design Manager',
    'Director of Design',
  ],
  SALES: [
    'Sales Development Representative',
    'Account Executive',
    'Senior Account Executive',
    'Enterprise Account Executive',
    'Sales Manager',
    'Director of Sales',
  ],
  MARKETING: [
    'Marketing Associate',
    'Marketing Specialist',
    'Senior Marketing Specialist',
    'Marketing Lead',
    'Marketing Manager',
    'Director of Marketing',
  ],
  FINANCE: [
    'Financial Analyst I',
    'Financial Analyst II',
    'Senior Financial Analyst',
    'Finance Lead',
    'Finance Manager',
    'Director of Finance',
  ],
  HUMAN_RESOURCES: [
    'HR Coordinator',
    'HR Generalist',
    'Senior HR Generalist',
    'HR Business Partner',
    'HR Manager',
    'Director of HR',
  ],
  OPERATIONS: [
    'Operations Associate',
    'Operations Analyst',
    'Senior Operations Analyst',
    'Operations Lead',
    'Operations Manager',
    'Director of Operations',
  ],
  CUSTOMER_SUPPORT: [
    'Support Associate',
    'Support Specialist',
    'Senior Support Specialist',
    'Support Team Lead',
    'Support Manager',
    'Director of Customer Support',
  ],
  LEGAL: [
    'Legal Associate',
    'Corporate Counsel',
    'Senior Counsel',
    'Lead Counsel',
    'Legal Manager',
    'General Counsel',
  ],
};

/** Relative department pay scale, basis points (10000 = 1.00x). */
export const DEPARTMENT_PAY_SCALE_BASIS_POINTS: Record<Department, number> = {
  ENGINEERING: 11500,
  PRODUCT: 11000,
  DESIGN: 9500,
  SALES: 9000,
  MARKETING: 9200,
  FINANCE: 10500,
  HUMAN_RESOURCES: 9000,
  OPERATIONS: 8800,
  CUSTOMER_SUPPORT: 7500,
  LEGAL: 12000,
};

export const DEPARTMENTS: readonly Department[] = [
  'ENGINEERING',
  'PRODUCT',
  'DESIGN',
  'SALES',
  'MARKETING',
  'FINANCE',
  'HUMAN_RESOURCES',
  'OPERATIONS',
  'CUSTOMER_SUPPORT',
  'LEGAL',
];
