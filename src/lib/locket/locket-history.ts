import "server-only";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Use the history query supported by locket.js, preserving each document's real
// author (the SDK's getMoments currently assigns the viewer UID to every entry).
export async function getLocketHistory(client: any, options: { limit: number; pageToken: string | null; userId?: string }) {
  const { uid } = client.session;
  const prefix = `projects/locket-4252a/databases/locket/documents/history/${uid}/entries/`;
  const cursor = client.moments.decodeQueryCursor(options.pageToken);
  if (options.pageToken && (!cursor || typeof cursor.date !== "string" || !Number.isFinite(Date.parse(cursor.date)) || typeof cursor.docName !== "string" || !cursor.docName.startsWith(prefix))) {
    throw new Error("Trang lịch sử không hợp lệ. Hãy làm mới bản tin.");
  }
  const token = await client.session.getValidToken();
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/locket-4252a/databases/locket/documents/history/${encodeURIComponent(uid)}:runQuery`, {
    method: "POST",
    headers: { ...client.device.defaultHeaders, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: "entries" }],
      orderBy: [{ field: { fieldPath: "date" }, direction: "DESCENDING" }, { field: { fieldPath: "__name__" }, direction: "DESCENDING" }],
      limit: options.limit,
      ...(options.userId ? { where: { fieldFilter: { field: { fieldPath: "user" }, op: "EQUAL", value: { stringValue: options.userId } } } } : {}),
      ...(cursor ? { startAt: { values: [{ timestampValue: cursor.date }, { referenceValue: cursor.docName }], before: false } } : {}),
    } }),
  });
  if (!response.ok) throw new Error(`Không thể tải lịch sử Locket (${response.status}). Vui lòng thử lại.`);
  const rows = await response.json();
  const documents = rows.flatMap((row: any) => row.document ? [row.document] : []);
  const moments = documents.map((doc: any) => {
    const fields = Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, client.moments.parseFirestoreValue(value)]));
    return { ...fields, moment_uid: fields.canonical_uid || fields.moment_uid || doc.name.split("/").pop(), user_uid: fields.user_uid || fields.user || options.userId || null, image_url: fields.image_url || fields.thumbnail_url || "", date: fields.date || client.moments.getDocDateValue(doc) };
  });
  const last = documents.at(-1);
  return { moments, nextPageToken: documents.length === options.limit && last ? client.moments.encodeQueryCursor({ date: client.moments.getDocDateValue(last), docName: last.name }) : null };
}
