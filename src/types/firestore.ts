import type { Timestamp } from "firebase/firestore";

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
