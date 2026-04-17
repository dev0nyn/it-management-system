const BASE = "http://localhost:3000";
let adminToken, staffToken, userToken;
let results = [];
// Unique suffix so re-runs don't hit 409 conflicts
const RUN_ID = Date.now().toString(36);

function log(status, feature, detail = "") {
  const icon = status === "PASS" ? "✓" : "✗";
  results.push({ status, feature, detail });
  console.log(`  ${icon} [${status}] ${feature}${detail ? " — " + detail : ""}`);
}

async function api(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

// ─────────────────── AUTH ──────────────────────────────────────────────────
console.log("\n=== AUTH MODULE ===");

let r = await api("POST", "/api/auth/login", { email: "admin@itms.local", password: "Admin1234!" });
if (r.status === 200 && (r.json.token || r.json.accessToken)) {
  adminToken = r.json.token || r.json.accessToken;
  log("PASS", "Login as admin");
} else log("FAIL", "Login as admin", JSON.stringify(r.json));

r = await api("POST", "/api/auth/login", { email: "staff@itms.local", password: "Staff1234!" });
if (r.status === 200 && (r.json.token || r.json.accessToken)) {
  staffToken = r.json.token || r.json.accessToken;
  log("PASS", "Login as it_staff");
} else log("FAIL", "Login as it_staff", JSON.stringify(r.json));

r = await api("POST", "/api/auth/login", { email: "user@itms.local", password: "User1234!" });
if (r.status === 200 && (r.json.token || r.json.accessToken)) {
  userToken = r.json.token || r.json.accessToken;
  log("PASS", "Login as end_user");
} else log("FAIL", "Login as end_user", JSON.stringify(r.json));

r = await api("POST", "/api/auth/login", { email: "admin@itms.local", password: "WrongPass!" });
if (r.status === 401) log("PASS", "Reject bad credentials (401)");
else log("FAIL", "Reject bad credentials", `Got ${r.status}`);

// ─────────────────── USERS ─────────────────────────────────────────────────
console.log("\n=== USERS MODULE ===");

// Response: { data: [...], page: N }
r = await api("GET", "/api/v1/users", null, adminToken);
if (r.status === 200 && r.json.data?.length >= 4) log("PASS", "List users (admin)", `${r.json.data.length} users`);
else log("FAIL", "List users (admin)", `status=${r.status} keys=${Object.keys(r.json)}`);

r = await api("GET", "/api/v1/users", null, userToken);
if (r.status === 403) log("PASS", "Block end_user from user list (403)");
else log("FAIL", "Block end_user from user list", `Got ${r.status}`);

// Create: returns { data: { id, ... } }
r = await api("POST", "/api/v1/users", { email: `test.${RUN_ID}@itms.local`, name: "Test New", password: "Test1234!", role: "end_user" }, adminToken);
let newUserId;
const createdUser = r.json.data || r.json;
if ((r.status === 201 || r.status === 200) && createdUser?.id) { newUserId = createdUser.id; log("PASS", "Create user", `id=${newUserId}`); }
else log("FAIL", "Create user", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

if (newUserId) {
  r = await api("PATCH", `/api/v1/users/${newUserId}`, { name: "Test Updated" }, adminToken);
  const updated = r.json.data || r.json;
  if (r.status === 200 && updated?.name === "Test Updated") log("PASS", "Update user name");
  else log("FAIL", "Update user", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

  r = await api("DELETE", `/api/v1/users/${newUserId}`, null, adminToken);
  if (r.status === 200 || r.status === 204) log("PASS", "Delete user");
  else log("FAIL", "Delete user", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
}

r = await api("GET", "/api/v1/users?search=Alice", null, adminToken);
const userSearchData = r.json.data || r.json.users || [];
if (r.status === 200 && userSearchData.some(u => u.name.includes("Alice"))) log("PASS", "Search users by name");
else log("FAIL", "Search users", `status=${r.status} found=${userSearchData.length}`);

// ─────────────────── TICKETS ───────────────────────────────────────────────
console.log("\n=== TICKETS MODULE ===");

// Response: { data: [...] }
r = await api("GET", "/api/v1/tickets", null, adminToken);
const ticketList = r.json.data || r.json.tickets || [];
if (r.status === 200 && ticketList.length > 0) log("PASS", "List all tickets (admin)", `${ticketList.length} tickets`);
else log("FAIL", "List all tickets (admin)", `status=${r.status} len=${ticketList.length}`);

r = await api("GET", "/api/v1/tickets", null, userToken);
const userTickets = r.json.data || r.json.tickets || [];
if (r.status === 200) log("PASS", "List own tickets (end_user)", `${userTickets.length} tickets`);
else log("FAIL", "List own tickets (end_user)", `status=${r.status}`);

r = await api("POST", "/api/v1/tickets", { title: "Test ticket for QA", description: "Testing the API", priority: "medium", category: "Software" }, userToken);
let newTicketId;
const createdTicket = r.json.data || r.json;
if ((r.status === 201 || r.status === 200) && createdTicket?.id) { newTicketId = createdTicket.id; log("PASS", "Create ticket (end_user)", `id=${newTicketId}`); }
else log("FAIL", "Create ticket", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

if (newTicketId) {
  r = await api("GET", `/api/v1/tickets/${newTicketId}`, null, adminToken);
  const gotTicket = r.json.data || r.json;
  if (r.status === 200 && gotTicket?.id === newTicketId) log("PASS", "Get ticket by id");
  else log("FAIL", "Get ticket by id", `status=${r.status}`);

  r = await api("PATCH", `/api/v1/tickets/${newTicketId}`, { status: "in_progress" }, staffToken);
  const patchedTicket = r.json.data || r.json;
  if (r.status === 200 && patchedTicket?.status === "in_progress") log("PASS", "Update ticket status (it_staff)");
  else log("FAIL", "Update ticket status", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

  const staffDecoded = JSON.parse(Buffer.from(staffToken.split(".")[1], "base64url").toString());
  const staffId = staffDecoded.sub || staffDecoded.id;
  r = await api("PATCH", `/api/v1/tickets/${newTicketId}`, { assigneeId: staffId }, staffToken);
  if (r.status === 200) log("PASS", "Assign ticket to self (it_staff)");
  else log("FAIL", "Assign ticket to self", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

  r = await api("GET", `/api/v1/tickets/${newTicketId}/events`, null, adminToken);
  const events = r.json.data || r.json;
  if (r.status === 200 && Array.isArray(events)) log("PASS", "Get ticket events", `${events.length} events`);
  else log("FAIL", "Get ticket events", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

  r = await api("DELETE", `/api/v1/tickets/${newTicketId}`, null, staffToken);
  if (r.status === 200 || r.status === 204) log("PASS", "Delete ticket (it_staff)");
  else log("FAIL", "Delete ticket", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
}

r = await api("GET", "/api/v1/tickets?search=VPN", null, adminToken);
const searchedTickets = r.json.data || r.json.tickets || [];
if (r.status === 200) log("PASS", "Search tickets by keyword", `${searchedTickets.length} results`);
else log("FAIL", "Search tickets", `status=${r.status}`);

r = await api("GET", "/api/v1/tickets?status=open", null, adminToken);
const openTickets = r.json.data || r.json.tickets || [];
if (r.status === 200) log("PASS", "Filter tickets by status=open", `${openTickets.length} results`);
else log("FAIL", "Filter tickets by status", `status=${r.status}`);

// ─────────────────── ASSETS ────────────────────────────────────────────────
console.log("\n=== ASSETS MODULE ===");

// Response: { data: [...], page: N }
r = await api("GET", "/api/v1/assets", null, adminToken);
const assetList = r.json.data || r.json.assets || [];
if (r.status === 200 && assetList.length > 0) log("PASS", "List assets (admin)", `${assetList.length} assets`);
else log("FAIL", "List assets", `status=${r.status} len=${assetList.length}`);

r = await api("POST", "/api/v1/assets", { tag: `TST-${RUN_ID}`, name: "QA Test Laptop", type: "laptop", serial: `QA${RUN_ID}`, status: "in_stock" }, staffToken);
let newAssetId;
const createdAsset = r.json.data || r.json;
if ((r.status === 201 || r.status === 200) && createdAsset?.id) { newAssetId = createdAsset.id; log("PASS", "Create asset (it_staff)", `id=${newAssetId}`); }
else log("FAIL", "Create asset", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

if (newAssetId) {
  r = await api("GET", `/api/v1/assets/${newAssetId}`, null, adminToken);
  const gotAsset = r.json.data || r.json;
  if (r.status === 200 && gotAsset?.id === newAssetId) log("PASS", "Get asset by id");
  else log("FAIL", "Get asset by id", `status=${r.status}`);

  r = await api("PATCH", `/api/v1/assets/${newAssetId}`, { name: "QA Test Laptop Updated" }, staffToken);
  const patchedAsset = r.json.data || r.json;
  if (r.status === 200 && patchedAsset?.name?.includes("Updated")) log("PASS", "Update asset name");
  else log("FAIL", "Update asset", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

  // Search users for assign
  const usersRes = await api("GET", "/api/v1/assets/users?search=Carol", null, staffToken);
  const usersForAssign = usersRes.json.data || usersRes.json.users || [];
  const carolUser = usersForAssign[0];
  if (carolUser) {
    r = await api("POST", `/api/v1/assets/${newAssetId}/assign`, { userId: carolUser.id }, staffToken);
    if (r.status === 200 || r.status === 201) log("PASS", "Assign asset to user");
    else log("FAIL", "Assign asset", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

    r = await api("GET", `/api/v1/assets/${newAssetId}/history`, null, staffToken);
    const history = r.json.data || r.json;
    if (r.status === 200 && Array.isArray(history)) log("PASS", "Get asset assignment history", `${history.length} entries`);
    else log("FAIL", "Get asset history", `status=${r.status}`);

    r = await api("POST", `/api/v1/assets/${newAssetId}/unassign`, {}, staffToken);
    if (r.status === 200) log("PASS", "Unassign asset");
    else log("FAIL", "Unassign asset", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
  } else {
    log("FAIL", "Find Carol for asset assign", `response=${JSON.stringify(usersRes.json).slice(0,120)}`);
  }

  r = await api("DELETE", `/api/v1/assets/${newAssetId}`, null, staffToken);
  if (r.status === 200 || r.status === 204) log("PASS", "Delete asset");
  else log("FAIL", "Delete asset", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
}

r = await api("GET", "/api/v1/assets?search=MacBook", null, adminToken);
const assetSearch = r.json.data || r.json.assets || [];
if (r.status === 200) log("PASS", "Search assets by name", `${assetSearch.length} results`);
else log("FAIL", "Search assets", `status=${r.status}`);

r = await api("GET", "/api/v1/assets?status=in_stock", null, adminToken);
const inStockAssets = r.json.data || r.json.assets || [];
if (r.status === 200) log("PASS", "Filter assets by status=in_stock", `${inStockAssets.length} results`);
else log("FAIL", "Filter assets by status", `status=${r.status}`);

// ─────────────────── REPORTS ───────────────────────────────────────────────
console.log("\n=== REPORTS MODULE ===");

const from = "2025-10-17";
const to = "2026-04-17";

// Reports return { data: { columns: [...], rows: [...] } } or flat array
function extractRows(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.data)) return json.data;
  if (json.data?.rows) return json.data.rows;
  return null;
}

r = await api("GET", `/api/v1/reports/tickets-by-status?from=${from}&to=${to}`, null, adminToken);
const tbs = extractRows(r.json);
if (r.status === 200 && tbs) log("PASS", "Report: tickets-by-status", `${tbs.length} rows`);
else log("FAIL", "Report: tickets-by-status", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

r = await api("GET", `/api/v1/reports/tickets-by-resolution-time?from=${from}&to=${to}`, null, adminToken);
const tbrt = extractRows(r.json);
if (r.status === 200 && tbrt) log("PASS", "Report: tickets-by-resolution-time", `${tbrt.length} rows`);
else log("FAIL", "Report: tickets-by-resolution-time", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

r = await api("GET", `/api/v1/reports/assets-by-status`, null, adminToken);
const abs = extractRows(r.json);
if (r.status === 200 && abs) log("PASS", "Report: assets-by-status", `${abs.length} rows`);
else log("FAIL", "Report: assets-by-status", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

r = await api("GET", `/api/v1/reports/user-activity?from=${from}&to=${to}`, null, adminToken);
const ua = extractRows(r.json);
if (r.status === 200 && ua) log("PASS", "Report: user-activity", `${ua.length} rows`);
else log("FAIL", "Report: user-activity", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

r = await api("GET", `/api/v1/reports/tickets-by-status/export?format=csv&from=${from}&to=${to}`, null, adminToken);
if (r.status === 200) log("PASS", "Export CSV: tickets-by-status");
else log("FAIL", "Export CSV", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

r = await api("GET", `/api/v1/reports/assets-by-status/export?format=pdf`, null, adminToken);
if (r.status === 200) log("PASS", "Export PDF: assets-by-status");
else log("FAIL", "Export PDF", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

r = await api("GET", "/api/v1/reports", null, adminToken);
const reportDefs = r.json.data || r.json;
if (r.status === 200 && Array.isArray(reportDefs)) log("PASS", "List report definitions", `${reportDefs.length} reports`);
else log("FAIL", "List report definitions", `status=${r.status} ${JSON.stringify(r.json).slice(0,80)}`);

// ─────────────────── MONITORING ────────────────────────────────────────────
console.log("\n=== MONITORING MODULE ===");

// Response: { data: [...] }
r = await api("GET", "/api/v1/devices", null, adminToken);
const deviceList = r.json.data || r.json;
if (r.status === 200 && Array.isArray(deviceList) && deviceList.length > 0) log("PASS", "List devices (admin)", `${deviceList.length} devices`);
else log("FAIL", "List devices", `status=${r.status} len=${Array.isArray(deviceList) ? deviceList.length : "N/A"}`);

r = await api("GET", "/api/v1/alerts", null, adminToken);
const alertList = r.json.data || r.json;
if (r.status === 200 && Array.isArray(alertList)) log("PASS", "List alerts", `${alertList.length} open alerts`);
else log("FAIL", "List alerts", `status=${r.status}`);

r = await api("POST", "/api/v1/devices", { name: "QA Test Device", host: `10.99.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`, port: 80, type: "server", checkIntervalSec: 60 }, adminToken);
let newDeviceId;
const createdDevice = r.json.data || r.json;
if ((r.status === 201 || r.status === 200) && createdDevice?.id) { newDeviceId = createdDevice.id; log("PASS", "Create device (admin)", `id=${newDeviceId}`); }
else log("FAIL", "Create device", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);

if (newDeviceId) {
  r = await api("GET", `/api/v1/devices/${newDeviceId}`, null, adminToken);
  const gotDevice = r.json.data || r.json;
  if (r.status === 200 && gotDevice?.id === newDeviceId) log("PASS", "Get device by id");
  else log("FAIL", "Get device by id", `status=${r.status}`);

  r = await api("GET", `/api/v1/devices/${newDeviceId}/status-log`, null, adminToken);
  const statusLog = r.json.data || r.json;
  if (r.status === 200 && Array.isArray(statusLog)) log("PASS", "Get device status-log");
  else log("FAIL", "Get device status-log", `status=${r.status}`);

  r = await api("DELETE", `/api/v1/devices/${newDeviceId}`, null, adminToken);
  if (r.status === 200 || r.status === 204) log("PASS", "Delete device");
  else log("FAIL", "Delete device", `status=${r.status} ${JSON.stringify(r.json).slice(0,120)}`);
}

r = await api("GET", "/api/v1/devices", null, userToken);
if (r.status === 403) log("PASS", "Block end_user from devices (403)");
else log("FAIL", "Block end_user from devices", `Got ${r.status}`);

// ─────────────────── SUMMARY ───────────────────────────────────────────────
const passed = results.filter(r => r.status === "PASS").length;
const failed = results.filter(r => r.status === "FAIL").length;
console.log(`\n${"=".repeat(55)}`);
console.log(`  RESULTS: ${passed} PASSED  |  ${failed} FAILED  |  ${results.length} TOTAL`);
if (failed > 0) {
  console.log("\n  FAILED TESTS:");
  results.filter(r => r.status === "FAIL").forEach(r => console.log(`    x ${r.feature}: ${r.detail}`));
}
console.log("=".repeat(55) + "\n");
