import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useClimbs } from '../context/ClimbContext';
import { useSettings } from '../context/SettingsContext';
import { getGradesForSettings } from '../data/grades';
import { getDisplayGrade, getSecondaryGrade } from '../utils/gradeUtils';
import { ClimbType, Climb } from '../types';
import { colors } from '../theme/colors';

type EditSessionRouteParams = {
  EditSession: {
    sessionId: string;
    startTime: string;
  };
};

const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EditSessionScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<EditSessionRouteParams, 'EditSession'>>();
  const { sessionId, startTime } = route.params;
  const { settings } = useSettings();
  const { climbs, deleteClimb, addClimbToSession, getSessionName, renameSession } = useClimbs();

  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const [sessionName, setSessionName] = useState(getSessionName(sessionId, startTime));
  const [isEditingName, setIsEditingName] = useState(false);

  const sessionClimbs = climbs
    .filter((c) => c.sessionId === sessionId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const currentGrades = getGradesForSettings(selectedType, settings.grades);

  const handleAddClimb = (grade: string, status: 'send' | 'attempt') => {
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
            <View style={styles.climbsList}>
              {sessionClimbs.map((climb, idx) => (
                <View
                  key={climb.id}
                  style={[
                    styles.climbRow,
                    idx === sessionClimbs.length - 1 && styles.climbRowLast,
                  ]}
                >
                  <Text style={climb.status === 'attempt' ? styles.attemptIcon : styles.sendIcon}>
                    {climb.status === 'attempt' ? '○' : '✓'}
                  </Text>
                  <Text style={styles.climbGrade}>{getDisplayGrade(climb, settings.grades)}</Text>
                  {climb.type !== 'boulder' && (
                    <Text style={styles.climbType}>({climb.type})</Text>
                  )}
                  <Text style={styles.climbTime}>{formatTime(climb.timestamp)}</Text>
                  <Pressable onPress={() => handleDeleteClimb(climb.id)} hitSlop={8}>
                    <Text style={styles.deleteBtn}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Climb</Text>
          <View style={styles.gradesList}>
            {currentGrades.map((grade) => (
              <View key={grade} style={styles.gradeRow}>
                <View style={styles.gradeLabels}>
                  <Text style={styles.gradeLabel}>{grade}</Text>
                  <Text style={styles.secondaryGradeLabel}>
                    {getSecondaryGrade(grade, selectedType, settings.grades)}
                  </Text>
                </View>
                <View style={styles.buttons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.tickBtn,
                      pressed && styles.tickBtnPressed,
                    ]}
                    onPress={() => handleAddClimb(grade, 'send')}
                  >
                    <Text style={[styles.tickBtnText, styles.sendText]}>✓</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.attemptBtn,
                      pressed && styles.attemptBtnPressed,
                    ]}
                    onPress={() => handleAddClimb(grade, 'attempt')}
                  >
                    <Text style={styles.attemptBtnText}>○</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
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
  climbsList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  climbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  climbRowLast: {
    borderBottomWidth: 0,
  },
  sendIcon: {
    color: colors.primary,
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  attemptIcon: {
    color: colors.warning,
    fontSize: 16,
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  climbGrade: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  climbType: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  climbTime: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  deleteBtn: {
    color: colors.danger,
    fontSize: 22,
    marginLeft: 12,
    padding: 4,
  },
  gradesList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gradeLabels: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  gradeLabel: {
    fontSize: 18,
    fontWeight: '500',
    minWidth: 50,
    color: colors.text,
  },
  secondaryGradeLabel: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textMuted,
    opacity: 0.7,
  },
  buttons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  tickBtn: {
    width: 48,
    height: 40,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tickBtnPressed: {
    backgroundColor: colors.primary,
  },
  tickBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sendText: {
    color: colors.primary,
  },
  attemptBtn: {
    width: 48,
    height: 40,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  attemptBtnPressed: {
    backgroundColor: colors.warning,
  },
  attemptBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.warning,
  },
});
