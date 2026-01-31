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
  achievements: Achievement[];
}
