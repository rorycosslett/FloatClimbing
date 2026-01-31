import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Climb, ClimbType } from '../../types';
import { colors } from '../../theme/colors';
import { getGradeDistributionData } from '../../utils/chartDataUtils';

interface Props {
  climbs: Climb[];
  type: ClimbType;
}

const CHART_COLORS = [colors.primary, colors.success, colors.warning, '#9b59b6'];

export default function GradeDistributionChart({ climbs, type }: Props) {
  const data = useMemo(
    () => getGradeDistributionData(climbs, type, CHART_COLORS),
    [climbs, type]
  );

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Grade Distribution</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No climbs logged yet</Text>
        </View>
      </View>
    );
  }

  const pieData = data.map((d) => ({
    value: d.value,
    color: d.color,
    text: d.label,
  }));

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grade Distribution</Text>
      <View style={styles.chartRow}>
        <View style={styles.chartWrapper}>
          <PieChart
            data={pieData}
            donut
            radius={70}
            innerRadius={45}
            innerCircleColor={colors.surface}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerValue}>{total}</Text>
                <Text style={styles.centerText}>climbs</Text>
              </View>
            )}
          />
        </View>
        <View style={styles.legend}>
          {data.map((d, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendText}>{d.label}</Text>
              <Text style={styles.legendValue}>
                {d.value} ({Math.round((d.value / total) * 100)}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.subtitle}>All-time distribution</Text>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  chartWrapper: {
    alignItems: 'center',
  },
  centerLabel: {
    alignItems: 'center',
  },
  centerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  centerText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  legend: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: colors.text,
    minWidth: 55,
  },
  legendValue: {
    fontSize: 11,
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
