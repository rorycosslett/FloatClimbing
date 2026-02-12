import { Climb, ClimbType } from '../types';
import { grades } from '../data/grades';
import { getGradeGradientColors } from './gradeColors';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Format a date as a short label (e.g., "Jan 5")
 */
function formatWeekLabel(date: Date): string {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

export interface WeeklyActivityDataPoint {
  label: string;
  sends: number;
  attempts: number;
  weekStart: Date;
}

/**
 * Aggregate climbs by week for the last N weeks
 */
export function getWeeklyActivityData(
  climbs: Climb[],
  type: ClimbType,
  weeks: number = 12
): WeeklyActivityDataPoint[] {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const typeClimbs = climbs.filter((c) => c.type === type);

  const weekData: WeeklyActivityDataPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart.getTime() - i * ONE_WEEK_MS);
    const weekEnd = new Date(weekStart.getTime() + ONE_WEEK_MS);

    const weekClimbs = typeClimbs.filter((c) => {
      const d = new Date(c.timestamp);
      return d >= weekStart && d < weekEnd;
    });

    weekData.push({
      label: formatWeekLabel(weekStart),
      sends: weekClimbs.filter((c) => c.status === 'send').length,
      attempts: weekClimbs.filter((c) => c.status === 'attempt').length,
      weekStart,
    });
  }

  return weekData;
}

export interface GradeProgressionDataPoint {
  label: string;
  gradeIndex: number;
  grade: string;
  weekStart: Date;
}

/**
 * Get the highest grade sent per week for the last N weeks
 */
export function getGradeProgressionData(
  climbs: Climb[],
  type: ClimbType,
  weeks: number = 12
): GradeProgressionDataPoint[] {
  const now = new Date();
  const currentWeekStart = getWeekStart(now);
  const typeClimbs = climbs.filter((c) => c.type === type && c.status === 'send');
  const gradeArray = grades[type];

  const progressionData: GradeProgressionDataPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(currentWeekStart.getTime() - i * ONE_WEEK_MS);
    const weekEnd = new Date(weekStart.getTime() + ONE_WEEK_MS);

    const weekClimbs = typeClimbs.filter((c) => {
      const d = new Date(c.timestamp);
      return d >= weekStart && d < weekEnd;
    });

    let maxGradeIndex = -1;
    weekClimbs.forEach((c) => {
      const idx = gradeArray.indexOf(c.grade);
      if (idx > maxGradeIndex) maxGradeIndex = idx;
    });

    if (maxGradeIndex >= 0) {
      progressionData.push({
        label: formatWeekLabel(weekStart),
        gradeIndex: maxGradeIndex,
        grade: gradeArray[maxGradeIndex],
        weekStart,
      });
    }
  }

  return progressionData;
}

export interface GradeDistributionDataPoint {
  label: string;
  sends: number;
  attempts: number;
  total: number;
  gradientColors: [string, string];
}

/**
 * Get grade distribution data with sends and attempts counted separately
 */
export function getGradeDistributionData(
  climbs: Climb[],
  type: ClimbType,
  _colors: string[] // kept for API compatibility
): GradeDistributionDataPoint[] {
  const typeClimbs = climbs.filter((c) => c.type === type);
  const gradeArray = grades[type];

  if (typeClimbs.length === 0) {
    return [];
  }

  // Count sends and attempts per grade
  const gradeSends = new Map<string, number>();
  const gradeAttempts = new Map<string, number>();
  typeClimbs.forEach((c) => {
    if (c.status === 'send') {
      gradeSends.set(c.grade, (gradeSends.get(c.grade) || 0) + 1);
    } else {
      gradeAttempts.set(c.grade, (gradeAttempts.get(c.grade) || 0) + 1);
    }
  });

  // Create distribution for each grade that has climbs
  const distribution: GradeDistributionDataPoint[] = [];
  gradeArray.forEach((grade) => {
    const sends = gradeSends.get(grade) || 0;
    const attempts = gradeAttempts.get(grade) || 0;
    const total = sends + attempts;
    if (total > 0) {
      // Get gradient colors for this grade
      const gradientColors = getGradeGradientColors(grade, type, {
        boulderSystem: 'vscale',
        routeSystem: 'yds',
      });
      distribution.push({
        label: grade,
        sends,
        attempts,
        total,
        gradientColors,
      });
    }
  });

  return distribution;
}

