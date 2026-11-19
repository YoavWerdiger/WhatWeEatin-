import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Press: quick strong ease-out so the UI answers the finger immediately.
// Release: a touch slower so it settles instead of snapping.
const PRESS = { duration: 120, easing: Easing.bezier(0.23, 1, 0.32, 1) };
const RELEASE = { duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) };

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** 0.97 for wide buttons, ~0.94 for small round icon buttons. */
  pressedScale?: number;
}

export function PressableScale({
  style,
  pressedScale = 0.97,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduceMotion) scale.value = withTiming(pressedScale, PRESS);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, RELEASE);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
