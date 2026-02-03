import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionSummary, ClimbType, GradeCount, Climb, GradeSettings } from '../types';
import { colors } from '../theme/colors';
import { generateSessionName } from '../utils/sessionUtils';
import { useSettings } from '../context/SettingsContext';
import { useClimbs } from '../context/ClimbContext';
import { getDisplayGrade } from '../utils/gradeUtils';

interface SessionSummaryModalProps {
  visible: boolean;
  summary: SessionSummary | null;
  isPaused?: boolean;
  onDismiss: (name?: string) => void;
  onResume?: (name?: string) => void;
  onFinish?: (name?: string) => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSessionDate(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

function GradePill({ grade, count, type, gradeSettings, variant }: { grade: string; count: number; type: ClimbType; gradeSettings: GradeSettings; variant: 'send' | 'attempt' }) {
  const displayGrade = getDisplayGrade({ grade, type } as Climb, gradeSettings);
  return (
    <View style={variant === 'send' ? styles.gradePill : styles.attemptPill}>
      <Text style={styles.gradePillText}>
        {displayGrade}{count > 1 ? ` ×${count}` : ''}
      </Text>
    </View>
  );
}

function TypeGradeSection({
  type,
  grades,
  gradeSettings,
}: {
  type: ClimbType;
  grades: GradeCount[];
  gradeSettings: GradeSettings;
}) {
  if (grades.length === 0) return null;

  // Build flat list of pills (sends first, then attempts for each grade)
  const allPills: { grade: string; count: number; variant: 'send' | 'attempt' }[] = [];
  grades.forEach(({ grade, sends, attempts }) => {
    if (sends > 0) {
      allPills.push({ grade, count: sends, variant: 'send' });
    }
    if (attempts > 0) {
      allPills.push({ grade, count: attempts, variant: 'attempt' });
    }
  });

  if (allPills.length === 0) return null;

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <View style={styles.typeSection}>
      <Text style={styles.typeSectionLabel}>{typeLabel}</Text>
      <View style={styles.gradePillsContainer}>
        {allPills.map(({ grade, count, variant }, idx) => (
          <GradePill key={`${grade}-${variant}-${idx}`} grade={grade} count={count} type={type} gradeSettings={gradeSettings} variant={variant} />
        ))}
      </View>
    </View>
  );
}

export function SessionSummaryModal({
  visible,
  summary,
  isPaused = false,
  onDismiss,
  onResume,
  onFinish,
}: SessionSummaryModalProps) {
  const { settings } = useSettings();
  const { sessionMetadata } = useClimbs();
  const [sessionName, setSessionName] = useState('');

  // Load the previously saved name when the modal opens
  useEffect(() => {
    if (visible && summary?.sessionId) {
      const savedName = sessionMetadata[summary.sessionId]?.name || '';
      setSessionName(savedName);
    }
  }, [visible, summary?.sessionId, sessionMetadata]);

  if (!summary) return null;

  const defaultName = generateSessionName(summary.startTime);

  const hasGrades =
    summary.gradesByType.boulder.length > 0 ||
    summary.gradesByType.sport.length > 0 ||
    summary.gradesByType.trad.length > 0;

  const handleDismiss = () => {
    const nameToSave = sessionName.trim() || undefined;
    onDismiss(nameToSave);
    setSessionName('');
  };

  const handleResume = () => {
    const nameToSave = sessionName.trim() || undefined;
    onResume?.(nameToSave);
    setSessionName('');
  };

  const handleFinish = () => {
    const nameToSave = sessionName.trim() || undefined;
    onFinish?.(nameToSave);
    setSessionName('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          {/* Header: Session name input at top */}
          <View style={styles.cardHeader}>
            <View style={styles.nameInputContainer}>
              <TextInput
                style={styles.nameInput}
                value={sessionName}
                onChangeText={setSessionName}
                placeholder={defaultName}
                placeholderTextColor={colors.textMuted}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <Ionicons name="pencil" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.cardSubtitle}>
              {formatSessionDate(summary.startTime)} at {formatTime(summary.startTime)} · {formatDuration(summary.duration)}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <Text style={styles.sendsStat}>{summary.sends} sends</Text>
            <Text style={styles.statsSeparator}> · </Text>
            <Text style={styles.attemptsStat}>{summary.attempts} attempts</Text>
          </View>

          {/* Grade breakdown by type */}
          {hasGrades && (
            <View style={styles.gradeBreakdownSection}>
              <TypeGradeSection
                type="boulder"
                grades={summary.gradesByType.boulder}
                gradeSettings={settings.grades}
              />
              <TypeGradeSection
                type="sport"
                grades={summary.gradesByType.sport}
                gradeSettings={settings.grades}
              />
              <TypeGradeSection
                type="trad"
                grades={summary.gradesByType.trad}
                gradeSettings={settings.grades}
              />
            </View>
          )}

          {/* Achievements */}
          {summary.achievements.length > 0 && (
            <View style={styles.achievements}>
              {summary.achievements.map((achievement, idx) => (
                <Text key={idx} style={styles.achievementText}>
                  {achievement.description}
                </Text>
              ))}
            </View>
          )}

          {isPaused ? (
            <View style={styles.buttonRow}>
              <Pressable style={styles.resumeButton} onPress={handleResume}>
                <Text style={styles.resumeButtonText}>Resume</Text>
              </Pressable>
              <Pressable style={styles.finishButton} onPress={handleFinish}>
                <Text style={styles.finishButtonText}>Finish</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.doneButton} onPress={handleDismiss}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 8,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  sendsStat: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  statsSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  attemptsStat: {
    fontSize: 14,
    color: colors.warning,
    fontWeight: '600',
  },
  gradeBreakdownSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  typeSection: {
    gap: 8,
  },
  typeSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gradePillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradePill: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attemptPill: {
    backgroundColor: colors.warning,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  gradePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  achievements: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  achievementText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  finishButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  finishButtonText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
});
