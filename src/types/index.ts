export type ClimbType = 'boulder' | 'sport' | 'trad';
export type ClimbStatus = 'send' | 'attempt';

export type BoulderGradeSystem = 'vscale' | 'fontainebleau';
export type RouteGradeSystem = 'yds' | 'french';

export interface GradeSettings {
  boulderSystem: BoulderGradeSystem;
  routeSystem: RouteGradeSystem;
}

export interface AppSettings {
  grades: GradeSettings;
}

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
  sends: number;
  attempts: number;
}

export interface TypeGradeBreakdown {
  boulder: GradeCount[];
  sport: GradeCount[];
  trad: GradeCount[];
}

export interface GroupedClimb extends Climb {
  index: number;
}

export interface SessionData {
  id: string;
  climbs: GroupedClimb[];
  sends: number;
  attempts: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  gradesByType: TypeGradeBreakdown;
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

// ============================================
// SOCIAL TYPES
// ============================================

export interface Profile {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileWithStats extends Profile {
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: string;
}

export interface ActivityMetadata {
  totalClimbs: number;
  sends: number;
  attempts: number;
  duration: number;
  maxBoulderGrade: string | null;
  maxSportGrade: string | null;
  maxTradGrade: string | null;
}

export type ActivityType = 'session_completed';

export interface ActivityFeedItem {
  id: string;
  userId: string;
  activityType: ActivityType;
  sessionId: string | null;
  metadata: ActivityMetadata;
  createdAt: string;
  // Populated fields for display
  user?: Profile;
  session?: Session;
  climbs?: Climb[];
}

export interface FeedPage {
  items: ActivityFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}
