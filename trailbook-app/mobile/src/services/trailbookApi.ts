import api from './api';
import { getPublicFeedBaseUrl } from '../config/api';
import axios from 'axios';
import type { Album, MediaItem, PublicFeedResponse, PublicFeedAlbumItem } from '../types';

// Re-export types (we'll create these)
export type { Album, MediaItem, PublicFeedResponse, PublicFeedAlbumItem };

function unwrapData<T>(res: { data?: T } | T): T {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }
  return res as T;
}

export async function getMyAlbums(): Promise<Album[]> {
  const response = await api.get('/albums/me');
  const data = unwrapData(response.data);
  
  if (data && typeof data === 'object' && 'albums' in data && Array.isArray(data.albums)) {
    return (data.albums as any[]).map((a) => ({
      ...a,
      id: a._id || a.id || '',
    })).filter((a) => Boolean(a.id));
  }
  return [];
}

export async function getAlbumById(albumId: string): Promise<Album | null> {
  const response = await api.get(`/albums/${encodeURIComponent(albumId)}`);
  const data = unwrapData(response.data);
  const album = (data && typeof data === 'object' && 'album' in data) ? data.album : data;
  
  if (album && typeof album === 'object') {
    return {
      ...(album as any),
      id: (album as any)._id || (album as any).id || albumId,
    } as Album;
  }
  return null;
}

export async function getAlbumMedia(albumId: string): Promise<MediaItem[]> {
  const response = await api.get(`/media/album/${encodeURIComponent(albumId)}`);
  const data = unwrapData(response.data);
  
  if (data && typeof data === 'object' && 'media' in data && Array.isArray(data.media)) {
    return data.media as MediaItem[];
  }
  if (Array.isArray(data)) return data as MediaItem[];
  return [];
}

export async function createAlbum(payload: {
  name: string;
  description: string;
  location: string;
  story: string;
  isPublic: boolean;
  coverImage?: string;
}): Promise<Album> {
  const response = await api.post('/albums', payload);
  const data = unwrapData(response.data);
  const album = (data && typeof data === 'object' && 'album' in data) ? data.album : data;
  
  if (album && typeof album === 'object') {
    return {
      ...(album as any),
      id: (album as any)._id || (album as any).id || '',
    } as Album;
  }
  return album as Album;
}

export async function getPublicFeed(payload?: {
  limit?: number;
  cursor?: string | null;
}): Promise<PublicFeedResponse> {
  const params: any = {};
  if (payload?.limit) params.limit = payload.limit;
  if (payload?.cursor) params.cursor = payload.cursor;
  
  // Public feed might be on a different backend, so use direct axios call
  const baseUrl = getPublicFeedBaseUrl();
  const url = `${baseUrl}/albums/public-feed`;
  
  try {
    const response = await axios.get(url, { params });
    const data = unwrapData(response.data);
    
    if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
      return {
        items: data.items as PublicFeedAlbumItem[],
        pageInfo: data.pageInfo,
      };
    }
    return { items: [] };
  } catch (error: any) {
    // If endpoint doesn't exist, return empty feed instead of crashing
    if (error.response?.status === 404 || error.message?.includes('Cannot GET')) {
      console.warn('Public feed endpoint not available, returning empty feed');
      return { items: [] };
    }
    throw error;
  }
}
