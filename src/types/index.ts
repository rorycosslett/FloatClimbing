export type ClimbType = 'boulder' | 'sport' | 'trad';
export type ClimbStatus = 'send' | 'attempt';

export interface Climb {
  id: string;
  grade: string;
  type: ClimbType;
  status: ClimbStatus;
  timestamp: string;
  sessionId: string;
}

export interface Session {
  id: string;
  startTime: string;
  endTime?: string;
  name?: string;
  pausedDuration?: number; // Accumulated pause time in milliseconds
  pausedAt?: string; // ISO timestamp when session was paused (null if running)
}

export interface SessionMetadata {
  name?: string;
}

export interface Achievement {
  type: 'new_pr';
  climbType: ClimbType;
  grade: string;
  description: string;
}

export interface GradeCount {
  grade: string;
  count: number;
}

export interface TypeGradeBreakdown {
  boulder: GradeCount[];
  sport: GradeCount[];
  trad: GradeCount[];
}

export interface SessionSummary {
  sessionId: string;
  duration: number;
  startTime: string;
  endTime: string;
  totalClimbs: number;
  sends: number;
  attempts: number;
  maxGradeByType: {
    boulder: string | null;
    sport: string | null;
    trad: string | null;
  };
  gradesByType: TypeGradeBreakdown;
  achievements: Achievement[];
}
