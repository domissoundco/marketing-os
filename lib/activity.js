// lib/activity.js — Daily check-in log, kept separate from the brand store.
// One Redis key holds a map of date -> array of completed item keys.

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ACTIVITY_KEY = 'activity:log';

// The three daily actions, grounded in the marketing philosophy.
export const DAILY_ITEMS = [
  { key: 'shipped', label: 'Shipped a post' },
  { key: 'waved',   label: 'Waved at people (engaged, commented, connected)' },
  { key: 'plan',    label: 'Moved a 90-day goal forward' },
];

function parseMaybe(data) {
  if (data == null) return null;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  return data;
}

export async function getActivityLog() {
  const data = await redis.get(ACTIVITY_KEY);
  return parseMaybe(data) || {};
}

// date = 'YYYY-MM-DD'; items = array of item keys done that day.
export async function setActivityForDate(date, items) {
  const log = await getActivityLog();
  const cleaned = Array.isArray(items) ? items.filter((k) => DAILY_ITEMS.some((d) => d.key === k)) : [];
  if (cleaned.length === 0) delete log[date];
  else log[date] = cleaned;
  await redis.set(ACTIVITY_KEY, log);
  return log;
}

// Overwrite the whole activity log (used by restore).
export async function setActivityLog(log) {
  await redis.set(ACTIVITY_KEY, log && typeof log === 'object' ? log : {});
}
