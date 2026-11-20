import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SessionUser } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const SIZE = 280;
const C = SIZE / 2;
const SEAT_R = 104;
const TABLE_R = 66;
const AVATAR = 46;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const AVATAR_COLORS = ['#FF6B35', '#22A35A', '#1D6FB8', '#9B59B6', '#F39C12', '#E5484D', '#1ABC9C', '#E91E63'];

// A new player drops into their seat.
const sitDown = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -18 }, { scale: 0.6 }] },
  70: { opacity: 1, transform: [{ translateY: 2 }, { scale: 1.06 }], easing: EASE_OUT },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
}).duration(420);

interface LobbyTableProps {
  users: SessionUser[];
  /** Ready-check ids, when the room uses one. */
  readyIds?: Set<string>;
}

/** The lobby as a table: players take seats as they join, ready players get a check. */
export function LobbyTable({ users, readyIds }: LobbyTableProps) {
  const seats = Math.min(8, Math.max(4, users.length + 1));
  return (
    <View style={styles.scene}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={C} cy={C} r={TABLE_R} fill={colors.surface} />
        <Circle cx={C} cy={C} r={TABLE_R - 16} fill="none" stroke={colors.borderLight} strokeWidth={2} />
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text style={styles.count}>
          {users.length}
          <Text style={styles.countOf}>/{seats}</Text>
        </Text>
      </View>

      {Array.from({ length: seats }).map((_, i) => {
        const angle = (i / seats) * 2 * Math.PI - Math.PI / 2;
        const left = C + SEAT_R * Math.cos(angle) - AVATAR / 2;
        const top = C + SEAT_R * Math.sin(angle) - AVATAR / 2;
        const user = users[i];
        return (
          <View key={user ? user.id : `empty-${i}`} style={[styles.seat, { left, top }]}>
            {user ? (
              <Animated.View entering={sitDown} style={styles.seatInner}>
                <View style={[styles.avatar, { backgroundColor: user.avatar || AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                  <Text style={styles.initial}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                {readyIds ? <ReadyBadge ready={readyIds.has(user.id)} /> : null}
                <Text style={styles.name} numberOfLines={1}>
                  {user.name}
                </Text>
              </Animated.View>
            ) : (
              <View style={styles.empty} />
            )}
          </View>
        );
      })}
    </View>
  );
}

function ReadyBadge({ ready }: { ready: boolean }) {
  const style = useAnimatedStyle(() => ({
    opacity: withTiming(ready ? 1 : 0, { duration: 150 }),
    transform: [{ scale: withSpring(ready ? 1 : 0.5, { duration: 320, dampingRatio: 0.55 }) }],
  }));
  return (
    <Animated.View style={[styles.badge, style]}>
      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scene: { width: SIZE, height: SIZE + 16, alignSelf: 'center' },
  center: {
    position: 'absolute',
    left: C - 50,
    top: C - 24,
    width: 100,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { ...typography.title1, color: colors.text, fontVariant: ['tabular-nums'] },
  countOf: { ...typography.title3, color: colors.textMuted },
  seat: { position: 'absolute', width: AVATAR, height: AVATAR, alignItems: 'center' },
  seatInner: { alignItems: 'center' },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
  },
  initial: { ...typography.headline, color: '#FFFFFF' },
  name: { ...typography.caption1, fontWeight: '600', color: colors.textSecondary, marginTop: 2, width: 72, textAlign: 'center' },
  empty: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: AVATAR - 18,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
});
