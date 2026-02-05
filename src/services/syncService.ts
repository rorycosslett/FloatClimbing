import { supabase } from './supabase';
import { Climb, Session, ClimbType, ClimbStatus } from '../types';

// Types for Supabase responses
interface DbSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  name: string | null;
  paused_duration: number | null;
  created_at: string;
  updated_at: string;
}

interface DbClimb {
  id: string;
  user_id: string;
  session_id: string;
  grade: string;
  type: ClimbType;
  status: ClimbStatus;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

// Convert local Session to DB format
function toDbSession(session: Session, userId: string): Omit<DbSession, 'created_at' | 'updated_at'> {
  return {
    id: session.id,
    user_id: userId,
    start_time: session.startTime,
    end_time: session.endTime || null,
    name: session.name || null,
    paused_duration: session.pausedDuration || null,
  };
}

// Convert DB session to local format
function fromDbSession(dbSession: DbSession): Session {
  return {
    id: dbSession.id,
    startTime: dbSession.start_time,
    endTime: dbSession.end_time || undefined,
    name: dbSession.name || undefined,
    pausedDuration: dbSession.paused_duration || undefined,
  };
}

// Convert local Climb to DB format
function toDbClimb(climb: Climb, userId: string): Omit<DbClimb, 'created_at' | 'updated_at'> {
  return {
    id: climb.id,
    user_id: userId,
    session_id: climb.sessionId,
    grade: climb.grade,
    type: climb.type,
    status: climb.status,
    timestamp: climb.timestamp,
  };
}

// Convert DB climb to local format
function fromDbClimb(dbClimb: DbClimb): Climb {
  return {
    id: dbClimb.id,
    grade: dbClimb.grade,
    type: dbClimb.type,
    status: dbClimb.status,
    timestamp: dbClimb.timestamp,
    sessionId: dbClimb.session_id,
  };
}

export class SyncService {
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  isAuthenticated(): boolean {
    return this.userId !== null;
  }

  // ============================================
  // SESSIONS
  // ============================================

  async fetchSessions(): Promise<Session[]> {
    if (!this.userId) return [];

    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', this.userId)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }

    return (data || []).map(fromDbSession);
  }

  async upsertSession(session: Session): Promise<void> {
    if (!this.userId) return;

    const { error } = await supabase
      .from('sessions')
      .upsert(toDbSession(session, this.userId), { onConflict: 'id' });

    if (error) {
      console.error('Error upserting session:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.userId) return;

    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  // ============================================
  // CLIMBS
  // ============================================

  async fetchClimbs(): Promise<Climb[]> {
    if (!this.userId) return [];

    const { data, error } = await supabase
      .from('climbs')
      .select('*')
      .eq('user_id', this.userId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching climbs:', error);
      throw error;
    }

    return (data || []).map(fromDbClimb);
  }

  async upsertClimb(climb: Climb): Promise<void> {
    if (!this.userId) return;

    const { error } = await supabase
      .from('climbs')
      .upsert(toDbClimb(climb, this.userId), { onConflict: 'id' });

    if (error) {
      console.error('Error upserting climb:', error);
      throw error;
    }
  }

  async upsertClimbs(climbs: Climb[]): Promise<void> {
    if (!this.userId || climbs.length === 0) return;

    const { error } = await supabase
      .from('climbs')
      .upsert(climbs.map((c) => toDbClimb(c, this.userId!)), { onConflict: 'id' });

    if (error) {
      console.error('Error upserting climbs:', error);
      throw error;
    }
  }

  async deleteClimb(climbId: string): Promise<void> {
    if (!this.userId) return;

    const { error } = await supabase
      .from('climbs')
      .delete()
      .eq('id', climbId)
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error deleting climb:', error);
      throw error;
    }
  }

  // ============================================
  // FULL SYNC
  // ============================================

  async syncLocalData(localClimbs: Climb[], localSessions: Session[]): Promise<{
    climbs: Climb[];
    sessions: Session[];
  }> {
    if (!this.userId) {
      return { climbs: localClimbs, sessions: localSessions };
    }

    // Fetch remote data
    const [remoteClimbs, remoteSessions] = await Promise.all([
      this.fetchClimbs(),
      this.fetchSessions(),
    ]);

    // Create maps for easy lookup
    const remoteClimbMap = new Map(remoteClimbs.map((c) => [c.id, c]));
    const remoteSessionMap = new Map(remoteSessions.map((s) => [s.id, s]));

    // Find local items not in remote (need to upload)
    const sessionsToUpload = localSessions.filter((s) => !remoteSessionMap.has(s.id));
    const climbsToUpload = localClimbs.filter((c) => !remoteClimbMap.has(c.id));

    // Upload local-only data to remote
    if (sessionsToUpload.length > 0) {
      for (const session of sessionsToUpload) {
        await this.upsertSession(session);
      }
    }

    if (climbsToUpload.length > 0) {
      await this.upsertClimbs(climbsToUpload);
    }

    // Merge: remote data + local-only data
    const mergedSessions = [...remoteSessions, ...sessionsToUpload];
    const mergedClimbs = [...remoteClimbs, ...climbsToUpload];

    return {
      climbs: mergedClimbs,
      sessions: mergedSessions,
    };
  }

  // ============================================
  // MIGRATION (first-time sync of guest data)
  // ============================================

  async migrateLocalData(localClimbs: Climb[], localSessions: Session[]): Promise<void> {
    if (!this.userId) {
      throw new Error('Must be authenticated to migrate data');
    }

    // Extract unique sessions from climbs
    const sessionIds = [...new Set(localClimbs.map((c) => c.sessionId))];

    // Create session records for sessions that don't exist yet
    const sessionsToCreate: Session[] = sessionIds
      .filter((id) => !localSessions.find((s) => s.id === id))
      .map((id) => {
        const sessionClimbs = localClimbs.filter((c) => c.sessionId === id);
        const firstClimb = sessionClimbs.reduce((a, b) =>
          new Date(a.timestamp) < new Date(b.timestamp) ? a : b
        );
        const lastClimb = sessionClimbs.reduce((a, b) =>
          new Date(a.timestamp) > new Date(b.timestamp) ? a : b
        );

        return {
          id,
          startTime: firstClimb.timestamp,
          endTime: lastClimb.timestamp,
        };
      });

    const allSessions = [...localSessions, ...sessionsToCreate];

    // Upload sessions first (foreign key constraint)
    for (const session of allSessions) {
      await this.upsertSession(session);
    }

    // Upload climbs
    if (localClimbs.length > 0) {
      await this.upsertClimbs(localClimbs);
    }
  }
}

export const syncService = new SyncService();
