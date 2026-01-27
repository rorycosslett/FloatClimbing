export type ClimbType = 'boulder' | 'sport' | 'trad';
export type ClimbStatus = 'send' | 'attempt';

export interface Climb {
  id: string;
  grade: string;
  type: ClimbType;
  status: ClimbStatus;
  timestamp: string;
}
