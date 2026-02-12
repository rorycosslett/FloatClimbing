import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings, BoulderGradeSystem, RouteGradeSystem } from '../types';
import { loadSettings, saveSettings } from '../data/storage';

interface SettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  setBoulderSystem: (system: BoulderGradeSystem) => void;
  setRouteSystem: (system: RouteGradeSystem) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  grades: {
    boulderSystem: 'vscale',
    routeSystem: 'yds',
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings().then((data) => {
      setSettings(data);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Error loading settings:', error);
      setIsLoading(false);
    });
  }, []);

  const setBoulderSystem = (system: BoulderGradeSystem) => {
    const updated: AppSettings = {
      ...settings,
      grades: { ...settings.grades, boulderSystem: system },
    };
    setSettings(updated);
    saveSettings(updated);
  };

  const setRouteSystem = (system: RouteGradeSystem) => {
    const updated: AppSettings = {
      ...settings,
      grades: { ...settings.grades, routeSystem: system },
    };
    setSettings(updated);
    saveSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, isLoading, setBoulderSystem, setRouteSystem }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
