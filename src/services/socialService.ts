import { supabase } from './supabase';
import {
  Profile,
  ProfileWithStats,
  Follow,
  ActivityFeedItem,
  ActivityMetadata,
  FeedPage,
  Session,
  Climb,
  ClimbType,
  ClimbStatus,
} from '../types';

// ============================================
// DB TYPE DEFINITIONS
// ============================================

interface DbProfile {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface DbFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

interface DbActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: string;
  session_id: string | null;
  metadata: ActivityMetadata;
  created_at: string;
}

interface DbSession {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  name: string | null;
  paused_duration: number | null;
}

interface DbClimb {
  id: string;
  user_id: string;
  session_id: string;
  grade: string;
  type: ClimbType;
  status: ClimbStatus;
  timestamp: string;
}

// ============================================
// TYPE CONVERTERS
// ============================================

function fromDbProfile(db: DbProfile): Profile {
  return {
    id: db.id,
    displayName: db.display_name,
    firstName: db.first_name,
    lastName: db.last_name,
    avatarUrl: db.avatar_url,
    isPublic: db.is_public,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function fromDbFollow(db: DbFollow): Follow {
  return {
    id: db.id,
    followerId: db.follower_id,
    followingId: db.following_id,
    createdAt: db.created_at,
  };
}

function fromDbSession(db: DbSession): Session {
  return {
    id: db.id,
    startTime: db.start_time,
    endTime: db.end_time || undefined,
    name: db.name || undefined,
    pausedDuration: db.paused_duration || undefined,
  };
}

function fromDbClimb(db: DbClimb): Climb {
  return {
    id: db.id,
    grade: db.grade,
    type: db.type,
    status: db.status,
    timestamp: db.timestamp,
    sessionId: db.session_id,
  };
}

function fromDbActivityFeedItem(
  db: DbActivityFeedItem,
  profile?: DbProfile,
  session?: DbSession,
  climbs?: DbClimb[]
): ActivityFeedItem {
  return {
    id: db.id,
    userId: db.user_id,
    activityType: db.activity_type as 'session_completed',
    sessionId: db.session_id,
    metadata: db.metadata,
    createdAt: db.created_at,
    user: profile ? fromDbProfile(profile) : undefined,
    session: session ? fromDbSession(session) : undefined,
    climbs: climbs ? climbs.map(fromDbClimb) : undefined,
  };
}

// ============================================
// SOCIAL SERVICE
// ============================================

export class SocialService {
  private userId: string | null = null;

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  // ============================================
  // PROFILE OPERATIONS
  // ============================================

  async getProfile(profileId: string): Promise<ProfileWithStats | null> {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error || !profile) {
      console.error('Error fetching profile:', error);
      return null;
    }

    // Get follower/following counts using RPC functions
    const [followerResult, followingResult] = await Promise.all([
      supabase.rpc('get_follower_count', { profile_id: profileId }),
      supabase.rpc('get_following_count', { profile_id: profileId }),
    ]);

    // Check if current user follows this profile
    let isFollowing = false;
    if (this.userId && this.userId !== profileId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', this.userId)
        .eq('following_id', profileId)
        .single();
      isFollowing = !!followData;
    }

    return {
      ...fromDbProfile(profile),
      followerCount: followerResult.data || 0,
      followingCount: followingResult.data || 0,
      isFollowing,
    };
  }

  async getCurrentUserProfile(): Promise<ProfileWithStats | null> {
    if (!this.userId) return null;
    return this.getProfile(this.userId);
  }

  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
  }): Promise<boolean> {
    if (!this.userId) return false;

    const dbUpdates: Record<string, string | undefined> = {};
    if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
    if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;

    // Recompute display_name from first/last name when either is provided
    const newFirst = updates.firstName?.trim();
    const newLast = updates.lastName?.trim();
    const computedDisplayName = [newFirst, newLast].filter(Boolean).join(' ');
    if (computedDisplayName) {
      dbUpdates.display_name = computedDisplayName;
    }

    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', this.userId);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  }

  async uploadAvatar(base64Data: string): Promise<string | null> {
    if (!this.userId) return null;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const filePath = `${this.userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, bytes.buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', this.userId);

    if (updateError) {
      console.error('Error updating avatar URL:', updateError);
      return null;
    }

    return publicUrl;
  }

  async searchUsers(query: string, limit = 20): Promise<ProfileWithStats[]> {
    if (!query.trim()) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_public', true)
      .or(`display_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching users:', error);
      return [];
    }

    // Get stats for each profile
    const profiles = await Promise.all(
      (data || []).map(async (profile) => {
        const fullProfile = await this.getProfile(profile.id);
        return fullProfile;
      })
    );

    return profiles.filter((p): p is ProfileWithStats => p !== null);
  }

  // ============================================
  // FOLLOW OPERATIONS
  // ============================================

  async followUser(targetId: string): Promise<boolean> {
    if (!this.userId || this.userId === targetId) return false;

    const { error } = await supabase.from('follows').insert({
      follower_id: this.userId,
      following_id: targetId,
    });

    if (error) {
      console.error('Error following user:', error);
      return false;
    }

    return true;
  }

  async unfollowUser(targetId: string): Promise<boolean> {
    if (!this.userId) return false;

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', this.userId)
      .eq('following_id', targetId);

    if (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }

    return true;
  }

  async getFollowers(userId: string, limit = 50): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id, profiles!follows_follower_id_fkey(*)')
      .eq('following_id', userId)
      .limit(limit);

    if (error) {
      console.error('Error fetching followers:', error);
      return [];
    }

    return (data || [])
      .map((row: any) => row.profiles)
      .filter((p: DbProfile | null): p is DbProfile => p !== null)
      .map(fromDbProfile);
  }

  async getFollowing(userId: string, limit = 50): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('following_id, profiles!follows_following_id_fkey(*)')
      .eq('follower_id', userId)
      .limit(limit);

    if (error) {
      console.error('Error fetching following:', error);
      return [];
    }

    return (data || [])
      .map((row: any) => row.profiles)
      .filter((p: DbProfile | null): p is DbProfile => p !== null)
      .map(fromDbProfile);
  }

  // ============================================
  // ACTIVITY FEED OPERATIONS
  // ============================================

  async getFeed(cursor?: string, limit = 20): Promise<FeedPage> {
    if (!this.userId) {
      return { items: [], nextCursor: null, hasMore: false };
    }

    let query = supabase
      .from('activity_feed_items')
      .select(`
        *,
        profiles!activity_feed_items_user_id_fkey(*),
        sessions!activity_feed_items_session_id_fkey(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to check if there's more

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feed:', error);
      return { items: [], nextCursor: null, hasMore: false };
    }

    const hasMore = (data || []).length > limit;
    const items = (data || []).slice(0, limit);

    // Fetch climbs for each session
    const sessionIds = items
      .map((item: any) => item.session_id)
      .filter((id: string | null): id is string => id !== null);

    let climbsMap = new Map<string, DbClimb[]>();
    if (sessionIds.length > 0) {
      const { data: climbs } = await supabase
        .from('climbs')
        .select('*')
        .in('session_id', sessionIds)
        .order('timestamp', { ascending: false });

      if (climbs) {
        climbs.forEach((climb: DbClimb) => {
          const existing = climbsMap.get(climb.session_id) || [];
          existing.push(climb);
          climbsMap.set(climb.session_id, existing);
        });
      }
    }

    const feedItems: ActivityFeedItem[] = items.map((item: any) =>
      fromDbActivityFeedItem(
        item,
        item.profiles,
        item.sessions,
        item.session_id ? climbsMap.get(item.session_id) : undefined
      )
    );

    return {
      items: feedItems,
      nextCursor: hasMore && items.length > 0 ? items[items.length - 1].created_at : null,
      hasMore,
    };
  }

  async createActivityItem(
    sessionId: string,
    metadata: ActivityMetadata
  ): Promise<boolean> {
    if (!this.userId) return false;

    const { error } = await supabase.from('activity_feed_items').insert({
      user_id: this.userId,
      activity_type: 'session_completed',
      session_id: sessionId,
      metadata,
    });

    if (error) {
      console.error('Error creating activity item:', error);
      return false;
    }

    return true;
  }

  // ============================================
  // USER SESSIONS (for profile view)
  // ============================================

  async getUserSessions(userId: string, limit = 10): Promise<Session[]> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }

    return (data || []).map(fromDbSession);
  }

  async getSessionClimbs(sessionId: string): Promise<Climb[]> {
    const { data, error } = await supabase
      .from('climbs')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching session climbs:', error);
      return [];
    }

    return (data || []).map(fromDbClimb);
  }
}

export const socialService = new SocialService();
