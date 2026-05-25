import { Platform } from "react-native";
import Constants from "expo-constants";

const custom = Constants.expoConfig?.extra?.apiBase;
const trimmed = typeof custom === "string" ? custom.trim() : "";

// Always use the explicit Wi-Fi IP address for local development 
// to prevent "Network Request Failed" on physical mobile phones.
export const API_BASE = "http://10.135.213.223:8000/api/v1";
