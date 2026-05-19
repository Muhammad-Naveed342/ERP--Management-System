import * as Network from "expo-network";
import { loadSession } from "./session";
import { fetchBootstrap, postOrdersSync, postSalesSync } from "./api";
import {
  getUnsyncedOrdersPayload,
  getUnsyncedSalesPayload,
  markOrdersSynced,
  markSalesSynced,
  applyBootstrap,
} from "../database/database";

export async function isOnline() {
  try {
    const s = await Network.getNetworkStateAsync();
    return Boolean(s?.isConnected && s?.isInternetReachable !== false);
  } catch {
    return false;
  }
}

/** Pull master data after online login (requires valid token). */
export async function pullMasterData(token) {
  const data = await fetchBootstrap(token);
  await applyBootstrap(data);
}

/** Push local unsynced rows when online. */
export async function pushOutbox() {
  const online = await isOnline();
  if (!online) return { ok: false, reason: "offline" };
  const session = await loadSession();
  if (!session?.access_token) return { ok: false, reason: "no_session" };
  const token = session.access_token;

  const orderRows = await getUnsyncedOrdersPayload(session.user.id);
  if (orderRows.length) {
    await postOrdersSync(token, orderRows);
    await markOrdersSynced(orderRows.map((o) => o.sync_id));
  }

  const saleRows = await getUnsyncedSalesPayload(session.user.id);
  if (saleRows.length) {
    await postSalesSync(token, saleRows);
    await markSalesSynced(saleRows.map((s) => s.sync_id));
  }

  return { ok: true };
}
