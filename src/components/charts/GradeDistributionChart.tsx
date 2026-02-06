import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Climb, ClimbType } from '../../types';
import { colors } from '../../theme/colors';
import { getGradeDistributionData } from '../../utils/chartDataUtils';

interface Props {
  climbs: Climb[];
  type: ClimbType;
}

const screenWidth = Dimensions.get('window').width;
const LABEL_WIDTH = 50;
const VALUE_LABEL_WIDTH = 50; // Space for sends/total counter on right (and matching left spacer)
const CONTAINER_PADDING = 32; // 16px padding on each side
// Subtract: padding, center label, left spacer, right value label
const maxBarWidth = (screenWidth - CONTAINER_PADDING - LABEL_WIDTH - VALUE_LABEL_WIDTH * 2) / 2;

export default function GradeDistributionChart({ climbs, type }: Props) {
  const data = useMemo(
    () => getGradeDistributionData(climbs, type, []),
    [climbs, type]
  );

  if (data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No climbs logged yet</Text>
        </View>
      </View>
    );
  }

  const totalSends = data.reduce((sum, d) => sum + d.sends, 0);
  const totalAttempts = data.reduce((sum, d) => sum + d.attempts, 0);
  const maxTotal = Math.max(...data.map((d) => d.total));

  // Reverse to show highest grades at top
  const reversedData = [...data].reverse();

  return (
    <View style={styles.container}>
      <View style={styles.totalRow}>
        <Text style={styles.totalValue}>{totalSends}</Text>
        <Text style={styles.totalLabel}>sends</Text>
        <Text style={styles.totalDivider}>·</Text>
        <Text style={styles.totalValueSecondary}>{totalAttempts}</Text>
        <Text style={styles.totalLabel}>attempts</Text>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <LinearGradient
            colors={['#1384FF', '#0048E8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.legendBox}
          />
          <Text style={styles.legendText}>Sends</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, styles.legendBoxOutline]} />
          <Text style={styles.legendText}>Attempts</Text>
        </View>
      </View>
      <View style={styles.chartWrapper}>
        {reversedData.map((d, index) => {
          const totalWidth = (d.total / maxTotal) * maxBarWidth;
          const sendsWidth = (d.sends / maxTotal) * maxBarWidth;
          return (
            <View key={index} style={styles.row}>
              {/* Left spacer to balance right value label */}
              <View style={styles.valueLabelSpacer} />
              {/* Left side bars */}
              <View style={styles.barContainer}>
                {/* Outline bar for total (attempts context) */}
                {d.attempts > 0 && (
                  <View
                    style={[
                      styles.outlineBar,
                      styles.outlineBarLeft,
                      { width: totalWidth },
                    ]}
                  />
                )}
                {/* Gradient bar for sends */}
                {d.sends > 0 && (
                  <LinearGradient
                    colors={d.gradientColors}
                    start={{ x: 1, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={[
                      styles.bar,
                      { width: sendsWidth },
                    ]}
                  />
                )}
              </View>
              <View style={styles.labelContainer}>
                <Text style={styles.gradeLabel}>{d.label}</Text>
              </View>
              {/* Right side bars */}
              <View style={[styles.barContainer, styles.barContainerRight]}>
                {/* Outline bar for total (attempts context) */}
                {d.attempts > 0 && (
                  <View
                    style={[
                      styles.outlineBar,
                      styles.outlineBarRight,
                      { width: totalWidth },
                    ]}
                  />
                )}
                {/* Gradient bar for sends */}
                {d.sends > 0 && (
                  <LinearGradient
                    colors={d.gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.bar,
                      styles.barRight,
                      { width: sendsWidth },
                    ]}
                  />
                )}
              </View>
              <View style={styles.valueLabelContainer}>
                <Text style={styles.valueLabel}>{d.sends}/{d.total}</Text>
              </View>
            </View>
          );
        })}
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  totalValueSecondary: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  totalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  totalDivider: {
    fontSize: 18,
    color: colors.textSecondary,
    marginHorizontal: 4,
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
  legendBoxOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.border,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  chartWrapper: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
  },
  barContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: '100%',
  },
  barContainerRight: {
    alignItems: 'flex-start',
  },
  bar: {
    height: 18,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    position: 'absolute',
  },
  barRight: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  outlineBar: {
    height: 18,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
    position: 'absolute',
  },
  outlineBarLeft: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    right: 0,
  },
  outlineBarRight: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    left: 0,
  },
  labelContainer: {
    width: 50,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  gradeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  valueLabelSpacer: {
    width: VALUE_LABEL_WIDTH,
  },
  valueLabelContainer: {
    width: VALUE_LABEL_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
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
