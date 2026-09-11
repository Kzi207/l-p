/**
 * Love Days Sheets Database API v3
 *
 * Script Properties bắt buộc:
 * - SPREADSHEET_ID
 * - FIREBASE_API_KEY
 * - SERVER_SECRET
 *
 * Deploy: Web app -> Execute as Me -> Who has access: Anyone.
 */

const API_VERSION = "love-days-sheets-v3";
const RECORD_SHEET = "Records";
const HEADERS = ["path", "json", "createdAt", "updatedAt"];
const MAX_BATCH_SIZE = 25;
const TOKEN_CACHE_SECONDS = 3000;

function doGet() {
  return respond({
    ok: true,
    service: "love-days-sheets-db",
    version: API_VERSION,
    time: Date.now(),
  });
}

function doPost(event) {
  const requestId = Utilities.getUuid();
  try {
    const body = parseBody(event);
    const user = authenticate(body);
    const data = dispatch(body, user);
    return respond({ ok: true, version: API_VERSION, requestId: requestId, data: data });
  } catch (error) {
    const message = error && error.message ? error.message : "Apps Script database error.";
    console.error("[" + requestId + "] " + (error && error.stack ? error.stack : message));
    return respond({ ok: false, version: API_VERSION, requestId: requestId, error: message });
  }
}

function parseBody(event) {
  const raw = event && event.postData ? event.postData.contents : "";
  if (!raw) throw new Error("Request body trống.");
  if (raw.length > 5000000) throw new Error("Request body quá lớn.");
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("INVALID_BODY");
    return body;
  } catch (_) {
    throw new Error("Request body không phải JSON hợp lệ.");
  }
}

function respond(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function property(name) {
  const value = (PropertiesService.getScriptProperties().getProperty(name) || "").trim();
  if (!value) throw new Error("Thiếu Script Property " + name + ".");
  return value;
}

function authenticate(body) {
  if (body.secret) {
    if (!safeEqual(String(body.secret), property("SERVER_SECRET"))) {
      throw new Error("SERVER_SECRET không hợp lệ.");
    }
    return { uid: "server", email: "", name: "Server", admin: true };
  }
  return verifyFirebaseToken(body.token);
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function verifyFirebaseToken(token) {
  if (!token || typeof token !== "string") throw new Error("Bạn cần đăng nhập lại.");

  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token);
  const cacheKey = "auth:" + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
  const cache = CacheService.getScriptCache();
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = UrlFetchApp.fetch(
    "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(property("FIREBASE_API_KEY")),
    {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ idToken: token }),
      muteHttpExceptions: true,
    }
  );
  let payload = {};
  try { payload = JSON.parse(response.getContentText() || "{}"); } catch (_) {}
  if (response.getResponseCode() !== 200 || !payload.users || !payload.users[0]) {
    throw new Error("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.");
  }

  const user = {
    uid: payload.users[0].localId,
    email: payload.users[0].email || "",
    name: payload.users[0].displayName || "",
    admin: false,
  };
  cache.put(cacheKey, JSON.stringify(user), TOKEN_CACHE_SECONDS);
  return user;
}

function dispatch(body, user) {
  const action = String(body.action || "");
  if (action === "write") return commit([body.operation], user);
  if (action === "batch") return commit(body.operations, user);

  const records = loadRecords(getRecordsSheet());
  if (action === "get") return readOne(body.path, user, records);
  if (action === "list") return readList(body.path, body.constraints, user, records);
  if (action === "collectionGroup") return readCollectionGroup(body.name, user, records);
  if (action === "exportCouple") return exportCouple(body.coupleId, user, records);
  throw new Error("Action không được hỗ trợ: " + action);
}

function getRecordsSheet() {
  const spreadsheet = SpreadsheetApp.openById(property("SPREADSHEET_ID"));
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
      path: String(row[0] || ""),
      row: index + 2,
      data: data,
      createdAt: Number(row[2]) || 0,
      updatedAt: Number(row[3]) || 0,
    };
  }).filter(function (record) { return Boolean(record.path); });
}

