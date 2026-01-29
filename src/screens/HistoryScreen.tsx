import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClimbs } from '../context/ClimbContext';
import { Climb, ClimbType } from '../types';
import { grades } from '../data/grades';
import { colors } from '../theme/colors';

interface GroupedClimb extends Climb {
  index: number;
}

interface SessionData {
  id: string;
  climbs: GroupedClimb[];
  sends: number;
  attempts: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  maxGrade: string;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatTimeRange(startTime: string, endTime: string): string {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  return start === end ? start : `${start} - ${end}`;
}

function formatDuration(ms: number): string {
  const durationMins = Math.floor(ms / 60000);
  if (durationMins >= 60) {
    return `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;
  }
  return `${durationMins}m`;
}

function getMaxGrade(climbs: GroupedClimb[]): string {
  let maxGradeIdx = -1;
  let maxGradeType: ClimbType = 'boulder';

  climbs.forEach((c) => {
    const gradeArray = grades[c.type];
    const idx = gradeArray.indexOf(c.grade);
    if (idx > maxGradeIdx) {
      maxGradeIdx = idx;
      maxGradeType = c.type;
    }
  });

  return maxGradeIdx >= 0 ? grades[maxGradeType][maxGradeIdx] : '-';
}

export default function HistoryScreen() {
  const { climbs, deleteClimb, isLoading } = useClimbs();
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

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

  // Group climbs by date
  const groupedByDate: Record<string, GroupedClimb[]> = {};
  climbs.forEach((climb, index) => {
    const date = new Date(climb.timestamp);
    const dateKey = date.toDateString();
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push({ ...climb, index });
  });

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {sortedDates.map((dateKey) => {
          let label = dateKey;
          if (dateKey === today) label = 'Today';
          else if (dateKey === yesterday) label = 'Yesterday';

          const dayClimbs = groupedByDate[dateKey];

          // Separate climbs by session
          const sessionClimbs: Record<string, GroupedClimb[]> = {};
          const looseClimbs: GroupedClimb[] = [];

          dayClimbs.forEach((climb) => {
            if (climb.sessionId) {
              if (!sessionClimbs[climb.sessionId]) sessionClimbs[climb.sessionId] = [];
              sessionClimbs[climb.sessionId].push(climb);
            } else {
              looseClimbs.push(climb);
            }
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
                maxGrade: getMaxGrade(sClimbs),
              };
            })
            .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

          // Sort loose climbs
          const sortedLooseClimbs = looseClimbs.sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          return (
            <View key={dateKey} style={styles.section}>
              <Text style={styles.sectionHeader}>{label}</Text>

              {/* Render session cards */}
              {sessions.map((session) => {
                const isExpanded = expandedSessions.has(session.id);

                return (
                  <View key={session.id} style={styles.sessionCard}>
                    <Pressable
                      style={styles.sessionHeader}
                      onPress={() => toggleSession(session.id)}
                    >
                                            <View style={styles.sessionTitle}>
                        <Text style={styles.sessionTitleText}>Session</Text>
                        <Text style={styles.sessionTimeRange}>
                          {session.climbs.length} climbs · {formatTimeRange(session.startTime, session.endTime)} ·{' '}
                          {formatDuration(session.durationMs)}
                        </Text>
                      </View>
                      <View style={styles.sessionStats}>
                        <View style={styles.sessionStat}>
                          <Text style={styles.sessionStatValue}>{session.sends}</Text>
                          <Text style={styles.sessionStatLabel}>Sends</Text>
                        </View>
                        <View style={styles.sessionStat}>
                          <Text style={styles.sessionStatValue}>{session.attempts}</Text>
                          <Text style={styles.sessionStatLabel}>Att</Text>
                        </View>
                        <View style={styles.sessionStat}>
                          <Text style={styles.sessionStatValue}>{session.maxGrade}</Text>
                          <Text style={styles.sessionStatLabel}>Max</Text>
                        </View>
                      </View>
                      <Text style={styles.sessionChevron}>
                        {isExpanded ? '▼' : '▶'}
                      </Text>
                    </Pressable>

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
                  </View>
                );
              })}

              {/* Render loose climbs */}
              {sortedLooseClimbs.length > 0 && (
                <View style={styles.historyGroup}>
                  {sortedLooseClimbs.map((climb, idx) => (
                    <View
                      key={climb.id}
                      style={[
                        styles.historyItem,
                        idx === sortedLooseClimbs.length - 1 && styles.historyItemLast,
                      ]}
                    >
                      <Text
                        style={climb.status === 'attempt' ? styles.attemptIcon : styles.sendIcon}
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
            </View>
          );
        })}
      </ScrollView>
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
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 16,
  },
  // Session Card styles
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
  },
  sessionTitle: {
    flex: 1,
  },
  sessionTitleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sessionTimeRange: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionStats: {
    flexDirection: 'row',
    gap: 12,
    marginRight: 8,
  },
  sessionStat: {
    alignItems: 'center',
    minWidth: 36,
  },
  sessionStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sessionStatLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  sessionChevron: {
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
  historyGroup: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
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
    color: colors.warning,
    fontSize: 20,
    marginLeft: 12,
    padding: 4,
  },
});
