import { API_BASE } from "../config/api";

async function parseError(res) {
  try {
    const j = await res.json();
    return j.detail || JSON.stringify(j);
  } catch {
    return await res.text();
  }
}

export async function loginRequest(username, password) {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchBootstrap(token) {
  const res = await fetch(`${API_BASE}/sync/bootstrap`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function postOrdersSync(token, orders) {
  const res = await fetch(`${API_BASE}/orders/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orders }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function postSalesSync(token, sales) {
  const res = await fetch(`${API_BASE}/sales/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sales }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
