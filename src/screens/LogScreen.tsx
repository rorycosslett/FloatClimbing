import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClimbs } from '../context/ClimbContext';
import { grades } from '../data/grades';
import { ClimbType } from '../types';

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
    Alert.alert('', `✓ ${message}`, [{ text: 'OK' }], { cancelable: true });
  };

  const handleSessionToggle = () => {
    if (activeSession) {
      const count = endSession();
      Alert.alert('', `Session ended - ${count} climb${count !== 1 ? 's' : ''}`, [{ text: 'OK' }], { cancelable: true });
    } else {
      startSession();
      Alert.alert('', 'Session started', [{ text: 'OK' }], { cancelable: true });
    }
  };

  const climbCount = getSessionClimbCount();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Log Climb/Attempt</Text>
          <Pressable
            style={[styles.sessionBtn, activeSession ? styles.sessionBtnEnd : styles.sessionBtnStart]}
            onPress={handleSessionToggle}
          >
            <Text style={styles.sessionBtnText}>
              {activeSession ? 'End Session' : 'Start Session'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.segmentControl}>
          {CLIMB_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[
                styles.segmentBtn,
                selectedType === type && styles.segmentBtnActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedType === type && styles.segmentTextActive,
                ]}
              >
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
                style={({ pressed }) => [
                  styles.tickBtn,
                  pressed && styles.tickBtnPressed,
                ]}
                onPress={() => handleLog(grade, 'send')}
              >
                <Text style={[styles.tickBtnText, styles.sendText]}>✓</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.attemptBtn,
                  pressed && styles.attemptBtnPressed,
                ]}
                onPress={() => handleLog(grade, 'attempt')}
              >
                <Text style={[styles.attemptBtnText]}>○</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  sessionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  sessionBtnStart: {
    backgroundColor: '#34c759',
  },
  sessionBtnEnd: {
    backgroundColor: '#ff3b30',
  },
  sessionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sessionBanner: {
    backgroundColor: '#34c759',
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
    backgroundColor: '#e5e5ea',
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
    backgroundColor: '#fff',
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
    color: '#333',
  },
  segmentTextActive: {
    color: '#007aff',
  },
  gradeList: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  gradeLabel: {
    fontSize: 17,
    fontWeight: '500',
    minWidth: 70,
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
    borderColor: '#007aff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tickBtnPressed: {
    backgroundColor: '#007aff',
  },
  tickBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendText: {
    color: '#007aff',
  },
  attemptBtn: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: '#ff6b35',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  attemptBtnPressed: {
    backgroundColor: '#ff6b35',
  },
  attemptBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b35',
  },
});
