import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSocial } from '../context/SocialContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { ProfileWithStats, Session, Climb, ClimbType, GradeSettings } from '../types';
import { getDisplayGrade, getNormalizedGradeIndex } from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';
import FollowButton from '../components/FollowButton';

type RootStackParamList = {
  Main: undefined;
  Profile: { userId: string };
  FollowList: { userId: string; initialTab: 'followers' | 'following' };
};

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;

interface SessionWithClimbs extends Session {
  climbs: Climb[];
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
      month: 'short',
      day: 'numeric',
    });
  }
}

function formatDuration(startTime: string, endTime?: string): string {
  if (!endTime) return '';
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
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
}: {
  grade: string;
  count: number;
  type: ClimbType;
  gradeSettings: GradeSettings;
}) {
  const displayGrade = getDisplayGrade({ grade, type } as Climb, gradeSettings);
  const gradientColors = getGradeGradientColors(grade, type, gradeSettings);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 1, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradePill}
    >
      <Text style={styles.gradePillText}>
        {displayGrade}
        {count > 1 ? ` x${count}` : ''}
      </Text>
    </LinearGradient>
  );
}

function aggregateSendGrades(climbs: Climb[], type: ClimbType): { grade: string; count: number }[] {
  const countMap: Record<string, number> = {};

  climbs
    .filter((c) => c.type === type && c.status === 'send')
    .forEach((c) => {
      countMap[c.grade] = (countMap[c.grade] || 0) + 1;
    });

  return Object.entries(countMap)
    .map(([grade, count]) => ({ grade, count }))
    .sort((a, b) => getNormalizedGradeIndex(b.grade, type) - getNormalizedGradeIndex(a.grade, type))
    .slice(0, 4);
}

function SessionCard({
  session,
  climbs,
  gradeSettings,
}: {
  session: Session;
  climbs: Climb[];
  gradeSettings: GradeSettings;
}) {
  const sends = climbs.filter((c) => c.status === 'send').length;
  const attempts = climbs.filter((c) => c.status === 'attempt').length;

  const boulderGrades = aggregateSendGrades(climbs, 'boulder');
  const sportGrades = aggregateSendGrades(climbs, 'sport');
  const tradGrades = aggregateSendGrades(climbs, 'trad');

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionDate}>{formatSessionDate(session.startTime)}</Text>
        {session.endTime && (
          <Text style={styles.sessionDuration}>
            {formatDuration(session.startTime, session.endTime)}
          </Text>
        )}
      </View>

      <View style={styles.sessionStats}>
        <Text style={styles.sendsStat}>{sends} sends</Text>
        <Text style={styles.statsSeparator}> . </Text>
        <Text style={styles.attemptsStat}>{attempts} attempts</Text>
      </View>

      {(boulderGrades.length > 0 || sportGrades.length > 0 || tradGrades.length > 0) && (
        <View style={styles.gradesContainer}>
          {boulderGrades.length > 0 && (
            <View style={styles.gradeRow}>
              {boulderGrades.map(({ grade, count }) => (
                <GradePill
                  key={grade}
                  grade={grade}
                  count={count}
                  type="boulder"
                  gradeSettings={gradeSettings}
                />
              ))}
            </View>
          )}
          {sportGrades.length > 0 && (
            <View style={styles.gradeRow}>
              {sportGrades.map(({ grade, count }) => (
                <GradePill
                  key={grade}
                  grade={grade}
                  count={count}
                  type="sport"
                  gradeSettings={gradeSettings}
                />
              ))}
            </View>
          )}
          {tradGrades.length > 0 && (
            <View style={styles.gradeRow}>
              {tradGrades.map(({ grade, count }) => (
                <GradePill
                  key={grade}
                  grade={grade}
                  count={count}
                  type="trad"
                  gradeSettings={gradeSettings}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ProfileScreenRouteProp>();
  const { userId } = route.params;
  const { user } = useAuth();
  const { settings } = useSettings();
  const { getProfile, getUserSessions, getSessionClimbs, followUser, unfollowUser } = useSocial();

  const [profile, setProfile] = useState<ProfileWithStats | null>(null);
  const [sessions, setSessions] = useState<SessionWithClimbs[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = user?.id === userId;

  useEffect(() => {
    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [profileData, sessionsData] = await Promise.all([
        getProfile(userId),
        getUserSessions(userId, 5),
      ]);

      setProfile(profileData);

      // Load climbs for each session
      const sessionsWithClimbs = await Promise.all(
        sessionsData.map(async (session) => {
          const climbs = await getSessionClimbs(session.id);
          return { ...session, climbs };
        })
      );

      setSessions(sessionsWithClimbs);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    const success = await followUser(userId);
    if (success && profile) {
      setProfile({
        ...profile,
        isFollowing: true,
        followerCount: profile.followerCount + 1,
      });
    }
    return success;
  };

  const handleUnfollow = async () => {
    const success = await unfollowUser(userId);
    if (success && profile) {
      setProfile({
        ...profile,
        isFollowing: false,
        followerCount: Math.max(0, profile.followerCount - 1),
      });
    }
    return success;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>User not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={colors.textMuted} />
            </View>
          )}

          <Text style={styles.displayName}>{profile.displayName || 'Climber'}</Text>

          <View style={styles.statsContainer}>
            <Pressable
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowList', { userId, initialTab: 'followers' })}
            >
              <Text style={styles.statNumber}>{profile.followerCount}</Text>
              <Text style={styles.statLabel}>
                {profile.followerCount === 1 ? 'Follower' : 'Followers'}
              </Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowList', { userId, initialTab: 'following' })}
            >
              <Text style={styles.statNumber}>{profile.followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
          </View>

          {!isOwnProfile && (
            <FollowButton
              isFollowing={profile.isFollowing}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
            />
          )}
        </View>

        {/* Recent Sessions */}
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>

          {sessions.length === 0 ? (
            <View style={styles.noSessions}>
              <Text style={styles.noSessionsText}>No sessions yet</Text>
            </View>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                climbs={session.climbs}
                gradeSettings={settings.grades}
              />
            ))
          )}
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  // Sessions Section
  sessionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  noSessions: {
    padding: 24,
    alignItems: 'center',
  },
  noSessionsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  sessionDuration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sessionStats: {
    flexDirection: 'row',
    marginBottom: 12,
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
  gradesContainer: {
    gap: 8,
  },
  gradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gradePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  gradePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});
