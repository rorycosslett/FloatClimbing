import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClimbs } from '../context/ClimbContext';
import { grades } from '../data/grades';
import { ClimbType } from '../types';
import { colors } from '../theme/colors';

const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function LogScreen() {
  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const [elapsed, setElapsed] = useState(0);
  const { addClimb, activeSession, startSession, endSession, getSessionClimbCount } = useClimbs();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeSession) {
      const updateElapsed = () => {
        const start = new Date(activeSession.startTime).getTime();
        setElapsed(Date.now() - start);
      };
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    } else {
      setElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  const handleLog = (grade: string, status: 'send' | 'attempt') => {
    addClimb(grade, selectedType, status);
    const message = status === 'attempt' ? `${grade} attempt logged` : `${grade} send logged`;
    Toast.show({
      type: 'success',
      text1: `✓ ${message}`,
      visibilityTime: 2000,
    });
  };

  const handleSessionToggle = () => {
    if (activeSession) {
      const count = endSession();
      Toast.show({
        type: 'success',
        text1: `Session ended - ${count} climb${count !== 1 ? 's' : ''}`,
        visibilityTime: 2000,
      });
    } else {
      startSession();
      Toast.show({
        type: 'success',
        text1: 'Session started',
        visibilityTime: 2000,
      });
    }
  };

  const climbCount = getSessionClimbCount();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Climb/Attempt</Text>
        <View style={styles.segmentControl}>
          {CLIMB_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[styles.segmentBtn, selectedType === type && styles.segmentBtnActive]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.segmentText, selectedType === type && styles.segmentTextActive]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeSession && (
        <View style={styles.sessionBanner}>
          <View style={styles.sessionInfo}>
            <View style={styles.sessionDot} />
            <Text style={styles.sessionTimer}>{formatDuration(elapsed)}</Text>
          </View>
          <Text style={styles.sessionCount}>
            {climbCount} climb{climbCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <ScrollView style={styles.gradeList}>
        {grades[selectedType].map((grade) => (
          <View key={grade} style={styles.gradeRow}>
            <Text style={styles.gradeLabel}>{grade}</Text>
            <View style={styles.buttons}>
              <Pressable
                style={({ pressed }) => [styles.tickBtn, pressed && styles.tickBtnPressed]}
                onPress={() => handleLog(grade, 'send')}
              >
                <Text style={[styles.tickBtnText, styles.sendText]}>✓</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.attemptBtn, pressed && styles.attemptBtnPressed]}
                onPress={() => handleLog(grade, 'attempt')}
              >
                <Text style={[styles.attemptBtnText]}>○</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.fab, activeSession ? styles.fabEnd : styles.fabStart]}
        onPress={handleSessionToggle}
      >
        <Text style={styles.fabIcon}>{activeSession ? '■' : '▶'}</Text>
        <Text style={styles.fabText}>{activeSession ? 'End Session' : 'Start Session'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: colors.text,
  },
  sessionBanner: {
    backgroundColor: colors.success,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sessionDot: {
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  sessionTimer: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sessionCount: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.9,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.text,
  },
  segmentTextActive: {
    color: colors.primary,
  },
  gradeList: {
    flex: 1,
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 12,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gradeLabel: {
    fontSize: 17,
    fontWeight: '500',
    minWidth: 70,
    color: colors.text,
  },
  buttons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  tickBtn: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tickBtnPressed: {
    backgroundColor: colors.primary,
  },
  tickBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendText: {
    color: colors.primary,
  },
  attemptBtn: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  attemptBtnPressed: {
    backgroundColor: colors.warning,
  },
  attemptBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.warning,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: '-50%' }],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 10,
  },
  fabStart: {
    backgroundColor: colors.success,
  },
  fabEnd: {
    backgroundColor: colors.danger,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 14,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
