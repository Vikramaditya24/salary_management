/** "HUMAN_RESOURCES" -> "Human Resources". */
export function formatDepartment(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' });

/** Formats a calendar date ("2021-03-05") without shifting it by the viewer's time zone. */
export function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return dateFormatter.format(date);
}

/** Formats an exact decimal string ("128450.00") as money, without a float round-trip on the wire. */
export function formatMoney(amount: string, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(
      amount as `${number}`,
    );
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
