import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getPublicFeed } from '../services/trailbookApi';
import type { PublicFeedAlbumItem } from '../types';

export default function FeedScreen() {
  const navigation = useNavigation();
  const [feedItems, setFeedItems] = useState<PublicFeedAlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPublicFeed({ limit: 20 });
      setFeedItems(response.items || []);
      // If no items, show a helpful message
      if (response.items.length === 0) {
        setError('No public albums available. The feed endpoint may not be configured on your backend.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load feed';
      setError(errorMessage);
      console.error('Error loading feed:', err);
      // Set empty array on error so UI doesn't break
      setFeedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const renderFeedItem = ({ item }: { item: PublicFeedAlbumItem }) => (
    <TouchableOpacity
      style={styles.feedCard}
      onPress={() => navigation.navigate('AlbumDetail' as never, { albumId: item.id } as never)}
    >
      <Image
        source={{ uri: item.coverImage || 'https://via.placeholder.com/300' }}
        style={styles.feedImage}
        resizeMode="cover"
      />
      <View style={styles.feedInfo}>
        <Text style={styles.feedTitle}>{item.title || 'Untitled Album'}</Text>
        {item.user && <Text style={styles.feedUser}>By {item.user.name || 'Unknown'}</Text>}
        {item.location && <Text style={styles.feedLocation}>{item.location}</Text>}
        {item.photoCount !== undefined && (
          <Text style={styles.feedPhotoCount}>{item.photoCount} photos</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  if (error && feedItems.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          The public feed endpoint may not be available on your backend.
          {'\n\n'}Check your API configuration or use the "My Albums" tab instead.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadFeed}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feedItems}
        renderItem={renderFeedItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No feed items available</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={loadFeed}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    marginBottom: 10,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  errorHint: {
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
  },
  feedCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  feedImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  feedInfo: {
    padding: 15,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  feedUser: {
    fontSize: 14,
    color: '#6200ee',
    marginBottom: 5,
  },
  feedLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  feedPhotoCount: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
