import type { Timestamp } from "@/lib/database";

export interface CoupleInfo {
  memberIds: string[];
  startDate: Timestamp | null;
  createdAt: Timestamp;
  inviteId: string;
  endedAt?: Timestamp;
}

export interface PhotoDocument {
  imageUrl: string;
  cloudinaryPublicId: string;
  caption: string;
  reaction: string | null;
  createdAt: Timestamp;
  uploaderId: string;
  uploaderName: string;
}

export interface UserDocument {
  displayName: string;
  email: string;
  nickname?: string;
  birthday?: string;
  bio?: string;
  photoURL?: string;
  coupleId?: string | null;
  fcmTokens?: string[];
}

export interface PairInviteDocument {
  ownerId: string;
  ownerName: string;
  targetUid: string;
  status: "active" | "accepted";
  acceptedBy?: string;
  coupleId?: string;
  createdAt: Timestamp;
}

export interface MemoryDocument {
  title: string;
  description: string;
  date: Timestamp;
  imageUrl: string;
  cloudinaryPublicId: string;
  tags: string[];
  createdAt: Timestamp;
  uploaderId: string;
  uploaderName: string;
}

export interface LocketPostDocument {
  imageUrl: string;
  cloudinaryPublicId: string;
  caption: string;
  reactions: Record<string, string>;
  createdAt: Timestamp;
  uploaderId: string;
  uploaderName: string;
  uploaderPhotoUrl: string;
}

export interface LocketReplyDocument {
  text: string;
  createdAt: Timestamp;
  senderId: string;
  senderName: string;
  senderPhotoUrl: string;
}

export type LocketMessageDocument = LocketReplyDocument;

export interface MediaMemoryDocument {
  mediaUrl: string;
  cloudinaryPublicId: string;
  mediaType: "image" | "video";
  caption: string;
  takenAt: Timestamp;
  createdAt: Timestamp;
  uploaderId: string;
  uploaderName: string;
}

export interface MusicFavoriteDocument {
  trackId: string;
  source: "youtube" | "soundcloud";
  title: string;
  artist: string;
  duration: string;
  thumbnail: string;
  url: string;
  addedBy: string;
  addedByName: string;
  createdAt: Timestamp;
}

export interface CoupleEventDocument {
  title: string;
  eventType: "date" | "birthday" | "anniversary" | "appointment";
  eventAt: Timestamp;
  endAt?: Timestamp;
  allDay?: boolean;
  scheduleType?: "personal" | "together";
  remindDays: number;
  notes: string;
  createdAt: Timestamp;
  creatorId: string;
  creatorName: string;
  reminderSentAt?: Timestamp;
}

export interface TimeCapsuleDocument {
  title: string;
  message?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  cloudinaryPublicId?: string;
  openDate: Timestamp;
  createdAt: Timestamp;
  creatorId: string;
  creatorName: string;
  locked?: boolean;
}

export interface TripAlbumMedia {
  url: string;
  publicId: string;
  type: "image" | "video";
  caption: string;
  uploadedAt: Timestamp;
  uploaderId: string;
}

export interface TripAlbumDocument {
  title: string;
  location: string;
  notes: string;
  tripDate: Timestamp;
  media: TripAlbumMedia[];
  createdAt: Timestamp;
  creatorId: string;
  creatorName: string;
}

export interface FirstMomentDocument {
  title: string;
  category: "met" | "date" | "kiss" | "trip" | "custom";
  happenedAt: Timestamp;
  story: string;
  imageUrl: string;
  cloudinaryPublicId: string;
  tags: string[];
  createdAt: Timestamp;
  creatorId: string;
  creatorName: string;
}

export interface MusicHistoryDocument {
  trackId: string;
  source: "soundcloud";
  title: string;
  artist: string;
  thumbnail: string;
  url: string;
  playedBy: string;
  playedByName: string;
  playedAt: Timestamp;
}

export interface WishItemDocument {
  title: string;
  category: "food" | "place" | "movie" | "activity" | "other";
  note: string;
  status: "open" | "done";
  createdAt: Timestamp;
  completedAt?: Timestamp;
  creatorId: string;
  creatorName: string;
}

export interface CoupleChallengeDocument {
  title: string;
  description: string;
  targetDays: number;
  checkInDates: string[];
  status: "active" | "completed";
  createdAt: Timestamp;
  creatorId: string;
  creatorName: string;
}
