import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '../../theme/typography';
import { borderRadius } from '../../theme/spacing';

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  isOnline?: boolean;
}

export function Avatar({ name, color = '#FF6B35', size = 40, isOnline }: AvatarProps) {
  const initials = name.charAt(0).toUpperCase();

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials}</Text>
      {isOnline !== undefined && (
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: isOnline ? '#2ECC71' : '#9CA3AF',
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              right: -1,
              bottom: -1,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  text: {
    ...typography.bodySemiBold,
    color: '#FFFFFF',
  },
  indicator: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
