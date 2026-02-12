import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import {
  Climb,
  ClimbType,
  ClimbStatus,
  Session,
  SessionSummary,
  Achievement,
  SessionMetadata,
  TypeGradeBreakdown,
} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadClimbs,
  saveClimbs,
  clearClimbs,
  loadSession,
  saveSession,
  loadSessionMetadata,
  saveSessionMetadata,
} from '../data/storage';
import { generateSessionName } from '../utils/sessionUtils';
import { getNormalizedGradeIndex } from '../utils/gradeUtils';
import { syncService } from '../services/syncService';
import { socialService } from '../services/socialService';
import { stravaService } from '../services/stravaService';
import { useAuth } from './AuthContext';

interface ClimbContextType {
  climbs: Climb[];
  isLoading: boolean;
  isSyncing: boolean;
  activeSession: Session | null;
  sessionMetadata: Record<string, SessionMetadata>;
  addClimb: (grade: string, type: ClimbType, status: ClimbStatus) => void;
  addClimbToSession: (sessionId: string, grade: string, type: ClimbType, status: ClimbStatus) => void;
  deleteClimb: (id: string) => void;
  deleteSession: (sessionId: string) => void;
  startSession: () => void;
  endSession: (name?: string) => SessionSummary | null;
  pauseSession: () => SessionSummary | null;
  resumeSession: () => void;
  getSessionClimbCount: () => number;
  renameSession: (sessionId: string, name: string) => void;
  getSessionName: (sessionId: string, startTime: string) => string;
  updateSessionPhotoUrl: (sessionId: string, photoUrl: string | null) => void;
  updateSessionPrivacy: (sessionId: string, isPublic: boolean) => void;
  syncData: () => Promise<void>;
}

const ClimbContext = createContext<ClimbContextType | undefined>(undefined);

