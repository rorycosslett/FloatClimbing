import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClimbs } from '../context/ClimbContext';
import { grades } from '../data/grades';
import { ClimbType, SessionSummary, Climb } from '../types';
import { colors } from '../theme/colors';
import { SessionSummaryModal } from '../components/SessionSummaryModal';

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

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LogScreen() {
  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const [elapsed, setElapsed] = useState(0);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [sessionListExpanded, setSessionListExpanded] = useState(false);
  const { climbs, addClimb, deleteClimb, activeSession, startSession, endSession, getSessionClimbCount, renameSession } =
    useClimbs();

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
      const summary = endSession();
      if (summary) {
        setSessionSummary(summary);
        setSummaryModalVisible(true);
      } else {
        Toast.show({
          type: 'success',
          text1: 'Session ended',
          visibilityTime: 2000,
        });
      }
    } else {
      startSession();
      Toast.show({
        type: 'success',
        text1: 'Session started',
        visibilityTime: 2000,
      });
    }
  };

  const handleDismissSummary = (name?: string) => {
    if (sessionSummary && name) {
      renameSession(sessionSummary.sessionId, name);
    }
    setSummaryModalVisible(false);
    setSessionSummary(null);
  };

  const climbCount = getSessionClimbCount();

  const sessionClimbs = activeSession
    ? climbs
        .filter((c) => c.sessionId === activeSession.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    : [];

  const sends = sessionClimbs.filter((c) => c.status === 'send').length;
  const attempts = sessionClimbs.filter((c) => c.status === 'attempt').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Climb</Text>
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


      <View style={styles.splitContainer}>
        <ScrollView style={styles.gradeList}>
          {grades[selectedType].map((grade) => (
            <View key={grade} style={styles.gradeRow}>
              <Text style={[styles.gradeLabel, !activeSession && styles.gradeLabelDisabled]}>{grade}</Text>
              <View style={styles.buttons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.tickBtn,
                    pressed && activeSession && styles.tickBtnPressed,
                    !activeSession && styles.btnDisabled,
                  ]}
                  onPress={() => handleLog(grade, 'send')}
                  disabled={!activeSession}
                >
                  <Text style={[styles.tickBtnText, styles.sendText, !activeSession && styles.textDisabled]}>✓</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.attemptBtn,
                    pressed && activeSession && styles.attemptBtnPressed,
                    !activeSession && styles.btnDisabled,
                  ]}
                  onPress={() => handleLog(grade, 'attempt')}
                  disabled={!activeSession}
                >
                  <Text style={[styles.attemptBtnText, !activeSession && styles.textDisabled]}>○</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        {activeSession && (
          <View style={styles.sessionCard}>
            <Pressable
              style={styles.sessionCardHeader}
              onPress={() => setSessionListExpanded(!sessionListExpanded)}
            >
              <Text style={styles.sessionCardTitle}>Session Active</Text>
              <Text style={styles.sessionCardChevron}>
                {sessionListExpanded ? '▼' : '▲'}
              </Text>
            </Pressable>

            <View style={styles.sessionCardStats}>
              <View style={styles.sessionTimerRow}>
                <View style={styles.sessionDot} />
                <Text style={styles.sessionTimer}>{formatDuration(elapsed)}</Text>
              </View>
              <Text style={styles.sessionClimbCount}>
                {climbCount} climb{climbCount !== 1 ? 's' : ''}
              </Text>
            </View>

            <Text style={styles.sessionSendAttempts}>
              {sends} send{sends !== 1 ? 's' : ''} · {attempts} attempt{attempts !== 1 ? 's' : ''}
            </Text>

            {sessionListExpanded && (
              <>
                <View style={styles.sessionDivider} />
                <ScrollView style={styles.sessionClimbsList}>
                  {sessionClimbs.length === 0 ? (
                    <View style={styles.emptySessionList}>
                      <Text style={styles.emptySessionText}>No climbs yet</Text>
                    </View>
                  ) : (
                    sessionClimbs.map((climb, idx) => (
                      <View
                        key={climb.id}
                        style={[
                          styles.sessionClimbRow,
                          idx === sessionClimbs.length - 1 && styles.sessionClimbRowLast,
                        ]}
                      >
                        <Text style={climb.status === 'attempt' ? styles.attemptIcon : styles.sendIcon}>
                          {climb.status === 'attempt' ? '○' : '✓'}
                        </Text>
                        <Text style={styles.climbGrade}>{climb.grade}</Text>
                        {climb.type !== 'boulder' && (
                          <Text style={styles.climbType}>({climb.type})</Text>
                        )}
                        <Text style={styles.climbTime}>{formatTime(climb.timestamp)}</Text>
                        <Pressable onPress={() => deleteClimb(climb.id)} hitSlop={8}>
                          <Text style={styles.deleteBtn}>×</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </ScrollView>
              </>
            )}

            <Pressable style={styles.endSessionBtn} onPress={handleSessionToggle}>
              <Text style={styles.endSessionIcon}>■</Text>
              <Text style={styles.endSessionText}>End Session</Text>
            </Pressable>
          </View>
        )}
      </View>

      {!activeSession && (
        <Pressable
          style={[styles.fab, styles.fabStart]}
          onPress={handleSessionToggle}
        >
          <Text style={styles.fabIcon}>▶</Text>
          <Text style={styles.fabText}>Start Session</Text>
        </Pressable>
      )}

      <SessionSummaryModal
        visible={summaryModalVisible}
        summary={sessionSummary}
        onDismiss={handleDismissSummary}
      />
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
  splitContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  gradeList: {
    flex: 1,
    backgroundColor: colors.surface,
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
  gradeLabelDisabled: {
    color: colors.textMuted,
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
  btnDisabled: {
    borderColor: colors.border,
    opacity: 0.5,
  },
  textDisabled: {
    color: colors.textMuted,
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
    borderRadius: 12,
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
  fabIcon: {
    color: '#fff',
    fontSize: 14,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Floating session card styles
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sessionCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionCardChevron: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  sessionCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sessionTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionDot: {
    width: 8,
    height: 8,
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  sessionTimer: {
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: colors.text,
  },
  sessionClimbCount: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  sessionSendAttempts: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  sessionClimbsList: {
    maxHeight: 150,
  },
  emptySessionList: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySessionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sessionClimbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionClimbRowLast: {
    borderBottomWidth: 0,
  },
  sendIcon: {
    color: colors.primary,
    fontSize: 14,
    marginRight: 8,
    width: 18,
    textAlign: 'center',
  },
  attemptIcon: {
    color: colors.warning,
    fontSize: 14,
    marginRight: 8,
    width: 18,
    textAlign: 'center',
  },
  climbGrade: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  climbType: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  climbTime: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  deleteBtn: {
    color: colors.danger,
    fontSize: 18,
    marginLeft: 10,
    padding: 4,
  },
  endSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.textSecondary,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  endSessionIcon: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  endSessionText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
