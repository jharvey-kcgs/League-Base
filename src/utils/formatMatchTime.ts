/** "Sat Jul 25 - 3:00 PM" — upcoming/live matches, where both the date and
 * kickoff time matter. Built from separate weekday/month-day/time parts
 * rather than one Intl call, since locale-default punctuation (commas
 * between weekday and date) isn't consistent enough to rely on. */
export function formatMatchDateTime(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${weekday} ${monthDay} - ${time}`;
}

/** "Fri Jul 24" — completed matches, paired with a W/L result where the
 * exact kickoff time matters less than which day it happened. */
export function formatMatchDate(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  const monthDay = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${weekday} ${monthDay}`;
}