function indexRecords(records) {
  const index = {};
  records.forEach(function (record) { index[record.path] = record; });
  return index;
}

function readOne(path, user, records) {
  validateDocumentPath(path);
  const index = indexRecords(records);
  const record = index[path] || null;
  authorize(user, path, "read", record ? record.data : null, index, {});
  return {
    id: path.split("/").pop(),
    data: record ? visibleData(path, record.data, user) : null,
    version: record ? record.updatedAt : 0,
  };
}

function readList(path, constraints, user, records) {
  validateCollectionPath(path);
  const index = indexRecords(records);
  const prefix = path + "/";
  let matches = records.filter(function (record) {
    const relative = record.path.indexOf(prefix) === 0 ? record.path.slice(prefix.length) : "";
    if (!relative || relative.indexOf("/") !== -1) return false;
    try {
      authorize(user, record.path, "read", record.data, index, {});
      return true;
    } catch (_) {
      return false;
    }
  });

  const safeConstraints = Array.isArray(constraints) ? constraints.slice(0, 10) : [];
  safeConstraints.filter(function (item) { return item && item.kind === "where" && item.operator === "=="; }).forEach(function (constraint) {
    matches = matches.filter(function (record) {
      return JSON.stringify(getField(record.data, constraint.field)) === JSON.stringify(constraint.value);
    });
  });

  const ordering = safeConstraints.filter(function (item) { return item && item.kind === "orderBy"; })[0];
  if (ordering) {
    matches.sort(function (left, right) {
      const a = sortable(getField(left.data, ordering.field));
      const b = sortable(getField(right.data, ordering.field));
      return (a < b ? -1 : a > b ? 1 : 0) * (ordering.direction === "desc" ? -1 : 1);
    });
  }

  const limiter = safeConstraints.filter(function (item) { return item && item.kind === "limit"; })[0];
  if (limiter) matches = matches.slice(0, Math.min(500, Math.max(0, Number(limiter.count) || 0)));

  return matches.map(function (record) {
    return {
      id: record.path.split("/").pop(),
      data: visibleData(record.path, record.data, user),
      version: record.updatedAt,
    };
  });
}

function readCollectionGroup(name, user, records) {
  if (!user.admin) throw new Error("Chỉ server được đọc collection group.");
  if (!name || String(name).indexOf("/") !== -1) throw new Error("Tên collection không hợp lệ.");
  const marker = "/" + name + "/";
  return records.filter(function (record) {
    return record.path.indexOf(marker) !== -1;
  }).map(function (record) {
    return { id: record.path.split("/").pop(), path: record.path, data: record.data, version: record.updatedAt };
  });
}

function exportCouple(coupleId, user, records) {
  if (!coupleId || String(coupleId).indexOf("/") !== -1) throw new Error("Couple ID không hợp lệ.");
  const index = indexRecords(records);
  const couplePath = "couples/" + coupleId;
  const couple = index[couplePath] || null;
  authorize(user, couplePath, "read", couple ? couple.data : null, index, {});

  const prefix = couplePath + "/";
  const data = {};
  records.forEach(function (record) {
    if (record.path.indexOf(prefix) !== 0) return;
    const relative = record.path.slice(prefix.length).split("/");
    if (relative.length !== 2) return;
    if (!data[relative[0]]) data[relative[0]] = [];
    data[relative[0]].push({
      id: relative[1],
      data: visibleData(record.path, record.data, user),
      version: record.updatedAt,
    });
  });
  return { coupleId: coupleId, exportedAt: Date.now(), data: data };
}

