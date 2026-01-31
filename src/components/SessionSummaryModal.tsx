import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SessionSummary, ClimbType } from '../types';
import { colors } from '../theme/colors';
import { generateSessionName } from '../utils/sessionUtils';

interface SessionSummaryModalProps {
  visible: boolean;
  summary: SessionSummary | null;
  onDismiss: (name?: string) => void;
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

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MaxGradeRow({ type, grade }: { type: string; grade: string }) {
  return (
    <View style={styles.maxGradeRow}>
      <Text style={styles.maxGradeType}>{type}</Text>
      <Text style={styles.maxGradeValue}>{grade}</Text>
    </View>
  );
}

export function SessionSummaryModal({
  visible,
  summary,
  onDismiss,
}: SessionSummaryModalProps) {
  const [sessionName, setSessionName] = useState('');

  if (!summary) return null;

  const defaultName = generateSessionName(summary.startTime);

  const maxGradeEntries = (
    Object.entries(summary.maxGradeByType) as [ClimbType, string | null][]
  ).filter(([, grade]) => grade !== null);

  const handleDismiss = () => {
    const nameToSave = sessionName.trim() || undefined;
    onDismiss(nameToSave);
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
          <Text style={styles.title}>Session Complete</Text>

          <Text style={styles.duration}>{formatDuration(summary.duration)}</Text>

          <View style={styles.statsGrid}>
            <StatBox label="Total" value={summary.totalClimbs} />
            <StatBox label="Sends" value={summary.sends} />
            <StatBox label="Attempts" value={summary.attempts} />
          </View>

          {maxGradeEntries.length > 0 && (
            <View style={styles.maxGrades}>
              <Text style={styles.sectionLabel}>Max Grade</Text>
              {maxGradeEntries.map(([type, grade]) => (
                <MaxGradeRow
                  key={type}
                  type={type.charAt(0).toUpperCase() + type.slice(1)}
                  grade={grade!}
                />
              ))}
            </View>
          )}

          {summary.achievements.length > 0 && (
            <View style={styles.achievements}>
              {summary.achievements.map((achievement, idx) => (
                <Text key={idx} style={styles.achievementText}>
                  {achievement.description}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.nameInputContainer}>
            <Text style={styles.nameLabel}>Session Name</Text>
            <TextInput
              style={styles.nameInput}
              value={sessionName}
              onChangeText={setSessionName}
              placeholder={defaultName}
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />
          </View>

          <Pressable style={styles.doneButton} onPress={handleDismiss}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  duration: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  maxGrades: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  maxGradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  maxGradeType: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  maxGradeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  achievements: {
    marginBottom: 20,
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
  nameInputContainer: {
    marginBottom: 20,
  },
  nameLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
