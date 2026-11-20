import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SessionUser } from '../types';
import { Glass } from './ui/Glass';
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
  /** Tapping an empty seat invites someone to fill it. */
  onInvite?: () => void;
  inviteLabel?: string;
  /** Dish photos to serve on the plate in the middle. */
  photos?: string[];
}

/** The lobby as a table: players take seats as they join, ready players get a check. */
export function LobbyTable({ users, readyIds, onInvite, inviteLabel, photos = [] }: LobbyTableProps) {
  const seats = Math.min(8, Math.max(4, users.length + 1));
  return (
    <View style={styles.scene}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={C} cy={C} r={TABLE_R} fill={colors.surface} />
        <Circle cx={C} cy={C} r={TABLE_R - 16} fill="none" stroke={colors.borderLight} strokeWidth={2} />
      </Svg>

      {/* The plate in the middle keeps serving dishes from tonight's list */}
      <Plate photos={photos} />
      <View style={styles.countWrap} pointerEvents="none">
        <Glass radius={999} scheme="dark" tint="rgba(0,0,0,0.35)" style={styles.countPill}>
          <Text style={styles.count}>
            {users.length}
            <Text style={styles.countOf}>/{seats}</Text>
          </Text>
        </Glass>
      </View>

      {Array.from({ length: seats }).map((_, i) => {
        const angle = (i / seats) * 2 * Math.PI - Math.PI / 2;
        const left = C + SEAT_R * Math.cos(angle) - AVATAR / 2;
        const top = C + SEAT_R * Math.sin(angle) - AVATAR / 2;
        const user = users[i];
        // Names sit on the far side of the seat, away from the table.
        const nameAbove = Math.sin(angle) < -0.3;
        return (
          <View key={user ? user.id : `empty-${i}`} style={[styles.seat, { left, top }]}>
            {user ? (
              <Animated.View entering={sitDown} style={[styles.seatInner, nameAbove && styles.seatInnerAbove]}>
                <View style={[styles.avatar, { backgroundColor: user.avatar || AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                  <Text style={styles.initial}>{user.name.charAt(0).toUpperCase()}</Text>
                </View>
                {readyIds ? <ReadyBadge ready={readyIds.has(user.id)} /> : null}
                <Text style={styles.name} numberOfLines={1}>
                  {user.name}
                </Text>
              </Animated.View>
            ) : (
              <Pressable
                onPress={onInvite}
                disabled={!onInvite}
                accessibilityRole="button"
                accessibilityLabel={inviteLabel}
                hitSlop={6}
                style={({ pressed }) => [styles.empty, pressed && styles.emptyPressed]}
              >
                <Ionicons name="add" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}

const PLATE = (TABLE_R - 10) * 2;

function Plate({ photos }: { photos: string[] }) {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setI((n) => (n + 1) % Math.min(photos.length, 10)), 2200);
    return () => clearInterval(id);
  }, [photos.length]);
  const uri = photos[i];
  return (
    <View style={styles.plate} pointerEvents="none">
      {uri ? (
        <Animated.Image key={uri} source={{ uri }} style={styles.plateImg} entering={FadeIn.duration(500)} exiting={FadeOut.duration(500)} />
      ) : (
        <Ionicons name="restaurant" size={34} color={colors.textMuted} />
      )}
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
  plate: {
    position: 'absolute',
    left: C - PLATE / 2,
    top: C - PLATE / 2,
    width: PLATE,
    height: PLATE,
    borderRadius: PLATE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
  },
  plateImg: { position: "absolute", top: 0, left: 0, width: PLATE, height: PLATE },
  countWrap: { position: 'absolute', left: 0, right: 0, top: C + PLATE / 2 - 18, alignItems: 'center' },
  countPill: { paddingHorizontal: 12, paddingVertical: 4 },
  count: { ...typography.headline, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  countOf: { ...typography.subheadline, color: 'rgba(255,255,255,0.75)' },
  seat: { position: 'absolute', width: AVATAR, height: AVATAR, alignItems: 'center' },
  seatInner: { alignItems: 'center' },
  // name above the avatar for seats on the top of the table
  seatInnerAbove: { flexDirection: 'column-reverse', marginTop: -18 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPressed: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
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
