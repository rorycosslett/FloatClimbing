import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { ProfileWithStats } from '../types';
import FollowButton from './FollowButton';

interface UserCardProps {
  profile: ProfileWithStats;
  onPress: () => void;
  onFollow: () => Promise<boolean>;
  onUnfollow: () => Promise<boolean>;
  showFollowButton?: boolean;
}

export default function UserCard({
  profile,
  onPress,
  onFollow,
  onUnfollow,
  showFollowButton = true,
}: UserCardProps) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.displayName || 'Climber'}
        </Text>
        <Text style={styles.stats}>
          {profile.followerCount} {profile.followerCount === 1 ? 'follower' : 'followers'}
        </Text>
      </View>

      {showFollowButton && (
        <FollowButton
          isFollowing={profile.isFollowing}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
          size="small"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  stats: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});
