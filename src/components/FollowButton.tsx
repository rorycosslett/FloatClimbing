import React, { useState } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/colors';

interface FollowButtonProps {
  isFollowing: boolean;
  onFollow: () => Promise<boolean>;
  onUnfollow: () => Promise<boolean>;
  size?: 'small' | 'medium';
}

export default function FollowButton({
  isFollowing,
  onFollow,
  onUnfollow,
  size = 'medium',
}: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(isFollowing);

  const handlePress = async () => {
    setLoading(true);
    try {
      if (following) {
        const success = await onUnfollow();
        if (success) setFollowing(false);
      } else {
        const success = await onFollow();
        if (success) setFollowing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const isSmall = size === 'small';

  return (
    <Pressable
      style={[
        styles.button,
        following ? styles.followingButton : styles.followButton,
        isSmall && styles.smallButton,
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? colors.text : '#fff'} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            following ? styles.followingText : styles.followText,
            isSmall && styles.smallText,
          ]}
        >
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
  },
  followButton: {
    backgroundColor: colors.primary,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  smallText: {
    fontSize: 13,
  },
  followText: {
    color: '#fff',
  },
  followingText: {
    color: colors.text,
  },
});
