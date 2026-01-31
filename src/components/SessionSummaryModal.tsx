import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SessionSummary, ClimbType, GradeCount } from '../types';
import { colors } from '../theme/colors';
import { generateSessionName } from '../utils/sessionUtils';

interface SessionSummaryModalProps {
  visible: boolean;
  summary: SessionSummary | null;
  isPaused?: boolean;
  onDismiss: (name?: string) => void;
  onResume?: () => void;
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

function GradePill({ grade, count }: { grade: string; count: number }) {
  return (
    <View style={styles.gradePill}>
      <Text style={styles.gradePillText}>
        {grade}{count > 1 ? ` ×${count}` : ''}
      </Text>
    </View>
  );
}

function TypeGradeSection({
  type,
  grades,
}: {
  type: ClimbType;
  grades: GradeCount[];
}) {
  if (grades.length === 0) return null;

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <View style={styles.typeSection}>
      <Text style={styles.typeSectionLabel}>{typeLabel}</Text>
      <View style={styles.gradePillsContainer}>
        {grades.map(({ grade, count }) => (
          <GradePill key={grade} grade={grade} count={count} />
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
  const [sessionName, setSessionName] = useState('');

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
    setSessionName('');
    onResume?.();
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
      <View style={styles.overlay}>
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
              />
              <Ionicons name="pencil" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.cardSubtitle}>
              {formatSessionDate(summary.startTime)} at {formatTime(summary.startTime)} · {formatDuration(summary.duration)}
            </Text>
          </View>

          {/* Stats row */}
          <Text style={styles.statsText}>
            {summary.sends} sends · {summary.attempts} attempts
          </Text>

          {/* Grade breakdown by type */}
          {hasGrades && (
            <View style={styles.gradeBreakdownSection}>
              <TypeGradeSection
                type="boulder"
                grades={summary.gradesByType.boulder}
              />
              <TypeGradeSection
                type="sport"
                grades={summary.gradesByType.sport}
              />
              <TypeGradeSection
                type="trad"
                grades={summary.gradesByType.trad}
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
      </View>
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
  statsText: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 4,
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
