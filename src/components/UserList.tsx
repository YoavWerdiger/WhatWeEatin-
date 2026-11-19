import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SessionUser } from '../types';
import { Avatar } from './ui/Avatar';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';

const AVATAR_COLORS = [
  '#FF6B35', '#2ECC71', '#3498DB', '#9B59B6',
  '#F39C12', '#E74C3C', '#1ABC9C', '#E91E63',
];

interface UserListProps {
  users: SessionUser[];
  compact?: boolean;
}

export function UserList({ users, compact = false }: UserListProps) {
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
        <Text style={styles.compactCount}>{users.length} joined</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {users.map((user, i) => (
        <View key={user.id} style={styles.userRow}>
          <Avatar
            name={user.name}
            color={user.avatar || AVATAR_COLORS[i % AVATAR_COLORS.length]}
            size={44}
            isOnline={user.isOnline}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userStatus}>
              {user.hasFinishedSwiping
                ? '✅ Done swiping'
                : user.isOnline
                ? '🟢 Online'
                : '⚪ Offline'}
            </Text>
          </View>
          {user.votesCount > 0 && (
            <View style={styles.voteBadge}>
              <Text style={styles.voteCount}>{user.votesCount} votes</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    gap: spacing.md,
    ...shadows.sm,
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
    borderRadius: borderRadius.sm,
  },
  voteCount: {
    ...typography.captionMedium,
    color: colors.primary,
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
});
