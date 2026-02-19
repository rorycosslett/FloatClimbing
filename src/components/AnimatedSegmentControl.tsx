import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { ClimbType } from '../types';
import { colors } from '../theme/colors';

const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];

interface AnimatedSegmentControlProps {
  selectedType: ClimbType;
  onTypeChange: (type: ClimbType) => void;
  indicatorAnimatedStyle: AnimatedStyle;
  onSegmentWidthChange: (width: number) => void;
}

export function AnimatedSegmentControl({
  selectedType,
  onTypeChange,
  indicatorAnimatedStyle,
  onSegmentWidthChange,
}: AnimatedSegmentControlProps) {
  const [measured, setMeasured] = useState(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    const sw = (width - 4) / CLIMB_TYPES.length; // subtract padding (2 * 2)
    onSegmentWidthChange(sw);
    setMeasured(true);
  };

  return (
    <View style={styles.segmentControl} onLayout={handleLayout}>
      {measured && (
        <Animated.View style={[styles.indicator, indicatorAnimatedStyle]} />
      )}
      {CLIMB_TYPES.map((type) => (
        <Pressable
          key={type}
          style={styles.segmentBtn}
          onPress={() => onTypeChange(type)}
        >
          <Text
            style={[
              styles.segmentText,
              selectedType === type && styles.segmentTextActive,
            ]}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 2,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    bottom: 2,
    width: '33.333%',
    backgroundColor: colors.surface,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
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
});
