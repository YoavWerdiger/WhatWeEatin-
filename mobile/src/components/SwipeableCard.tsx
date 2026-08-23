import * as Haptics from "expo-haptics";
import { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
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
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const leaving = useSharedValue(0);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    leaving.value = 0;
  }, [candidate.id, leaving, translateX, translateY]);

  const finish = (vote: SwipeVote) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onVote(vote);
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY < -SWIPE_Y) {
        leaving.value = 1;
        translateY.value = withTiming(-700, { duration: 220 }, () => {
          runOnJS(finish)("up_must");
        });
        return;
      }
      if (event.translationX > SWIPE_X) {
        leaving.value = 1;
        translateX.value = withTiming(width * 1.3, { duration: 220 }, () => {
          runOnJS(finish)("right_want");
        });
        return;
      }
      if (event.translationX < -SWIPE_X) {
        leaving.value = 1;
        translateX.value = withTiming(-width * 1.3, { duration: 220 }, () => {
          runOnJS(finish)("left_no");
        });
        return;
      }
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(translateX.value, [-width, 0, width], [-12, 0, 12])}deg`,
      },
    ],
  }));

  const wantStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [20, SWIPE_X], [0, 1], "clamp"),
  }));

  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_X, -20], [1, 0], "clamp"),
  }));

  const mustStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [-SWIPE_Y, -30], [1, 0], "clamp"),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.wrap, cardStyle]}>
        <RestaurantCard candidate={candidate} />
        <Animated.View style={[styles.stamp, styles.want, wantStyle]}>
          <Text style={styles.wantText}>WANT</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.nope, nopeStyle]}>
          <Text style={styles.nopeText}>NOPE</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.must, mustStyle]}>
          <Text style={styles.mustText}>MUST</Text>
        </Animated.View>
        <View style={styles.hintRow}>
          <Text style={styles.hint}>← No · Want → · ↑ Must</Text>
        </View>
      </Animated.View>
    </GestureDetector>
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
