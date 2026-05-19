import { Platform } from "react-native";
import Constants from "expo-constants";

const custom = Constants.expoConfig?.extra?.apiBase;
const trimmed = typeof custom === "string" ? custom.trim() : "";

/**
 * Set `expo.extra.apiBase` in app.json to your LAN URL on a physical device, e.g.
 * "http://192.168.0.10:8000/api/v1"
 *
 * Android emulator default reaches host via 10.0.2.2.
 */
export const API_BASE =
  trimmed ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:8000/api/v1"
    : "http://127.0.0.1:8000/api/v1");
