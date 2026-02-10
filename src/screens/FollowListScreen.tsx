import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSocial } from '../context/SocialContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { Profile } from '../types';
import FollowButton from '../components/FollowButton';

type RootStackParamList = {
  Main: undefined;
  Profile: { userId: string };
  FollowList: { userId: string; initialTab: 'followers' | 'following' };
};

type FollowListRouteProp = RouteProp<RootStackParamList, 'FollowList'>;
type TabType = 'followers' | 'following';

function UserRow({
  profile,
  isCurrentUser,
  isFollowingUser,
  onPress,
  onFollow,
  onUnfollow,
}: {
  profile: Profile;
  isCurrentUser: boolean;
  isFollowingUser: boolean;
  onPress: () => void;
  onFollow: () => Promise<boolean>;
  onUnfollow: () => Promise<boolean>;
}) {
  return (
    <Pressable style={styles.userRow} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.userName} numberOfLines={1}>
          {profile.displayName || 'Climber'}
        </Text>
      </View>

      {!isCurrentUser && (
        <FollowButton
          isFollowing={isFollowingUser}
          onFollow={onFollow}
          onUnfollow={onUnfollow}
          size="small"
        />
      )}
    </Pressable>
  );
}

export default function FollowListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<FollowListRouteProp>();
  const { userId, initialTab } = route.params;
  const { user } = useAuth();
  const { getFollowers, getFollowing, followUser, unfollowUser } = useSocial();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [followersData, followingData] = await Promise.all([
        getFollowers(userId),
        getFollowing(userId),
      ]);
      setFollowers(followersData);
      setFollowing(followingData);

      // If viewing another user's list, we need to know who *we* follow
      // to show correct button states. If viewing our own, followingData is our list.
      if (user?.id === userId) {
        setFollowingIds(new Set(followingData.map((p) => p.id)));
      } else if (user?.id) {
        const myFollowing = await getFollowing(user.id);
        setFollowingIds(new Set(myFollowing.map((p) => p.id)));
      }
    } catch (error) {
      console.error('Error loading follow lists:', error);
    } finally {
      setLoading(false);
    }
  }, [userId, user?.id, getFollowers, getFollowing]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFollow = async (targetId: string) => {
    const success = await followUser(targetId);
    if (success) {
      setFollowingIds((prev) => new Set(prev).add(targetId));
    }
    return success;
  };

  const handleUnfollow = async (targetId: string) => {
    const success = await unfollowUser(targetId);
    if (success) {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      // If we're on our own "following" tab, remove from the list
      if (user?.id === userId) {
        setFollowing((prev) => prev.filter((p) => p.id !== targetId));
      }
    }
    return success;
  };

  const activeList = activeTab === 'followers' ? followers : following;

  const renderItem = ({ item }: { item: Profile }) => (
    <UserRow
      profile={item}
      isCurrentUser={item.id === user?.id}
      isFollowingUser={followingIds.has(item.id)}
      onPress={() => navigation.push('Profile', { userId: item.id })}
      onFollow={() => handleFollow(item.id)}
      onUnfollow={() => handleUnfollow(item.id)}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={activeTab === 'followers' ? 'people-outline' : 'person-add-outline'}
          size={48}
          color={colors.textMuted}
        />
        <Text style={styles.emptyTitle}>
          {activeTab === 'followers' ? 'No followers yet' : 'Not following anyone'}
        </Text>
        <Text style={styles.emptyText}>
          {activeTab === 'followers'
            ? 'When people follow this account, they\u2019ll show up here.'
            : 'When this account follows people, they\u2019ll show up here.'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Connections</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabControl}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'followers' && styles.tabBtnActive]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            Followers
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'following' && styles.tabBtnActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            Following
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={activeList.length === 0 ? styles.emptyList : styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 44,
  },
  tabControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  emptyList: {
    flexGrow: 1,
  },
  userRow: {
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
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
