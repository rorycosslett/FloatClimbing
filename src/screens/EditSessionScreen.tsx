import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Toast, { BaseToastProps } from 'react-native-toast-message';
import { useClimbs } from '../context/ClimbContext';
import { useSettings } from '../context/SettingsContext';
import { getGradesForSettings } from '../data/grades';
import { getSecondaryGrade } from '../utils/gradeUtils';
import { getGradeGradientColors } from '../utils/gradeColors';
import { ClimbType } from '../types';
import { colors } from '../theme/colors';
import { SwipeableClimbPill } from '../components/SwipeableClimbPill';

type EditSessionRouteParams = {
  EditSession: {
    sessionId: string;
    startTime: string;
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
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditSessionRouteParams, 'EditSession'>>();
  const { sessionId, startTime } = route.params;
  const { settings } = useSettings();
  const { climbs, deleteClimb, addClimbToSession, getSessionName, renameSession } = useClimbs();

  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const [sessionName, setSessionName] = useState(getSessionName(sessionId, startTime));
  const [isEditingName, setIsEditingName] = useState(false);
  const [showAddClimbModal, setShowAddClimbModal] = useState(false);

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

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          {isEditingName ? (
            <TextInput
              style={styles.headerTitleInput}
              value={sessionName}
              onChangeText={setSessionName}
              onBlur={handleSaveName}
              onSubmitEditing={handleSaveName}
              autoFocus
              maxLength={50}
              selectTextOnFocus
            />
          ) : (
            <Pressable onPress={() => setIsEditingName(true)} style={styles.titlePressable}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {sessionName}
              </Text>
              <Ionicons name="pencil" size={16} color={colors.textSecondary} style={styles.editIcon} />
            </Pressable>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addClimbButtonText}>Add Climb</Text>
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
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  titlePressable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  headerTitleInput: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editIcon: {
    marginLeft: 6,
  },
  headerSpacer: {
    width: 36,
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
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  addClimbButtonText: {
    color: '#fff',
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
});
