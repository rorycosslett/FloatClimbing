import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Climb, ClimbType, ClimbStatus, Session } from '../types';
import { loadClimbs, saveClimbs, loadSession, saveSession } from '../data/storage';

interface ClimbContextType {
  climbs: Climb[];
  isLoading: boolean;
  activeSession: Session | null;
  addClimb: (grade: string, type: ClimbType, status: ClimbStatus) => void;
  deleteClimb: (id: string) => void;
  startSession: () => void;
  endSession: () => number;
  getSessionClimbCount: () => number;
}

const ClimbContext = createContext<ClimbContextType | undefined>(undefined);

export function ClimbProvider({ children }: { children: ReactNode }) {
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<Session | null>(null);

  useEffect(() => {
    Promise.all([loadClimbs(), loadSession()]).then(([climbData, sessionData]) => {
      setClimbs(climbData);
      setActiveSession(sessionData);
      setIsLoading(false);
    });
  }, []);

  const addClimb = (grade: string, type: ClimbType, status: ClimbStatus) => {
    const newClimb: Climb = {
      id: Date.now().toString(),
      grade,
      type,
      status,
      timestamp: new Date().toISOString(),
      sessionId: activeSession?.id,
    };
    const updated = [...climbs, newClimb];
    setClimbs(updated);
    saveClimbs(updated);
  };

  const deleteClimb = (id: string) => {
    const updated = climbs.filter((c) => c.id !== id);
    setClimbs(updated);
    saveClimbs(updated);
  };

  const startSession = () => {
    const session: Session = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
    };
    setActiveSession(session);
    saveSession(session);
  };

  const endSession = () => {
    const count = getSessionClimbCount();
    setActiveSession(null);
    saveSession(null);
    return count;
  };

  const getSessionClimbCount = () => {
    if (!activeSession) return 0;
    return climbs.filter((c) => c.sessionId === activeSession.id).length;
  };

  return (
    <ClimbContext.Provider
      value={{
        climbs,
        isLoading,
        activeSession,
        addClimb,
        deleteClimb,
        startSession,
        endSession,
        getSessionClimbCount,
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
