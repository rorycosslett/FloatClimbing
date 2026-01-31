import { Climb, ClimbType } from '../types';
import { grades } from '../data/grades';

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
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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
  value: number;
  color: string;
}

/**
 * Get grade distribution data for pie chart
 */
export function getGradeDistributionData(
  climbs: Climb[],
  type: ClimbType,
  colors: string[]
): GradeDistributionDataPoint[] {
  const typeClimbs = climbs.filter((c) => c.type === type);
  const gradeArray = grades[type];

  if (typeClimbs.length === 0) {
    return [];
  }

  // Define grade ranges based on type
  const ranges =
    type === 'boulder'
      ? [
          { label: 'V0-V2', min: 0, max: 2 },
          { label: 'V3-V5', min: 3, max: 5 },
          { label: 'V6-V8', min: 6, max: 8 },
          { label: 'V9+', min: 9, max: Infinity },
        ]
      : [
          { label: '5.6-5.9', min: 0, max: 3 },
          { label: '5.10', min: 4, max: 7 },
          { label: '5.11', min: 8, max: 11 },
          { label: '5.12+', min: 12, max: Infinity },
        ];

  const distribution = ranges.map((range, index) => {
    const count = typeClimbs.filter((c) => {
      const gradeIdx = gradeArray.indexOf(c.grade);
      return gradeIdx >= range.min && gradeIdx <= range.max;
    }).length;

    return {
      label: range.label,
      value: count,
      color: colors[index % colors.length],
    };
  });

  // Filter out zero values
  return distribution.filter((d) => d.value > 0);
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
