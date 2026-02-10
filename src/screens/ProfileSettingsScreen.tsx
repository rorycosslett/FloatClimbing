import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Image, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import { useSocial } from '../context/SocialContext';
import { colors } from '../theme/colors';

export default function ProfileSettingsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { currentProfile, updateProfile, uploadAvatar } = useSocial();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (currentProfile) {
      setFirstName(currentProfile.firstName || '');
      setLastName(currentProfile.lastName || '');
    }
  }, [currentProfile]);

  const hasNameChanges =
    firstName !== (currentProfile?.firstName || '') ||
    lastName !== (currentProfile?.lastName || '');

  const handleSaveName = async () => {
    setNameSaving(true);
    try {
      const success = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      if (!success) {
        Alert.alert('Error', 'Failed to save name. Please try again.');
      }
    } catch (error) {
      console.error('Save name error:', error);
      Alert.alert('Error', 'Failed to save name. Please try again.');
    } finally {
      setNameSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to set a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setAvatarUploading(true);
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        Alert.alert('Error', 'Failed to process photo. Please try again.');
        return;
      }

      const publicUrl = await uploadAvatar(manipulated.base64);
      if (!publicUrl) {
        Alert.alert('Error', 'Failed to upload photo. Please try again.');
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Profile Photo</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.avatarSection}
            onPress={handlePickAvatar}
            disabled={avatarUploading}
          >
            <View style={styles.avatarContainer}>
              {avatarUploading ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : currentProfile?.avatarUrl ? (
                <Image
                  source={{ uri: currentProfile.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={32} color={colors.textMuted} />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </View>
            <Text style={styles.avatarHelpText}>
              Tap to change your profile photo
            </Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Name</Text>
        <View style={styles.card}>
          <Text style={styles.nameHelpText}>
            Set your name so friends can find you
          </Text>
          <View style={styles.nameFieldsContainer}>
            <View style={styles.nameField}>
              <Text style={styles.nameFieldLabel}>First Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="First name"
                placeholderTextColor={colors.textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <View style={styles.nameField}>
              <Text style={styles.nameFieldLabel}>Last Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="Last name"
                placeholderTextColor={colors.textMuted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          </View>
          {hasNameChanges && (
            <Pressable
              style={[styles.saveNameButton, nameSaving && styles.saveNameButtonDisabled]}
              onPress={handleSaveName}
              disabled={nameSaving}
            >
              <Text style={styles.saveNameButtonText}>
                {nameSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          {user && (
            <View style={styles.accountInfo}>
              <Ionicons name="person-circle" size={40} color={colors.textSecondary} />
              <View style={styles.accountDetails}>
                <Text style={styles.accountEmail}>{user.email}</Text>
                <Text style={styles.accountProvider}>
                  Signed in with {user.app_metadata?.provider || 'email'}
                </Text>
              </View>
            </View>
          )}
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarHelpText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  nameHelpText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  nameFieldsContainer: {
    gap: 12,
  },
  nameField: {
    gap: 4,
  },
  nameFieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  nameInput: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text,
  },
  saveNameButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveNameButtonDisabled: {
    opacity: 0.6,
  },
  saveNameButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountEmail: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  accountProvider: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
