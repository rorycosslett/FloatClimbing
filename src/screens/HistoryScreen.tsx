import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  EditSession: { sessionId: string; startTime: string; photoUrl?: string };
};
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useClimbs } from '../context/ClimbContext';
import { useSettings } from '../context/SettingsContext';
import { Climb, ClimbType, GradeSettings, GradeCount, GroupedClimb, SessionData } from '../types';
import { colors } from '../theme/colors';
import { getDisplayGrade, aggregateGradesByType } from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const durationMins = Math.floor(ms / 60000);
  if (durationMins >= 60) {
    return `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;
  }
  return `${durationMins}m`;
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
  const gradientColors = getGradeGradientColors(grade, type, gradeSettings);

  if (variant === 'attempt') {
    return (
      <View style={styles.attemptPill}>
        <Text style={styles.gradePillText}>
          {displayGrade}{count > 1 ? ` ×${count}` : ''}
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradePill}
    >
      <Text style={styles.gradePillText}>
        {displayGrade}{count > 1 ? ` ×${count}` : ''}
      </Text>
    </LinearGradient>
  );
}

function TypeGradeSection({
  type,
  grades: gradeList,
  expanded,
  onToggleExpand,
  gradeSettings,
}: {
  type: ClimbType;
  grades: GradeCount[];
  expanded: boolean;
  onToggleExpand: () => void;
  gradeSettings: GradeSettings;
}) {
  if (gradeList.length === 0) return null;

  // Build flat list of pills (sends first, then attempts for each grade)
  const allPills: { grade: string; count: number; variant: 'send' | 'attempt' }[] = [];
  gradeList.forEach(({ grade, sends, attempts }) => {
    if (sends > 0) {
      allPills.push({ grade, count: sends, variant: 'send' });
    }
    if (attempts > 0) {
      allPills.push({ grade, count: attempts, variant: 'attempt' });
    }
  });

  const maxVisible = 6;
  const hasMore = allPills.length > maxVisible;
  const visiblePills = expanded ? allPills : allPills.slice(0, maxVisible);
  const hiddenCount = allPills.length - maxVisible;

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <View style={styles.typeSection}>
      <Text style={styles.typeSectionLabel}>{typeLabel}</Text>
      <View style={styles.gradePillsContainer}>
        {visiblePills.map(({ grade, count, variant }, idx) => (
          <GradePill key={`${grade}-${variant}-${idx}`} grade={grade} count={count} type={type} gradeSettings={gradeSettings} variant={variant} />
        ))}
        {hasMore && !expanded && (
          <Pressable onPress={onToggleExpand} hitSlop={8}>
            <View style={styles.morePill}>
              <Text style={styles.morePillText}>+{hiddenCount} more</Text>
            </View>
          </Pressable>
        )}
        {hasMore && expanded && (
          <Pressable onPress={onToggleExpand} hitSlop={8}>
            <View style={styles.morePill}>
              <Text style={styles.morePillText}>show less</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { settings } = useSettings();
  const { climbs, deleteSession, isLoading, getSessionName, sessionMetadata } = useClimbs();
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuSession, setActionMenuSession] = useState<{ id: string; startTime: string; photoUrl?: string } | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const toggleGradeExpand = (sessionId: string, type: ClimbType) => {
    const key = `${sessionId}-${type}`;
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleOpenActionMenu = (sessionId: string, startTime: string, photoUrl?: string) => {
    setActionMenuSession({ id: sessionId, startTime, photoUrl });
    setActionMenuVisible(true);
  };

  const handleCloseActionMenu = () => {
    setActionMenuVisible(false);
    setActionMenuSession(null);
  };

  const handleEditFromMenu = () => {
    if (actionMenuSession) {
      navigation.navigate('EditSession', {
        sessionId: actionMenuSession.id,
        startTime: actionMenuSession.startTime,
        photoUrl: actionMenuSession.photoUrl,
      });
    }
    handleCloseActionMenu();
  };

  const handleDeleteFromMenu = () => {
    setActionMenuVisible(false);
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    if (actionMenuSession) {
      deleteSession(actionMenuSession.id);
    }
    setDeleteConfirmVisible(false);
    setActionMenuSession(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmVisible(false);
    setActionMenuSession(null);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Group climbs by session (flat list, no date grouping)
  const sessionClimbs: Record<string, GroupedClimb[]> = {};
  climbs.forEach((climb, index) => {
    if (!sessionClimbs[climb.sessionId]) sessionClimbs[climb.sessionId] = [];
    sessionClimbs[climb.sessionId].push({ ...climb, index });
  });

  // Build session data from climbs
  const sessions: SessionData[] = Object.keys(sessionClimbs)
    .map((sessionId) => {
      const sClimbs = sessionClimbs[sessionId].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const times = sClimbs.map((c) => new Date(c.timestamp).getTime());
      const startTime = new Date(Math.min(...times)).toISOString();
      const endTime = new Date(Math.max(...times)).toISOString();

      return {
        id: sessionId,
        climbs: sClimbs,
        sends: sClimbs.filter((c) => c.status !== 'attempt').length,
        attempts: sClimbs.filter((c) => c.status === 'attempt').length,
        startTime,
        endTime,
        durationMs: Math.max(...times) - Math.min(...times),
        gradesByType: aggregateGradesByType(sClimbs),
        photoUrl: sessionMetadata[sessionId]?.photoUrl,
      };
    });

  // Add empty sessions from metadata (sessions with no climbs)
  const sessionIdsWithClimbs = new Set(Object.keys(sessionClimbs));
  Object.entries(sessionMetadata).forEach(([sessionId, meta]) => {
    if (!sessionIdsWithClimbs.has(sessionId) && meta.startTime && meta.endTime) {
      sessions.push({
        id: sessionId,
        climbs: [],
        sends: 0,
        attempts: 0,
        startTime: meta.startTime,
        endTime: meta.endTime,
        durationMs: new Date(meta.endTime).getTime() - new Date(meta.startTime).getTime(),
        gradesByType: { boulder: [], sport: [], trad: [] },
        photoUrl: meta.photoUrl,
      });
    }
  });

  sessions.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

  if (sessions.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No sessions logged yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasGrades = (session: SessionData) =>
    session.gradesByType.boulder.length > 0 ||
    session.gradesByType.sport.length > 0 ||
    session.gradesByType.trad.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>History</Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {sessions.map((session) => (
            <Pressable
              key={session.id}
              style={styles.sessionCard}
              onPress={() => navigation.navigate('EditSession', {
                sessionId: session.id,
                startTime: session.startTime,
                photoUrl: session.photoUrl,
              })}
            >
              {/* Header: Title and date/time */}
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleSection}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {getSessionName(session.id, session.startTime)}
                  </Text>
                  <Pressable
                    style={styles.menuButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOpenActionMenu(session.id, session.startTime, session.photoUrl);
                    }}
                    hitSlop={12}
                  >
                    <Text style={styles.menuButtonText}>•••</Text>
                  </Pressable>
                </View>
                <Text style={styles.cardSubtitle}>
                  {formatSessionDate(session.startTime)} at {formatTime(session.startTime)} · {formatDuration(session.durationMs)}
                </Text>
              </View>

              {session.photoUrl && (
                <Image source={{ uri: session.photoUrl }} style={styles.sessionPhoto} />
              )}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <Text style={styles.sendsStat}>{session.sends} {session.sends === 1 ? 'send' : 'sends'}</Text>
                <Text style={styles.statsSeparator}> · </Text>
                <Text style={styles.attemptsStat}>{session.attempts} {session.attempts === 1 ? 'attempt' : 'attempts'}</Text>
              </View>

              {/* Grade breakdown by type */}
              {hasGrades(session) && (
                <View style={styles.gradeBreakdownSection}>
                  <TypeGradeSection
                    type="boulder"
                    grades={session.gradesByType.boulder}
                    expanded={expandedGrades.has(`${session.id}-boulder`)}
                    onToggleExpand={() => toggleGradeExpand(session.id, 'boulder')}
                    gradeSettings={settings.grades}
                  />
                  <TypeGradeSection
                    type="sport"
                    grades={session.gradesByType.sport}
                    expanded={expandedGrades.has(`${session.id}-sport`)}
                    onToggleExpand={() => toggleGradeExpand(session.id, 'sport')}
                    gradeSettings={settings.grades}
                  />
                  <TypeGradeSection
                    type="trad"
                    grades={session.gradesByType.trad}
                    expanded={expandedGrades.has(`${session.id}-trad`)}
                    onToggleExpand={() => toggleGradeExpand(session.id, 'trad')}
                    gradeSettings={settings.grades}
                  />
                </View>
              )}
            </Pressable>
          ))}
      </ScrollView>

      <Modal
        visible={actionMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseActionMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCloseActionMenu}>
          <Pressable style={styles.actionMenuContent} onPress={(e) => e.stopPropagation()}>
            <Pressable style={styles.actionMenuItem} onPress={handleEditFromMenu}>
              <Text style={styles.actionMenuText}>Edit Session</Text>
            </Pressable>
            <View style={styles.actionMenuDivider} />
            <Pressable style={styles.actionMenuItem} onPress={handleDeleteFromMenu}>
              <Text style={styles.actionMenuTextDanger}>Delete Session</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancelDelete}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Delete Session?</Text>
            <Text style={styles.deleteWarningText}>
              This will permanently delete this session and all of its climbs.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={handleCancelDelete}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalDeleteButton} onPress={handleConfirmDelete}>
                <Text style={styles.modalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Session Card styles - Strava-inspired larger cards
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 8,
  },
  sessionPhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  cardTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
    marginRight: -4,
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 6,
  },
  expandText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  expandChevron: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  sessionClimbs: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  sessionClimbItem: {
    backgroundColor: colors.surfaceSecondary,
  },
  // History item styles
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyItemLast: {
    borderBottomWidth: 0,
  },
  sendIcon: {
    color: colors.primary,
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  attemptIcon: {
    color: colors.warning,
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  grade: {
    fontSize: 17,
    fontWeight: '500',
    color: colors.text,
  },
  typeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  time: {
    fontSize: 15,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  deleteBtn: {
    color: colors.danger,
    fontSize: 20,
    marginLeft: 12,
    padding: 4,
  },
  modalOverlay: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.text,
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Grade breakdown styles
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
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 40,
    alignItems: 'center',
  },
  attemptPill: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  gradePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  morePill: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  morePillText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
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
    color: colors.textSecondary,
    fontWeight: '600',
  },
  actionMenuContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 280,
    overflow: 'hidden',
  },
  actionMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  actionMenuText: {
    fontSize: 17,
    color: colors.text,
  },
  actionMenuTextDanger: {
    fontSize: 17,
    color: colors.danger,
  },
  actionMenuDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  deleteWarningText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  modalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
