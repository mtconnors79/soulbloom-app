import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme/colors';
import { careCircleAPI } from '../../services/careCircleService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sharing tier options
const SHARING_TIERS = {
  data_only: {
    id: 'data_only',
    label: 'Share trends and mood data',
    description: 'They can see your mood scores, stress levels, and emotional patterns, but not your personal journal entries.',
    icon: 'analytics-outline',
  },
  full: {
    id: 'full',
    label: 'Share everything including journal entries',
    description: 'They can see all your wellness data including your personal reflections and check-in notes.',
    icon: 'document-text-outline',
  },
};

// Status badge colors
const STATUS_COLORS = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  declined: { bg: '#FEE2E2', text: '#991B1B' },
  revoked: { bg: '#F3F4F6', text: '#6B7280' },
  expired: { bg: '#FEE2E2', text: '#991B1B' },
};

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format relative time
const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateString);
};

// Status Badge Component
const StatusBadge = ({ status }) => {
  const statusColors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
      <Text style={[styles.statusText, { color: statusColors.text }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
};

// Tier Badge Component
const TierBadge = ({ tier }) => {
  const isFullAccess = tier === 'full';
  return (
    <View style={[styles.tierBadge, isFullAccess && styles.tierBadgeFull]}>
      <Icon
        name={isFullAccess ? 'eye-outline' : 'analytics-outline'}
        size={12}
        color={isFullAccess ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.tierText, isFullAccess && styles.tierTextFull]}>
        {isFullAccess ? 'Full Access' : 'Data Only'}
      </Text>
    </View>
  );
};

// Connection Card Component
const ConnectionCard = ({ connection, isPatientView, onPress, onAction }) => {
  const name = isPatientView
    ? connection.trusted_name || connection.trusted_email
    : connection.patient_name;

  const subtitle = isPatientView
    ? connection.trusted_email
    : 'Sharing your data';

  const dateLabel = isPatientView
    ? connection.status === 'pending'
      ? `Invited ${formatRelativeTime(connection.invited_at)}`
      : `Connected ${formatRelativeTime(connection.accepted_at)}`
    : `Connected ${formatRelativeTime(connection.accepted_at)}`;

  const isExpired = connection.is_expired;
  const displayStatus = isExpired ? 'expired' : connection.status;

  return (
    <TouchableOpacity
      style={styles.connectionCard}
      onPress={() => onPress(connection)}
      activeOpacity={0.7}
    >
      <View style={styles.connectionAvatar}>
        <Icon
          name={isPatientView ? 'person-outline' : 'heart-outline'}
          size={24}
          color={colors.primary}
        />
      </View>
      <View style={styles.connectionInfo}>
        <Text style={styles.connectionName} numberOfLines={1}>
          {name}
        </Text>
        {isPatientView && connection.status !== 'pending' && (
          <Text style={styles.connectionSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
        <Text style={styles.connectionDate}>{dateLabel}</Text>
      </View>
      <View style={styles.connectionMeta}>
        <StatusBadge status={displayStatus} />
        <TierBadge tier={connection.sharing_tier} />
      </View>
    </TouchableOpacity>
  );
};

// Empty State Component
const EmptyState = ({ onInvite }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Icon name="people-outline" size={64} color={colors.accent} />
    </View>
    <Text style={styles.emptyTitle}>Your Care Circle is empty</Text>
    <Text style={styles.emptySubtitle}>
      Invite someone you trust to view your wellness journey. They can help support you and stay connected.
    </Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onInvite}>
      <Icon name="person-add-outline" size={20} color={colors.white} />
      <Text style={styles.emptyButtonText}>Add Trusted Person</Text>
    </TouchableOpacity>
  </View>
);

// Invite Modal Component
const InviteModal = ({ visible, onClose, onSubmit, loading }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tier, setTier] = useState('data_only');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (text) => {
    setEmail(text);
    if (text && !text.includes('@')) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  const handleSubmit = () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }
    onSubmit({ email: email.trim(), name: name.trim(), tier });
  };

  const handleClose = () => {
    setEmail('');
    setName('');
    setTier('data_only');
    setEmailError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Trusted Person</Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalDescription}>
              Invite someone you trust to be part of your wellness journey. They'll receive an email invitation to join your Care Circle.
            </Text>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={[styles.textInput, emailError && styles.textInputError]}
                placeholder="Enter their email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={validateEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError ? (
                <Text style={styles.inputError}>{emailError}</Text>
              ) : null}
            </View>

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Their Name (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter their name"
                placeholderTextColor={colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            {/* Sharing Tier Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>What would you like to share?</Text>
              {Object.values(SHARING_TIERS).map((tierOption) => (
                <TouchableOpacity
                  key={tierOption.id}
                  style={[
                    styles.tierOption,
                    tier === tierOption.id && styles.tierOptionSelected,
                  ]}
                  onPress={() => setTier(tierOption.id)}
                >
                  <View style={styles.tierOptionHeader}>
                    <View style={[
                      styles.tierRadio,
                      tier === tierOption.id && styles.tierRadioSelected,
                    ]}>
                      {tier === tierOption.id && (
                        <View style={styles.tierRadioInner} />
                      )}
                    </View>
                    <Icon
                      name={tierOption.icon}
                      size={20}
                      color={tier === tierOption.id ? colors.primary : colors.textSecondary}
                    />
                    <Text style={[
                      styles.tierOptionLabel,
                      tier === tierOption.id && styles.tierOptionLabelSelected,
                    ]}>
                      {tierOption.label}
                    </Text>
                  </View>
                  <Text style={styles.tierOptionDescription}>
                    {tierOption.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Privacy Note */}
            <View style={styles.privacyNote}>
              <Icon name="shield-checkmark-outline" size={20} color={colors.primary} />
              <Text style={styles.privacyNoteText}>
                You can change sharing settings or remove access at any time. Your trusted person will be notified of any changes.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Icon name="paper-plane-outline" size={18} color={colors.white} />
                  <Text style={styles.submitButtonText}>Send Invitation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Connection Detail Modal Component
const ConnectionDetailModal = ({ visible, connection, isPatientView, onClose, onChangeTier, onRevoke, onViewAudit, loading }) => {
  if (!connection) return null;

  const name = isPatientView
    ? connection.trusted_name || connection.trusted_email
    : connection.patient_name;

  const isActive = connection.status === 'active';
  const isPending = connection.status === 'pending';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Connection Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Connection Info */}
            <View style={styles.detailSection}>
              <View style={styles.detailAvatar}>
                <Icon
                  name={isPatientView ? 'person' : 'heart'}
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.detailName}>{name}</Text>
              {isPatientView && (
                <Text style={styles.detailEmail}>{connection.trusted_email}</Text>
              )}
              <View style={styles.detailBadges}>
                <StatusBadge status={connection.is_expired ? 'expired' : connection.status} />
                <TierBadge tier={connection.sharing_tier} />
              </View>
            </View>

            {/* Status Info */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={styles.infoValue}>
                  {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                </Text>
              </View>
              {isPending && connection.expires_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expires</Text>
                  <Text style={styles.infoValue}>{formatDate(connection.expires_at)}</Text>
                </View>
              )}
              {connection.invited_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Invited</Text>
                  <Text style={styles.infoValue}>{formatDate(connection.invited_at)}</Text>
                </View>
              )}
              {connection.accepted_at && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Connected</Text>
                  <Text style={styles.infoValue}>{formatDate(connection.accepted_at)}</Text>
                </View>
              )}
            </View>

            {/* Sharing Tier (Patient can change) */}
            {isPatientView && isActive && (
              <View style={styles.tierChangeSection}>
                <Text style={styles.sectionLabel}>Sharing Level</Text>
                {Object.values(SHARING_TIERS).map((tierOption) => (
                  <TouchableOpacity
                    key={tierOption.id}
                    style={[
                      styles.tierOption,
                      connection.sharing_tier === tierOption.id && styles.tierOptionSelected,
                    ]}
                    onPress={() => onChangeTier(connection.id, tierOption.id)}
                    disabled={loading || connection.sharing_tier === tierOption.id}
                  >
                    <View style={styles.tierOptionHeader}>
                      <View style={[
                        styles.tierRadio,
                        connection.sharing_tier === tierOption.id && styles.tierRadioSelected,
                      ]}>
                        {connection.sharing_tier === tierOption.id && (
                          <View style={styles.tierRadioInner} />
                        )}
                      </View>
                      <Text style={[
                        styles.tierOptionLabel,
                        connection.sharing_tier === tierOption.id && styles.tierOptionLabelSelected,
                      ]}>
                        {tierOption.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionSection}>
              {isPatientView && isActive && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onViewAudit(connection.id)}
                >
                  <Icon name="list-outline" size={20} color={colors.primary} />
                  <Text style={styles.actionButtonText}>View Activity Log</Text>
                  <Icon name="chevron-forward" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonDanger]}
                onPress={() => onRevoke(connection)}
              >
                <Icon name="close-circle-outline" size={20} color="#EF4444" />
                <Text style={styles.actionButtonTextDanger}>
                  {isPatientView ? 'Remove from Care Circle' : 'Leave Care Circle'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Audit Log Modal Component
const AuditLogModal = ({ visible, connectionId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && connectionId) {
      fetchAuditLog();
    }
  }, [visible, connectionId]);

  const fetchAuditLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await careCircleAPI.getAuditLog(connectionId, { limit: 50 });
      setLogs(response.data?.audit_logs || []);
    } catch (err) {
      setError(err.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (actionType) => {
    const icons = {
      invited: 'mail-outline',
      accepted: 'checkmark-circle-outline',
      declined: 'close-circle-outline',
      revoked: 'ban-outline',
      viewed_summary: 'eye-outline',
      viewed_checkins: 'document-text-outline',
      viewed_moods: 'analytics-outline',
      exported_data: 'download-outline',
      tier_changed: 'options-outline',
    };
    return icons[actionType] || 'ellipse-outline';
  };

  const getActionLabel = (actionType) => {
    const labels = {
      invited: 'Invitation sent',
      accepted: 'Invitation accepted',
      declined: 'Invitation declined',
      revoked: 'Access revoked',
      viewed_summary: 'Viewed summary',
      viewed_checkins: 'Viewed check-ins',
      viewed_moods: 'Viewed mood data',
      exported_data: 'Exported data',
      tier_changed: 'Sharing level changed',
    };
    return labels[actionType] || actionType;
  };

  const renderLogItem = useCallback(({ item }) => (
    <View style={styles.logItem}>
      <View style={styles.logIcon}>
        <Icon name={getActionIcon(item.action_type)} size={18} color={colors.primary} />
      </View>
      <View style={styles.logContent}>
        <Text style={styles.logAction}>{getActionLabel(item.action_type)}</Text>
        <Text style={styles.logActor}>by {item.actor_name}</Text>
        <Text style={styles.logDate}>{formatDate(item.created_at)}</Text>
      </View>
    </View>
  ), []);

  const logKeyExtractor = useCallback((item) => item.id, []);

  // Log item height for getItemLayout (approx. 72px)
  const LOG_ITEM_HEIGHT = 72;
  const getLogItemLayout = useCallback((data, index) => ({
    length: LOG_ITEM_HEIGHT,
    offset: LOG_ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Activity Log</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.auditBody}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle-outline" size={48} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={fetchAuditLog}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : logs.length === 0 ? (
              <View style={styles.emptyLogContainer}>
                <Icon name="document-text-outline" size={48} color={colors.accent} />
                <Text style={styles.emptyLogText}>No activity recorded yet</Text>
              </View>
            ) : (
              <FlatList
                data={logs}
                renderItem={renderLogItem}
                keyExtractor={logKeyExtractor}
                showsVerticalScrollIndicator={false}
                // Performance optimizations
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                getItemLayout={getLogItemLayout}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Main Screen Component
const CareCircleScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connections, setConnections] = useState({ asPatient: [], asTrustedPerson: [] });
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [isPatientView, setIsPatientView] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    try {
      const response = await careCircleAPI.getConnections();
      setConnections({
        asPatient: response.data?.asPatient || [],
        asTrustedPerson: response.data?.asTrustedPerson || [],
      });
    } catch (error) {
      console.error('Error fetching connections:', error);
      Alert.alert('Error', 'Failed to load your Care Circle. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConnections();
  }, [fetchConnections]);

  const handleSendInvite = async ({ email, name, tier }) => {
    setActionLoading(true);
    try {
      await careCircleAPI.sendInvite(email, name, tier);
      setInviteModalVisible(false);
      Alert.alert('Invitation Sent', `An invitation has been sent to ${email}`);
      fetchConnections();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConnectionPress = (connection, isPatient = true) => {
    setSelectedConnection(connection);
    setIsPatientView(isPatient);
    setDetailModalVisible(true);
  };

  const handleChangeTier = async (connectionId, newTier) => {
    if (selectedConnection?.sharing_tier === newTier) return;

    setActionLoading(true);
    try {
      await careCircleAPI.updateTier(connectionId, newTier);
      setSelectedConnection({ ...selectedConnection, sharing_tier: newTier });
      fetchConnections();
      Alert.alert('Updated', 'Sharing level has been updated');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update sharing level');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevoke = (connection) => {
    const isPatient = connections.asPatient.some(c => c.id === connection.id);
    const name = isPatient
      ? connection.trusted_name || connection.trusted_email
      : connection.patient_name;

    Alert.alert(
      isPatient ? 'Remove from Care Circle' : 'Leave Care Circle',
      isPatient
        ? `Are you sure you want to remove ${name} from your Care Circle? They will no longer be able to see your wellness data.`
        : `Are you sure you want to leave ${name}'s Care Circle? You will no longer be able to view their wellness data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isPatient ? 'Remove' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await careCircleAPI.revokeConnection(connection.id);
              setDetailModalVisible(false);
              setSelectedConnection(null);
              Alert.alert('Done', isPatient ? 'Connection removed' : 'You have left the Care Circle');
              fetchConnections();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to remove connection');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleViewAudit = (connectionId) => {
    setSelectedConnectionId(connectionId);
    setAuditModalVisible(true);
  };

  const activePatientConnections = connections.asPatient.filter(c => c.status === 'active');
  const pendingPatientConnections = connections.asPatient.filter(c => c.status === 'pending');
  const activeTrustedConnections = connections.asTrustedPerson.filter(c => c.status === 'active');
  const hasConnections = connections.asPatient.length > 0 || connections.asTrustedPerson.length > 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Icon name="people" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>My Care Circle</Text>
          <Text style={styles.subtitle}>
            Share your wellness journey with people you trust
          </Text>
        </View>

        {!hasConnections ? (
          <EmptyState onInvite={() => setInviteModalVisible(true)} />
        ) : (
          <>
            {/* Add Button */}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setInviteModalVisible(true)}
            >
              <Icon name="person-add-outline" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>Add Trusted Person</Text>
            </TouchableOpacity>

            {/* Active Connections */}
            {activePatientConnections.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Icon name="checkmark-circle" size={16} color={colors.success} /> Active Connections
                </Text>
                {activePatientConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    isPatientView={true}
                    onPress={(c) => handleConnectionPress(c, true)}
                    onAction={() => {}}
                  />
                ))}
              </View>
            )}

            {/* Pending Invitations */}
            {pendingPatientConnections.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Icon name="time-outline" size={16} color="#F59E0B" /> Pending Invitations
                </Text>
                {pendingPatientConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    isPatientView={true}
                    onPress={(c) => handleConnectionPress(c, true)}
                    onAction={() => {}}
                  />
                ))}
              </View>
            )}

            {/* People Who Share With Me */}
            {activeTrustedConnections.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  <Icon name="heart" size={16} color={colors.primary} /> People Sharing With Me
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Tap to view their wellness data
                </Text>
                {activeTrustedConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    isPatientView={false}
                    onPress={(c) => handleConnectionPress(c, false)}
                    onAction={() => {}}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        onSubmit={handleSendInvite}
        loading={actionLoading}
      />

      <ConnectionDetailModal
        visible={detailModalVisible}
        connection={selectedConnection}
        isPatientView={isPatientView}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedConnection(null);
        }}
        onChangeTier={handleChangeTier}
        onRevoke={handleRevoke}
        onViewAudit={handleViewAudit}
        loading={actionLoading}
      />

      <AuditLogModal
        visible={auditModalVisible}
        connectionId={selectedConnectionId}
        onClose={() => {
          setAuditModalVisible(false);
          setSelectedConnectionId(null);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  headerIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 12,
  },

  // Connection Card
  connectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  connectionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  connectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  connectionDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  connectionMeta: {
    alignItems: 'flex-end',
    gap: 6,
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Tier Badge
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.background,
    gap: 4,
  },
  tierBadgeFull: {
    backgroundColor: colors.accent,
  },
  tierText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  tierTextFull: {
    color: colors.primary,
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
    gap: 12,
  },

  // Input
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  inputError: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  // Tier Options
  tierOption: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tierOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  tierOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRadioSelected: {
    borderColor: colors.primary,
  },
  tierRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  tierOptionLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tierOptionLabelSelected: {
    color: colors.primary,
  },
  tierOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    marginLeft: 32,
    lineHeight: 18,
  },

  // Privacy Note
  privacyNote: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  // Buttons
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },

  // Detail Modal
  detailSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    marginBottom: 20,
  },
  detailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  detailEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  detailBadges: {
    flexDirection: 'row',
    gap: 8,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500',
  },

  // Tier Change Section
  tierChangeSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Action Section
  actionSection: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  actionButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonTextDanger: {
    flex: 1,
    fontSize: 15,
    color: '#EF4444',
  },

  // Audit Log Modal
  auditBody: {
    flex: 1,
    minHeight: 300,
  },
  logItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  logActor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },

  // Error/Empty States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 15,
    color: colors.error,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  emptyLogContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyLogText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
  },
});

export default CareCircleScreen;
