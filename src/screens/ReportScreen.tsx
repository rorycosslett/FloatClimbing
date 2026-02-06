import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useClimbs } from '../context/ClimbContext';
import { useSettings } from '../context/SettingsContext';
import { getDisplayGrade, getNormalizedGradeIndex } from '../utils/gradeUtils';
import { ClimbType, Climb } from '../types';
import { colors } from '../theme/colors';
import GradeProgressionChart from '../components/charts/GradeProgressionChart';
import WeeklyActivityChart from '../components/charts/WeeklyActivityChart';
import GradeDistributionChart from '../components/charts/GradeDistributionChart';
import SessionCalendarChart from '../components/charts/SessionCalendarChart';

const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];

export default function ReportScreen() {
  const navigation = useNavigation();
  const { settings } = useSettings();
  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const { climbs, isLoading } = useClimbs();

  const stats = useMemo(() => {
    const typeClimbs = climbs.filter((c) => c.type === selectedType);
    const now = new Date();
    const weeksToShow = 12;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

    // Recent climbs (last 12 weeks)
    const recentClimbs = typeClimbs.filter((c) => {
      const d = new Date(c.timestamp);
      return d >= new Date(now.getTime() - weeksToShow * oneWeekMs);
    });

    // Calculate max grade index for recent period (sends only)
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

    // All-time stats (sends only)
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Insights</Text>
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

      <ScrollView style={styles.content}>
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
  content: {
    flex: 1,
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text,
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