function commit(operations, user) {
  if (!Array.isArray(operations) || operations.length === 0) throw new Error("Không có thao tác để ghi.");
  if (operations.length > MAX_BATCH_SIZE) throw new Error("Một lần chỉ được ghi tối đa " + MAX_BATCH_SIZE + " bản ghi.");

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error("Dữ liệu đang được cập nhật. Hãy thử lại sau ít giây.");
  try {
    const sheet = getRecordsSheet();
    let records = loadRecords(sheet);
    const originalRecords = records.slice();
    let index = indexRecords(records);

    operations.forEach(function (operation) {
      if (!operation || typeof operation !== "object") throw new Error("Thao tác ghi không hợp lệ.");
      validateDocumentPath(operation.path);
      if (["set", "create", "update", "delete"].indexOf(operation.type) === -1) throw new Error("Kiểu ghi không hợp lệ.");

      const existing = index[operation.path] || null;
      authorize(user, operation.path, operation.type, existing ? existing.data : null, index, operation.data || {});
      if (operation.type === "create" && existing) throw new Error("Bản ghi đã tồn tại: " + operation.path);
      if (operation.type === "update" && !existing) throw new Error("Bản ghi không tồn tại: " + operation.path);

      if (operation.type === "delete") {
        if (existing) {
          records = records.filter(function (record) { return record.path !== operation.path; });
          delete index[operation.path];
        }
        return;
      }

      const now = Date.now();
      const incoming = resolveOperations(operation.data || {}, now);
      const nextData = operation.type === "update" || operation.merge
        ? mergeFields(existing ? existing.data : {}, incoming)
        : incoming;
      const next = {
        path: operation.path,
        row: existing ? existing.row : 0,
        data: nextData,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      if (existing) {
        const position = records.indexOf(existing);
        records[position] = next;
      } else {
        records.push(next);
      }
      index[operation.path] = next;
    });

    persistChanges(sheet, originalRecords, records);
    return { written: operations.length };
  } finally {
    lock.releaseLock();
  }
}

function persistChanges(sheet, originalRecords, finalRecords) {
  const originalIndex = indexRecords(originalRecords);
  const finalIndex = indexRecords(finalRecords);

  // Chỉ cập nhật những dòng thực sự thay đổi, tránh ghi lại toàn bộ Sheet khi chat.
  originalRecords.forEach(function (original) {
    const current = finalIndex[original.path];
    if (!current) return;
    if (current.updatedAt !== original.updatedAt || JSON.stringify(current.data) !== JSON.stringify(original.data)) {
      sheet.getRange(original.row, 1, 1, HEADERS.length).setValues([[
        current.path, JSON.stringify(current.data), current.createdAt, current.updatedAt,
      ]]);
    }
  });

  const additions = finalRecords.filter(function (record) { return !originalIndex[record.path]; });
  if (additions.length) {
    const startRow = sheet.getLastRow() + 1;
    const requiredLastRow = startRow + additions.length - 1;
    if (sheet.getMaxRows() < requiredLastRow) sheet.insertRowsAfter(sheet.getMaxRows(), requiredLastRow - sheet.getMaxRows());
    sheet.getRange(startRow, 1, additions.length, HEADERS.length).setValues(additions.map(function (record) {
      return [record.path, JSON.stringify(record.data), record.createdAt, record.updatedAt];
    }));
  }

  // Xóa từ dưới lên để số dòng còn lại không bị lệch.
  originalRecords.filter(function (record) { return !finalIndex[record.path]; })
    .map(function (record) { return record.row; })
    .sort(function (left, right) { return right - left; })
    .forEach(function (row) { sheet.deleteRow(row); });
  SpreadsheetApp.flush();
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

function authorize(user, path, action, currentData, index, incoming) {
  if (user.admin) return;
  const parts = path.split("/");

  if (parts[0] === "users") {
    if (parts[1] === user.uid) return;
    const self = index["users/" + user.uid];
    const other = index["users/" + parts[1]];
    const sameCouple = self && other && self.data.coupleId && self.data.coupleId === other.data.coupleId;
    if (action === "read" && sameCouple) return;

    const keys = Object.keys(incoming || {});
    if (action === "update" && keys.length === 1 && keys[0] === "coupleId") {
      if (incoming.coupleId === null && (sameCouple || hasLinkedCouple(index, user.uid, parts[1]))) return;
      if (typeof incoming.coupleId === "string" && hasValidInvite(index, user.uid, parts[1])) return;
    }
    throw new Error("Bạn không có quyền với hồ sơ này.");
  }

  if (parts[0] === "pairInvites") {
    const invite = currentData || incoming || {};
    if (invite.ownerId === user.uid || invite.targetUid === user.uid || invite.acceptedBy === user.uid) return;
    throw new Error("Bạn không có quyền với lời mời này.");
  }

  if (parts[0] === "couples") {
    const couplePath = "couples/" + parts[1];
    const existingCouple = index[couplePath];
    const couple = parts.length === 2 && (action === "set" || action === "create") && !currentData
      ? incoming
      : existingCouple && existingCouple.data;
    if (couple && Array.isArray(couple.memberIds) && couple.memberIds.indexOf(user.uid) !== -1) return;
    throw new Error("Bạn không thuộc không gian cặp đôi này.");
  }

  throw new Error("Collection không được phép.");
}

function hasLinkedCouple(index, firstUid, secondUid) {
  return Object.keys(index).some(function (path) {
    const record = index[path];
    return path.indexOf("couples/") === 0 && path.split("/").length === 2 &&
      record.data && Array.isArray(record.data.memberIds) &&
      record.data.memberIds.indexOf(firstUid) !== -1 && record.data.memberIds.indexOf(secondUid) !== -1;
  });
}

function hasValidInvite(index, firstUid, secondUid) {
  return Object.keys(index).some(function (path) {
    if (path.indexOf("pairInvites/") !== 0) return false;
    const invite = index[path].data || {};
    const membersMatch = (invite.ownerId === firstUid && invite.targetUid === secondUid) ||
      (invite.targetUid === firstUid && invite.ownerId === secondUid);
    return membersMatch && (invite.status === "active" || invite.status === "accepted");
  });
}

function resolveOperations(value, now) {
  if (Array.isArray(value)) return value.map(function (item) { return resolveOperations(item, now); });
  if (!value || typeof value !== "object") return value;
  if (value.__op === "serverTimestamp") return { __type: "timestamp", value: now };
  if (value.__type === "timestamp") return { __type: "timestamp", value: Number(value.value) };
  if (value.__op === "arrayUnion") return { __op: "arrayUnion", values: (value.values || []).map(function (item) { return resolveOperations(item, now); }) };
  const output = {};
  Object.keys(value).forEach(function (key) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") return;
    output[key] = resolveOperations(value[key], now);
  });
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
  return String(path || "").split(".").reduce(function (current, key) {
    return current && typeof current === "object" ? current[key] : undefined;
  }, value);
}

function setField(target, path, value) {
  const parts = String(path || "").split(".");
  if (!parts.length || parts.some(function (part) { return !part || part === "__proto__" || part === "constructor" || part === "prototype"; })) {
    throw new Error("Field path không hợp lệ.");
  }
  let cursor = target;
  parts.slice(0, -1).forEach(function (part) {
    if (!cursor[part] || typeof cursor[part] !== "object" || Array.isArray(cursor[part])) cursor[part] = {};
    cursor = cursor[part];
  });
  cursor[parts[parts.length - 1]] = value;
}

function sortable(value) {
  if (value && value.__type === "timestamp") return Number(value.value) || 0;
  return value === undefined || value === null ? "" : value;
}

function validateDocumentPath(path) {
  validatePath(path);
  if (path.split("/").length % 2 !== 0) throw new Error("Document path không hợp lệ.");
}

function validateCollectionPath(path) {
  validatePath(path);
  if (path.split("/").length % 2 !== 1) throw new Error("Collection path không hợp lệ.");
}

function validatePath(path) {
  if (!path || typeof path !== "string" || path.length > 500 || path.charAt(0) === "/" || path.charAt(path.length - 1) === "/" || path.indexOf("//") !== -1) {
    throw new Error("Đường dẫn dữ liệu không hợp lệ.");
  }
  const parts = path.split("/");
  if (parts.some(function (part) { return !part || part === "." || part === ".."; })) throw new Error("Đường dẫn dữ liệu không hợp lệ.");
}
