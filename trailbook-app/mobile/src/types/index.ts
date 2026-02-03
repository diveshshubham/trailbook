export type Album = {
  id: string;
  _id?: string;
  title?: string;
  name?: string;
  description?: string;
  coverImage?: string;
  cover?: string;
  coverUrl?: string;
  photoCount?: number;
  photosCount?: number;
  createdAt?: string;
  location?: string;
  isPublic?: boolean;
  story?: string;
  photos?: string[];
};

export type MediaItem = {
  _id: string;
  albumId: string;
  key: string;
  contentType: string;
  size: number;
  url?: string;
  reflectionsCount?: number;
  createdAt: string;
  title?: string;
  description?: string;
  location?: string;
  tags?: string[];
  story?: string;
  isPublic?: boolean;
  isArchived?: boolean;
};

export type PublicFeedUser = {
  id: string;
  name?: string;
  profilePicture?: string;
};

export type PublicFeedBadge = {
  id: string;
  name?: string;
  description?: string;
  logoKey?: string;
  isCustom?: boolean;
};

export type PublicFeedAlbumItem = {
  id: string;
  title?: string;
  location?: string;
  createdAt?: string;
  eventDate?: string;
  description?: string;
  storyPreview?: string;
  coverImage?: string;
  photoCount?: number;
  user?: PublicFeedUser;
  badges?: PublicFeedBadge[];
};

export type PublicFeedPageInfo = {
  limit: number;
  hasNextPage: boolean;
  nextCursor: string | null;
};

export type PublicFeedResponse = {
  items: PublicFeedAlbumItem[];
  pageInfo?: PublicFeedPageInfo;
};
