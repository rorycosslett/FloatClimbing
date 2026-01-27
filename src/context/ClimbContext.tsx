import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Climb, ClimbType, ClimbStatus } from '../types';
import { loadClimbs, saveClimbs } from '../data/storage';

interface ClimbContextType {
  climbs: Climb[];
  isLoading: boolean;
  addClimb: (grade: string, type: ClimbType, status: ClimbStatus) => void;
  deleteClimb: (id: string) => void;
}

const ClimbContext = createContext<ClimbContextType | undefined>(undefined);

export function ClimbProvider({ children }: { children: ReactNode }) {
  const [climbs, setClimbs] = useState<Climb[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClimbs().then((data) => {
      setClimbs(data);
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

  return (
    <ClimbContext.Provider value={{ climbs, isLoading, addClimb, deleteClimb }}>
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
