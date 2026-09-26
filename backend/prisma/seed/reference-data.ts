/**
 * Static reference data for countries and currencies.
 *
 * `exchangeRateToUsd` and `payScaleBasisPoints` are illustrative, hand-set
 * constants for generating plausible-looking synthetic salaries and for the
 * static cross-country conversion table called for in docs/decisions.md #8
 * — not a live feed, and not sourced from any particular date's real rates.
 *
 * `payScaleBasisPoints` (10000 = 1.00x, relative to the US) is a synthetic
 * "local pay level" factor used only by the generator, to make salaries
 * vary sensibly by country instead of every country earning identical USD
 * figures. `headcountWeight` controls what share of the 10,000 employees
 * land in that country (bigger economies get more employees).
 */

export interface CurrencyDefinition {
  code: string;
  name: string;
  minorUnit: number;
  exchangeRateToUsd: number;
}

export interface CountryDefinition {
  code: string;
  name: string;
  defaultCurrencyCode: string;
  payScaleBasisPoints: number;
  headcountWeight: number;
}

export const CURRENCIES: readonly CurrencyDefinition[] = [
  { code: 'USD', name: 'US Dollar', minorUnit: 2, exchangeRateToUsd: 1.0 },
  { code: 'GBP', name: 'British Pound', minorUnit: 2, exchangeRateToUsd: 1.27 },
  { code: 'EUR', name: 'Euro', minorUnit: 2, exchangeRateToUsd: 1.08 },
  { code: 'SEK', name: 'Swedish Krona', minorUnit: 2, exchangeRateToUsd: 0.095 },
  { code: 'PLN', name: 'Polish Zloty', minorUnit: 2, exchangeRateToUsd: 0.25 },
  { code: 'CHF', name: 'Swiss Franc', minorUnit: 2, exchangeRateToUsd: 1.13 },
  { code: 'INR', name: 'Indian Rupee', minorUnit: 2, exchangeRateToUsd: 0.012 },
  { code: 'JPY', name: 'Japanese Yen', minorUnit: 0, exchangeRateToUsd: 0.0067 },
  { code: 'SGD', name: 'Singapore Dollar', minorUnit: 2, exchangeRateToUsd: 0.74 },
  { code: 'AUD', name: 'Australian Dollar', minorUnit: 2, exchangeRateToUsd: 0.65 },
  { code: 'CAD', name: 'Canadian Dollar', minorUnit: 2, exchangeRateToUsd: 0.73 },
  { code: 'BRL', name: 'Brazilian Real', minorUnit: 2, exchangeRateToUsd: 0.2 },
  { code: 'MXN', name: 'Mexican Peso', minorUnit: 2, exchangeRateToUsd: 0.058 },
  { code: 'ZAR', name: 'South African Rand', minorUnit: 2, exchangeRateToUsd: 0.055 },
  { code: 'AED', name: 'UAE Dirham', minorUnit: 2, exchangeRateToUsd: 0.27 },
];

export const COUNTRIES: readonly CountryDefinition[] = [
  {
    code: 'US',
    name: 'United States',
    defaultCurrencyCode: 'USD',
    payScaleBasisPoints: 10000,
    headcountWeight: 22,
  },
  {
    code: 'IN',
    name: 'India',
    defaultCurrencyCode: 'INR',
    payScaleBasisPoints: 3200,
    headcountWeight: 18,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    defaultCurrencyCode: 'GBP',
    payScaleBasisPoints: 9200,
    headcountWeight: 10,
  },
  {
    code: 'DE',
    name: 'Germany',
    defaultCurrencyCode: 'EUR',
    payScaleBasisPoints: 9000,
    headcountWeight: 8,
  },
  {
    code: 'CA',
    name: 'Canada',
    defaultCurrencyCode: 'CAD',
    payScaleBasisPoints: 9000,
    headcountWeight: 5,
  },
  {
    code: 'FR',
    name: 'France',
    defaultCurrencyCode: 'EUR',
    payScaleBasisPoints: 8700,
    headcountWeight: 5,
  },
  {
    code: 'AU',
    name: 'Australia',
    defaultCurrencyCode: 'AUD',
    payScaleBasisPoints: 9600,
    headcountWeight: 4,
  },
  {
    code: 'BR',
    name: 'Brazil',
    defaultCurrencyCode: 'BRL',
    payScaleBasisPoints: 4200,
    headcountWeight: 4,
  },
  {
    code: 'NL',
    name: 'Netherlands',
    defaultCurrencyCode: 'EUR',
    payScaleBasisPoints: 9300,
    headcountWeight: 3,
  },
  {
    code: 'SG',
    name: 'Singapore',
    defaultCurrencyCode: 'SGD',
    payScaleBasisPoints: 9800,
    headcountWeight: 3,
  },
  {
    code: 'JP',
    name: 'Japan',
    defaultCurrencyCode: 'JPY',
    payScaleBasisPoints: 7800,
    headcountWeight: 3,
  },
  {
    code: 'MX',
    name: 'Mexico',
    defaultCurrencyCode: 'MXN',
    payScaleBasisPoints: 3800,
    headcountWeight: 3,
  },
  {
    code: 'ES',
    name: 'Spain',
    defaultCurrencyCode: 'EUR',
    payScaleBasisPoints: 7200,
    headcountWeight: 2,
  },
  {
    code: 'IT',
    name: 'Italy',
    defaultCurrencyCode: 'EUR',
    payScaleBasisPoints: 7500,
    headcountWeight: 2,
  },
  {
    code: 'IE',
    name: 'Ireland',
    defaultCurrencyCode: 'EUR',
    payScaleBasisPoints: 9500,
    headcountWeight: 2,
  },
  {
    code: 'SE',
    name: 'Sweden',
    defaultCurrencyCode: 'SEK',
    payScaleBasisPoints: 8800,
    headcountWeight: 2,
  },
  {
    code: 'CH',
    name: 'Switzerland',
    defaultCurrencyCode: 'CHF',
    payScaleBasisPoints: 12000,
    headcountWeight: 2,
  },
  {
    code: 'PL',
    name: 'Poland',
    defaultCurrencyCode: 'PLN',
    payScaleBasisPoints: 5200,
    headcountWeight: 2,
  },
  {
    code: 'ZA',
    name: 'South Africa',
    defaultCurrencyCode: 'ZAR',
    payScaleBasisPoints: 3600,
    headcountWeight: 1,
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    defaultCurrencyCode: 'AED',
    payScaleBasisPoints: 8200,
    headcountWeight: 1,
  },
];

export function currencyByCode(code: string): CurrencyDefinition {
  const currency = CURRENCIES.find((c) => c.code === code);
  if (!currency) throw new Error(`Unknown currency code: ${code}`);
  return currency;
}
