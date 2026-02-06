import { ClimbType, GradeSettings } from '../types';
import { gradesBySystem } from '../data/grades';

// Grade color scale - distinct colors for each grade level with strong gradients
// Each entry is [startColor, endColor] for LinearGradient
const GRADE_COLORS: Array<[string, string]> = [
  // V0: Bright cyan-blue
  ['#00D0FF', '#0080D0'],
  // V1: Sky blue
  ['#00B8FF', '#0068D8'],
  // V2: Azure blue
  ['#18A0FF', '#0058E0'],
  // V3: Royal blue
  ['#1384FF', '#0048E8'],
  // V4: Strong blue
  ['#0070F8', '#0038E0'],
  // V5: Deep blue
  ['#0060F0', '#1030D0'],
  // V6: Blue-indigo
  ['#0050F0', '#2028C8'],
  // V7: Indigo
  ['#2040E8', '#3020C0'],
  // V8: Blue-violet
  ['#3030E0', '#4818B8'],
  // V9: Violet
  ['#4020D8', '#5810B0'],
  // V10: Purple
  ['#5010D0', '#6808A8'],
  // V11: Deep purple
  ['#6000C8', '#7800A0'],
  // V12: Magenta-purple
  ['#7000C0', '#880098'],
  // V13: Strong magenta
  ['#8000B8', '#980090'],
  // V14: Vivid magenta
  ['#9000B0', '#A80088'],
  // V15: Hot pink-magenta
  ['#A000A8', '#B80080'],
  // V16: Bright pink
  ['#B000A0', '#C80078'],
  // V17: Ultra pink
  ['#C00098', '#D80070'],
];

/**
 * Get gradient colors for a send pill based on grade difficulty
 * Returns [startColor, endColor] for LinearGradient
 */
export function getGradeGradientColors(
  grade: string,
  climbType: ClimbType,
  settings: GradeSettings
): [string, string] {
  // Get the appropriate grade list
  let grades: string[];
  if (climbType === 'boulder') {
    grades = gradesBySystem.boulder[settings.boulderSystem];
  } else {
    grades = gradesBySystem[climbType][settings.routeSystem];
  }

  // Find the index of this grade
  const index = grades.indexOf(grade);

  // If grade not found, return default blue
  if (index === -1) {
    return GRADE_COLORS[3]; // Royal blue as default
  }

  const maxIndex = grades.length - 1;

  // Map the grade index to the color scale
  const colorIndex = Math.round((index / maxIndex) * (GRADE_COLORS.length - 1));

  return GRADE_COLORS[Math.max(0, Math.min(colorIndex, GRADE_COLORS.length - 1))];
}
