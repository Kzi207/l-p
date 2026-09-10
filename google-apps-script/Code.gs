const RECORD_SHEET = "Records";
const HEADERS = ["path", "json", "createdAt", "updatedAt"];
const API_VERSION = "love-days-sheets-v2";

function doGet() {
  return jsonResponse({ ok: true, service: "love-days-sheets-db", version: API_VERSION, time: Date.now() });
}

function doPost(event) {
  try {
    const body = JSON.parse((event.postData && event.postData.contents) || "{}");
    const serverSecret = (PropertiesService.getScriptProperties().getProperty("SERVER_SECRET") || "").trim();
    let user;
    if (body.secret) {
      if (!serverSecret) throw new Error("Apps Script chưa có Script Property SERVER_SECRET.");
      if (body.secret !== serverSecret) throw new Error("APPS_SCRIPT_SERVER_SECRET không khớp SERVER_SECRET trong Apps Script.");
      user = { uid: "server", email: "", name: "", admin: true };
    } else {
      user = verifyFirebaseToken(body.token);
    }
    const result = dispatchAction(body, user);
    return jsonResponse({ ok: true, version: API_VERSION, data: result });
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    return jsonResponse({ ok: false, version: API_VERSION, error: error && error.message ? error.message : "Apps Script database error." });
  }
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function config(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error("Thiếu Script Property " + name + ".");
  return value;
}

function verifyFirebaseToken(token) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token || "");
  const cacheKey = "firebase-token:" + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
  const cachedUser = CacheService.getScriptCache().get(cacheKey);
  if (cachedUser) return JSON.parse(cachedUser);
  if (!token || typeof token !== "string") throw new Error("Bạn cần đăng nhập lại.");
  const response = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(config("FIREBASE_API_KEY")),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: token }),
      muteHttpExceptions: true,
    }
  );
  const data = JSON.parse(response.getContentText() || "{}");
  if (response.getResponseCode() !== 200 || !data.users || !data.users[0]) throw new Error("Phiên đăng nhập không hợp lệ.");
  const verifiedUser = {
    uid: data.users[0].localId,
    email: data.users[0].email || "",
    name: data.users[0].displayName || "",
  };
  CacheService.getScriptCache().put(cacheKey, JSON.stringify(verifiedUser), 3000);
  return verifiedUser;
}

function dispatchAction(body, user) {
  if (body.action === "get") return readOne(body.path, user);
  if (body.action === "list") return readList(body.path, body.constraints || [], user);
  if (body.action === "collectionGroup") return readCollectionGroup(body.name, user);
  if (body.action === "exportCouple") return exportCouple(body.coupleId, user);
  if (body.action === "write") return commitOperations([body.operation], user);
  if (body.action === "batch") return commitOperations(body.operations || [], user);
  throw new Error("Action không được hỗ trợ.");
}

function exportCouple(coupleId, user) {
  if (!coupleId || String(coupleId).indexOf("/") !== -1) throw new Error("Couple ID khong hop le.");
  const records = loadRecords(recordsSheet());
  const couplePath = "couples/" + coupleId;
  const couple = findRecord(records, couplePath);
  authorize(user, couplePath, "read", couple ? couple.data : null, records);
  const prefix = couplePath + "/";
  const data = {};
  records.forEach(function (record) {
    if (record.path.indexOf(prefix) !== 0) return;
    const relative = record.path.slice(prefix.length).split("/");
    if (relative.length !== 2) return;
    if (!data[relative[0]]) data[relative[0]] = [];
    data[relative[0]].push({ id: relative[1], data: visibleData(record.path, record.data, user), version: record.updatedAt });
  });
  return { coupleId: coupleId, exportedAt: Date.now(), data: data };
}

function readCollectionGroup(name, user) {
  if (!user.admin) throw new Error("Chỉ server được đọc collection group.");
  if (!name || String(name).indexOf("/") !== -1) throw new Error("Tên collection không hợp lệ.");
  const records = loadRecords(recordsSheet());
  const marker = "/" + name + "/";
  return records.filter(function (record) {
    return record.path.indexOf(marker) !== -1;
  }).map(function (record) {
    return { id: record.path.split("/").pop(), path: record.path, data: record.data, version: record.updatedAt };
  });
}

