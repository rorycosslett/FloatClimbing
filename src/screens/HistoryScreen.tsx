import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClimbs } from '../context/ClimbContext';
import { Climb, ClimbType } from '../types';
import { colors } from '../theme/colors';
import { grades } from '../data/grades';

interface GroupedClimb extends Climb {
  index: number;
}

interface GradeCount {
  grade: string;
  count: number;
}

interface TypeGradeBreakdown {
  boulder: GradeCount[];
  sport: GradeCount[];
  trad: GradeCount[];
}

interface SessionData {
  id: string;
  climbs: GroupedClimb[];
  sends: number;
  attempts: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  gradesByType: TypeGradeBreakdown;
}

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

function getGradeIndex(grade: string, type: ClimbType): number {
  return grades[type].indexOf(grade);
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
  grades: gradeList,
  expanded,
  onToggleExpand,
}: {
  type: ClimbType;
  grades: GradeCount[];
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  if (gradeList.length === 0) return null;

  const maxVisible = 6;
  const hasMore = gradeList.length > maxVisible;
  const visibleGrades = expanded ? gradeList : gradeList.slice(0, maxVisible);
  const hiddenCount = gradeList.length - maxVisible;

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <View style={styles.typeSection}>
      <Text style={styles.typeSectionLabel}>{typeLabel}</Text>
      <View style={styles.gradePillsContainer}>
        {visibleGrades.map(({ grade, count }) => (
          <GradePill key={grade} grade={grade} count={count} />
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

function aggregateGradesByType(climbs: GroupedClimb[]): TypeGradeBreakdown {
  const result: TypeGradeBreakdown = {
    boulder: [],
    sport: [],
    trad: [],
  };

  // Only count sends
  const sends = climbs.filter((c) => c.status === 'send');

  // Count grades per type
  const countMap: Record<ClimbType, Record<string, number>> = {
    boulder: {},
    sport: {},
    trad: {},
  };

  sends.forEach((climb) => {
    if (!countMap[climb.type][climb.grade]) {
      countMap[climb.type][climb.grade] = 0;
    }
    countMap[climb.type][climb.grade]++;
  });

  // Convert to sorted arrays (highest grade first)
  (['boulder', 'sport', 'trad'] as ClimbType[]).forEach((type) => {
    result[type] = Object.entries(countMap[type])
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => getGradeIndex(b.grade, type) - getGradeIndex(a.grade, type));
  });

  return result;
}

export default function HistoryScreen() {
  const { climbs, deleteClimb, isLoading, getSessionName, renameSession } = useClimbs();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<{ id: string; startTime: string } | null>(
    null
  );
  const [editingName, setEditingName] = useState('');

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

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

  const handleOpenRename = (sessionId: string, startTime: string) => {
    setEditingSession({ id: sessionId, startTime });
    setEditingName(getSessionName(sessionId, startTime));
    setRenameModalVisible(true);
  };

  const handleSaveRename = () => {
    if (editingSession && editingName.trim()) {
      renameSession(editingSession.id, editingName.trim());
    }
    setRenameModalVisible(false);
    setEditingSession(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setRenameModalVisible(false);
    setEditingSession(null);
    setEditingName('');
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

  if (climbs.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No climbs logged yet</Text>
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

  // Build session data
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
      };
    })
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

  const hasGrades = (session: SessionData) =>
    session.gradesByType.boulder.length > 0 ||
    session.gradesByType.sport.length > 0 ||
    session.gradesByType.trad.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {sessions.map((session) => {
          const isExpanded = expandedSessions.has(session.id);

          return (
            <Pressable
              key={session.id}
              style={styles.sessionCard}
              onPress={() => toggleSession(session.id)}
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
                      handleOpenRename(session.id, session.startTime);
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

              {/* Stats row */}
              <Text style={styles.statsText}>
                {session.sends} sends · {session.attempts} attempts
              </Text>

              {/* Grade breakdown by type */}
              {hasGrades(session) && (
                <View style={styles.gradeBreakdownSection}>
                  <TypeGradeSection
                    type="boulder"
                    grades={session.gradesByType.boulder}
                    expanded={expandedGrades.has(`${session.id}-boulder`)}
                    onToggleExpand={() => toggleGradeExpand(session.id, 'boulder')}
                  />
                  <TypeGradeSection
                    type="sport"
                    grades={session.gradesByType.sport}
                    expanded={expandedGrades.has(`${session.id}-sport`)}
                    onToggleExpand={() => toggleGradeExpand(session.id, 'sport')}
                  />
                  <TypeGradeSection
                    type="trad"
                    grades={session.gradesByType.trad}
                    expanded={expandedGrades.has(`${session.id}-trad`)}
                    onToggleExpand={() => toggleGradeExpand(session.id, 'trad')}
                  />
                </View>
              )}

              {/* Expand indicator */}
              <View style={styles.expandRow}>
                <Text style={styles.expandText}>
                  {isExpanded ? 'Hide details' : `View ${session.climbs.length} climbs`}
                </Text>
                <Text style={styles.expandChevron}>{isExpanded ? '▲' : '▼'}</Text>
              </View>

              {isExpanded && (
                <View style={styles.sessionClimbs}>
                  {session.climbs.map((climb, idx) => (
                    <View
                      key={climb.id}
                      style={[
                        styles.historyItem,
                        styles.sessionClimbItem,
                        idx === session.climbs.length - 1 && styles.historyItemLast,
                      ]}
                    >
                      <Text
                        style={
                          climb.status === 'attempt' ? styles.attemptIcon : styles.sendIcon
                        }
                      >
                        {climb.status === 'attempt' ? '○' : '✓'}
                      </Text>
                      <Text style={styles.grade}>{climb.grade}</Text>
                      {climb.type !== 'boulder' && (
                        <Text style={styles.typeLabel}>({climb.type})</Text>
                      )}
                      <Text style={styles.time}>{formatTime(climb.timestamp)}</Text>
                      <Pressable onPress={() => deleteClimb(climb.id)} hitSlop={8}>
                        <Text style={styles.deleteBtn}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelRename}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancelRename}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Rename Session</Text>
            <TextInput
              style={styles.modalInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Session name"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelButton} onPress={handleCancelRename}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveButton} onPress={handleSaveRename}>
                <Text style={styles.modalSaveText}>Save</Text>
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
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
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
  },
  cardHeader: {
    padding: 20,
    paddingBottom: 8,
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
  statsText: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
});
