import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const SIZE = 240;
const C = SIZE / 2;
const SEAT_R = 86; // where the players sit
const TABLE_R = 58;
const AVATAR = 44;
const RING_LEN = 2 * Math.PI * SEAT_R;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Host sits at the top; the rest clockwise.
const PLAYERS = [
  { letter: 'A', color: '#FF6B35', angle: -90 },
  { letter: 'B', color: '#22A35A', angle: 0 },
  { letter: 'C', color: '#1D6FB8', angle: 90 },
  { letter: 'D', color: '#9B59B6', angle: 180 },
];

/**
 * A table seen from above. 0 = chill (only the host acts), 1 = balanced (everyone
 * raises a hand first), 2 = all together (a ring joins everyone).
 */
export function TableScene({ level }: { level: 0 | 1 | 2 }) {
  // The ring draws itself around the table when everyone has to agree.
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: withTiming(level === 2 ? 0 : RING_LEN, { duration: 520, easing: EASE_OUT }),
  }));

  const centerIcon: keyof typeof Ionicons.glyphMap =
    level === 0 ? 'play' : level === 1 ? 'hand-left' : 'people';

  return (
    <View style={styles.scene} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {/* the table */}
        <Circle cx={C} cy={C} r={TABLE_R} fill={colors.surface} />
        <Circle cx={C} cy={C} r={TABLE_R - 14} fill="none" stroke={colors.borderLight} strokeWidth={2} />
        {/* everyone holds hands */}
        <AnimatedCircle
          cx={C}
          cy={C}
          r={SEAT_R}
          fill="none"
          stroke={colors.primary}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={RING_LEN}
          animatedProps={ringProps}
          rotation={-90}
          origin={`${C}, ${C}`}
        />
      </Svg>

      <CenterIcon key={centerIcon} icon={centerIcon} />

      {PLAYERS.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = C + SEAT_R * Math.cos(rad) - AVATAR / 2;
        const y = C + SEAT_R * Math.sin(rad) - AVATAR / 2;
        const isHost = i === 0;
        const badge: keyof typeof Ionicons.glyphMap | null =
          level === 0 ? (isHost ? 'play' : null) : level === 1 ? 'hand-left' : 'checkmark';
        return (
          <View key={p.letter} style={[styles.seat, { left: x, top: y }]}>
            <View style={[styles.avatar, { backgroundColor: p.color }]}>
              <Text style={styles.letter}>{p.letter}</Text>
            </View>
            <Badge icon={badge} delay={i * 80} host={isHost && level === 0} />
          </View>
        );
      })}
    </View>
  );
}

function CenterIcon({ icon }: { icon: keyof typeof Ionicons.glyphMap }) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 180 }),
    transform: [{ scale: withSpring(1, { duration: 320, dampingRatio: 0.6 }) }],
  }));
  return (
    <Animated.View style={[styles.center, { opacity: 0, transform: [{ scale: 0.8 }] }, style]}>
      <Ionicons name={icon} size={30} color={colors.primaryDark} />
    </Animated.View>
  );
}

/** Pops in after the player\'s turn in the stagger; fades away when not used. */
function Badge({ icon, delay, host }: { icon: keyof typeof Ionicons.glyphMap | null; delay: number; host: boolean }) {
  const on = icon !== null;
  const style = useAnimatedStyle(() => ({
    opacity: withDelay(on ? delay : 0, withTiming(on ? 1 : 0, { duration: 160 })),
    transform: [{ scale: withDelay(on ? delay : 0, withSpring(on ? 1 : 0.6, { duration: 340, dampingRatio: 0.55 })) }],
  }));
  return (
    <Animated.View style={[styles.badge, host ? styles.badgeHost : styles.badgeAll, style]}>
      {icon ? <Ionicons name={icon} size={12} color="#FFFFFF" /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: { width: SIZE, height: SIZE, alignSelf: 'center' },
  center: {
    position: 'absolute',
    left: C - 24,
    top: C - 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seat: { position: 'absolute', width: AVATAR, height: AVATAR },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  letter: { ...typography.headline, color: '#FFFFFF' },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeAll: { backgroundColor: colors.accentDark },
  badgeHost: { backgroundColor: colors.primary },
});
