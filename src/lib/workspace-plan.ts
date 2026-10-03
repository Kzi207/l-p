import { randomUUID } from "node:crypto";

type Data = Record<string, unknown>;
export type WorkspaceRecord = { path: string; data: Data; createdAt: number; updatedAt: number };
export type WorkspacePlan = { changes: Map<string, WorkspaceRecord | null>; result: { coupleId: string }; scopes: string[] };

export function planWorkspace(action: string, body: Data, uid: string, records: WorkspaceRecord[]): WorkspacePlan {
  const index = new Map(records.map(record => [record.path, record]));
  const changes = new Map<string, WorkspaceRecord | null>();
  const now = Date.now();
  const stamp = { __type: "timestamp", value: now };
  const put = (path: string, data: Data) => changes.set(path, { path, data, createdAt: index.get(path)?.createdAt ?? now, updatedAt: now });
  const selfPath = `users/${uid}`;
  const self = index.get(selfPath);
  if (action === "ensureWorkspace") {
    const currentId = self?.data.coupleId;
    if (typeof currentId === "string") {
      const space = index.get(`couples/${currentId}`);
      if (!space || !Array.isArray(space.data.memberIds) || !space.data.memberIds.includes(uid)) throw new Error("Không gian hiện tại không hợp lệ.");
      return { changes, result: { coupleId: currentId }, scopes: [selfPath] };
    }
    const coupleId = randomUUID();
    put(`couples/${coupleId}`, { memberIds: [uid], mode: "personal", startDate: null, createdAt: stamp, inviteId: "" });
    put(selfPath, { ...(self?.data ?? { displayName: String(body.displayName || "Bạn"), email: String(body.email || ""), photoURL: String(body.photoURL || "") }), coupleId });
    return { changes, result: { coupleId }, scopes: [selfPath] };
  }
  const inviteId = String(body.inviteId || "");
  if (!inviteId || inviteId.includes("/")) throw new Error("Lời mời không hợp lệ.");
  const invitePath = `pairInvites/${inviteId}`;
  const invite = index.get(invitePath);
  if (!invite || invite.data.status !== "active") throw new Error("Lời mời không còn hiệu lực.");
  const ownerId = String(invite.data.ownerId || "");
  if (!ownerId || ownerId === uid) throw new Error("Hãy gửi lời mời cho người khác.");
  if (invite.data.targetUid && invite.data.targetUid !== uid) throw new Error("Lời mời này dành cho tài khoản khác.");
  const ownerPath = `users/${ownerId}`;
  const owner = index.get(ownerPath);
  if (!self || !owner) throw new Error("Hãy mở ứng dụng để tạo hồ sơ trước khi ghép đôi.");
  const sources = [owner, self].map(profile => {
    const id = profile.data.coupleId;
    if (!id) return null;
    const source = index.get(`couples/${id}`);
    if (!source || !Array.isArray(source.data.memberIds) || source.data.memberIds.length !== 1 || source.data.memberIds[0] !== profile.path.slice(6) || source.data.endedAt) throw new Error("Một trong hai tài khoản đã ghép đôi. Hãy tải lại trang.");
    return source;
  });
  const coupleId = randomUUID();
  const destination = `couples/${coupleId}`;
  put(destination, { memberIds: [ownerId, uid], mode: "shared", startDate: sources.find(source => source?.data.startDate)?.data.startDate ?? null, createdAt: stamp, inviteId });
  for (const [sourceIndex, source] of sources.entries()) {
    if (!source) continue;
    const prefix = `${source.path}/`;
    const children = records.filter(record => record.path.startsWith(prefix));
    // Namespace document IDs from each source, including nested replies. Rewrite
    // matching reference fields so albums and their entries remain connected.
    const ids = new Map<string, string>();
    for (const record of children) record.path.slice(prefix.length).split("/").forEach((part, i) => { if (i % 2 === 1) ids.set(part, `${sourceIndex}-${part}`); });
    const rewrite = (value: unknown, field = ""): unknown => {
      if (typeof value === "string") {
        if (field === "coupleId") return coupleId;
        if (/^(albumId|postId|memoryId|challengeId|itemId|parentId|replyToId)$/.test(field)) return ids.get(value) ?? value;
        return value;
      }
      if (Array.isArray(value)) return value.map(item => rewrite(item, field));
      if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewrite(item, key)]));
      return value;
    };
    for (const record of children) {
      const relative = record.path.slice(prefix.length).split("/").map((part, i) => i % 2 === 1 ? ids.get(part)! : part).join("/");
      const path = `${destination}/${relative}`;
      changes.set(path, { ...record, path, data: rewrite(record.data) as Data, updatedAt: now });
      changes.set(record.path, null);
    }
    put(source.path, { ...source.data, memberIds: [], mergedInto: coupleId, endedAt: stamp });
  }
  put(ownerPath, { ...owner.data, coupleId });
  put(selfPath, { ...self.data, coupleId });
  put(invitePath, { ...invite.data, status: "accepted", acceptedBy: uid, coupleId });
  return { changes, result: { coupleId }, scopes: [selfPath, ownerPath, invitePath, ...sources.filter((source): source is WorkspaceRecord => Boolean(source)).map(source => source.path)] };
}
