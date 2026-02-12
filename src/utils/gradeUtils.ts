import { ClimbType, GradeSettings, Climb, TypeGradeBreakdown } from '../types';
import { gradesBySystem } from '../data/grades';

// Detect which system a grade belongs to
export function detectGradeSystem(grade: string, type: ClimbType): string {
  if (type === 'boulder') {
    if (gradesBySystem.boulder.vscale.includes(grade)) return 'vscale';
    if (gradesBySystem.boulder.fontainebleau.includes(grade)) return 'fontainebleau';
    return 'vscale'; // Default
  } else {
    if (gradesBySystem[type].yds.includes(grade)) return 'yds';
    if (gradesBySystem[type].french.includes(grade)) return 'french';
    return 'yds'; // Default
  }
}

// Helper to get grade array for a type and system
function getGradeArray(type: ClimbType, system: string): string[] | undefined {
  if (type === 'boulder') {
    if (system === 'vscale') return gradesBySystem.boulder.vscale;
    if (system === 'fontainebleau') return gradesBySystem.boulder.fontainebleau;
  } else {
    if (system === 'yds') return gradesBySystem[type].yds;
    if (system === 'french') return gradesBySystem[type].french;
  }
  return undefined;
}

// Convert a grade from one system to another using index-based mapping
export function convertGrade(
  grade: string,
  type: ClimbType,
  fromSystem: string,
  toSystem: string
): string {
  if (fromSystem === toSystem) return grade;

  const sourceArray = getGradeArray(type, fromSystem);
  const targetArray = getGradeArray(type, toSystem);

  if (!sourceArray || !targetArray) return grade;

  const index = sourceArray.indexOf(grade);
  if (index === -1 || index >= targetArray.length) return grade;

  return targetArray[index];
}

// Get the display grade for a climb based on user's settings
export function getDisplayGrade(climb: Climb, settings: GradeSettings): string {
  const sourceSystem = detectGradeSystem(climb.grade, climb.type);
  const targetSystem = climb.type === 'boulder' ? settings.boulderSystem : settings.routeSystem;

  return convertGrade(climb.grade, climb.type, sourceSystem, targetSystem);
}

// Get the grade index in the current system (for comparisons)
export function getGradeIndex(grade: string, type: ClimbType, settings: GradeSettings): number {
  const system = type === 'boulder' ? settings.boulderSystem : settings.routeSystem;
  const gradeArray = getGradeArray(type, system);
  return gradeArray ? gradeArray.indexOf(grade) : -1;
}

// Get the secondary grade (the grade in the alternate system)
export function getSecondaryGrade(grade: string, type: ClimbType, settings: GradeSettings): string {
  const currentSystem = type === 'boulder' ? settings.boulderSystem : settings.routeSystem;
  const alternateSystem =
    type === 'boulder'
      ? currentSystem === 'vscale'
        ? 'fontainebleau'
        : 'vscale'
      : currentSystem === 'yds'
        ? 'french'
        : 'yds';

  return convertGrade(grade, type, currentSystem, alternateSystem);
}

// Aggregate climbs into a grade breakdown by type, tracking sends and attempts separately
export function aggregateGradesByType(climbs: Climb[]): TypeGradeBreakdown {
  const result: TypeGradeBreakdown = {
    boulder: [],
    sport: [],
    trad: [],
  };

  const countMap: Record<ClimbType, Record<string, { sends: number; attempts: number }>> = {
    boulder: {},
    sport: {},
    trad: {},
  };

  climbs.forEach((climb) => {
    if (!countMap[climb.type][climb.grade]) {
      countMap[climb.type][climb.grade] = { sends: 0, attempts: 0 };
    }
    if (climb.status === 'attempt') {
      countMap[climb.type][climb.grade].attempts++;
    } else {
      countMap[climb.type][climb.grade].sends++;
    }
  });

  (['boulder', 'sport', 'trad'] as ClimbType[]).forEach((type) => {
    result[type] = Object.entries(countMap[type])
      .map(([grade, counts]) => ({ grade, sends: counts.sends, attempts: counts.attempts }))
      .sort(
        (a, b) => getNormalizedGradeIndex(b.grade, type) - getNormalizedGradeIndex(a.grade, type)
      );
  });

  return result;
}

// Get the normalized grade index (converts to default system for consistent comparison)
export function getNormalizedGradeIndex(grade: string, type: ClimbType): number {
  const sourceSystem = detectGradeSystem(grade, type);
  const defaultSystem = type === 'boulder' ? 'vscale' : 'yds';

  if (sourceSystem === defaultSystem) {
    const gradeArray = getGradeArray(type, defaultSystem);
    return gradeArray ? gradeArray.indexOf(grade) : -1;
  }

  // Convert to default system first
  const convertedGrade = convertGrade(grade, type, sourceSystem, defaultSystem);
  const gradeArray = getGradeArray(type, defaultSystem);
  return gradeArray ? gradeArray.indexOf(convertedGrade) : -1;
}
