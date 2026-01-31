import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Climb, ClimbType } from '../../types';
import { colors } from '../../theme/colors';
import { getGradeProgressionData, getGradeLabel } from '../../utils/chartDataUtils';

interface Props {
  climbs: Climb[];
  type: ClimbType;
}

const screenWidth = Dimensions.get('window').width;
const chartWidth = screenWidth - 80;

export default function GradeProgressionChart({ climbs, type }: Props) {
  const data = useMemo(() => getGradeProgressionData(climbs, type, 12), [climbs, type]);

  if (data.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Grade Progression</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Need at least 2 weeks of sends to show progression</Text>
        </View>
      </View>
    );
  }

  const chartData = data.map((d) => ({
    value: d.gradeIndex,
    label: d.label,
    dataPointText: d.grade,
  }));

  const minGrade = Math.max(0, Math.min(...data.map((d) => d.gradeIndex)) - 1);
  const maxGrade = Math.max(...data.map((d) => d.gradeIndex)) + 1;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Grade Progression</Text>
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={150}
          spacing={chartWidth / (chartData.length + 1)}
          color={colors.primary}
          thickness={2}
          dataPointsColor={colors.primary}
          dataPointsRadius={5}
          curved
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          yAxisTextStyle={styles.axisText}
          xAxisLabelTextStyle={styles.axisLabel}
          hideRules
          yAxisOffset={minGrade}
          maxValue={maxGrade - minGrade}
          noOfSections={Math.min(4, maxGrade - minGrade)}
          formatYLabel={(val) => getGradeLabel(type, Math.round(Number(val) + minGrade))}
          textShiftY={-8}
          textShiftX={-5}
          textColor={colors.textSecondary}
          textFontSize={10}
          initialSpacing={20}
          endSpacing={20}
        />
      </View>
      <Text style={styles.subtitle}>Highest grade sent per week</Text>
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
    fontSize: 9,
    width: 40,
  },
});
