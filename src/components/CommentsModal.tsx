import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { FeedComment, ActivityFeedItem } from '../types';
import { useAuth } from '../context/AuthContext';

interface CommentsModalProps {
  visible: boolean;
  feedItem: ActivityFeedItem | null;
  onClose: () => void;
  onLoadComments: (feedItemId: string) => Promise<FeedComment[]>;
  onAddComment: (feedItemId: string, content: string) => Promise<FeedComment | null>;
  onDeleteComment: (feedItemId: string, commentId: string) => Promise<boolean>;
  onProfilePress: (userId: string) => void;
}

function formatCommentTime(timestamp: string): string {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function CommentsModal({
  visible,
  feedItem,
  onClose,
  onLoadComments,
  onAddComment,
  onDeleteComment,
  onProfilePress,
}: CommentsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && feedItem) {
      setLoading(true);
      onLoadComments(feedItem.id)
        .then(setComments)
        .finally(() => setLoading(false));
    } else {
      setComments([]);
      setInputText('');
    }
  }, [visible, feedItem?.id, onLoadComments]);

  const handleSubmit = async () => {
    if (!feedItem || !inputText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await onAddComment(feedItem.id, inputText);
      if (comment) {
        setComments((prev) => [...prev, comment]);
        setInputText('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!feedItem) return;
          const success = await onDeleteComment(feedItem.id, commentId);
          if (success) {
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          }
        },
      },
    ]);
  };

  const renderComment = ({ item }: { item: FeedComment }) => (
    <View style={styles.commentRow}>
      <Pressable onPress={() => onProfilePress(item.userId)}>
        {item.user?.avatarUrl ? (
          <Image source={{ uri: item.user.avatarUrl }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Ionicons name="person" size={14} color={colors.textMuted} />
          </View>
        )}
      </Pressable>
      <View style={styles.commentBody}>
        <Text style={styles.commentUserName}>
          {item.user?.displayName || 'Climber'}
        </Text>
        <Text style={styles.commentContent}>{item.content}</Text>
        <Text style={styles.commentTimestamp}>{formatCommentTime(item.createdAt)}</Text>
      </View>
      {item.userId === user?.id && (
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={12}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.overlayTop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Comments</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : comments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySubtext}>Be the first to comment</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
            />
          )}

          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              maxLength={500}
              multiline
            />
            <Pressable
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!inputText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={inputText.trim() ? '#fff' : colors.textMuted}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    minHeight: 300,
  },
  modalHeader: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  loader: {
    paddingVertical: 40,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  commentsList: {
    padding: 16,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentBody: {
    flex: 1,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentContent: {
    fontSize: 14,
    color: colors.text,
    marginTop: 2,
    lineHeight: 20,
  },
  commentTimestamp: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  deleteButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.surfaceSecondary,
  },
});
