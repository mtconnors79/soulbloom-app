/**
 * OptimizedImage Component
 *
 * A wrapper around React Native's Image component with:
 * - Loading placeholder support
 * - Error fallback handling
 * - Caching for network images
 * - Fade-in animation on load
 *
 * Can be upgraded to react-native-fast-image when React 19 support is added.
 */

import React, { useState, useCallback, memo } from 'react';
import {
  Image,
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
import { colors } from '../theme/colors';

/**
 * Memoized to prevent re-renders when image source hasn't changed.
 * Uses custom comparison for source prop (compares uri for network images).
 */
const OptimizedImage = memo(function OptimizedImage({
  source,
  style,
  resizeMode = 'cover',
  showPlaceholder = true,
  placeholderColor = colors.background,
  onLoad,
  onError,
  fadeDuration = 300,
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const handleLoad = useCallback((e) => {
    setLoading(false);
    setError(false);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: fadeDuration,
      useNativeDriver: true,
    }).start();

    onLoad?.(e);
  }, [fadeAnim, fadeDuration, onLoad]);

  const handleError = useCallback((e) => {
    setLoading(false);
    setError(true);
    onError?.(e);
  }, [onError]);

  // Determine if this is a network image
  const isNetworkImage = source?.uri && typeof source.uri === 'string';

  // Add cache control for network images
  const imageSource = isNetworkImage
    ? {
        ...source,
        cache: 'force-cache', // Use cached version if available
        headers: source.headers || {},
      }
    : source;

  return (
    <View style={[styles.container, style]}>
      {/* Placeholder shown while loading */}
      {showPlaceholder && loading && !error && (
        <View style={[styles.placeholder, { backgroundColor: placeholderColor }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Error fallback */}
      {error && (
        <View style={[styles.placeholder, styles.errorPlaceholder]}>
          <View style={styles.errorIcon}>
            <View style={styles.errorLine} />
          </View>
        </View>
      )}

      {/* Actual image with fade animation */}
      <Animated.Image
        source={imageSource}
        style={[
          styles.image,
          style,
          { opacity: fadeAnim },
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if source uri changes
  const prevUri = prevProps.source?.uri;
  const nextUri = nextProps.source?.uri;

  // If both are network images, compare URIs
  if (prevUri && nextUri) {
    return prevUri === nextUri;
  }

  // For local images, use default shallow comparison
  return prevProps.source === nextProps.source;
});

/**
 * Preload images for faster display
 * @param {Array<{uri: string}>} sources - Array of image sources to preload
 */
OptimizedImage.preload = (sources) => {
  sources.forEach((source) => {
    if (source?.uri) {
      Image.prefetch(source.uri);
    }
  });
};

/**
 * Clear image cache (if supported)
 */
OptimizedImage.clearCache = () => {
  // Note: React Native's Image doesn't have a native cache clear method
  // This is a placeholder for when we upgrade to FastImage
  console.log('Image cache clearing not supported with native Image component');
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    backgroundColor: colors.background,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorLine: {
    width: 20,
    height: 2,
    backgroundColor: colors.textSecondary,
    transform: [{ rotate: '45deg' }],
  },
});

export default OptimizedImage;
