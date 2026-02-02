import { ClimbType, GradeSettings } from '../types';

export const gradesBySystem = {
  boulder: {
    vscale: [
      'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9',
      'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16', 'V17',
    ],
    fontainebleau: [
      '4', '4+', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+',
      '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A', '8A+',
    ],
  },
  sport: {
    yds: [
      '5.6', '5.7', '5.8', '5.9',
      '5.10a', '5.10b', '5.10c', '5.10d',
      '5.11a', '5.11b', '5.11c', '5.11d',
      '5.12a', '5.12b', '5.12c', '5.12d',
      '5.13a', '5.13b', '5.13c', '5.13d',
      '5.14a', '5.14b', '5.14c', '5.14d',
      '5.15a', '5.15b', '5.15c', '5.15d',
    ],
    // French grades aligned to YDS per Rockfax conversion chart
    french: [
      '4c', '5a', '5b', '5c',       // 5.6, 5.7, 5.8, 5.9
      '6a+', '6a+', '6b', '6b+',    // 5.10a, 5.10b, 5.10c, 5.10d
      '6c', '6c', '6c+', '7a',      // 5.11a, 5.11b, 5.11c, 5.11d
      '7a+', '7b', '7b+', '7c',     // 5.12a, 5.12b, 5.12c, 5.12d
      '7c+', '8a', '8a', '8a+',     // 5.13a, 5.13b, 5.13c, 5.13d
      '8b', '8b+', '8c', '8c+',     // 5.14a, 5.14b, 5.14c, 5.14d
      '9a', '9a+', '9b', '9b+',     // 5.15a, 5.15b, 5.15c, 5.15d
    ],
  },
  trad: {
    yds: [
      '5.6', '5.7', '5.8', '5.9',
      '5.10a', '5.10b', '5.10c', '5.10d',
      '5.11a', '5.11b', '5.11c', '5.11d',
      '5.12a', '5.12b', '5.12c', '5.12d',
      '5.13a', '5.13b', '5.13c', '5.13d',
      '5.14a', '5.14b', '5.14c', '5.14d',
      '5.15a', '5.15b', '5.15c', '5.15d',
    ],
    // French grades aligned to YDS per Rockfax conversion chart
    french: [
      '4c', '5a', '5b', '5c',       // 5.6, 5.7, 5.8, 5.9
      '6a+', '6a+', '6b', '6b+',    // 5.10a, 5.10b, 5.10c, 5.10d
      '6c', '6c', '6c+', '7a',      // 5.11a, 5.11b, 5.11c, 5.11d
      '7a+', '7b', '7b+', '7c',     // 5.12a, 5.12b, 5.12c, 5.12d
      '7c+', '8a', '8a', '8a+',     // 5.13a, 5.13b, 5.13c, 5.13d
      '8b', '8b+', '8c', '8c+',     // 5.14a, 5.14b, 5.14c, 5.14d
      '9a', '9a+', '9b', '9b+',     // 5.15a, 5.15b, 5.15c, 5.15d
    ],
  },
};

// Maintain backward compatibility - default to current systems
export const grades: Record<ClimbType, string[]> = {
  boulder: gradesBySystem.boulder.vscale,
  sport: gradesBySystem.sport.yds,
  trad: gradesBySystem.trad.yds,
};

// Helper function to get grades for a given type and settings
export function getGradesForSettings(type: ClimbType, settings: GradeSettings): string[] {
  if (type === 'boulder') {
    return gradesBySystem.boulder[settings.boulderSystem];
  }
  return gradesBySystem[type][settings.routeSystem];
}

// Get the system name for a climb type
export function getSystemForType(type: ClimbType, settings: GradeSettings): string {
  if (type === 'boulder') {
    return settings.boulderSystem;
  }
  return settings.routeSystem;
}
