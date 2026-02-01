import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '../context/SettingsContext';
import { colors } from '../theme/colors';
import { BoulderGradeSystem, RouteGradeSystem } from '../types';

const BOULDER_SYSTEMS: { key: BoulderGradeSystem; label: string; example: string }[] = [
  { key: 'vscale', label: 'V-Scale', example: 'V0, V4, V10' },
  { key: 'fontainebleau', label: 'Fontainebleau', example: '4, 6A, 7A' },
];

const ROUTE_SYSTEMS: { key: RouteGradeSystem; label: string; example: string }[] = [
  { key: 'yds', label: 'YDS', example: '5.9, 5.11a, 5.13b' },
  { key: 'french', label: 'French', example: '5a, 6b, 7c+' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { settings, setBoulderSystem, setRouteSystem } = useSettings();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Grade Systems</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bouldering</Text>
          <View style={styles.optionsContainer}>
            {BOULDER_SYSTEMS.map((system) => (
              <Pressable
                key={system.key}
                style={[
                  styles.option,
                  settings.grades.boulderSystem === system.key && styles.optionSelected,
                ]}
                onPress={() => setBoulderSystem(system.key)}
              >
                <View style={styles.optionHeader}>
                  <Text
                    style={[
                      styles.optionLabel,
                      settings.grades.boulderSystem === system.key && styles.optionLabelSelected,
                    ]}
                  >
                    {system.label}
                  </Text>
                  {settings.grades.boulderSystem === system.key && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.optionExample}>{system.example}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sport / Trad</Text>
          <View style={styles.optionsContainer}>
            {ROUTE_SYSTEMS.map((system) => (
              <Pressable
                key={system.key}
                style={[
                  styles.option,
                  settings.grades.routeSystem === system.key && styles.optionSelected,
                ]}
                onPress={() => setRouteSystem(system.key)}
              >
                <View style={styles.optionHeader}>
                  <Text
                    style={[
                      styles.optionLabel,
                      settings.grades.routeSystem === system.key && styles.optionLabelSelected,
                    ]}
                  >
                    {system.label}
                  </Text>
                  {settings.grades.routeSystem === system.key && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.optionExample}>{system.example}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionExample: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
