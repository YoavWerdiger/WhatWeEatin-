import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SessionUser } from '../types';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { Avatar } from './ui/Avatar';
import { Glass } from './ui/Glass';

interface Props {
  users: SessionUser[];
  /** Lobby ready-check: a mark per player when provided */
  readyIds?: Set<string>;
  hostId?: string;
  hostLabel: string;
  onInvite?: () => void;
  inviteLabel: string;
}

/** The players as a simple grid of cards — who's in, who's ready — plus a card to invite one more. */
export function LobbyPlayers({ users, readyIds, hostId, hostLabel, onInvite, inviteLabel }: Props) {
  return (
    <View style={styles.grid}>
      {users.map((u) => {
        const ready = readyIds?.has(u.id);
        return (
          <Animated.View key={u.id} entering={FadeInDown.duration(260)} layout={LinearTransition.duration(220)} style={styles.cardWrap}>
          <Glass radius={borderRadius.lg} tint={ready ? 'rgba(34, 163, 90, 0.18)' : 'rgba(255, 255, 255, 0.6)'} style={[styles.card, styles.cardFill]}>
            <View>
              <Avatar name={u.name} color={u.avatar} size={52} />
              {readyIds ? (
                <View style={[styles.badge, ready ? styles.badgeReady : styles.badgeWaiting]}>
                  <Ionicons name={ready ? 'checkmark' : 'ellipsis-horizontal'} size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {u.name}
            </Text>
            {u.id === hostId ? <Text style={styles.host}>{hostLabel}</Text> : null}
          </Glass>
          </Animated.View>
        );
      })}

      {onInvite ? (
        <Animated.View layout={LinearTransition.duration(220)} style={styles.cardWrap}>
          <Pressable onPress={onInvite} style={[styles.card, styles.cardFill, styles.invite]} accessibilityRole="button" accessibilityLabel={inviteLabel}>
            <View style={styles.inviteIcon}>
              <Ionicons name="add" size={26} color={colors.primary} />
            </View>
            <Text style={[styles.name, styles.inviteText]} numberOfLines={1}>
              {inviteLabel}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const CARD_W = '30%';
const CARD_H = 134;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  cardWrap: { width: CARD_W, height: CARD_H },
  cardFill: { width: '100%', height: '100%' },
  // Same size for every card (players with or without the host line, and the invite card)
  card: {
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: 6,
  },
  badge: {
    position: 'absolute',
    right: -4,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  badgeReady: { backgroundColor: colors.accentDark },
  badgeWaiting: { backgroundColor: colors.textMuted },
  name: { ...typography.subheadline, fontWeight: '600', color: colors.text, maxWidth: '100%' },
  host: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
  invite: { borderStyle: 'dashed', borderWidth: 2, borderRadius: borderRadius.lg, borderColor: colors.primary, backgroundColor: 'transparent' },
  inviteIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  inviteText: { color: colors.primaryDark },
});
