import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getDisplayGrade } from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';
import { Climb, GradeSettings } from '../types';
import { colors } from '../theme/colors';

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function SwipeableClimbPill({
  climb,
  gradeSettings,
  onDelete,
}: {
  climb: Climb;
  gradeSettings: GradeSettings;
  onDelete: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const displayGrade = getDisplayGrade(climb, gradeSettings);
  const gradientColors = getGradeGradientColors(climb.grade, climb.type, gradeSettings);

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const opacity = dragX.interpolate({
      inputRange: [-80, -40, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={[styles.swipeDeleteAction, { opacity }]}>
        <Pressable
          onPress={() => {
            swipeableRef.current?.close();
            onDelete();
          }}
          style={styles.swipeDeletePressable}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Pressable>
      </Animated.View>
    );
  };

  const pillContent = (
    <View style={styles.climbPillContent}>
      <Text style={styles.climbPillGrade}>{displayGrade}</Text>
      {climb.type !== 'boulder' && (
        <Text style={styles.climbPillType}>{climb.type}</Text>
      )}
      <Text style={styles.climbPillTime}>{formatTime(climb.timestamp)}</Text>
    </View>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      {climb.status === 'attempt' ? (
        <View style={styles.climbAttemptPill}>
          {pillContent}
        </View>
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.climbSendPill}
        >
          {pillContent}
        </LinearGradient>
      )}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  climbSendPill: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  climbAttemptPill: {
    backgroundColor: colors.textSecondary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  climbPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  climbPillGrade: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  climbPillType: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.7,
    marginLeft: 6,
  },
  climbPillTime: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.7,
    marginLeft: 'auto',
  },
  swipeDeleteAction: {
    backgroundColor: colors.danger,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    marginLeft: 8,
  },
  swipeDeletePressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
