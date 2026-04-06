/** Jim's default time preferences based on day-of-week */

export const COGNITO_CLIENT_ID = '4qv4b8pvtsqigsontd3vfmf6kf';
export const COGNITO_REGION = 'us-east-2';
export const COGNITO_USER_POOL_ID = 'us-east-2_IqPUw1L4C';
export const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

export const API_BASE = 'https://api.goose.pet/api/v1/client/bay-view-bark';

export const TAX_RATE = 0.079;
export const PHONE_NUMBER = '(414) 763-1304';

/** Check-in time defaults (based on start date day-of-week) */
export function defaultCheckInTime(dayOfWeek: number): string {
  // 0=Sun, 6=Sat
  return dayOfWeek === 0 || dayOfWeek === 6 ? '09:00' : '07:30';
}

/** Check-out time defaults (based on end date day-of-week + PM pickup) */
export function defaultCheckOutTime(
  dayOfWeek: number,
  pmPickup: boolean
): string {
  if (pmPickup) {
    return dayOfWeek === 0 || dayOfWeek === 6 ? '16:30' : '18:00';
  }
  return dayOfWeek === 0 || dayOfWeek === 6 ? '09:00' : '07:30';
}

/** Format 24h time string to display (e.g., "07:30" → "7:30am") */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (h === undefined || m === undefined) return time;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}
