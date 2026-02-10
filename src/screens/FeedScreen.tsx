import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { colors } from '../theme/colors';
import { ActivityFeedItem } from '../types';
import ActivityFeedCard from '../components/ActivityFeedCard';

type RootStackParamList = {
  Main: undefined;
  Settings: undefined;
  Profile: { userId: string };
  SearchUsers: undefined;
};

function SignInPrompt() {
  const { signInWithGoogle, signInWithApple } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
      </View>
      <View style={styles.promptContainer}>
        <Ionicons name="people-outline" size={64} color={colors.textMuted} />
        <Text style={styles.promptTitle}>See what your friends are climbing</Text>
        <Text style={styles.promptText}>
          Sign in to follow other climbers and see their sessions in your feed.
        </Text>
        <Pressable style={styles.signInButton} onPress={signInWithGoogle}>
          <Ionicons name="logo-google" size={20} color="#fff" />
          <Text style={styles.signInButtonText}>Sign in with Google</Text>
        </Pressable>
        <Pressable style={styles.signInButtonApple} onPress={signInWithApple}>
          <Ionicons name="logo-apple" size={20} color="#fff" />
          <Text style={styles.signInButtonText}>Sign in with Apple</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function EmptyFeedState() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>Your feed is empty</Text>
      <Text style={styles.emptyText}>
        Follow other climbers to see their sessions here.
      </Text>
      <Pressable
        style={styles.findFriendsButton}
        onPress={() => navigation.navigate('SearchUsers')}
      >
        <Ionicons name="search" size={20} color="#fff" />
        <Text style={styles.findFriendsButtonText}>Find Friends</Text>
      </Pressable>
    </View>
  );
}

export default function FeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isGuest } = useAuth();
  const {
    feed,
    feedLoading,
    feedError,
    hasMoreFeed,
    refreshFeed,
    loadMoreFeed,
  } = useSocial();

  if (isGuest) {
    return <SignInPrompt />;
  }

  const handleProfilePress = (userId: string) => {
    navigation.navigate('Profile', { userId });
  };

  const renderItem = ({ item }: { item: ActivityFeedItem }) => (
    <ActivityFeedCard item={item} onProfilePress={handleProfilePress} />
  );

  const renderFooter = () => {
    if (!hasMoreFeed) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Home</Text>
          <Pressable
            onPress={() => navigation.navigate('SearchUsers')}
            style={styles.searchButton}
          >
            <Ionicons name="search" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {feedError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{feedError}</Text>
          <Pressable onPress={refreshFeed}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {feed.length === 0 && !feedLoading ? (
        <EmptyFeedState />
      ) : (
        <FlatList
          data={feed}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={feedLoading && feed.length > 0}
              onRefresh={refreshFeed}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMoreFeed}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            feedLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : null
          }
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
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    color: colors.text,
  },
  searchButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  findFriendsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  findFriendsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Sign in prompt
  promptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  signInButtonApple: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    width: '100%',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
