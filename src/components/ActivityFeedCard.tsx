import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { ActivityFeedItem, Climb, ClimbType, GradeSettings, GradeCount } from '../types';
import { useSettings } from '../context/SettingsContext';
import { getDisplayGrade, aggregateGradesByType } from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';

interface ActivityFeedCardProps {
  item: ActivityFeedItem;
  onProfilePress: (userId: string) => void;
  isOwnSession?: boolean;
  onMenuPress?: (item: ActivityFeedItem) => void;
}

function formatSessionTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const today = new Date();
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (date.toDateString() === today.toDateString()) {
    return `Today at ${time}`;
  }

  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${dateStr} at ${time}`;
}

function formatDuration(ms: number): string {
  const durationMins = Math.floor(ms / 60000);
  if (durationMins >= 60) {
    return `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`;
  }
  return `${durationMins}m`;
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

function buildPills(
  grades: GradeCount[]
): { grade: string; count: number; variant: 'send' | 'attempt' }[] {
  const pills: { grade: string; count: number; variant: 'send' | 'attempt' }[] = [];
  grades.slice(0, 4).forEach(({ grade, sends, attempts }) => {
    if (sends > 0) {
      pills.push({ grade, count: sends, variant: 'send' });
    }
    if (attempts > 0) {
      pills.push({ grade, count: attempts, variant: 'attempt' });
    }
  });
  return pills;
}

export default function ActivityFeedCard({
  item,
  onProfilePress,
  isOwnSession,
  onMenuPress,
}: ActivityFeedCardProps) {
  const { settings } = useSettings();
  const { user, metadata, createdAt, climbs } = item;

  const gradesByType = climbs
    ? aggregateGradesByType(climbs)
    : { boulder: [], sport: [], trad: [] };
  const boulderPills = buildPills(gradesByType.boulder);
  const sportPills = buildPills(gradesByType.sport);
  const tradPills = buildPills(gradesByType.trad);

  return (
    <Pressable style={styles.container} onPress={() => onProfilePress(item.userId)}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.userInfo} onPress={() => onProfilePress(item.userId)}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color={colors.textMuted} />
            </View>
          )}
          <View>
            <Text style={styles.userName}>{user?.displayName || 'Climber'}</Text>
            <Text style={styles.timestamp}>
              {formatSessionTimestamp(item.session?.startTime || createdAt)}
            </Text>
          </View>
        </Pressable>
        {isOwnSession && onMenuPress && (
          <Pressable
            style={styles.menuButton}
            onPress={(e) => {
              e.stopPropagation();
              onMenuPress(item);
            }}
            hitSlop={12}
          >
            <Text style={styles.menuButtonText}>•••</Text>
          </Pressable>
        )}
      </View>

      {/* Session Photo */}
      {item.session?.photoUrl && (
        <Image source={{ uri: item.session.photoUrl }} style={styles.sessionPhoto} />
      )}

      {/* Session Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.activityTitle}>{item.session?.name || 'Climbing Session'}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{metadata.sends}</Text>
            <Text style={styles.statLabel}>sends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{metadata.attempts}</Text>
            <Text style={styles.statLabel}>attempts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatDuration(metadata.duration)}</Text>
            <Text style={styles.statLabel}>duration</Text>
          </View>
        </View>

        {/* Grade Pills */}
        {(boulderPills.length > 0 || sportPills.length > 0 || tradPills.length > 0) && (
          <View style={styles.gradesSection}>
            {boulderPills.length > 0 && (
              <View style={styles.gradeTypeSection}>
                <Text style={styles.gradeTypeLabel}>Boulder</Text>
                <View style={styles.gradePillsRow}>
                  {boulderPills.map(({ grade, count, variant }, idx) => (
                    <GradePill
                      key={`${grade}-${variant}-${idx}`}
                      grade={grade}
                      count={count}
                      type="boulder"
                      gradeSettings={settings.grades}
                      variant={variant}
                    />
                  ))}
                </View>
              </View>
            )}
            {sportPills.length > 0 && (
              <View style={styles.gradeTypeSection}>
                <Text style={styles.gradeTypeLabel}>Sport</Text>
                <View style={styles.gradePillsRow}>
                  {sportPills.map(({ grade, count, variant }, idx) => (
                    <GradePill
                      key={`${grade}-${variant}-${idx}`}
                      grade={grade}
                      count={count}
                      type="sport"
                      gradeSettings={settings.grades}
                      variant={variant}
                    />
                  ))}
                </View>
              </View>
            )}
            {tradPills.length > 0 && (
              <View style={styles.gradeTypeSection}>
                <Text style={styles.gradeTypeLabel}>Trad</Text>
                <View style={styles.gradePillsRow}>
                  {tradPills.map(({ grade, count, variant }, idx) => (
                    <GradePill
                      key={`${grade}-${variant}-${idx}`}
                      grade={grade}
                      count={count}
                      type="trad"
                      gradeSettings={settings.grades}
                      variant={variant}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionPhoto: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  timestamp: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  summaryContainer: {
    padding: 16,
    paddingTop: 12,
  },
  activityTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  gradesSection: {
    gap: 12,
  },
  gradeTypeSection: {
    gap: 6,
  },
  gradeTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gradePillsRow: {
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
});
