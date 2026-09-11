import { collection, exportCouple, getDocs } from "@/lib/database";
import { db } from "@/lib/firebase";

const backupCollections = ["photos", "memories", "mediaMemories", "locketPosts", "coupleEvents", "timeCapsules", "tripAlbums", "firstMoments", "musicFavorites", "musicHistory", "wishItems", "coupleChallenges"];

async function collectWithLegacyApi(coupleId: string) {
  const entries = await Promise.all(backupCollections.map(async (name) => {
    const snapshot = await getDocs(collection(db, "couples", coupleId, name));
    return [name, snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))] as const;
  }));
  return { format: "love-days-backup-v1", coupleId, exportedAt: new Date().toISOString(), data: Object.fromEntries(entries) };
}

export async function collectCoupleData(coupleId: string) {
  try {
    const result = await exportCouple(coupleId);
    return { format: "love-days-backup-v1", coupleId, exportedAt: new Date(result.exportedAt).toISOString(), data: Object.fromEntries(Object.entries(result.data).map(([name, records]) => [name, records.map((record) => ({ id: record.id, ...record.data }))])) };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message.toLowerCase() : "";
    if (!message.includes("action") && !message.includes("hỗ trợ") && !message.includes("ho tro")) throw caught;
    return collectWithLegacyApi(coupleId);
  }
}
