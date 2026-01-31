export function generateSessionName(startTime: string): string {
  const date = new Date(startTime);
  const hour = date.getHours();

  if (hour < 12) {
    return 'Morning Session';
  } else if (hour < 17) {
    return 'Afternoon Session';
  } else {
    return 'Evening Session';
  }
}
