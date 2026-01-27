import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useClimbs } from '../context/ClimbContext';
import { Climb } from '../types';

interface GroupedClimb extends Climb {
  index: number;
}

export default function HistoryScreen() {
  const { climbs, deleteClimb, isLoading } = useClimbs();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (climbs.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No climbs logged yet</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Group climbs by date
  const grouped: Record<string, GroupedClimb[]> = {};
  climbs.forEach((climb, index) => {
    const date = new Date(climb.timestamp);
    const dateKey = date.toDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push({ ...climb, index });
  });

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const sections = Object.keys(grouped)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    .map((dateKey) => {
      let label = dateKey;
      if (dateKey === today) label = 'Today';
      else if (dateKey === yesterday) label = 'Yesterday';

      return {
        title: label,
        data: grouped[dateKey].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      };
    });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item, index, section }) => (
          <View
            style={[
              styles.historyItem,
              index === section.data.length - 1 && styles.historyItemLast,
            ]}
          >
            <Text
              style={item.status === 'attempt' ? styles.attemptIcon : styles.sendIcon}
            >
              {item.status === 'attempt' ? '○' : '✓'}
            </Text>
            <Text style={styles.grade}>{item.grade}</Text>
            {item.type !== 'boulder' && (
              <Text style={styles.typeLabel}>({item.type})</Text>
            )}
            <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            <Pressable onPress={() => deleteClimb(item.id)} hitSlop={8}>
              <Text style={styles.deleteBtn}>×</Text>
            </Pressable>
          </View>
        )}
        renderSectionFooter={() => <View style={styles.sectionFooter} />}
      />
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
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#8e8e93',
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6e6e73',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 16,
  },
  sectionFooter: {
    height: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  historyItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  sendIcon: {
    color: '#007aff',
    fontSize: 14,
    marginRight: 8,
  },
  attemptIcon: {
    color: '#ff6b35',
    fontSize: 18,
    marginRight: 8,
  },
  grade: {
    fontSize: 17,
    fontWeight: '500',
  },
  typeLabel: {
    fontSize: 13,
    color: '#8e8e93',
    marginLeft: 8,
  },
  time: {
    fontSize: 15,
    color: '#8e8e93',
    marginLeft: 'auto',
  },
  deleteBtn: {
    color: '#ff6b35',
    fontSize: 20,
    marginLeft: 12,
    padding: 4,
  },
});
