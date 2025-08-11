/**
 * Timezone utilities for proper Eastern Time handling
 */

/**
 * Get current Eastern Time date components
 */
export function getEasternTimeComponents() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(now);
  const components: Record<string, string> = {};
  
  parts.forEach(({ type, value }) => {
    if (type !== 'literal') {
      components[type] = value;
    }
  });

  return {
    year: parseInt(components.year),
    month: parseInt(components.month),
    day: parseInt(components.day),
    hour: parseInt(components.hour),
    minute: parseInt(components.minute)
  };
}

/**
 * Get Eastern Time business date in YYYYMMDD format
 */
export function getEasternBusinessDate(): number {
  const { year, month, day } = getEasternTimeComponents();
  return parseInt(
    `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
  );
}

/**
 * Create a Date object for Eastern Time "today at midnight"
 */
export function getEasternTodayStart(): Date {
  const { year, month, day } = getEasternTimeComponents();
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Format a date in Eastern Time
 */
export function formatEasternTime(date: Date = new Date()): string {
  return date.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  });
}