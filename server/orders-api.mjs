import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data");
const shotDir = path.join(dataDir, "shots");
const ordersFile = path.join(dataDir, "orders.json");
const adminFile = path.join(dataDir, "admin.json");
const visitsFile = path.join(dataDir, "visits.json");
const defaultPassword = "cinora";
const maxOrders = 200;
const maxBody = 6_000_000;
const statuses = new Set(["new", "confirmed", "baking", "delivering", "delivered", "cancelled"]);

const sessions = new Map();
const attempts = new Map();
let writeChain = Promise.resolve();

function sameSecret(left, right) {
  const a = createHash("sha256").update(String(left)).digest();
  const b = createHash("sha256").update(String(right)).digest();
  return timingSafeEqual(a, b);
}

function ensureAdmin() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(adminFile)) {
    fs.writeFileSync(adminFile, `${JSON.stringify({ password: defaultPassword }, null, 2)}\n`);
  }
}

function readPassword() {
  ensureAdmin();
  const parsed = JSON.parse(fs.readFileSync(adminFile, "utf8"));
  if (typeof parsed.password !== "string" || parsed.password.length < 4) {
    throw new Error("Admin password file is unreadable.");
  }
  return parsed.password;
}

function withOrders(change) {
  const run = writeChain.then(async () => {
    const orders = readOrders();
    const result = await change(orders);
    if (Array.isArray(result?.orders)) writeOrders(result.orders);
    return result;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function readOrders() {
  try {
    const parsed = JSON.parse(fs.readFileSync(ordersFile, "utf8"));
    return Array.isArray(parsed.orders) ? parsed.orders : [];
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${ordersFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ orders }, null, 2));
  try {
    fs.renameSync(tmp, ordersFile);
  } catch {
    fs.copyFileSync(tmp, ordersFile);
    fs.rmSync(tmp, { force: true });
  }
}

function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function readCookie(req, name) {
  const header = req.headers.cookie ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function sessionToken(req) {
  const token = readCookie(req, "cinora_admin");
  const expiry = sessions.get(token);
  if (!token || !expiry || expiry < Date.now()) {
    if (token) sessions.delete(token);
    return "";
  }
  return token;
}

function setSession(res, token) {
  res.setHeader("Set-Cookie", `cinora_admin=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", "cinora_admin=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

function clientKey(req) {
  return req.socket?.remoteAddress || "local";
}

function tooManyAttempts(key) {
  const entry = attempts.get(key);
  return Boolean(entry && entry.until > Date.now() && entry.fails >= 8);
}

function noteFailure(key) {
  const entry = attempts.get(key) ?? { fails: 0, until: 0 };
  const fails = entry.until > Date.now() ? entry.fails + 1 : 1;
  attempts.set(key, { fails, until: Date.now() + 60_000 });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBody) {
        reject(Object.assign(new Error("too large"), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error("invalid json"), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function cleanText(value, max) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);
}

function cleanDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  if (year < 2024 || year > 2035) return "";
  return value;
}

function cleanPhone(value) {
  const phone = cleanText(value, 20);
  const compact = phone.replace(/[\s-]/g, "");
  return /^(?:03\d{9}|\+923\d{9})$/.test(compact) ? phone : "";
}

function cleanItems(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8) return null;
  const items = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const id = cleanText(raw.id, 40);
    const name = cleanText(raw.name, 80);
    const qty = Number(raw.qty);
    const price = Number(raw.price);
    if (!/^[a-z0-9-]+$/i.test(id) || !name) return null;
    if (!Number.isInteger(qty) || qty < 1 || qty > 12) return null;
    if (!Number.isInteger(price) || price < 1 || price > 100_000) return null;
    items.push({ id, name, qty, price });
  }
  const count = items.reduce((sum, item) => sum + item.qty, 0);
  if (count < 1 || count > 12) return null;
  return items;
}

function reservedId(orders, requested) {
  if (typeof requested !== "string" || !/^CN-\d{4}$/.test(requested)) {
    return { error: "The reference is missing. Start the payment again.", status: 400 };
  }
  if (orders.some((order) => order.id === requested)) {
    return { error: "This reference was already used. Start again for a new one.", status: 409 };
  }
  return { id: requested };
}

function saveShot(id, dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length < 32 || buffer.length > 2_500_000) return null;
  const ext = match[1] === "jpeg" ? "jpg" : match[1];
  const filename = `${id}.${ext}`;
  fs.mkdirSync(shotDir, { recursive: true });
  fs.writeFileSync(path.join(shotDir, filename), buffer);
  return { filename, type: `image/${match[1]}` };
}

function shotFile(filename) {
  if (typeof filename !== "string" || !/^CN-\d{4,6}\.(png|jpg|webp)$/.test(filename)) return "";
  const full = path.join(shotDir, filename);
  return path.basename(full) === filename ? full : "";
}

function toPublic(order) {
  return {
    id: order.id,
    createdAt: order.createdAt,
    date: order.date,
    items: order.items,
    fulfillment: "delivery",
    area: order.area,
    address: order.address,
    name: order.name,
    phone: order.phone,
    note: order.note,
    total: order.total,
    hasScreenshot: Boolean(order.shot),
    status: statuses.has(order.status) ? order.status : "new",
  };
}

function prune(orders) {
  if (orders.length <= maxOrders) return orders;
  const oldest = [...orders].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
  const drop = new Set(oldest.slice(0, orders.length - maxOrders).map((order) => order.id));
  for (const order of orders) {
    if (!drop.has(order.id) || !order.shot) continue;
    const file = shotFile(order.shot);
    if (file) fs.rmSync(file, { force: true });
  }
  return orders.filter((order) => !drop.has(order.id));
}

async function createOrder(body) {
  const date = cleanDate(body.date);
  const items = cleanItems(body.items);
  const name = cleanText(body.name, 80);
  const phone = cleanPhone(body.phone);
  const area = cleanText(body.area, 80);
  const address = cleanText(body.address, 160);
  const note = cleanText(body.note, 400);
  if (!date || !items || name.length < 2 || !phone || area.length < 2 || address.length < 5) {
    return { error: "Please check the order and try again.", status: 400 };
  }

  return withOrders(async (orders) => {
    const reserved = reservedId(orders, body.id);
    if (reserved.error) return reserved;
    const id = reserved.id;
    const shot = saveShot(id, body.screenshot);
    if (!shot) return { error: "Add a payment screenshot before placing the order.", status: 400 };
    const order = {
      id,
      createdAt: new Date().toISOString(),
      date,
      items,
      fulfillment: "delivery",
      area,
      address,
      name,
      phone,
      note,
      total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      status: "new",
      shot: shot.filename,
      shotType: shot.type,
    };
    return { order: toPublic(order), orders: prune([order, ...orders]), status: 201 };
  });
}

function listOrders() {
  return readOrders()
    .map(toPublic)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function findOrder(id) {
  return readOrders().find((order) => order.id === id);
}

async function patchOrder(id, body) {
  const status = typeof body.status === "string" ? body.status : "";
  if (!statuses.has(status)) return { error: "Choose a valid status.", status: 400 };
  const updated = await withOrders(async (orders) => {
    const index = orders.findIndex((order) => order.id === id);
    if (index < 0) return { missing: true };
    const next = orders.slice();
    next[index] = { ...orders[index], status };
    return { order: toPublic(next[index]), orders: next };
  });
  if (updated.missing) return { error: "Order not found.", status: 404 };
  return { order: updated.order, status: 200 };
}

const geoCache = new Map();
const liveWindowMs = 60_000;
let visitChain = Promise.resolve();

function karachiDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function visitorIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = typeof forwarded === "string" && forwarded.trim() ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress || "";
  return raw.replace(/^::ffff:/, "");
}

function isPrivateIp(ip) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function pageName(pathValue) {
  if (pathValue === "/") return "Home";
  if (pathValue.startsWith("/order/confirmed")) return "Confirmation";
  if (pathValue.startsWith("/order")) return "Order";
  return "Page";
}

function placeLabel(person) {
  if (person.country) return `${person.city}, ${person.country}`;
  return person.city || "Unknown place";
}

async function locate(ip) {
  if (!ip || isPrivateIp(ip)) return { city: "This network", country: "" };
  const cached = geoCache.get(ip);
  if (cached) return cached;
  const place = { city: "Unknown place", country: "" };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      const data = await response.json();
      if (data && data.success !== false) {
        place.city = typeof data.city === "string" && data.city.trim() ? data.city.trim() : "Unknown place";
        place.country = typeof data.country === "string" ? data.country.trim() : "";
      }
    }
  } catch {
    // The visitor still counts when the city cannot be looked up.
  }
  geoCache.set(ip, place);
  return place;
}

function readVisits() {
  try {
    const parsed = JSON.parse(fs.readFileSync(visitsFile, "utf8"));
    return parsed && typeof parsed.days === "object" && parsed.days ? parsed.days : {};
  } catch {
    return {};
  }
}

function writeVisits(days) {
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${visitsFile}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ days }));
  try {
    fs.renameSync(tmp, visitsFile);
  } catch {
    fs.copyFileSync(tmp, visitsFile);
    fs.rmSync(tmp, { force: true });
  }
}

function withVisits(change) {
  const run = visitChain.then(async () => {
    const result = await change(readVisits());
    if (result?.days) writeVisits(result.days);
    return result;
  });
  visitChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function keepRecentDays(days, today) {
  const next = {};
  for (const day of Object.keys(days).sort().slice(-14)) next[day] = days[day];
  if (days[today]) next[today] = days[today];
  return next;
}

async function recordPresence(req, body) {
  const agent = String(req.headers["user-agent"] || "");
  if (/bot|spider|crawler/i.test(agent)) return { ok: true, status: 200 };
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{16,40}$/i.test(id)) return { error: true, status: 400 };
  const rawPath = typeof body.path === "string" ? body.path.slice(0, 80) : "/";
  const pathValue = rawPath.startsWith("/") && !rawPath.startsWith("/admin") && !rawPath.includes("..") ? rawPath : "/";
  const place = await locate(visitorIp(req));
  const today = karachiDay();
  await withVisits(async (days) => {
    const next = keepRecentDays(days, today);
    const bucket = { ...(next[today] || {}) };
    bucket[id] = {
      city: place.city,
      country: place.country,
      page: pageName(pathValue),
      lastSeen: Date.now(),
    };
    next[today] = bucket;
    return { days: next };
  });
  return { ok: true, status: 200 };
}

function visitStats() {
  const bucket = readVisits()[karachiDay()] || {};
  const now = Date.now();
  const people = Object.values(bucket);
  const live = (person) => now - Number(person.lastSeen) < liveWindowMs;
  const places = new Map();
  for (const person of people) {
    const label = placeLabel(person);
    const current = places.get(label) || { place: label, people: 0, live: 0 };
    current.people += 1;
    if (live(person)) current.live += 1;
    places.set(label, current);
  }
  return {
    today: people.length,
    live: people.filter(live).length,
    places: [...places.values()].sort((a, b) => b.live - a.live || b.people - a.people),
    watching: people
      .filter(live)
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 12)
      .map((person) => ({ place: placeLabel(person), page: person.page || "Page" })),
  };
}

async function handle(req, res) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const { pathname } = url;
  const method = req.method ?? "GET";

  if (method === "POST" && pathname === "/api/orders") {
    const body = await readBody(req);
    const result = await createOrder(body);
    send(res, result.status, result.order ? result.order : { error: result.error });
    return;
  }

  if (method === "POST" && pathname === "/api/admin/login") {
    const key = clientKey(req);
    if (tooManyAttempts(key)) {
      send(res, 429, { error: "Too many tries. Wait a minute and try again." });
      return;
    }
    const body = await readBody(req);
    const password = typeof body.password === "string" ? body.password : "";
    if (!sameSecret(password, readPassword())) {
      noteFailure(key);
      send(res, 401, { error: "That password does not match." });
      return;
    }
    attempts.delete(key);
    const token = randomBytes(24).toString("hex");
    sessions.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000);
    setSession(res, token);
    send(res, 200, { ok: true });
    return;
  }

  if (method === "POST" && pathname === "/api/presence") {
    const body = await readBody(req);
    const result = await recordPresence(req, body);
    send(res, result.status, result.ok ? { ok: true } : { error: "Ignored." });
    return;
  }

  if (method === "POST" && pathname === "/api/admin/logout") {
    const token = sessionToken(req);
    if (token) sessions.delete(token);
    clearSession(res);
    send(res, 200, { ok: true });
    return;
  }

  if (pathname.startsWith("/api/admin/") && !sessionToken(req)) {
    send(res, 401, { error: "Sign in to open the desk." });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/session") {
    send(res, 200, { ok: true });
    return;
  }

  if (method === "GET" && pathname === "/api/admin/visits") {
    send(res, 200, visitStats());
    return;
  }

  if (method === "GET" && pathname === "/api/admin/orders") {
    send(res, 200, { orders: listOrders() });
    return;
  }

  const detail = /^\/api\/admin\/orders\/(CN-\d{4,6})(\/shot)?$/.exec(pathname);
  if (!detail) {
    send(res, 404, { error: "Not found." });
    return;
  }

  const id = detail[1];
  const order = findOrder(id);
  if (!order) {
    send(res, 404, { error: "Order not found." });
    return;
  }

  if (detail[2] === "/shot" && method === "GET") {
    const file = shotFile(order.shot);
    if (!file || !fs.existsSync(file)) {
      send(res, 404, { error: "No payment screenshot." });
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", order.shotType || "image/jpeg");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    fs.createReadStream(file).pipe(res);
    return;
  }

  if (method === "GET") {
    send(res, 200, toPublic(order));
    return;
  }

  if (method === "PATCH") {
    const body = await readBody(req);
    const result = await patchOrder(id, body);
    send(res, result.status, result.order ? result.order : { error: result.error });
    return;
  }

  send(res, 405, { error: "Not found." });
}

export function ordersApi() {
  const attach = (server) => {
    ensureAdmin();
    server.middlewares.use(async (req, res, next) => {
      const url = req.url ?? "";
      if (!url.startsWith("/api/")) {
        next();
        return;
      }
      try {
        await handle(req, res);
      } catch (error) {
        if (res.headersSent) return;
        const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 500;
        send(res, status === 413 || status === 400 ? status : 500, {
          error: status === 413 ? "That screenshot is too large." : "The order could not be saved. Please try again.",
        });
      }
    });
  };

  return {
    name: "cinora-orders",
    configureServer: attach,
    configurePreviewServer: attach,
  };
}
