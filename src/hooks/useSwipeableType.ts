import { useEffect } from 'react';
import { Dimensions } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ClimbType } from '../types';

const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];
const SCREEN_WIDTH = Dimensions.get('window').width;

const SWIPE_TRANSLATION_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 500;
const ACTIVATION_THRESHOLD = 15;
const EXIT_OFFSET = SCREEN_WIDTH * 0.3;
const EXIT_DURATION = 150;
const ENTER_DURATION = 200;
const INDICATOR_DURATION = 250;

export function useSwipeableType(
  selectedType: ClimbType,
  onTypeChange: (type: ClimbType) => void,
  segmentWidth: number,
) {
  const currentIndex = useSharedValue(CLIMB_TYPES.indexOf(selectedType));
  const segmentWidthShared = useSharedValue(segmentWidth);
  const isAnimating = useSharedValue(false);

  const contentTranslateX = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const indicatorPosition = useSharedValue(CLIMB_TYPES.indexOf(selectedType) * segmentWidth);

  // Touch tracking for manual activation
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const decided = useSharedValue(false);

  // Sync shared values when selectedType or segmentWidth changes
  useEffect(() => {
    const idx = CLIMB_TYPES.indexOf(selectedType);
    currentIndex.value = idx;
    segmentWidthShared.value = segmentWidth;
    indicatorPosition.value = withTiming(idx * segmentWidth, {
      duration: INDICATOR_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [selectedType, segmentWidth]);

  const triggerTransition = (newType: ClimbType, _direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTypeChange(newType);
  };

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesDown((event) => {
      'worklet';
      if (event.allTouches.length === 1) {
        startX.value = event.allTouches[0].x;
        startY.value = event.allTouches[0].y;
        decided.value = false;
      }
    })
    .onTouchesMove((event, stateManager) => {
      'worklet';
      if (decided.value || event.allTouches.length !== 1) return;

      const dx = Math.abs(event.allTouches[0].x - startX.value);
      const dy = Math.abs(event.allTouches[0].y - startY.value);

      // Wait until movement exceeds threshold before deciding
      if (dx < ACTIVATION_THRESHOLD && dy < ACTIVATION_THRESHOLD) return;

      decided.value = true;
      if (dx > dy) {
        // Horizontal movement dominates — activate pan gesture
        stateManager.activate();
      } else {
        // Vertical movement dominates — fail, defer to ScrollView
        stateManager.fail();
      }
    })
    .onUpdate((event) => {
      'worklet';
      if (isAnimating.value) return;
      contentTranslateX.value = event.translationX * 0.3;
    })
    .onEnd((event) => {
      'worklet';
      if (isAnimating.value) return;

      const idx = currentIndex.value;
      let newIdx = idx;

      if (
        event.translationX < -SWIPE_TRANSLATION_THRESHOLD ||
        event.velocityX < -SWIPE_VELOCITY_THRESHOLD
      ) {
        newIdx = Math.min(idx + 1, CLIMB_TYPES.length - 1);
      } else if (
        event.translationX > SWIPE_TRANSLATION_THRESHOLD ||
        event.velocityX > SWIPE_VELOCITY_THRESHOLD
      ) {
        newIdx = Math.max(idx - 1, 0);
      }

      if (newIdx !== idx) {
        isAnimating.value = true;
        const direction = newIdx > idx ? 'left' : 'right';
        const exitX = direction === 'left' ? -EXIT_OFFSET : EXIT_OFFSET;
        const entryX = direction === 'left' ? EXIT_OFFSET : -EXIT_OFFSET;

        // Update indicator immediately
        indicatorPosition.value = withTiming(newIdx * segmentWidthShared.value, {
          duration: INDICATOR_DURATION,
          easing: Easing.out(Easing.cubic),
        });

        // Exit animation, then snap + enter
        contentTranslateX.value = withSequence(
          withTiming(exitX, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) }),
          withTiming(entryX, { duration: 0 }),
          withTiming(0, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) }),
        );
        contentOpacity.value = withSequence(
          withTiming(0, { duration: EXIT_DURATION }),
          withTiming(1, { duration: ENTER_DURATION }, () => {
            isAnimating.value = false;
          }),
        );

        // Fire type change after exit completes
        runOnJS(triggerTransition)(CLIMB_TYPES[newIdx], direction);
      } else {
        // Snap back
        contentTranslateX.value = withTiming(0, { duration: 200 });
      }
    });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentTranslateX.value }],
    opacity: contentOpacity.value,
  }));

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
  }));

  const handleSegmentPress = (type: ClimbType) => {
    const newIdx = CLIMB_TYPES.indexOf(type);
    const idx = currentIndex.value;
    if (newIdx === idx) return;

    const direction = newIdx > idx ? 'left' : 'right';
    const exitX = direction === 'left' ? -EXIT_OFFSET : EXIT_OFFSET;
    const entryX = direction === 'left' ? EXIT_OFFSET : -EXIT_OFFSET;

    isAnimating.value = true;

    indicatorPosition.value = withTiming(newIdx * segmentWidthShared.value, {
      duration: INDICATOR_DURATION,
      easing: Easing.out(Easing.cubic),
    });

    contentTranslateX.value = withSequence(
      withTiming(exitX, { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) }),
      withTiming(entryX, { duration: 0 }),
      withTiming(0, { duration: ENTER_DURATION, easing: Easing.out(Easing.cubic) }),
    );
    contentOpacity.value = withSequence(
      withTiming(0, { duration: EXIT_DURATION }),
      withTiming(1, { duration: ENTER_DURATION }, () => {
        isAnimating.value = false;
      }),
    );

    triggerTransition(type, direction);
  };

  return {
    panGesture,
    contentAnimatedStyle,
    indicatorAnimatedStyle,
    handleSegmentPress,
  };
}
