import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { API_BASE } from "../config/api";
import {
  initDatabase,
  insertLocalOrder,
  listCompanies,
  listItems,
  listLocalOrders,
  listShops,
} from "../database/database";
import { isOnline, pushOutbox } from "../services/syncEngine";

// Secondary Company Dropdown Selector & Search Input Product Modal
function ProductPickerModal({ visible, onSelect, onClose }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsList, setItemsList] = useState([]);
  const [companyModal, setCompanyModal] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (visible) {
      (async () => {
        const comps = await listCompanies();
        setCompanies(comps);
        if (comps.length > 0) {
          setSelectedCompany(comps[0]);
        } else {
          setSelectedCompany(null);
        }
      })();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      (async () => {
        setLoadingItems(true);
        try {
          const companyId = selectedCompany ? selectedCompany.company_id : null;
          const res = await listItems(companyId, searchQuery);
          setItemsList(res);
        } finally {
          setLoadingItems(false);
        }
      })();
    }
  }, [selectedCompany, searchQuery, visible]);

  const imageBase = API_BASE.replace("/api/v1", "");

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={pm.overlay}>
        <View style={pm.sheet}>
          <View style={pm.header}>
            <Text style={pm.title}>Select Product</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Company Selection Dropdown */}
          <View style={pm.filterBox}>
            <Text style={pm.label}>Company / Manufacturer</Text>
            <TouchableOpacity
              style={pm.dropdownButton}
              onPress={() => setCompanyModal(true)}
            >
              <Text style={selectedCompany ? pm.dropdownValue : pm.dropdownPlaceholder}>
                {selectedCompany ? selectedCompany.company_name : "Select Company"}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Search Bar within company */}
          <View style={pm.searchBox}>
            <Ionicons name="search" size={18} color="#9CA3AF" style={pm.searchIcon} />
            <TextInput
              style={pm.searchInput}
              placeholder="Search within company..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Products List */}
          {loadingItems ? (
            <ActivityIndicator style={{ margin: 24 }} size="large" color="#4F46E5" />
          ) : (
            <FlatList
              data={itemsList}
              keyExtractor={(it) => String(it.id)}
              contentContainerStyle={{ paddingBottom: 24 }}
              renderItem={({ item }) => {
                const fullImageUrl = item.image_url ? `${imageBase}${item.image_url}` : null;
                return (
                  <TouchableOpacity
                    style={pm.productCard}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <TouchableOpacity
                      style={pm.thumbnailContainer}
                      onPress={() => {
                        if (fullImageUrl) {
                          setLightboxImage(fullImageUrl);
                        }
                      }}
                      disabled={!fullImageUrl}
                    >
                      {fullImageUrl ? (
                        <Image source={{ uri: fullImageUrl }} style={pm.thumbnail} />
                      ) : (
                        <Ionicons name="cube-outline" size={24} color="#9CA3AF" />
                      )}
                    </TouchableOpacity>

                    <View style={pm.productDetails}>
                      <Text style={pm.productName}>{item.item_name}</Text>

                      {/* Pieces Pricing Row */}
                      <Text style={{ fontSize: 9, color: "#9CA3AF", fontWeight: "bold", marginTop: 6, letterSpacing: 0.5 }}>PER PIECE</Text>
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                        <Text style={{ fontSize: 12, color: "#4B5563" }}>
                          Retail: <Text style={{ fontWeight: "800", color: "#4F46E5" }}>Rs.{Number(item.retail_price ?? item.price).toFixed(2)}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: "#4B5563" }}>
                          Wholesale: <Text style={{ fontWeight: "800", color: "#059669" }}>Rs.{Number(item.wholesale_price ?? item.price).toFixed(2)}</Text>
                        </Text>
                      </View>

                      {/* Carton Pricing Row */}
                      <Text style={{ fontSize: 9, color: "#9CA3AF", fontWeight: "bold", marginTop: 6, letterSpacing: 0.5 }}>PER CARTON ({item.pieces_per_carton || 12} Pieces)</Text>
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 2 }}>
                        <Text style={{ fontSize: 12, color: "#4B5563" }}>
                          Retail: <Text style={{ fontWeight: "800", color: "#4F46E5" }}>Rs.{Number(item.retail_price_carton ?? ((item.retail_price ?? item.price) * (item.pieces_per_carton || 12))).toFixed(0)}</Text>
                        </Text>
                        <Text style={{ fontSize: 12, color: "#4B5563" }}>
                          Wholesale: <Text style={{ fontWeight: "800", color: "#059669" }}>Rs.{Number(item.wholesale_price_carton ?? ((item.wholesale_price ?? item.price) * (item.pieces_per_carton || 12))).toFixed(0)}</Text>
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={pm.emptyText}>
                  {selectedCompany
                    ? "No products available under this company."
                    : "Select a company to view products."
                  }
                </Text>
              }
            />
          )}
        </View>
      </View>

      {/* Company Selector Sub Modal */}
      <Modal visible={companyModal} transparent animationType="fade">
        <View style={pm.overlaySub}>
          <View style={pm.sheetSub}>
            <Text style={pm.subTitle}>Filter by Company</Text>
            <FlatList
              data={companies}
              keyExtractor={(c) => String(c.company_id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={pm.subRow}
                  onPress={() => {
                    setSelectedCompany(item);
                    setCompanyModal(false);
                  }}
                >
                  <Text style={pm.subRowText}>{item.company_name}</Text>
                  {selectedCompany?.company_id === item.company_id && (
                    <Ionicons name="checkmark" size={20} color="#4F46E5" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={pm.emptyText}>No companies. Connect online & sync.</Text>
              }
            />
            <TouchableOpacity style={pm.closeSub} onPress={() => setCompanyModal(false)}>
              <Text style={pm.closeSubText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Lightbox Overlay Modal */}
      <Modal visible={!!lightboxImage} transparent animationType="fade">
        <TouchableOpacity
          style={pm.lightboxOverlay}
          activeOpacity={1}
          onPress={() => setLightboxImage(null)}
        >
          <TouchableOpacity
            style={pm.lightboxClose}
            onPress={() => setLightboxImage(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {lightboxImage && (
            <Image
              source={{ uri: lightboxImage }}
              style={pm.lightboxImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

// Simple Shop Picker Modal
function PickerModal({ visible, title, options, onSelect, onClose, labelKey }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={simplePm.overlay}>
        <View style={simplePm.sheet}>
          <Text style={simplePm.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(it) => String(it.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={simplePm.row}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={simplePm.rowText}>{item[labelKey]}</Text>
                  {item.location ? (
                    <Text style={{ fontSize: 13, color: "#4F46E5", fontWeight: "700", marginTop: 4 }}>
                      📍 {item.location}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={simplePm.cancel} onPress={onClose}>
            <Text style={simplePm.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const simplePm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    maxHeight: "70%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowText: { fontSize: 16, color: "#111827", flex: 1 },
  cancel: { marginTop: 8, padding: 16, alignItems: "center" },
  cancelText: { fontSize: 16, color: "#6B7280", fontWeight: "600" },
});

export default function OrderTakerScreen({ user, onBack }) {
  const [shops, setShops] = useState([]);
  const [shop, setShop] = useState(null);
  const [item, setItem] = useState(null);
  const [qty, setQty] = useState("");
  const [unitType, setUnitType] = useState("piece");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopModal, setShopModal] = useState(false);
  const [itemModal, setItemModal] = useState(false);
  const [net, setNet] = useState(false);

  const loadRefs = useCallback(async () => {
    await initDatabase();
    const s = await listShops();
    setShops(s);
  }, []);

  const refreshList = useCallback(async () => {
    const rows = await listLocalOrders(user.id);
    setRecords(rows);
  }, [user.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadRefs();
        await refreshList();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadRefs, refreshList]);

  const runSync = useCallback(async () => {
    const online = await isOnline();
    setNet(online);
    if (online) {
      try {
        await pushOutbox();
        await refreshList();
      } catch (e) {
        console.warn("sync", e);
      }
    }
  }, [refreshList]);

  useEffect(() => {
    runSync();
    const t = setInterval(runSync, 20000);
    return () => clearInterval(t);
  }, [runSync]);

  const qtyNum = parseInt(qty, 10) || 0;
  // Order Takers resolve the retail price tier
  const unit = item
    ? (unitType === "carton"
      ? Number(item.retail_price_carton ?? ((item.retail_price ?? item.price) * (item.pieces_per_carton || 12)))
      : Number(item.retail_price ?? item.price))
    : 0;
  const lineTotal = unit * qtyNum;

  const submit = async () => {
    if (!shop || !item) {
      Alert.alert("Select shop and item", "Choose from the lists — do not type names.");
      return;
    }
    if (qtyNum <= 0) {
      Alert.alert("Quantity", "Enter a valid quantity.");
      return;
    }
    try {
      const syncId = Crypto.randomUUID();
      await insertLocalOrder({
        syncId,
        userId: user.id,
        shopId: shop.id,
        itemId: item.id,
        quantity: qtyNum,
        unitPrice: unit,
        totalPrice: lineTotal,
        unitType,
      });
      setQty("");
      setUnitType("piece");
      await refreshList();
      await runSync();
      Alert.alert("Saved", "Order stored on this device. It will upload when internet is available.");
    } catch (e) {
      Alert.alert("Error", e.message || String(e));
    }
  };

  const renderRow = ({ item: row }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.shopName}>{row.shop_name}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: row.synced ? "#DCFCE7" : "#FEF3C7" },
          ]}
        >
          <Text style={styles.badgeText}>{row.synced ? "Synced" : "Pending"}</Text>
        </View>
      </View>
      <Text style={styles.itemName}>{row.item_name}</Text>
      <View style={styles.rowStats}>
        <Text style={styles.muted}>Qty: {row.quantity} ({row.unit_type === "carton" ? "ctn" : "pcs"})</Text>
        <Text style={styles.muted}>Unit: Rs. {Number(row.unit_price).toFixed(2)}</Text>
        <Text style={styles.total}>Total: Rs. {Number(row.total_price).toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Orders</Text>
        <TouchableOpacity onPress={runSync}>
          <Ionicons
            name="cloud-upload-outline"
            size={24}
            color={net ? "#4F46E5" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </View>
      {!user.access_token ? (
        <Text style={styles.banner}>
          Offline session: connect and log in online periodically to upload pending orders.
        </Text>
      ) : null}

      <FlatList
        data={records}
        keyExtractor={(r) => String(r.local_id)}
        renderItem={renderRow}
        refreshing={loading}
        onRefresh={async () => {
          setLoading(true);
          await loadRefs();
          await refreshList();
          await runSync();
          setLoading(false);
        }}
        ListHeaderComponent={
          <View style={styles.form}>
            <Text style={styles.hint}>
              {net ? "Online — pending orders will try to upload." : "Offline — data is saved on device."}
            </Text>

            <Text style={styles.label}>Shop</Text>
            <TouchableOpacity style={styles.select} onPress={() => setShopModal(true)}>
              <View style={{ flex: 1 }}>
                <Text style={shop ? styles.selectVal : styles.ph}>
                  {shop ? shop.shop_name : "Tap to choose shop"}
                </Text>
                {shop && shop.location ? (
                  <Text style={{ fontSize: 13, color: "#4F46E5", fontWeight: "700", marginTop: 4 }}>
                    📍 {shop.location}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <Text style={styles.label}>Item</Text>
            <TouchableOpacity style={styles.select} onPress={() => setItemModal(true)}>
              <Text style={item ? styles.selectVal : styles.ph}>
                {item ? `${item.item_name} (Rs. ${unit.toFixed(2)})` : "Tap to choose item"}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>

            <Text style={styles.label}>Quantity Type</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: unitType === "piece" ? "#4F46E5" : "#F3F4F6",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center"
                }}
                onPress={() => setUnitType("piece")}
              >
                <Text style={{ color: unitType === "piece" ? "#FFF" : "#4B5563", fontWeight: "bold" }}>Piece (Single)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: unitType === "carton" ? "#4F46E5" : "#F3F4F6",
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center"
                }}
                onPress={() => setUnitType("carton")}
              >
                <Text style={{ color: unitType === "carton" ? "#FFF" : "#4B5563", fontWeight: "bold" }}>Carton (Bulk)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Quantity</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={qty}
              onChangeText={setQty}
              placeholder="0"
            />

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Line total</Text>
              <Text style={styles.totalBig}>Rs. {lineTotal.toFixed(2)}</Text>
            </View>

            <TouchableOpacity style={styles.primary} onPress={submit}>
              <Text style={styles.primaryTxt}>Submit Order</Text>
            </TouchableOpacity>

            <Text style={styles.section}>Your orders</Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#4F46E5" />
          ) : (
            <Text style={styles.empty}>No orders yet</Text>
          )
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />

      <PickerModal
        visible={shopModal}
        title="Select shop"
        options={shops}
        labelKey="shop_name"
        onSelect={setShop}
        onClose={() => setShopModal(false)}
      />
      <ProductPickerModal
        visible={itemModal}
        onSelect={setItem}
        onClose={() => setItemModal(false)}
      />
    </View>
  );
}

// Product Selector Layout & Badging Styling sheet
const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  filterBox: {
    marginTop: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 2,
  },
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dropdownValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: "#111827",
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  pricesRow: {
    flexDirection: "row",
    gap: 8,
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4F46E5",
    marginRight: 4,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#312E81",
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginTop: 32,
    fontSize: 14,
    fontStyle: "italic",
  },
  overlaySub: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheetSub: {
    backgroundColor: "#fff",
    width: "100%",
    maxHeight: "60%",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  subTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 10,
  },
  subRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  subRowText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  closeSub: {
    marginTop: 14,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
  },
  closeSubText: {
    color: "#4B5563",
    fontWeight: "700",
    fontSize: 15,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 48,
    right: 24,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 24,
  },
  lightboxImage: {
    width: "90%",
    height: "75%",
    borderRadius: 20,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  topTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  banner: {
    backgroundColor: "#FEF9C3",
    color: "#854D0E",
    padding: 10,
    fontSize: 13,
    textAlign: "center",
  },
  form: { padding: 16 },
  hint: { color: "#6B7280", marginBottom: 12, fontSize: 14 },
  label: { fontSize: 14, fontWeight: "700", color: "#374151", marginTop: 10, marginBottom: 6 },
  select: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
  },
  selectVal: { fontSize: 16, color: "#111827", flex: 1 },
  ph: { fontSize: 16, color: "#9CA3AF", flex: 1 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
  },
  totalBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 15, fontWeight: "600", color: "#4338CA" },
  totalBig: { fontSize: 22, fontWeight: "900", color: "#312E81" },
  primary: {
    marginTop: 18,
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryTxt: { color: "#fff", fontSize: 18, fontWeight: "800" },
  section: { marginTop: 28, fontSize: 18, fontWeight: "800", color: "#111827" },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTop: { flexDirection: "row", justifyStyle: "space-between", alignItems: "center" },
  shopName: { fontSize: 17, fontWeight: "800", color: "#111827", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "800", color: "#374151" },
  itemName: { marginTop: 6, fontSize: 15, color: "#4B5563" },
  rowStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
    justifyContent: "space-between",
  },
  muted: { fontSize: 13, color: "#6B7280" },
  total: { fontSize: 14, fontWeight: "800", color: "#111827" },
  empty: { textAlign: "center", color: "#9CA3AF", marginTop: 12 },
});
