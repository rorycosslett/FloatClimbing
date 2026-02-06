import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { Climb, ClimbType } from '../../types';
import { colors } from '../../theme/colors';
import { getWeeklyActivityData } from '../../utils/chartDataUtils';

interface Props {
  climbs: Climb[];
  type: ClimbType;
}

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80;

export default function WeeklyActivityChart({ climbs, type }: Props) {
  const rawData = useMemo(() => getWeeklyActivityData(climbs, type, 12), [climbs, type]);

  // Trim leading weeks with no data
  const data = useMemo(() => {
    const firstDataIndex = rawData.findIndex((d) => d.sends > 0 || d.attempts > 0);
    if (firstDataIndex === -1) return rawData;
    return rawData.slice(firstDataIndex);
  }, [rawData]);

  const hasData = data.some((d) => d.sends > 0 || d.attempts > 0);

  if (!hasData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Weekly Activity</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No climbing activity in the last 12 weeks</Text>
        </View>
      </View>
    );
  }

  // Create stacked bar data
  // Attempts shown with gray, sends with grade-consistent blue
  const stackData = data.map((d) => ({
    stacks: [
      { value: d.attempts, color: colors.border },
      { value: d.sends, color: '#1384FF' },
    ],
    label: d.label,
  }));

  const maxValue = Math.max(...data.map((d) => d.sends + d.attempts), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Activity</Text>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#1384FF' }]} />
          <Text style={styles.legendText}>Sends</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.border }]} />
          <Text style={styles.legendText}>Attempts</Text>
        </View>
      </View>
      <View style={styles.chartWrapper}>
        <BarChart
          stackData={stackData}
          width={chartWidth}
          height={150}
          barWidth={16}
          spacing={12}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisLabel}
          hideRules
          maxValue={Math.ceil(maxValue * 1.2)}
          noOfSections={4}
          initialSpacing={10}
          endSpacing={10}
          barBorderRadius={4}
          disablePress
        />
      </View>
      <Text style={styles.subtitle}>
        {data.length === 1 ? 'This week' : `Last ${data.length} weeks`}
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
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  chartWrapper: {
    alignItems: 'center',
    marginLeft: -16,
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
  axisText: {
    color: colors.textSecondary,
    fontSize: 10,
  },
  axisLabel: {
    color: colors.textSecondary,
    fontSize: 8,
    width: 30,
  },
});