export function ClimbProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<Record<string, SessionMetadata>>({});
  const hasInitialSynced = useRef(false);
  const sessionSyncPromise = useRef<Promise<void>>(Promise.resolve());

  const LAST_USER_KEY = 'lastUserId';

  // Update services when user changes
  useEffect(() => {
    syncService.setUserId(user?.id || null);
    socialService.setUserId(user?.id || null);
    stravaService.setUserId(user?.id || null);
  }, [user?.id]);

  // Load local data on mount, clearing if a different account logged in
  useEffect(() => {
    const loadData = async () => {
      try {
        const lastUserId = await AsyncStorage.getItem(LAST_USER_KEY);

        // If a different user logged in, clear stale local data
        if (user?.id && lastUserId && lastUserId !== user.id) {
          await clearClimbs();
          await saveSession(null);
          await saveSessionMetadata({});
          await AsyncStorage.setItem(LAST_USER_KEY, user.id);
          setClimbs([]);
          setActiveSession(null);
          setSessionMetadata({});
          return;
        }

        if (user?.id) {
          await AsyncStorage.setItem(LAST_USER_KEY, user.id);
        }

        const [climbData, sessionData, metadataData] = await Promise.all([
          loadClimbs(),
          loadSession(),
          loadSessionMetadata(),
        ]);

        // Remove any loose climbs (climbs without a sessionId)
        const validClimbs = climbData.filter((c) => c.sessionId);
        if (validClimbs.length !== climbData.length) {
          saveClimbs(validClimbs);
        }
        setClimbs(validClimbs);
        setActiveSession(sessionData);
        setSessionMetadata(metadataData);
      } catch (error) {
        console.error('Error loading climb data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Sync when user logs in
  useEffect(() => {
    if (user && !isLoading && !hasInitialSynced.current) {
      hasInitialSynced.current = true;
      syncData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading]);

  const syncData = useCallback(async () => {
    if (!user || isSyncing) return;

    setIsSyncing(true);
    try {
      // Extract sessions from climbs for sync
      const sessionIds = [...new Set(climbs.map((c) => c.sessionId))];
      const localSessions: Session[] = sessionIds.map((id) => {
        const sessionClimbs = climbs.filter((c) => c.sessionId === id);
        const metadata = sessionMetadata[id];
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
          name: metadata?.name,
          isPublic: metadata?.isPublic,
        };
      });

      const { climbs: syncedClimbs } = await syncService.syncLocalData(climbs, localSessions);

      // Update local state with synced data
      setClimbs(syncedClimbs);
      saveClimbs(syncedClimbs);
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user, climbs, sessionMetadata, isSyncing]);

  const addClimb = (grade: string, type: ClimbType, status: ClimbStatus) => {
    if (!activeSession) {
      return; // Cannot add climbs without an active session
    }
    const newClimb: Climb = {
      id: Crypto.randomUUID(),
      grade,
      type,
      status,
      timestamp: new Date().toISOString(),
      sessionId: activeSession.id,
    };
    const updated = [...climbs, newClimb];
    setClimbs(updated);
    saveClimbs(updated);

    // Sync to cloud if authenticated
    if (user) {
      syncService.upsertClimb(newClimb).catch(console.error);
    }
  };

  const addClimbToSession = (sessionId: string, grade: string, type: ClimbType, status: ClimbStatus) => {
    const newClimb: Climb = {
      id: Crypto.randomUUID(),
      grade,
      type,
      status,
      timestamp: new Date().toISOString(),
      sessionId,
    };
    const updated = [...climbs, newClimb];
    setClimbs(updated);
    saveClimbs(updated);

    // Sync to cloud if authenticated (wait for session to be synced first)
    if (user) {
      sessionSyncPromise.current.then(() => {
        syncService.upsertClimb(newClimb).catch(console.error);
      });
    }
  };

  const deleteClimb = (id: string) => {
    const updated = climbs.filter((c) => c.id !== id);
    setClimbs(updated);
    saveClimbs(updated);

    // Sync to cloud if authenticated
    if (user) {
      syncService.deleteClimb(id).catch(console.error);
    }
  };

  const deleteSession = (sessionId: string) => {
    // Remove all climbs belonging to this session
    const updatedClimbs = climbs.filter((c) => c.sessionId !== sessionId);
    setClimbs(updatedClimbs);
    saveClimbs(updatedClimbs);

    // Remove session metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [sessionId]: _removed, ...remainingMetadata } = sessionMetadata;
    setSessionMetadata(remainingMetadata);
    saveSessionMetadata(remainingMetadata);

    // Sync to cloud if authenticated
    if (user) {
      syncService.deleteSession(sessionId).catch(console.error);
    }
  };

  const startSession = () => {
    const session: Session = {
      id: Crypto.randomUUID(),
      startTime: new Date().toISOString(),
    };
    setActiveSession(session);
    saveSession(session);

    // Sync to cloud if authenticated
    if (user) {
      sessionSyncPromise.current = syncService.upsertSession(session).catch(console.error).then(() => {});
    }
  };

  const endSession = (name?: string): SessionSummary | null => {
    if (!activeSession) return null;

    const sessionClimbs = climbs.filter((c) => c.sessionId === activeSession.id);

    const endTime = new Date().toISOString();
    const totalElapsed = new Date(endTime).getTime() - new Date(activeSession.startTime).getTime();
    const pausedDuration = activeSession.pausedDuration || 0;
    const duration = totalElapsed - pausedDuration;

    const sends = sessionClimbs.filter((c) => c.status === 'send');
    const attempts = sessionClimbs.filter((c) => c.status === 'attempt');

    // Calculate max grade per type for sends in this session
    const maxGradeByType: SessionSummary['maxGradeByType'] = {
      boulder: null,
      sport: null,
      trad: null,
    };

    sends.forEach((climb) => {
      const idx = getNormalizedGradeIndex(climb.grade, climb.type);
      const currentMax = maxGradeByType[climb.type];
      const currentMaxIdx = currentMax ? getNormalizedGradeIndex(currentMax, climb.type) : -1;

      if (idx > currentMaxIdx) {
        maxGradeByType[climb.type] = climb.grade;
      }
    });

    // Aggregate grades by type for grade pills display
    const gradesByType: TypeGradeBreakdown = {
      boulder: [],
      sport: [],
      trad: [],
    };

    const countMap: Record<ClimbType, Record<string, { sends: number; attempts: number }>> = {
      boulder: {},
      sport: {},
      trad: {},
    };

    sessionClimbs.forEach((climb) => {
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
      gradesByType[type] = Object.entries(countMap[type])
        .map(([grade, counts]) => ({ grade, sends: counts.sends, attempts: counts.attempts }))
        .sort((a, b) => getNormalizedGradeIndex(b.grade, type) - getNormalizedGradeIndex(a.grade, type));
    });

    // Detect achievements (PRs)
    const achievements = detectAchievements(sessionClimbs, climbs, activeSession.id);

    const summary: SessionSummary = {
      sessionId: activeSession.id,
      duration,
      startTime: activeSession.startTime,
      endTime,
      totalClimbs: sessionClimbs.length,
      sends: sends.length,
      attempts: attempts.length,
      maxGradeByType,
      gradesByType,
      achievements,
    };

    // Resolve session name: use provided name, existing metadata name, or generate from start time
    const resolvedName = name || sessionMetadata[activeSession.id]?.name || generateSessionName(activeSession.startTime);

    const updatedMetadata = { ...sessionMetadata, [activeSession.id]: { ...sessionMetadata[activeSession.id], name: resolvedName, startTime: activeSession.startTime, endTime } };
    setSessionMetadata(updatedMetadata);
    saveSessionMetadata(updatedMetadata);

    // Sync completed session to cloud
    if (user) {
      const completedSession: Session = {
        ...activeSession,
        endTime,
        name: resolvedName,
      };
      // Await session upsert before creating activity item (foreign key dependency)
      syncService.upsertSession(completedSession).then(() => {
        // Create activity feed item for followers to see (only for public sessions)
        const sessionIsPublic = sessionMetadata[activeSession.id]?.isPublic !== false;
        if (sends.length > 0 && sessionIsPublic) {
          socialService.createActivityItem(activeSession.id, {
            totalClimbs: sessionClimbs.length,
            sends: sends.length,
            attempts: attempts.length,
            duration,
            maxBoulderGrade: maxGradeByType.boulder,
            maxSportGrade: maxGradeByType.sport,
            maxTradGrade: maxGradeByType.trad,
          }).catch(console.error);
        }
      }).catch(console.error);
    }

    setActiveSession(null);
    saveSession(null);

    return summary;
  };

  const pauseSession = (): SessionSummary | null => {
    if (!activeSession) return null;

    const sessionClimbs = climbs.filter((c) => c.sessionId === activeSession.id);

    const endTime = new Date().toISOString();
    const totalElapsed = new Date(endTime).getTime() - new Date(activeSession.startTime).getTime();
    const pausedDuration = activeSession.pausedDuration || 0;
    const duration = totalElapsed - pausedDuration;

    const sends = sessionClimbs.filter((c) => c.status === 'send');
    const attempts = sessionClimbs.filter((c) => c.status === 'attempt');

    // Calculate max grade per type for sends in this session
    const maxGradeByType: SessionSummary['maxGradeByType'] = {
      boulder: null,
      sport: null,
      trad: null,
    };

    sends.forEach((climb) => {
      const idx = getNormalizedGradeIndex(climb.grade, climb.type);
      const currentMax = maxGradeByType[climb.type];
      const currentMaxIdx = currentMax ? getNormalizedGradeIndex(currentMax, climb.type) : -1;

      if (idx > currentMaxIdx) {
        maxGradeByType[climb.type] = climb.grade;
      }
    });

    // Aggregate grades by type for grade pills display
    const gradesByType: TypeGradeBreakdown = {
      boulder: [],
      sport: [],
      trad: [],
    };

    const countMap: Record<ClimbType, Record<string, { sends: number; attempts: number }>> = {
      boulder: {},
      sport: {},
      trad: {},
    };

    sessionClimbs.forEach((climb) => {
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
      gradesByType[type] = Object.entries(countMap[type])
        .map(([grade, counts]) => ({ grade, sends: counts.sends, attempts: counts.attempts }))
        .sort((a, b) => getNormalizedGradeIndex(b.grade, type) - getNormalizedGradeIndex(a.grade, type));
    });

    // Detect achievements (PRs)
    const achievements = detectAchievements(sessionClimbs, climbs, activeSession.id);

    const summary: SessionSummary = {
      sessionId: activeSession.id,
      duration,
      startTime: activeSession.startTime,
      endTime,
      totalClimbs: sessionClimbs.length,
      sends: sends.length,
      attempts: attempts.length,
      maxGradeByType,
      gradesByType,
      achievements,
    };

    // Mark session as paused
    const pausedSession: Session = {
      ...activeSession,
      pausedAt: new Date().toISOString(),
    };
    setActiveSession(pausedSession);
    saveSession(pausedSession);

    return summary;
  };

  const resumeSession = () => {
    if (!activeSession || !activeSession.pausedAt) return;

    const pausedAt = new Date(activeSession.pausedAt).getTime();
    const now = Date.now();
    const pauseDuration = now - pausedAt;
    const totalPausedDuration = (activeSession.pausedDuration || 0) + pauseDuration;

    const resumedSession: Session = {
      ...activeSession,
      pausedDuration: totalPausedDuration,
      pausedAt: undefined,
    };
    setActiveSession(resumedSession);
    saveSession(resumedSession);
  };

  const renameSession = (sessionId: string, name: string) => {
    const existing = sessionMetadata[sessionId] || {};
    const updatedMetadata = { ...sessionMetadata, [sessionId]: { ...existing, name } };
    setSessionMetadata(updatedMetadata);
    saveSessionMetadata(updatedMetadata);

    // Sync updated name to backend
    if (user) {
      const sessionClimbs = climbs.filter((c) => c.sessionId === sessionId);
      if (sessionClimbs.length > 0) {
        const firstClimb = sessionClimbs.reduce((a, b) =>
          new Date(a.timestamp) < new Date(b.timestamp) ? a : b
        );
        const lastClimb = sessionClimbs.reduce((a, b) =>
          new Date(a.timestamp) > new Date(b.timestamp) ? a : b
        );
        syncService.upsertSession({
          id: sessionId,
          startTime: firstClimb.timestamp,
          endTime: lastClimb.timestamp,
          name,
          photoUrl: existing.photoUrl,
          isPublic: existing.isPublic,
        }).catch(console.error);
      }
    }
  };

  const getSessionName = (sessionId: string, startTime: string): string => {
    const metadata = sessionMetadata[sessionId];
    if (metadata?.name) {
      return metadata.name;
    }
    return generateSessionName(startTime);
  };

  const updateSessionPhotoUrl = (sessionId: string, photoUrl: string | null) => {
    const existing = sessionMetadata[sessionId] || {};
    const updatedMetadata = {
      ...sessionMetadata,
      [sessionId]: { ...existing, photoUrl: photoUrl || undefined },
    };
    setSessionMetadata(updatedMetadata);
    saveSessionMetadata(updatedMetadata);
  };

  const updateSessionPrivacy = (sessionId: string, isPublic: boolean) => {
    const existing = sessionMetadata[sessionId] || {};
    const updatedMetadata = {
      ...sessionMetadata,
      [sessionId]: { ...existing, isPublic },
    };
    setSessionMetadata(updatedMetadata);
    saveSessionMetadata(updatedMetadata);

    if (user) {
      socialService.updateSessionPrivacy(sessionId, isPublic).catch(console.error);

      if (!isPublic) {
        // Remove from feed when making private
        socialService.deleteActivityItemBySession(sessionId).catch(console.error);
      } else {
        // When making public, create activity item if session has sends
        const sessionClimbs = climbs.filter((c) => c.sessionId === sessionId);
        const sends = sessionClimbs.filter((c) => c.status === 'send');
        if (sends.length > 0) {
          const attempts = sessionClimbs.filter((c) => c.status === 'attempt');
          const times = sessionClimbs.map((c) => new Date(c.timestamp).getTime());
          const startTime = new Date(Math.min(...times)).toISOString();
          const endTime = new Date(Math.max(...times)).toISOString();
          const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

          const maxGradeByType: { boulder: string | null; sport: string | null; trad: string | null } = {
            boulder: null,
            sport: null,
            trad: null,
          };
          sends.forEach((climb) => {
            const idx = getNormalizedGradeIndex(climb.grade, climb.type);
            const currentMax = maxGradeByType[climb.type];
            const currentMaxIdx = currentMax ? getNormalizedGradeIndex(currentMax, climb.type) : -1;
            if (idx > currentMaxIdx) {
              maxGradeByType[climb.type] = climb.grade;
            }
          });

          socialService.createActivityItem(sessionId, {
            totalClimbs: sessionClimbs.length,
            sends: sends.length,
            attempts: attempts.length,
            duration,
            maxBoulderGrade: maxGradeByType.boulder,
            maxSportGrade: maxGradeByType.sport,
            maxTradGrade: maxGradeByType.trad,
          }).catch(console.error);
        }
      }
    }
  };

  function detectAchievements(
    sessionClimbs: Climb[],
    allClimbs: Climb[],
    sessionId: string
  ): Achievement[] {
    const achievements: Achievement[] = [];
    const priorClimbs = allClimbs.filter((c) => c.sessionId !== sessionId);

    // Find max grade sent prior to this session for each type
    const priorMaxByType: Record<ClimbType, number> = {
      boulder: -1,
      sport: -1,
      trad: -1,
    };

    priorClimbs
      .filter((c) => c.status === 'send')
      .forEach((c) => {
        const idx = getNormalizedGradeIndex(c.grade, c.type);
        if (idx > priorMaxByType[c.type]) {
          priorMaxByType[c.type] = idx;
        }
      });

    // Check each session send for PR
    const sessionSends = sessionClimbs.filter((c) => c.status === 'send');
    const prsByType: Record<ClimbType, string | null> = {
      boulder: null,
      sport: null,
      trad: null,
    };

    sessionSends.forEach((c) => {
      const idx = getNormalizedGradeIndex(c.grade, c.type);
      if (idx > priorMaxByType[c.type]) {
        const currentPr = prsByType[c.type];
        const currentPrIdx = currentPr ? getNormalizedGradeIndex(currentPr, c.type) : -1;
        if (idx > currentPrIdx) {
          prsByType[c.type] = c.grade;
        }
      }
    });

    // Create achievement entries for PRs
    (Object.entries(prsByType) as [ClimbType, string | null][]).forEach(([type, grade]) => {
      if (grade) {
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        achievements.push({
          type: 'new_pr',
          climbType: type,
          grade,
          description: `New ${typeLabel} PR: ${grade}`,
        });
      }
    });

    return achievements;
  }

  const getSessionClimbCount = () => {
    if (!activeSession) return 0;
    return climbs.filter((c) => c.sessionId === activeSession.id).length;
  };

  return (
    <ClimbContext.Provider
      value={{
        climbs,
        isLoading,
        isSyncing,
        activeSession,
        sessionMetadata,
        addClimb,
        addClimbToSession,
        deleteClimb,
        deleteSession,
        startSession,
        endSession,
        pauseSession,
        resumeSession,
        getSessionClimbCount,
        renameSession,
        getSessionName,
        updateSessionPhotoUrl,
        updateSessionPrivacy,
        syncData,
      }}
    >
      {children}
    </ClimbContext.Provider>
  );
}

export function useClimbs() {
  const context = useContext(ClimbContext);
  if (!context) {
    throw new Error('useClimbs must be used within a ClimbProvider');
  }
  return context;
}
