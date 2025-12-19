import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import { profileAPI, authAPI } from '../../services/api';
import CrisisResourcesModal from '../../components/CrisisResourcesModal';

const ProfileMenuItem = ({ icon, label, value, onPress, danger }) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    disabled={!onPress}
  >
    <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
      <Icon name={icon} size={20} color={danger ? '#EF4444' : '#6366F1'} />
    </View>
    <View style={styles.menuContent}>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
    </View>
    {onPress && (
      <Icon name="chevron-forward" size={20} color="#9CA3AF" />
    )}
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [showCrisisModal, setShowCrisisModal] = useState(false);
  const firebaseUser = auth().currentUser;

  const fetchProfile = useCallback(async () => {
    try {
      const [profileResponse, meResponse] = await Promise.all([
        profileAPI.get().catch(() => ({ data: { profile: null } })),
        authAPI.getMe().catch(() => ({ data: { user: null } })),
      ]);

      setProfile(profileResponse.data?.profile || null);
      setUserInfo(meResponse.data?.user || null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await auth().signOut();
              // Navigation is handled by AppNavigator
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Coming Soon', 'Profile editing will be available in a future update.');
  };

  const handleNotificationSettings = () => {
    navigation.navigate('Settings');
  };

  const handlePrivacySettings = () => {
    Alert.alert('Coming Soon', 'Privacy settings will be available in a future update.');
  };

  const handleEmergencyContacts = () => {
    navigation.navigate('EmergencyContacts');
  };

  const handleSupport = () => {
    Alert.alert(
      'App Support',
      'For app support, email: support@soulbloom.app',
      [{ text: 'OK' }]
    );
  };

  const handleGetHelp = () => {
    setShowCrisisModal(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Coming Soon', 'Account deletion will be available in a future update.');
          },
        },
      ]
    );
  };

  const getInitials = () => {
    const name = profile?.name || firebaseUser?.displayName || firebaseUser?.email || '';
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
      }
    >
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <TouchableOpacity style={styles.editAvatarButton} onPress={handleEditProfile}>
            <Icon name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>
          {profile?.name || firebaseUser?.displayName || 'User'}
        </Text>
        <Text style={styles.userEmail}>{firebaseUser?.email}</Text>
        {profile?.age && (
          <Text style={styles.userAge}>{profile.age} years old</Text>
        )}
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="person-outline"
            label="Edit Profile"
            onPress={handleEditProfile}
          />
          <ProfileMenuItem
            icon="notifications-outline"
            label="Notifications"
            onPress={handleNotificationSettings}
          />
          <ProfileMenuItem
            icon="shield-checkmark-outline"
            label="Privacy & Security"
            onPress={handlePrivacySettings}
          />
          <ProfileMenuItem
            icon="settings-outline"
            label="Settings"
            value="Notifications, display & more"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </View>

      {/* Wellness Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wellness</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="people-outline"
            label="Emergency Contacts"
            value="Manage support contacts"
            onPress={handleEmergencyContacts}
          />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="heart-outline"
            label="Crisis Resources"
            value="Hotlines, support & help"
            onPress={handleGetHelp}
          />
          <ProfileMenuItem
            icon="help-circle-outline"
            label="App Support"
            onPress={handleSupport}
          />
          <ProfileMenuItem
            icon="information-circle-outline"
            label="Member Since"
            value={formatDate(userInfo?.created_at || firebaseUser?.metadata?.creationTime)}
          />
        </View>
      </View>

      {/* Danger Zone */}
      <View style={styles.section}>
        <View style={styles.menuCard}>
          <ProfileMenuItem
            icon="log-out-outline"
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
          <ProfileMenuItem
            icon="trash-outline"
            label="Delete Account"
            onPress={handleDeleteAccount}
            danger
          />
        </View>
      </View>

      {/* App Version */}
      <Text style={styles.version}>SoulBloom v0.5.0</Text>

      {/* Crisis Resources Modal */}
      <CrisisResourcesModal
        visible={showCrisisModal}
        onClose={() => setShowCrisisModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F9FAFB',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  userAge: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#1F2937',
  },
  menuLabelDanger: {
    color: '#EF4444',
  },
  menuValue: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
});

export default ProfileScreen;
