import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import { useClimbs } from '../context/ClimbContext';
import { useSettings } from '../context/SettingsContext';
import { useSocial } from '../context/SocialContext';
import { getGradesForSettings } from '../data/grades';
import { getSecondaryGrade } from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';
import { ClimbType } from '../types';
import { colors } from '../theme/colors';
import { SwipeableClimbPill } from '../components/SwipeableClimbPill';

type TabParamList = {
  Log: undefined;
  You: undefined;
  Home: undefined;
};

type RootStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
  EditSession: {
    sessionId: string;
    startTime: string;
    photoUrl?: string;
  };
};

type EditSessionRouteParams = {
  EditSession: {
    sessionId: string;
    startTime: string;
    photoUrl?: string;
  };
};

const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];

const modalToastConfig = {
  success: ({ text1 }: BaseToastProps) => (
    <View style={modalToastStyles.container}>
      <Text style={modalToastStyles.text}>{text1}</Text>
    </View>
  ),
};

const modalToastStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default function EditSessionScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<EditSessionRouteParams, 'EditSession'>>();
  const { sessionId, startTime, photoUrl: initialPhotoUrl } = route.params;
  const { settings } = useSettings();
  const { climbs, deleteClimb, addClimbToSession, getSessionName, renameSession, updateSessionPhotoUrl, updateSessionPrivacy, deleteSession, sessionMetadata } = useClimbs();
  const { uploadSessionPhoto, deleteSessionPhoto } = useSocial();

  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const [sessionName, setSessionName] = useState(getSessionName(sessionId, startTime));
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAddClimbModal, setShowAddClimbModal] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl || null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isPublic, setIsPublic] = useState<boolean>(
    sessionMetadata[sessionId]?.isPublic !== false
  );

  const sessionClimbs = climbs
    .filter((c) => c.sessionId === sessionId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const currentGrades = getGradesForSettings(selectedType, settings.grades);

  const handleAddClimb = (grade: string, status: 'send' | 'attempt') => {
    Haptics.impactAsync(
      status === 'send' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    addClimbToSession(sessionId, grade, selectedType, status);
    const message = status === 'attempt' ? `${grade} attempt added` : `${grade} send added`;
    Toast.show({
      type: 'success',
      text1: `✓ ${message}`,
      visibilityTime: 2000,
    });
  };

  const handleDeleteClimb = (climbId: string) => {
    deleteClimb(climbId);
  };

  const handleSaveName = () => {
    if (sessionName.trim()) {
      renameSession(sessionId, sessionName.trim());
    }
    setIsEditingName(false);
  };

  const handleTogglePrivacy = (value: boolean) => {
    setIsPublic(value);
    updateSessionPrivacy(sessionId, value);
  };

  const handlePickPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to add a session photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setPhotoUploading(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        Alert.alert('Error', 'Failed to process photo. Please try again.');
        return;
      }

      const publicUrl = await uploadSessionPhoto(sessionId, manipulated.base64);
      if (publicUrl) {
        setPhotoUrl(publicUrl);
        updateSessionPhotoUrl(sessionId, publicUrl);
        Toast.show({
          type: 'success',
          text1: 'Photo uploaded',
          visibilityTime: 2000,
        });
      } else {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoUploading(true);
    try {
      const success = await deleteSessionPhoto(sessionId);
      if (success) {
        setPhotoUrl(null);
        updateSessionPhotoUrl(sessionId, null);
        Toast.show({
          type: 'success',
          text1: 'Photo removed',
          visibilityTime: 2000,
        });
      } else {
        Alert.alert('Error', 'Failed to remove photo. Please try again.');
      }
    } catch (error) {
      console.error('Photo delete error:', error);
      Alert.alert('Error', 'Failed to remove photo. Please try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleBack = () => {
    navigation.navigate('Main', { screen: 'You' });
  };

  const handleDeleteSession = () => {
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    deleteSession(sessionId);
    if (photoUrl) {
      deleteSessionPhoto(sessionId).catch(console.error);
    }
    setDeleteConfirmVisible(false);
    navigation.navigate('Main', { screen: 'You' });
    Toast.show({
      type: 'success',
      text1: 'Session deleted',
      visibilityTime: 2000,
    });
  };

  const handleCancelDelete = () => {
    setDeleteConfirmVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Session</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Session name section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Name</Text>
          <View style={styles.sessionNameContainer}>
            {isEditingName ? (
              <TextInput
                style={styles.sessionNameInput}
                value={sessionName}
                onChangeText={setSessionName}
                onBlur={handleSaveName}
                onSubmitEditing={handleSaveName}
                autoFocus
                maxLength={50}
                selectTextOnFocus
              />
            ) : (
              <Pressable onPress={() => setIsEditingName(true)} style={styles.sessionNamePressable}>
                <Text style={styles.sessionNameText} numberOfLines={1}>
                  {sessionName}
                </Text>
                <Ionicons name="pencil" size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Photo section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo</Text>
          <View style={styles.photoContainer}>
            {photoUploading ? (
              <View style={styles.photoPlaceholder}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : photoUrl ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
                <View style={styles.photoActions}>
                  <Pressable style={styles.photoActionBtn} onPress={handlePickPhoto}>
                    <Ionicons name="swap-horizontal" size={16} color={colors.text} />
                    <Text style={styles.photoActionText}>Replace</Text>
                  </Pressable>
                  <Pressable style={styles.photoActionBtn} onPress={handleRemovePhoto}>
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text style={[styles.photoActionText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable style={styles.photoPlaceholder} onPress={handlePickPhoto}>
                <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                <Text style={styles.photoPlaceholderText}>Add a session photo</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Current Climbs ({sessionClimbs.length})
          </Text>
          {sessionClimbs.length === 0 ? (
            <View style={styles.emptyClimbs}>
              <Text style={styles.emptyText}>No climbs in this session</Text>
            </View>
          ) : (
            <View style={styles.climbPillContainer}>
              {sessionClimbs.map((climb) => (
                <SwipeableClimbPill
                  key={climb.id}
                  climb={climb}
                  gradeSettings={settings.grades}
                  onDelete={() => handleDeleteClimb(climb.id)}
                />
              ))}
            </View>
          )}
          <Pressable
            style={styles.addClimbButton}
            onPress={() => setShowAddClimbModal(true)}
          >
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text style={styles.addClimbButtonText}>Add Climb</Text>
          </Pressable>
        </View>

        {/* Privacy section */}
        <View style={styles.section}>
          <View style={styles.privacyRow}>
            <View style={styles.privacyInfo}>
              <Ionicons
                name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                size={20}
                color={isPublic ? colors.primary : colors.textSecondary}
              />
              <View>
                <Text style={styles.privacyLabel}>
                  {isPublic ? 'Public' : 'Private'}
                </Text>
                <Text style={styles.privacyDescription}>
                  {isPublic
                    ? "Visible on followers' feeds"
                    : 'Only visible in your history'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPublic}
              onValueChange={handleTogglePrivacy}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        <View style={styles.bottomActions}>
          <Pressable style={styles.deleteSessionButton} onPress={handleDeleteSession}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <Text style={styles.deleteSessionText}>Delete Session</Text>
          </Pressable>
          <Pressable style={styles.saveSessionButton} onPress={handleBack}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.saveSessionText}>Save Session</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showAddClimbModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddClimbModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Climb</Text>
            <Pressable
              onPress={() => setShowAddClimbModal(false)}
              style={styles.modalCloseBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.typeSelector}>
            {CLIMB_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.typeBtn, selectedType === type && styles.typeBtnActive]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[styles.typeText, selectedType === type && styles.typeTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.columnHeaders}>
            <Text style={styles.columnHeaderText}>Attempts</Text>
            <Text style={styles.columnHeaderText}>Sends</Text>
          </View>
          <ScrollView style={styles.gradeList}>
            {currentGrades.map((grade) => {
              const secondaryGrade = getSecondaryGrade(grade, selectedType, settings.grades);
              const gradientColors = getGradeGradientColors(grade, selectedType, settings.grades);
              return (
                <View key={grade} style={styles.gradeRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.attemptPillWrapper,
                      pressed && styles.attemptPillPressed,
                    ]}
                    onPress={() => handleAddClimb(grade, 'attempt')}
                  >
                    <View style={styles.attemptPillInner}>
                      <View style={styles.pillContent}>
                        <Text style={styles.pillText}>{grade}</Text>
                        <Text style={styles.pillSecondaryText}>{secondaryGrade}</Text>
                      </View>
                    </View>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.sendPillWrapper,
                      pressed && styles.sendPillPressed,
                    ]}
                    onPress={() => handleAddClimb(grade, 'send')}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 1, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.sendPillGradient}
                    >
                      <View style={styles.pillContent}>
                        <Text style={styles.pillText}>{grade}</Text>
                        <Text style={styles.pillSecondaryText}>{secondaryGrade}</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </SafeAreaView>
        <Toast config={modalToastConfig} />
      </Modal>

      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={handleCancelDelete}>
        <Pressable style={styles.deleteModalOverlay} onPress={handleCancelDelete}>
          <Pressable style={styles.deleteModalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.deleteModalTitle}>Delete Session?</Text>
            <Text style={styles.deleteWarningText}>
              This will permanently delete this session and all of its climbs.
            </Text>
            <View style={styles.deleteModalButtons}>
              <Pressable style={styles.deleteModalCancelButton} onPress={handleCancelDelete}>
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.deleteModalDeleteButton} onPress={handleConfirmDelete}>
                <Text style={styles.deleteModalDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  sessionNameContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sessionNamePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionNameText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  sessionNameInput: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 2,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  typeBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: colors.text,
  },
  typeTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  emptyClimbs: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  climbPillContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  columnHeaders: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  columnHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
  },
  gradeList: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  gradeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 48,
  },
  sendPillWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendPillGradient: {
    paddingHorizontal: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },
  sendPillPressed: {
    opacity: 0.8,
  },
  attemptPillWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attemptPillInner: {
    backgroundColor: colors.textSecondary,
    paddingHorizontal: 13,
    paddingVertical: 15,
    alignItems: 'center',
  },
  attemptPillPressed: {
    opacity: 0.8,
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 6,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    width: 44,
    textAlign: 'center',
  },
  pillSecondaryText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#ffffff',
    opacity: 0.7,
    width: 34,
    textAlign: 'left',
  },
  addClimbButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  addClimbButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  modalCloseBtn: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  privacyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  privacyDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  photoContainer: {
    padding: 16,
    paddingTop: 0,
  },
  photoPlaceholder: {
    height: 100,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  photoPreviewContainer: {
    gap: 12,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  deleteSessionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.danger,
    gap: 8,
  },
  deleteSessionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  saveSessionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  saveSessionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  deleteWarningText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    color: colors.text,
  },
  deleteModalDeleteButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  deleteModalDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
