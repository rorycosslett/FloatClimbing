export type ClimbType = 'boulder' | 'sport' | 'trad';
export type ClimbStatus = 'send' | 'attempt';

export interface Climb {
  id: string;
  grade: string;
  type: ClimbType;
  status: ClimbStatus;
  timestamp: string;
  sessionId?: string;
}

export interface Session {
  id: string;
  startTime: string;
  endTime?: string;
}
