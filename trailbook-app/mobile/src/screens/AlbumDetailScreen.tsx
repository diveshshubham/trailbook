import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { getAlbumById, getAlbumMedia } from '../services/trailbookApi';
import type { Album, MediaItem } from '../types';

export default function AlbumDetailScreen() {
  const route = useRoute();
  const { albumId } = route.params as { albumId: string };
  
  const [album, setAlbum] = useState<Album | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlbumData();
  }, [albumId]);

  const loadAlbumData = async () => {
    try {
      setLoading(true);
      const [albumData, mediaData] = await Promise.all([
        getAlbumById(albumId),
        getAlbumMedia(albumId),
      ]);
      setAlbum(albumData);
      setMedia(mediaData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load album');
      console.error('Error loading album:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading album...</Text>
      </View>
    );
  }

  if (error || !album) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Album not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: album.coverImage || album.coverUrl || 'https://via.placeholder.com/400' }}
        style={styles.coverImage}
        resizeMode="cover"
      />
      
      <View style={styles.content}>
        <Text style={styles.title}>{album.title || album.name || 'Untitled Album'}</Text>
        
        {album.location && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location:</Text>
            <Text style={styles.infoValue}>{album.location}</Text>
          </View>
        )}
        
        {album.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{album.description}</Text>
          </View>
        )}
        
        {album.story && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Story</Text>
            <Text style={styles.story}>{album.story}</Text>
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos ({media.length})</Text>
          <View style={styles.photoGrid}>
            {media.map((item) => (
              <Image
                key={item._id}
                source={{ uri: item.url || `https://via.placeholder.com/150` }}
                style={styles.photoThumbnail}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    textAlign: 'center',
  },
  coverImage: {
    width: '100%',
    height: 300,
    backgroundColor: '#e0e0e0',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  story: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  photoThumbnail: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.66%',
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
  },
});
