import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useClimbs } from '../context/ClimbContext';
import { useSettings } from '../context/SettingsContext';
import { useSocial } from '../context/SocialContext';
import { getGradesForSettings } from '../data/grades';
import { getSecondaryGrade } from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';
import { ClimbType, SessionSummary } from '../types';
import { colors } from '../theme/colors';
import { SessionSummaryModal } from '../components/SessionSummaryModal';
import { SwipeableClimbPill } from '../components/SwipeableClimbPill';
import { stravaService } from '../services/stravaService';
import { generateSessionName } from '../utils/sessionUtils';

type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  EditSession: { sessionId: string; startTime: string; photoUrl?: string };
};

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { settings } = useSettings();
  const { uploadSessionPhoto } = useSocial();
  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const [elapsed, setElapsed] = useState(0);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [sessionListExpanded, setSessionListExpanded] = useState(true);
  const { climbs, addClimb, deleteClimb, activeSession, startSession, endSession, pauseSession, resumeSession, getSessionClimbCount, renameSession, updateSessionPhotoUrl } =
    useClimbs();

  const currentGrades = getGradesForSettings(selectedType, settings.grades);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeSession) {
      const updateElapsed = () => {
        const start = new Date(activeSession.startTime).getTime();
        const pausedDuration = activeSession.pausedDuration || 0;

        // If paused, show elapsed time up to when it was paused
        if (activeSession.pausedAt) {
          const pausedAt = new Date(activeSession.pausedAt).getTime();
          setElapsed(pausedAt - start - pausedDuration);
        } else {
          setElapsed(Date.now() - start - pausedDuration);
        }
      };
      updateElapsed();
      // Only run interval if not paused
      if (!activeSession.pausedAt) {
        interval = setInterval(updateElapsed, 1000);
      }
    } else {
      setElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  const handleLog = (grade: string, status: 'send' | 'attempt') => {
    Haptics.impactAsync(
      status === 'send' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    addClimb(grade, selectedType, status);
    const message = status === 'attempt' ? `${grade} attempt logged` : `${grade} send logged`;
    Toast.show({
      type: 'success',
      text1: `✓ ${message}`,
      visibilityTime: 2000,
    });
  };

  const handlePauseSession = () => {
    if (activeSession) {
      const summary = pauseSession();
      if (summary) {
        setSessionSummary(summary);
        setSummaryModalVisible(true);
      }
    }
  };

  const handleStartSession = () => {
    startSession();
    Toast.show({
      type: 'success',
      text1: 'Session started',
      visibilityTime: 2000,
    });
  };

  const handleResume = (name?: string) => {
    if (sessionSummary && name) {
      renameSession(sessionSummary.sessionId, name);
    }
    resumeSession();
    setSummaryModalVisible(false);
    setSessionSummary(null);
    Toast.show({
      type: 'success',
      text1: 'Session resumed',
      visibilityTime: 2000,
    });
  };

  const handleFinish = async (name?: string, photoBase64?: string) => {
    const sessionId = sessionSummary?.sessionId;
    const startTime = sessionSummary?.startTime;
    const summarySnapshot = sessionSummary;

    endSession(name);
    setSummaryModalVisible(false);
    setSessionSummary(null);

    let photoUrl: string | undefined;
    if (photoBase64 && sessionId) {
      try {
        photoUrl = (await uploadSessionPhoto(sessionId, photoBase64)) || undefined;
        if (photoUrl) {
          updateSessionPhotoUrl(sessionId, photoUrl);
        }
      } catch (error) {
        console.error('Photo upload error:', error);
      }
    }

    if (sessionId && startTime) {
      navigation.navigate('EditSession', {
        sessionId,
        startTime,
        photoUrl,
      });
    }

    // Post to Strava (fire-and-forget, no-ops if not connected)
    if (summarySnapshot) {
      const resolvedName = name || generateSessionName(summarySnapshot.startTime);
      stravaService.createActivity(summarySnapshot, resolvedName, settings.grades)
        .then((result) => {
          console.log('Strava activity posted:', result.ok);
          if (result.ok && result.activityId && sessionId) {
            stravaService.saveStravaActivityId(sessionId, result.activityId)
              .catch((err) => console.error('Strava save ID error:', err));
          }
        })
        .catch((err) => console.error('Strava post error:', err));
    }

    Toast.show({
      type: 'success',
      text1: 'Session finished',
      visibilityTime: 2000,
    });
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
        <View style={styles.headerRow}>
          <Text style={styles.title}>Log Climb</Text>
          <Pressable
            onPress={() => navigation.navigate('Settings' as never)}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
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
        <View style={styles.columnHeaders}>
          <Text style={styles.columnHeaderText}>Attempts</Text>
          <Text style={styles.columnHeaderText}>Sends</Text>
        </View>
        <ScrollView style={styles.gradeList}>
          {currentGrades.map((grade, index) => {
            const secondaryGrade = getSecondaryGrade(grade, selectedType, settings.grades);
            const gradientColors = getGradeGradientColors(grade, selectedType, settings.grades);
            return (
              <View key={`${grade}-${index}`} style={styles.gradeRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.attemptPillWrapper,
                    pressed && activeSession && styles.attemptPillPressed,
                  ]}
                  onPress={() => handleLog(grade, 'attempt')}
                  disabled={!activeSession}
                >
                  <View style={[styles.attemptPillInner, !activeSession && styles.pillDisabled]}>
                    <View style={styles.pillContent}>
                      <Text style={[styles.pillText, !activeSession && styles.pillTextDisabled]}>{grade}</Text>
                      <Text style={[styles.pillSecondaryText, !activeSession && styles.pillTextDisabled]}>{secondaryGrade}</Text>
                    </View>
                  </View>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.sendPillWrapper,
                    pressed && activeSession && styles.sendPillPressed,
                  ]}
                  onPress={() => handleLog(grade, 'send')}
                  disabled={!activeSession}
                >
                  {activeSession ? (
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.sendPillGradient}
                    >
                      <View style={styles.pillContent}>
                        <Text style={styles.pillText}>{grade}</Text>
                        <Text style={styles.pillSecondaryText}>{secondaryGrade}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.sendPillGradient, styles.pillDisabled]}>
                      <View style={styles.pillContent}>
                        <Text style={[styles.pillText, styles.pillTextDisabled]}>{grade}</Text>
                        <Text style={[styles.pillSecondaryText, styles.pillTextDisabled]}>{secondaryGrade}</Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
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
                    <View style={styles.sessionClimbPillContainer}>
                      {sessionClimbs.map((climb) => (
                        <SwipeableClimbPill
                          key={climb.id}
                          climb={climb}
                          gradeSettings={settings.grades}
                          onDelete={() => deleteClimb(climb.id)}
                        />
                      ))}
                    </View>
                  )}
                </ScrollView>
              </>
            )}

            <Pressable style={styles.endSessionBtn} onPress={handlePauseSession}>
              <Text style={styles.endSessionIcon}>❚❚</Text>
              <Text style={styles.endSessionText}>Pause Session</Text>
            </Pressable>
          </View>
        )}
      </View>

      {!activeSession && (
        <Pressable
          style={[styles.fab, styles.fabStart]}
          onPress={handleStartSession}
        >
          <Text style={styles.fabIcon}>▶</Text>
          <Text style={styles.fabText}>Start Session</Text>
        </Pressable>
      )}

      <SessionSummaryModal
        visible={summaryModalVisible}
        summary={sessionSummary}
        isPaused={true}
        onDismiss={handleDismissSummary}
        onResume={handleResume}
        onFinish={handleFinish}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
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
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 48,
  },
  columnHeaders: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  columnHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  sendPillWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendPillGradient: {
    paddingHorizontal: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },
  sendPillPressed: {
    opacity: 0.8,
  },
  attemptPillWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attemptPillInner: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },
  attemptPillPressed: {
    opacity: 0.8,
  },
  pillDisabled: {
    backgroundColor: colors.border,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 6,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    width: 44,
    textAlign: 'center',
  },
  pillSecondaryText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#ffffff',
    opacity: 0.7,
    width: 34,
    textAlign: 'left',
  },
  pillTextDisabled: {
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
    maxHeight: 125,
  },
  emptySessionList: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySessionText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sessionClimbPillContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
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
