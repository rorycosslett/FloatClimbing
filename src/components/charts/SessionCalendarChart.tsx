import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Climb, ClimbType } from '../../types';
import { colors } from '../../theme/colors';
import { getSessionCalendarData, CalendarDayData } from '../../utils/chartDataUtils';

interface Props {
  climbs: Climb[];
  type: ClimbType;
}

const screenWidth = Dimensions.get('window').width;
const containerPadding = 32;
const weekdayLabelWidth = 20;
const gap = 2;

const INTENSITY_COLORS = [
  colors.surfaceSecondary, // 0 - no activity
  '#0d3a5c', // 1 - low
  '#0f5a8a', // 2 - medium-low
  '#1a7ab8', // 3 - medium-high
  colors.primary, // 4 - high
];

export default function SessionCalendarChart({ climbs, type }: Props) {
  const data = useMemo(() => getSessionCalendarData(climbs, type, 6), [climbs, type]);

  const cellSize = useMemo(() => {
    const availableWidth = screenWidth - containerPadding - weekdayLabelWidth - 8;
    const weeksCount = data.weeks.length || 26;
    const calculatedSize = Math.floor((availableWidth - gap * (weeksCount - 1)) / weeksCount);
    return Math.max(8, Math.min(14, calculatedSize));
  }, [data.weeks.length]);

  if (data.activeDays === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No climbs logged yet</Text>
        </View>
      </View>
    );
  }

  const getCellColor = (day: CalendarDayData): string => {
    if (day.totalCount === 0) return INTENSITY_COLORS[0];
    return INTENSITY_COLORS[day.intensity];
  };

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {INTENSITY_COLORS.map((color, i) => (
          <View key={i} style={[styles.legendBox, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>

      <View style={styles.calendarWrapper}>
        <View style={[styles.weekdayLabels, { gap }]}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
            <Text key={i} style={[styles.weekdayLabel, { height: cellSize, lineHeight: cellSize }]}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.weeksContainer}>
          {data.weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={[styles.weekColumn, { gap }]}>
              {week.map((day, dayIndex) => (
                <View
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    {
                      width: cellSize,
                      height: cellSize,
                      backgroundColor: day.dateKey ? getCellColor(day) : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.monthLabelsContainer}>
        <View style={{ width: weekdayLabelWidth }} />
        <View style={styles.monthLabels}>
          {data.monthLabels.map((monthLabel, index) => (
            <Text
              key={index}
              style={[styles.monthLabel, { left: monthLabel.weekIndex * (cellSize + gap) }]}
            >
              {monthLabel.label}
            </Text>
          ))}
        </View>
      </View>

      <Text style={styles.subtitle}>
        {data.activeDays} active day{data.activeDays !== 1 ? 's' : ''} in the last 6 months
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginHorizontal: 4,
  },
  calendarWrapper: {
    flexDirection: 'row',
  },
  weekdayLabels: {
    width: weekdayLabelWidth,
    marginRight: 4,
  },
  weekdayLabel: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'right',
    paddingRight: 4,
  },
  weeksContainer: {
    flexDirection: 'row',
    gap,
  },
  weekColumn: {
    flexDirection: 'column',
  },
  dayCell: {
    borderRadius: 2,
  },
  monthLabelsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  monthLabels: {
    flex: 1,
    position: 'relative',
    height: 14,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 9,
    color: colors.textSecondary,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
