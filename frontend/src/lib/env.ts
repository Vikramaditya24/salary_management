// NEXT_PUBLIC_ vars are inlined at build time and safe to expose to the
// browser — this is the only env var the frontend needs for now: where the
// backend API lives.
export const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '')
).replace(/\/$/, '');
