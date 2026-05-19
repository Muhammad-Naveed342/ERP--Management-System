import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import bcrypt from "bcryptjs";

import { initDatabase, getFieldUser, countMasterRows } from "../database/database";
import { loginRequest } from "../services/api";
import { saveSession } from "../services/session";
import { pullMasterData, isOnline } from "../services/syncEngine";

const EXPECTED_ROLE = "sales_man";

export default function SalesManLogin({ onLoginSuccess, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const finish = async (session) => {
    await saveSession(session);
    onLoginSuccess({ ...session.user, access_token: session.access_token });
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert("Missing fields", "Enter username and password.");
      return;
    }
    setBusy(true);
    try {
      await initDatabase();
      const online = await isOnline();

      if (online) {
        const data = await loginRequest(username.trim(), password);
        if (data.user.role !== EXPECTED_ROLE) {
          Alert.alert(
            "Wrong portal",
            "This account is not a sales man. Use the Order Taker portal instead."
          );
          return;
        }
        await pullMasterData(data.access_token);
        await finish({
          access_token: data.access_token,
          user: data.user,
        });
        return;
      }

      const counts = await countMasterRows();
      if (!counts.users) {
        Alert.alert(
          "First-time setup",
          "Connect to the internet once while logging in so shops, items, and team accounts can download. After that you can work offline."
        );
        return;
      }

      const row = await getFieldUser(username.trim());
      if (!row || row.role !== EXPECTED_ROLE) {
        Alert.alert("Login failed", "Unknown user for this portal.");
        return;
      }
      if (!row.is_active) {
        Alert.alert("Inactive", "This account is disabled.");
        return;
      }
      const ok = bcrypt.compareSync(password, row.password_hash);
      if (!ok) {
        Alert.alert("Login failed", "Incorrect password.");
        return;
      }
      await finish({
        access_token: null,
        user: { id: row.id, username: row.username, role: row.role },
      });
    } catch (e) {
      Alert.alert("Login error", e.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: "#ECFDF5" }]}>
            <Ionicons name="cash" size={50} color="#059669" />
          </View>
          <Text style={styles.title}>Sales Man Login</Text>
          <Text style={styles.subtitle}>
            Online: downloads catalog. Offline: uses last sync on this device.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!busy}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!busy}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginButton, busy && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Login to Portal</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.backButton} onPress={onBack} disabled={busy}>
            <Ionicons name="home-outline" size={20} color="#059669" />
            <Text style={styles.backText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flex: 1, padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "800", color: "#1F2937" },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  form: { width: "100%" },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#111827",
  },
  loginButton: {
    backgroundColor: "#059669",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: { color: "white", fontSize: 18, fontWeight: "700" },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 14,
    backgroundColor: "white",
  },
  backText: { fontSize: 16, color: "#059669", fontWeight: "700", marginLeft: 8 },
});
