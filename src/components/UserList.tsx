import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SessionUser } from '../types';
import { Avatar } from './ui/Avatar';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, continuous } from '../theme/spacing';

const AVATAR_COLORS = [
  '#FF6B35', '#2ECC71', '#3498DB', '#9B59B6',
  '#F39C12', '#E74C3C', '#1ABC9C', '#E91E63',
];

interface UserListProps {
  users: SessionUser[];
  compact?: boolean;
  /** Lobby ready-check: shows a check per player when provided. */
  readyIds?: Set<string>;
  /** Light text — over a dark/photo backdrop (swipe screen). */
  light?: boolean;
}

export function UserList({ users, compact = false, readyIds, light = false }: UserListProps) {
  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {users.map((user, i) => (
          <View key={user.id} style={[styles.compactAvatar, { marginLeft: i > 0 ? -10 : 0, zIndex: users.length - i }]}>
            <Avatar
              name={user.name}
              color={user.avatar || AVATAR_COLORS[i % AVATAR_COLORS.length]}
              size={32}
              isOnline={user.isOnline}
            />
          </View>
        ))}
        <Text style={[styles.compactCount, light && styles.compactCountLight]}>{users.length} joined</Text>
      </View>
    );
  }

  return (
    <Animated.View style={styles.container} layout={LinearTransition.duration(220)}>
      {users.map((user, i) => (
        // Someone joining is an occasional, meaningful event — let it arrive.
        <Animated.View
          key={user.id}
          entering={FadeInDown.duration(260).withInitialValues({ transform: [{ translateY: 6 }] })}
          exiting={FadeOut.duration(150)}
          layout={LinearTransition.duration(220)}
        >
          {i > 0 && <View style={styles.separator} />}
          <View style={styles.userRow}>
            <Avatar
              name={user.name}
              color={user.avatar || AVATAR_COLORS[i % AVATAR_COLORS.length]}
              size={40}
              isOnline={user.isOnline}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.userStatus}>
                {user.hasFinishedSwiping
                  ? 'Done swiping'
                  : user.isOnline
                  ? 'Online'
                  : 'Offline'}
              </Text>
            </View>
            {user.votesCount > 0 && (
              <View style={styles.voteBadge}>
                <Text style={styles.voteCount}>{user.votesCount} votes</Text>
              </View>
            )}
            {readyIds && (
              <Ionicons
                name={readyIds.has(user.id) ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={readyIds.has(user.id) ? colors.accent : colors.border}
                accessibilityLabel={readyIds.has(user.id) ? 'Ready' : 'Not ready'}
              />
            )}
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...continuous,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginStart: spacing.md + 40 + spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.md,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    ...typography.bodySemiBold,
    color: colors.text,
  },
  userStatus: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  voteBadge: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  voteCount: {
    ...typography.captionMedium,
    color: colors.primaryDark,
  },

  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  compactAvatar: {
    borderWidth: 2,
    borderColor: colors.background,
    borderRadius: 18,
  },
  compactCount: {
    ...typography.captionMedium,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  compactCountLight: {
    color: 'rgba(255,255,255,0.85)',
  },
});
