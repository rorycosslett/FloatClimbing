import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { socialService } from '../services/socialService';
import {
  Profile,
  ProfileWithStats,
  ActivityFeedItem,
} from '../types';

interface SocialContextType {
  // Feed state
  feed: ActivityFeedItem[];
  feedLoading: boolean;
  feedError: string | null;
  hasMoreFeed: boolean;

  // Profile state
  currentProfile: ProfileWithStats | null;

  // Actions
  refreshFeed: () => Promise<void>;
  loadMoreFeed: () => Promise<void>;
  followUser: (userId: string) => Promise<boolean>;
  unfollowUser: (userId: string) => Promise<boolean>;
  searchUsers: (query: string) => Promise<ProfileWithStats[]>;
  getProfile: (userId: string) => Promise<ProfileWithStats | null>;
  getFollowers: (userId: string) => Promise<Profile[]>;
  getFollowing: (userId: string) => Promise<Profile[]>;
  updateProfile: (updates: { firstName?: string; lastName?: string }) => Promise<boolean>;
  uploadAvatar: (base64Data: string) => Promise<string | null>;
  getUserSessions: typeof socialService.getUserSessions;
  getSessionClimbs: typeof socialService.getSessionClimbs;
}

const SocialContext = createContext<SocialContextType | undefined>(undefined);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileWithStats | null>(null);

  // Update service when user changes
  useEffect(() => {
    socialService.setUserId(user?.id || null);
    if (user) {
      loadCurrentProfile();
      refreshFeed();
    } else {
      setFeed([]);
      setCurrentProfile(null);
      setFeedCursor(null);
      setHasMoreFeed(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadCurrentProfile = async () => {
    const profile = await socialService.getCurrentUserProfile();
    setCurrentProfile(profile);
  };

  const refreshFeed = useCallback(async () => {
    if (!user) return;
    setFeedLoading(true);
    setFeedError(null);
    try {
      const page = await socialService.getFeed();
      setFeed(page.items);
      setFeedCursor(page.nextCursor);
      setHasMoreFeed(page.hasMore);
    } catch (error) {
      setFeedError('Failed to load feed');
      console.error('Feed error:', error);
    } finally {
      setFeedLoading(false);
    }
  }, [user]);

  const loadMoreFeed = useCallback(async () => {
    if (!user || !hasMoreFeed || feedLoading) return;
    setFeedLoading(true);
    try {
      const page = await socialService.getFeed(feedCursor || undefined);
      setFeed((prev) => [...prev, ...page.items]);
      setFeedCursor(page.nextCursor);
      setHasMoreFeed(page.hasMore);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setFeedLoading(false);
    }
  }, [user, hasMoreFeed, feedLoading, feedCursor]);

  const followUser = useCallback(
    async (userId: string): Promise<boolean> => {
      const success = await socialService.followUser(userId);
      if (success) {
        // Refresh feed to include new user's activity
        refreshFeed();
        // Update current profile stats
        loadCurrentProfile();
      }
      return success;
    },
    [refreshFeed]
  );

  const unfollowUser = useCallback(
    async (userId: string): Promise<boolean> => {
      const success = await socialService.unfollowUser(userId);
      if (success) {
        // Remove unfollowed user's items from feed
        setFeed((prev) => prev.filter((item) => item.userId !== userId));
        // Update current profile stats
        loadCurrentProfile();
      }
      return success;
    },
    []
  );

  const searchUsers = useCallback(
    async (query: string): Promise<ProfileWithStats[]> => {
      return socialService.searchUsers(query);
    },
    []
  );

  const getProfile = useCallback(
    async (userId: string): Promise<ProfileWithStats | null> => {
      return socialService.getProfile(userId);
    },
    []
  );

  const updateProfile = useCallback(
    async (updates: { firstName?: string; lastName?: string }): Promise<boolean> => {
      const success = await socialService.updateProfile(updates);
      if (success) {
        await loadCurrentProfile();
      }
      return success;
    },
    []
  );

  const uploadAvatar = useCallback(
    async (base64Data: string): Promise<string | null> => {
      const publicUrl = await socialService.uploadAvatar(base64Data);
      if (publicUrl) {
        await loadCurrentProfile();
      }
      return publicUrl;
    },
    []
  );

  return (
    <SocialContext.Provider
      value={{
        feed,
        feedLoading,
        feedError,
        hasMoreFeed,
        currentProfile,
        refreshFeed,
        loadMoreFeed,
        followUser,
        unfollowUser,
        searchUsers,
        getProfile,
        getFollowers: socialService.getFollowers.bind(socialService),
        getFollowing: socialService.getFollowing.bind(socialService),
        updateProfile,
        uploadAvatar,
        getUserSessions: socialService.getUserSessions.bind(socialService),
        getSessionClimbs: socialService.getSessionClimbs.bind(socialService),
      }}
    >
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
