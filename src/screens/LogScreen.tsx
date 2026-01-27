import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClimbs } from '../context/ClimbContext';
import { grades } from '../data/grades';
import { ClimbType } from '../types';

const CLIMB_TYPES: ClimbType[] = ['boulder', 'sport', 'trad'];

export default function LogScreen() {
  const [selectedType, setSelectedType] = useState<ClimbType>('boulder');
  const { addClimb } = useClimbs();

  const handleLog = (grade: string, status: 'send' | 'attempt') => {
    addClimb(grade, selectedType, status);
    const message = status === 'attempt' ? `${grade} attempt` : `${grade} logged`;
    Alert.alert('', message, [{ text: 'OK' }], { cancelable: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Climb/Attempt</Text>
        <View style={styles.segmentControl}>
          {CLIMB_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[
                styles.segmentBtn,
                selectedType === type && styles.segmentBtnActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedType === type && styles.segmentTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.gradeList}>
        {grades[selectedType].map((grade) => (
          <View key={grade} style={styles.gradeRow}>
            <Text style={styles.gradeLabel}>{grade}</Text>
            <View style={styles.buttons}>
              <Pressable
                style={({ pressed }) => [
                  styles.tickBtn,
                  pressed && styles.tickBtnPressed,
                ]}
                onPress={() => handleLog(grade, 'send')}
              >
                <Text style={[styles.tickBtnText, styles.sendText]}>✓</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.attemptBtn,
                  pressed && styles.attemptBtnPressed,
                ]}
                onPress={() => handleLog(grade, 'attempt')}
              >
                <Text style={[styles.attemptBtnText]}>○</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f7',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  segmentControl: {
    flexDirection: 'row',
    backgroundColor: '#e5e5ea',
    borderRadius: 8,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    color: '#333',
  },
  segmentTextActive: {
    color: '#007aff',
  },
  gradeList: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  gradeLabel: {
    fontSize: 17,
    fontWeight: '500',
    minWidth: 70,
  },
  buttons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 8,
  },
  tickBtn: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: '#007aff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tickBtnPressed: {
    backgroundColor: '#007aff',
  },
  tickBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sendText: {
    color: '#007aff',
  },
  attemptBtn: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: '#ff6b35',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  attemptBtnPressed: {
    backgroundColor: '#ff6b35',
  },
  attemptBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ff6b35',
  },
});