/**
 * Get a grade label for Y-axis display (simplified)
 */
export function getGradeLabel(type: ClimbType, gradeIndex: number): string {
  const gradeArray = grades[type];
  if (gradeIndex < 0 || gradeIndex >= gradeArray.length) {
    return '';
  }
  return gradeArray[gradeIndex];
}

export interface CalendarDayData {
  date: Date;
  dateKey: string;
  totalCount: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface SessionCalendarData {
  days: CalendarDayData[];
  weeks: CalendarDayData[][];
  activeDays: number;
  monthLabels: { label: string; weekIndex: number }[];
}

/**
 * Get calendar data for session activity visualization
 */
export function getSessionCalendarData(
  climbs: Climb[],
  type: ClimbType,
  months: number = 6
): SessionCalendarData {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Filter climbs by type
  const typeClimbs = climbs.filter((c) => c.type === type);

  // Find the Monday of the current week
  const currentWeekStart = getWeekStart(today);

  // Calculate start date (beginning of week, N months ago)
  const startDate = new Date(currentWeekStart);
  startDate.setMonth(startDate.getMonth() - months);
  const calendarStart = getWeekStart(startDate);

  // Build a map of date -> climb count
  const climbsByDate = new Map<string, number>();

  typeClimbs.forEach((climb) => {
    const d = new Date(climb.timestamp);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    climbsByDate.set(dateKey, (climbsByDate.get(dateKey) || 0) + 1);
  });

  // Calculate intensity thresholds based on active days
  const counts = Array.from(climbsByDate.values()).sort((a, b) => a - b);
  const getIntensity = (count: number): 0 | 1 | 2 | 3 | 4 => {
    if (count === 0) return 0;
    if (counts.length === 0) return 1;
    const maxCount = counts[counts.length - 1];
    if (maxCount <= 1) return count > 0 ? 4 : 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  };

  // Generate all days from calendarStart to today
  const days: CalendarDayData[] = [];
  const currentDate = new Date(calendarStart);

  while (currentDate <= today) {
    const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const totalCount = climbsByDate.get(dateKey) || 0;

    days.push({
      date: new Date(currentDate),
      dateKey,
      totalCount,
      intensity: getIntensity(totalCount),
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group days into weeks (each week is Mon-Sun)
  const weeks: CalendarDayData[][] = [];
  let currentWeek: CalendarDayData[] = [];

  // Pad the first week if it doesn't start on Monday
  const firstDayOfWeek = days[0]?.date.getDay() || 1;
  const mondayOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  for (let i = 0; i < mondayOffset; i++) {
    const paddingDate = new Date(days[0].date);
    paddingDate.setDate(paddingDate.getDate() - (mondayOffset - i));
    currentWeek.push({
      date: paddingDate,
      dateKey: '',
      totalCount: 0,
      intensity: 0,
    });
  }

  days.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Pad the last week if needed
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: new Date(),
        dateKey: '',
        totalCount: 0,
        intensity: 0,
      });
    }
    weeks.push(currentWeek);
  }

  // Generate month labels
  const monthLabels: { label: string; weekIndex: number }[] = [];
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    // Check the first valid day of the week for month
    const firstValidDay = week.find((d) => d.dateKey !== '');
    if (firstValidDay) {
      const month = firstValidDay.date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: monthNames[month], weekIndex });
        lastMonth = month;
      }
    }
  });

  const activeDays = days.filter((d) => d.totalCount > 0).length;

  return { days, weeks, activeDays, monthLabels };
}
