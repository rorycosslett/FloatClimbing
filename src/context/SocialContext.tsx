import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { socialService } from '../services/socialService';
import { Profile, ProfileWithStats, ActivityFeedItem, FeedComment } from '../types';

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
  uploadSessionPhoto: (sessionId: string, base64Data: string) => Promise<string | null>;
  deleteSessionPhoto: (sessionId: string) => Promise<boolean>;
  removeFeedItem: (sessionId: string) => void;
  getUserSessions: typeof socialService.getUserSessions;
  getSessionClimbs: typeof socialService.getSessionClimbs;
  // Like & comment actions
  likeFeedItem: (feedItemId: string) => Promise<void>;
  unlikeFeedItem: (feedItemId: string) => Promise<void>;
  getComments: (feedItemId: string) => Promise<FeedComment[]>;
  addComment: (feedItemId: string, content: string) => Promise<FeedComment | null>;
  deleteComment: (feedItemId: string, commentId: string) => Promise<boolean>;
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
    try {
      const profile = await socialService.getCurrentUserProfile();
      setCurrentProfile(profile);
    } catch (error) {
      console.error('Error loading current profile:', error);
    }
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

  const unfollowUser = useCallback(async (userId: string): Promise<boolean> => {
    const success = await socialService.unfollowUser(userId);
    if (success) {
      // Remove unfollowed user's items from feed
      setFeed((prev) => prev.filter((item) => item.userId !== userId));
      // Update current profile stats
      loadCurrentProfile();
    }
    return success;
  }, []);

  const searchUsers = useCallback(async (query: string): Promise<ProfileWithStats[]> => {
    return socialService.searchUsers(query);
  }, []);

  const getProfile = useCallback(async (userId: string): Promise<ProfileWithStats | null> => {
    return socialService.getProfile(userId);
  }, []);

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

  const uploadAvatar = useCallback(async (base64Data: string): Promise<string | null> => {
    const publicUrl = await socialService.uploadAvatar(base64Data);
    if (publicUrl) {
      await loadCurrentProfile();
    }
    return publicUrl;
  }, []);

  const uploadSessionPhoto = useCallback(
    async (sessionId: string, base64Data: string): Promise<string | null> => {
      return socialService.uploadSessionPhoto(sessionId, base64Data);
    },
    []
  );

  const removeFeedItem = useCallback((sessionId: string) => {
    setFeed((prev) => prev.filter((item) => item.sessionId !== sessionId));
  }, []);

  const deleteSessionPhoto = useCallback(async (sessionId: string): Promise<boolean> => {
    return socialService.deleteSessionPhoto(sessionId);
  }, []);

  const likeFeedItem = useCallback(async (feedItemId: string) => {
    const success = await socialService.likeFeedItem(feedItemId);
    if (success) {
      setFeed((prev) =>
        prev.map((item) =>
          item.id === feedItemId
            ? { ...item, isLikedByMe: true, likeCount: item.likeCount + 1 }
            : item
        )
      );
    }
  }, []);

  const unlikeFeedItem = useCallback(async (feedItemId: string) => {
    const success = await socialService.unlikeFeedItem(feedItemId);
    if (success) {
      setFeed((prev) =>
        prev.map((item) =>
          item.id === feedItemId
            ? { ...item, isLikedByMe: false, likeCount: Math.max(0, item.likeCount - 1) }
            : item
        )
      );
    }
  }, []);

  const getComments = useCallback(async (feedItemId: string): Promise<FeedComment[]> => {
    return socialService.getComments(feedItemId);
  }, []);

  const addComment = useCallback(
    async (feedItemId: string, content: string): Promise<FeedComment | null> => {
      const comment = await socialService.addComment(feedItemId, content);
      if (comment) {
        setFeed((prev) =>
          prev.map((item) =>
            item.id === feedItemId
              ? { ...item, commentCount: item.commentCount + 1 }
              : item
          )
        );
      }
      return comment;
    },
    []
  );

  const deleteComment = useCallback(
    async (feedItemId: string, commentId: string): Promise<boolean> => {
      const success = await socialService.deleteComment(commentId);
      if (success) {
        setFeed((prev) =>
          prev.map((item) =>
            item.id === feedItemId
              ? { ...item, commentCount: Math.max(0, item.commentCount - 1) }
              : item
          )
        );
      }
      return success;
    },
    []
  );

  const value = useMemo(
    () => ({
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
      uploadSessionPhoto,
      deleteSessionPhoto,
      removeFeedItem,
      getUserSessions: socialService.getUserSessions.bind(socialService),
      getSessionClimbs: socialService.getSessionClimbs.bind(socialService),
      likeFeedItem,
      unlikeFeedItem,
      getComments,
      addComment,
      deleteComment,
    }),
    [
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
      updateProfile,
      uploadAvatar,
      uploadSessionPhoto,
      deleteSessionPhoto,
      removeFeedItem,
      likeFeedItem,
      unlikeFeedItem,
      getComments,
      addComment,
      deleteComment,
    ]
  );

  return (
    <SocialContext.Provider value={value}>
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