function recordsSheet() {
  const spreadsheet = SpreadsheetApp.openById(config("SPREADSHEET_ID"));
  let sheet = spreadsheet.getSheetByName(RECORD_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(RECORD_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function loadRecords(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues().map(function (row, index) {
    let data = {};
    try { data = JSON.parse(row[1] || "{}"); } catch (_) {}
    return {
      row: index + 2,
      path: String(row[0]),
      data: data,
      createdAt: Number(row[2]) || 0,
      updatedAt: Number(row[3]) || 0,
    };
  });
}

function findRecord(records, path) {
  for (let index = 0; index < records.length; index += 1) {
    if (records[index].path === path) return records[index];
  }
  return null;
}

function readOne(path, user) {
  validateDocumentPath(path);
  const records = loadRecords(recordsSheet());
  const record = findRecord(records, path);
  authorize(user, path, "read", record ? record.data : null, records);
  return {
    id: path.split("/").pop(),
    data: record ? visibleData(path, record.data, user) : null,
    version: record ? record.updatedAt : 0,
  };
}

function readList(path, constraints, user) {
  validateCollectionPath(path);
  const records = loadRecords(recordsSheet());
  const prefix = path + "/";
  let matches = records.filter(function (record) {
    return record.path.indexOf(prefix) === 0 && record.path.slice(prefix.length).indexOf("/") === -1;
  }).filter(function (record) {
    try {
      authorize(user, record.path, "read", record.data, records);
      return true;
    } catch (_) {
      return false;
    }
  });

  (constraints || []).filter(function (item) { return item.kind === "where"; }).forEach(function (constraint) {
    matches = matches.filter(function (record) {
      return JSON.stringify(getField(record.data, constraint.field)) === JSON.stringify(constraint.value);
    });
  });
  const ordering = (constraints || []).filter(function (item) { return item.kind === "orderBy"; })[0];
  if (ordering) {
    matches.sort(function (left, right) {
      const a = sortable(getField(left.data, ordering.field));
      const b = sortable(getField(right.data, ordering.field));
      return (a < b ? -1 : a > b ? 1 : 0) * (ordering.direction === "desc" ? -1 : 1);
    });
  }
  const limiter = (constraints || []).filter(function (item) { return item.kind === "limit"; })[0];
  if (limiter) matches = matches.slice(0, Math.max(0, Number(limiter.count) || 0));

  return matches.map(function (record) {
    return { id: record.path.split("/").pop(), data: visibleData(record.path, record.data, user), version: record.updatedAt };
  });
}

function visibleData(path, data, user) {
  if (user.admin || path.indexOf("/timeCapsules/") === -1 || !data) return data;
  const openAt = data.openDate && data.openDate.__type === "timestamp" ? Number(data.openDate.value) : 0;
  if (!openAt || openAt <= Date.now()) return data;
  const hidden = JSON.parse(JSON.stringify(data));
  delete hidden.message;
  delete hidden.mediaUrl;
  delete hidden.cloudinaryPublicId;
  hidden.locked = true;
  return hidden;
}

function commitOperations(operations, user) {
  if (!Array.isArray(operations) || operations.length === 0) return { written: 0 };
  if (operations.length > 25) throw new Error("Một lần chỉ được ghi tối đa 25 bản ghi.");
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = recordsSheet();
    let records = loadRecords(sheet);
    operations.forEach(function (operation) {
      validateDocumentPath(operation.path);
      const existing = findRecord(records, operation.path);
      authorize(user, operation.path, operation.type, existing ? existing.data : null, records, operation.data || {});
      if (operation.type === "create" && existing) throw new Error("RECORD_ALREADY_EXISTS");
      if (operation.type === "delete") {
        if (existing) {
          sheet.deleteRow(existing.row);
          records = loadRecords(sheet);
        }
        return;
      }
      const now = Date.now();
      const incoming = resolveOperations(operation.data || {}, now);
      let next;
      if (operation.type === "update" || operation.merge) {
        if (operation.type === "update" && !existing) throw new Error("Bản ghi không tồn tại: " + operation.path);
        next = mergeFields(existing ? existing.data : {}, incoming);
      } else {
        next = incoming;
      }
      const createdAt = existing ? existing.createdAt : now;
      const row = [operation.path, JSON.stringify(next), createdAt, now];
      if (existing) {
        sheet.getRange(existing.row, 1, 1, HEADERS.length).setValues([row]);
        existing.data = next;
        existing.updatedAt = now;
      } else {
        sheet.appendRow(row);
        records.push({ row: sheet.getLastRow(), path: operation.path, data: next, createdAt: createdAt, updatedAt: now });
      }
    });
    return { written: operations.length };
  } finally {
    lock.releaseLock();
  }
}

function resolveOperations(value, now) {
  if (Array.isArray(value)) return value.map(function (item) { return resolveOperations(item, now); });
  if (!value || typeof value !== "object") return value;
  if (value.__op === "serverTimestamp") return { __type: "timestamp", value: now };
  if (value.__type === "timestamp") return { __type: "timestamp", value: Number(value.value) };
  const output = {};
  Object.keys(value).forEach(function (key) { output[key] = resolveOperations(value[key], now); });
  return output;
}

function mergeFields(base, patch) {
  const output = JSON.parse(JSON.stringify(base || {}));
  Object.keys(patch || {}).forEach(function (path) {
    const raw = patch[path];
    const current = getField(output, path);
    const value = raw && raw.__op === "arrayUnion"
      ? uniqueArray((Array.isArray(current) ? current : []).concat(raw.values || []))
      : raw;
    setField(output, path, value);
  });
  return output;
}

function uniqueArray(values) {
  const seen = {};
  return values.filter(function (value) {
    const key = JSON.stringify(value);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });
}

function getField(value, path) {
  return String(path).split(".").reduce(function (current, key) {
    return current && typeof current === "object" ? current[key] : undefined;
  }, value);
}

function setField(target, path, value) {
  const parts = String(path).split(".");
  let cursor = target;
  parts.slice(0, -1).forEach(function (part) {
    if (!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
    cursor = cursor[part];
  });
  cursor[parts[parts.length - 1]] = value;
}

function sortable(value) {
  if (value && value.__type === "timestamp") return Number(value.value) || 0;
  return value === undefined || value === null ? "" : value;
}

function authorize(user, path, action, data, records, incoming) {
  if (user.admin) return;
  const parts = path.split("/");
  if (parts[0] === "users") {
    if (parts[1] === user.uid) return;
    const self = findRecord(records, "users/" + user.uid);
    const other = findRecord(records, "users/" + parts[1]);
    const sameCouple = self && other && self.data.coupleId && self.data.coupleId === other.data.coupleId;
    if (action === "read" && sameCouple) return;
    const keys = Object.keys(incoming || {});
    if (action === "update" && keys.length === 1 && keys[0] === "coupleId" && incoming.coupleId === null) {
      const linkedCouple = records.some(function (record) {
        return record.path.indexOf("couples/") === 0 && record.path.split("/").length === 2 &&
          record.data && Array.isArray(record.data.memberIds) &&
          record.data.memberIds.indexOf(user.uid) !== -1 && record.data.memberIds.indexOf(parts[1]) !== -1;
      });
      if (sameCouple || linkedCouple) return;
    }
    if (action === "update" && keys.length === 1 && keys[0] === "coupleId" && typeof incoming.coupleId === "string") {
      const validInvite = records.some(function (record) {
        if (record.path.indexOf("pairInvites/") !== 0 || !record.data) return false;
        const memberMatch = (record.data.ownerId === user.uid && record.data.targetUid === parts[1]) ||
          (record.data.targetUid === user.uid && record.data.ownerId === parts[1]);
        return memberMatch && (record.data.status === "active" || record.data.status === "accepted");
      });
      if (validInvite) return;
    }
    throw new Error("Bạn không có quyền với hồ sơ này.");
  }
  if (parts[0] === "pairInvites") {
    const invite = data || incoming || {};
    if (invite.ownerId === user.uid || invite.targetUid === user.uid || invite.acceptedBy === user.uid) return;
    throw new Error("Bạn không có quyền với lời mời này.");
  }
  if (parts[0] === "couples") {
    const couplePath = "couples/" + parts[1];
    const couple = parts.length === 2 && (action === "set" || action === "create") && !data ? incoming : (findRecord(records, couplePath) || {}).data;
    if (couple && Array.isArray(couple.memberIds) && couple.memberIds.indexOf(user.uid) !== -1) return;
    throw new Error("Bạn không thuộc không gian cặp đôi này.");
  }
  throw new Error("Collection không được phép.");
}

function validateDocumentPath(path) {
  if (!path || typeof path !== "string" || path.split("/").length % 2 !== 0) throw new Error("Document path không hợp lệ.");
}

function validateCollectionPath(path) {
  if (!path || typeof path !== "string" || path.split("/").length % 2 !== 1) throw new Error("Collection path không hợp lệ.");
}
