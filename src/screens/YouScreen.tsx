import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useClimbs } from '../context/ClimbContext';
import { useSettings } from '../context/SettingsContext';
import { Climb, ClimbType, GradeSettings, GradeCount, GroupedClimb, SessionData } from '../types';
import { colors } from '../theme/colors';
import {
  getDisplayGrade,
  getNormalizedGradeIndex,
  aggregateGradesByType,
} from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';
import GradeProgressionChart from '../components/charts/GradeProgressionChart';
import WeeklyActivityChart from '../components/charts/WeeklyActivityChart';
import GradeDistributionChart from '../components/charts/GradeDistributionChart';
import SessionCalendarChart from '../components/charts/SessionCalendarChart';

type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  EditSession: { sessionId: string; startTime: string; photoUrl?: string };
  SearchUsers: undefined;
};

type TabType = 'history' | 'insights';
const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];

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

function GradePill({
  grade,
  count,
  type,
  gradeSettings,
  variant,
}: {
  grade: string;
  count: number;
  type: ClimbType;
  gradeSettings: GradeSettings;
  variant: 'send' | 'attempt';
}) {
  const displayGrade = getDisplayGrade({ grade, type } as Climb, gradeSettings);
  const gradientColors = getGradeGradientColors(grade, type, gradeSettings);

  if (variant === 'attempt') {
    return (
      <View style={styles.attemptPill}>
        <Text style={styles.gradePillText}>
          {displayGrade}
          {count > 1 ? ` ×${count}` : ''}
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
        {displayGrade}
        {count > 1 ? ` ×${count}` : ''}
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
          <GradePill
            key={`${grade}-${variant}-${idx}`}
            grade={grade}
            count={count}
            type={type}
            gradeSettings={gradeSettings}
            variant={variant}
          />
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

// ============================================
// HISTORY TAB CONTENT
// ============================================

function HistoryContent() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { settings } = useSettings();
  const { climbs, deleteSession, isLoading, getSessionName, sessionMetadata } = useClimbs();
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuSession, setActionMenuSession] = useState<{
    id: string;
    startTime: string;
    photoUrl?: string;
  } | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

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
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  // Group climbs by session
  const sessionClimbs: Record<string, GroupedClimb[]> = {};
  climbs.forEach((climb, index) => {
    if (!sessionClimbs[climb.sessionId]) sessionClimbs[climb.sessionId] = [];
    sessionClimbs[climb.sessionId].push({ ...climb, index });
  });

  // Build session data from climbs
  const sessions: SessionData[] = Object.keys(sessionClimbs).map((sessionId) => {
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
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>No sessions logged yet</Text>
      </View>
    );
  }

  const hasGrades = (session: SessionData) =>
    session.gradesByType.boulder.length > 0 ||
    session.gradesByType.sport.length > 0 ||
    session.gradesByType.trad.length > 0;

  return (
    <>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {sessions.map((session) => (
          <Pressable
            key={session.id}
            style={styles.sessionCard}
            onPress={() =>
              navigation.navigate('EditSession', {
                sessionId: session.id,
                startTime: session.startTime,
                photoUrl: session.photoUrl,
              })
            }
          >
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
                  <Text style={styles.menuButtonText}>...</Text>
                </Pressable>
              </View>
              <Text style={styles.cardSubtitle}>
                {formatSessionDate(session.startTime)} at {formatTime(session.startTime)} .{' '}
                {formatDuration(session.durationMs)}
              </Text>
            </View>

            {session.photoUrl && (
              <Image source={{ uri: session.photoUrl }} style={styles.sessionPhoto} />
            )}

            <View style={styles.sessionStatsRow}>
              <View style={styles.sessionStatItem}>
                <Text style={styles.sessionStatValue}>{session.sends}</Text>
                <Text style={styles.sessionStatLabel}>
                  {session.sends === 1 ? 'send' : 'sends'}
                </Text>
              </View>
              <View style={styles.sessionStatDivider} />
              <View style={styles.sessionStatItem}>
                <Text style={styles.sessionStatValue}>{session.attempts}</Text>
                <Text style={styles.sessionStatLabel}>
                  {session.attempts === 1 ? 'attempt' : 'attempts'}
                </Text>
              </View>
              <View style={styles.sessionStatDivider} />
              <View style={styles.sessionStatItem}>
                <Text style={styles.sessionStatValue}>{formatDuration(session.durationMs)}</Text>
                <Text style={styles.sessionStatLabel}>duration</Text>
              </View>
            </View>

            {hasGrades(session) && (
              <View style={styles.gradeBreakdownSection}>
                <TypeGradeSection
                  type="boulder"
                  grades={session.gradesByType.boulder}
                  expanded={expandedGrades.has(`${session.id}-boulder`)}
                  onToggleExpand={() =>
                    setExpandedGrades((prev) => {
                      const next = new Set(prev);
                      const key = `${session.id}-boulder`;
                      if (next.has(key)) {
                        next.delete(key);
                      } else {
                        next.add(key);
                      }
                      return next;
                    })
                  }
                  gradeSettings={settings.grades}
                />
                <TypeGradeSection
                  type="sport"
                  grades={session.gradesByType.sport}
                  expanded={expandedGrades.has(`${session.id}-sport`)}
                  onToggleExpand={() =>
                    setExpandedGrades((prev) => {
                      const next = new Set(prev);
                      const key = `${session.id}-sport`;
                      if (next.has(key)) {
                        next.delete(key);
                      } else {
                        next.add(key);
                      }
                      return next;
                    })
                  }
                  gradeSettings={settings.grades}
                />
                <TypeGradeSection
                  type="trad"
                  grades={session.gradesByType.trad}
                  expanded={expandedGrades.has(`${session.id}-trad`)}
                  onToggleExpand={() =>
                    setExpandedGrades((prev) => {
                      const next = new Set(prev);
                      const key = `${session.id}-trad`;
                      if (next.has(key)) {
                        next.delete(key);
                      } else {
                        next.add(key);
                      }
                      return next;
                    })
                  }
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
    </>
  );
}

// ============================================
// INSIGHTS TAB CONTENT
// ============================================

function InsightsContent() {
  const { settings } = useSettings();
  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const { climbs, isLoading } = useClimbs();

  const stats = useMemo(() => {
    const typeClimbs = climbs.filter((c) => c.type === selectedType);
    const now = new Date();
    const weeksToShow = 12;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    const recentClimbs = typeClimbs.filter((c) => {
      const d = new Date(c.timestamp);
      return d >= new Date(now.getTime() - weeksToShow * oneWeekMs);
    });

    let maxGradeIndex = -1;
    let maxGradeClimb: Climb | null = null;
    recentClimbs
      .filter((c) => c.status === 'send')
      .forEach((c) => {
        const idx = getNormalizedGradeIndex(c.grade, c.type);
        if (idx > maxGradeIndex) {
          maxGradeIndex = idx;
          maxGradeClimb = c;
        }
      });

    let allTimeMaxIdx = -1;
    let allTimeMaxClimb: Climb | null = null;
    typeClimbs
      .filter((c) => c.status === 'send')
      .forEach((c) => {
        const idx = getNormalizedGradeIndex(c.grade, c.type);
        if (idx > allTimeMaxIdx) {
          allTimeMaxIdx = idx;
          allTimeMaxClimb = c;
        }
      });

    const allTimeDates = typeClimbs
      .map((c) => new Date(c.timestamp))
      .sort((a, b) => a.getTime() - b.getTime());
    const firstTick = allTimeDates.length > 0 ? allTimeDates[0] : null;
    const daysSinceFirst = firstTick
      ? Math.floor((now.getTime() - firstTick.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    const formatDate = (d: Date) => {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      return `${months[d.getMonth()]} ${d.getDate()}`;
    };

    return {
      recentTotal: recentClimbs.length,
      recentSends: recentClimbs.filter((c) => c.status === 'send').length,
      recentAttempts: recentClimbs.filter((c) => c.status === 'attempt').length,
      recentMaxGrade: maxGradeClimb ? getDisplayGrade(maxGradeClimb, settings.grades) : '-',
      allTimeTotal: typeClimbs.length,
      allTimeSends: typeClimbs.filter((c) => c.status === 'send').length,
      allTimeMaxGrade: allTimeMaxClimb ? getDisplayGrade(allTimeMaxClimb, settings.grades) : '-',
      daysSinceFirst,
      firstTick: firstTick ? formatDate(firstTick) : '-',
      weeksToShow,
    };
  }, [climbs, selectedType, settings.grades]);

  if (isLoading) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.typeSelector}>
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {climbs.length === 0 || stats.recentTotal === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No climbs logged yet.{'\n'}Log some climbs to see your report!
            </Text>
          </View>
        ) : (
          <>
            <GradeDistributionChart climbs={climbs} type={selectedType} />
            <SessionCalendarChart climbs={climbs} type={selectedType} />
            <GradeProgressionChart climbs={climbs} type={selectedType} />
            <WeeklyActivityChart climbs={climbs} type={selectedType} />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Summary ({stats.weeksToShow} Weeks)</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.recentSends}</Text>
                  <Text style={styles.statLabel}>Sends</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.recentAttempts}</Text>
                  <Text style={styles.statLabel}>Attempts</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.recentMaxGrade}</Text>
                  <Text style={styles.statLabel}>Highest Send</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.recentTotal}</Text>
                  <Text style={styles.statLabel}>Total Climbs</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>All Time</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.allTimeSends}</Text>
                  <Text style={styles.statLabel}>Total Sends</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.allTimeMaxGrade}</Text>
                  <Text style={styles.statLabel}>Highest Send</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.daysSinceFirst}</Text>
                  <Text style={styles.statLabel}>Days Climbing</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{stats.firstTick}</Text>
                  <Text style={styles.statLabel}>First Tick</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

// ============================================
// MAIN SCREEN
// ============================================

export default function YouScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = useState<TabType>('history');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>You</Text>
          <View style={styles.headerButtons}>
            <Pressable
              onPress={() => navigation.navigate('SearchUsers')}
              style={styles.headerButton}
            >
              <Ionicons name="person-add-outline" size={22} color={colors.text} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate('Settings')} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={24} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.tabControl}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'insights' && styles.tabBtnActive]}
            onPress={() => setActiveTab('insights')}
          >
            <Text style={[styles.tabText, activeTab === 'insights' && styles.tabTextActive]}>
              Insights
            </Text>
          </Pressable>
        </View>
      </View>

      {activeTab === 'history' ? <HistoryContent /> : <InsightsContent />}
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
  headerButtons: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  tabControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  typeSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
    textAlign: 'center',
  },
  // Session card styles
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    padding: 16,
    paddingBottom: 12,
  },
  sessionPhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 12,
  },
  cardTitleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
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
  sessionStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sessionStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  sessionStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sessionStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sessionStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  gradeBreakdownSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  typeSection: {
    gap: 6,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  attemptPill: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  gradePillText: {
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  // Modal styles
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
  deleteWarningText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
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
  // Insights card styles
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    width: '47%',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
