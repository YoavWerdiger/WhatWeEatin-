import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Candidate, SwipeVote } from "../types/app";
import { colors, radius, spacing, typography } from "../theme/tokens";
import { RestaurantCard } from "./RestaurantCard";

const { width } = Dimensions.get("window");
const SWIPE_X = width * 0.28;
const SWIPE_Y = 110;

interface SwipeableCardProps {
  candidate: Candidate;
  disabled?: boolean;
  onVote: (vote: SwipeVote) => void;
}

export function SwipeableCard({ candidate, disabled = false, onVote }: SwipeableCardProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const locked = useRef(false);

  useEffect(() => {
    locked.current = false;
    position.setValue({ x: 0, y: 0 });
  }, [candidate.id, position]);

  const finish = (vote: SwipeVote, toX: number, toY: number) => {
    if (locked.current) {
      return;
    }
    locked.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(position, {
      toValue: { x: toX, y: toY },
      duration: 180,
      useNativeDriver: true,
    }).start(() => onVote(vote));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !disabled && (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6),
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (disabled || locked.current) {
          return;
        }
        if (gesture.dy < -SWIPE_Y) {
          finish("up_must", gesture.dx, -700);
          return;
        }
        if (gesture.dx > SWIPE_X) {
          finish("right_want", width * 1.3, gesture.dy);
          return;
        }
        if (gesture.dx < -SWIPE_X) {
          finish("left_no", -width * 1.3, gesture.dy);
          return;
        }
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ["-12deg", "0deg", "12deg"],
  });
  const wantOpacity = position.x.interpolate({
    inputRange: [20, SWIPE_X],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_X, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const mustOpacity = position.y.interpolate({
    inputRange: [-SWIPE_Y, -30],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <RestaurantCard candidate={candidate} />
      <Animated.View style={[styles.stamp, styles.want, { opacity: wantOpacity }]}>
        <Text style={styles.wantText}>WANT</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.nope, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.must, { opacity: mustOpacity }]}>
        <Text style={styles.mustText}>MUST</Text>
      </Animated.View>
      <View style={styles.hintRow}>
        <Text style={styles.hint}>← No · Want → · ↑ Must</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  stamp: {
    position: "absolute",
    top: 24,
    borderWidth: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  want: {
    left: 20,
    borderColor: colors.accent,
    transform: [{ rotate: "-12deg" }],
  },
  nope: {
    right: 20,
    borderColor: colors.danger,
    transform: [{ rotate: "12deg" }],
  },
  must: {
    alignSelf: "center",
    left: "35%",
    borderColor: colors.warning,
  },
  wantText: {
    color: colors.accent,
    fontWeight: "900",
    fontSize: typography.subtitle,
  },
  nopeText: {
    color: colors.danger,
    fontWeight: "900",
    fontSize: typography.subtitle,
  },
  mustText: {
    color: colors.warning,
    fontWeight: "900",
    fontSize: typography.subtitle,
  },
  hintRow: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  hint: {
    color: colors.textSecondary,
    fontSize: typography.tiny,
    fontWeight: "700",
  },
});
