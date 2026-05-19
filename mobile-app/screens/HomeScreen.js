import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const HomeScreen = ({ onSelectPortal }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Decorative Background Elements */}
      <View style={styles.headerBackground} />
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />

      <View style={styles.headerContent}>
        <View style={styles.logoContainer}>
          <Ionicons name="business" size={44} color="#4F46E5" />
        </View>
        <Text style={styles.title}>Business Apps</Text>
        <Text style={styles.subtitle}>Streamline your daily operations</Text>
      </View>

      <View style={styles.menuContainer}>
        <View style={styles.sectionLabelContainer}>
          <Text style={styles.sectionLabel}>CHOOSE YOUR PORTAL</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => onSelectPortal('order_login')}
          activeOpacity={0.9}
        >
          <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="cart" size={36} color="#4F46E5" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Order Taker</Text>
            <Text style={styles.cardDesc}>Collect orders from retail shops and manage inventory.</Text>
          </View>
          <View style={[styles.arrowBox, { backgroundColor: '#4F46E5' }]}>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.card} 
          onPress={() => onSelectPortal('sales_login')}
          activeOpacity={0.9}
        >
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <Ionicons name="cash" size={36} color="#10B981" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Sales Man</Text>
            <Text style={styles.cardDesc}>Record sales, income, and track outstanding loans.</Text>
          </View>
          <View style={[styles.arrowBox, { backgroundColor: '#10B981' }]}>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.offlineBadge}>
          <Ionicons name="cloud-offline" size={14} color="#6B7280" />
          <Text style={styles.offlineText}>OFFLINE MODE</Text>
        </View>
        <Text style={styles.versionText}>Version 1.0.0 • Phase 1 MVP</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#1F2937',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 100,
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 120,
    height: 120,
    top: 150,
    left: -30,
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    zIndex: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    fontWeight: '500',
  },
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -20,
    zIndex: 2,
  },
  sectionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1.5,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
    marginLeft: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  cardDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 18,
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  offlineText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    marginLeft: 6,
    letterSpacing: 1,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default HomeScreen;
