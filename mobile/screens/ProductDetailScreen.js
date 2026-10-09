import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import ProgressiveImage from '../components/ProgressiveImage';
import useStatusBarStyle from '../utils/useStatusBarStyle';
import { toast } from '../components/Toast';
import { getMyPhone } from '../components/ContactActions';

const ACCENT = '#00695C';
const { width } = Dimensions.get('window');

/**
 * A vendor's product with a pickup order: the order goes to the vendor's dashboard as
 * "pending", the vendor accepts it, prepares it and marks it ready for collection.
 */
export default function ProductDetailScreen({ route, navigation }) {
  useStatusBarStyle('light-content');
  const insets = useSafeAreaInsets();
  const { product } = route.params;
  const images = (product.images || []).filter(u => typeof u === 'string' && u.startsWith('http'));
  const [page, setPage] = useState(0);
  const stock = Number(product.stock) || 0;
  const maxQty = Math.max(1, Math.min(stock || 1, Number(product.maxOrderQty) || stock || 1));
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const price = Number(product.price) || 0;
  const total = price * qty;
  const outOfStock = stock <= 0;
  const isOwnProduct = auth.currentUser?.uid === product.vendorId;
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v || '');
  const from = isDate(product.availableFrom) ? product.availableFrom : null;
  const until = isDate(product.availableUntil) ? product.availableUntil : null;
  const native = product.name_native && product.name_native.trim().toLowerCase() !== (product.name_en || '').trim().toLowerCase() ? product.name_native : null;

  const placeOrder = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.warning('Sign in required', 'Please sign in to place an order.');
      return;
    }
    setPlacing(true);
    try {
      const customerPhone = await getMyPhone(); // so the vendor can call about pickup
      const ref = await addDoc(collection(db, 'orders'), {
        vendorId: product.vendorId,
        vendorBusinessName: product.vendorBusinessName || '',
        touristId: user.uid,
        customerName: user.displayName || 'Traveller',
        customerPhone,
        items: [{ productId: product.id, name: product.name_en || 'Product', price, qty, image: images[0] || null }],
        totalPrice: total,
        pickupLocation: product.pickupLocation || '',
        notes: notes.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert(
        'Order sent',
        `${product.vendorBusinessName || 'The vendor'} will confirm your order. Pay LKR ${total.toLocaleString()} when you collect it${product.pickupLocation ? ` at ${product.pickupLocation}` : ''}.`,
        [{ text: 'View my orders', onPress: () => navigation.replace('MyOrders', { highlight: ref.id }) }],
      );
    } catch (e) {
      Alert.alert('Order failed', e.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {images.map(uri => <ProgressiveImage key={uri} source={{ uri }} style={styles.hero} />)}
            </ScrollView>
          ) : (
            <ProgressiveImage source={null} style={styles.hero} />
          )}
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((u, i) => <View key={u} style={[styles.dot, i === page && styles.dotActive]} />)}
            </View>
          )}
          <TouchableOpacity style={[styles.back, { top: insets.top + 8 }]} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
            <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name_en || 'Product'}</Text>
            <Text style={styles.price}>LKR {price.toLocaleString()}</Text>
          </View>
          {native ? <Text style={styles.native}>{native}</Text> : null}

          <View style={styles.tags}>
            {product.category ? <View style={styles.tag}><Text style={styles.tagText}>{product.category}</Text></View> : null}
            {product.isEcoFriendly ? (
              <View style={[styles.tag, styles.ecoTag]}>
                <MaterialCommunityIcons name="leaf" size={12} color="#FFF" />
                <Text style={[styles.tagText, { color: '#FFF' }]}>Eco-friendly</Text>
              </View>
            ) : null}
            <View style={styles.tag}>
              <Text style={[styles.tagText, outOfStock && { color: '#C62828' }]}>{outOfStock ? 'Out of stock' : `${stock} in stock`}</Text>
            </View>
          </View>

          {product.description ? <Text style={styles.desc}>{product.description}</Text> : null}

          <View style={styles.infoCard}>
            <Info icon="storefront-outline" label="Sold by" value={product.vendorBusinessName || 'Local vendor'} />
            {product.pickupLocation ? <Info icon="map-marker-outline" label="Pickup" value={product.pickupLocation} /> : null}
            {from || until ? (
              <Info icon="calendar-range" label="Available" value={from && until ? `${from} to ${until}` : from ? `From ${from}` : `Until ${until}`} />
            ) : null}
            <Info icon="cash" label="Payment" value="Pay the vendor when you collect" />
          </View>

          {!outOfStock && !isOwnProduct && (
            <>
              <Text style={styles.section}>Quantity</Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} accessibilityLabel="Decrease quantity">
                  <MaterialCommunityIcons name="minus" size={20} color={qty <= 1 ? '#B0BAB6' : ACCENT} />
                </TouchableOpacity>
                <Text style={styles.qty}>{qty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty(q => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} accessibilityLabel="Increase quantity">
                  <MaterialCommunityIcons name="plus" size={20} color={qty >= maxQty ? '#B0BAB6' : ACCENT} />
                </TouchableOpacity>
                <Text style={styles.qtyHint}>Max {maxQty} per order</Text>
              </View>

              <Text style={styles.section}>Note to the vendor</Text>
              <TextInput
                style={styles.notes}
                value={notes}
                onChangeText={setNotes}
                placeholder="Colour, size, or when you plan to collect"
                placeholderTextColor="#9AA8A2"
                multiline
                maxLength={300}
              />
            </>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerTotal}>LKR {total.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.orderBtn, (outOfStock || isOwnProduct || placing) && { opacity: 0.5 }]}
          onPress={placeOrder}
          disabled={outOfStock || isOwnProduct || placing}
        >
          {placing ? <ActivityIndicator color="#FFF" /> : (
            <>
              <MaterialCommunityIcons name="shopping-outline" size={20} color="#FFF" />
              <Text style={styles.orderText}>{outOfStock ? 'Out of stock' : isOwnProduct ? 'Your product' : 'Order for pickup'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function Info({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon} size={20} color={ACCENT} />
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F9F8' },
  hero: { width, height: width * 0.8 },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#FFF', width: 18 },
  back: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { flex: 1, fontSize: 24, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  price: { fontSize: 20, fontFamily: 'Outfit-Bold', color: ACCENT, marginTop: 3 },
  native: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#5F6F6B', marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: '#E6EFEC' },
  ecoTag: { backgroundColor: ACCENT },
  tagText: { fontSize: 12, fontFamily: 'Outfit-SemiBold', color: ACCENT },
  desc: { fontSize: 15, fontFamily: 'Outfit-Regular', color: '#3A4A46', lineHeight: 22, marginTop: 16 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginTop: 18, gap: 12 },
  infoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  infoLabel: { fontSize: 12, fontFamily: 'Outfit-Regular', color: '#5F6F6B' },
  infoValue: { fontSize: 15, fontFamily: 'Outfit-SemiBold', color: '#1B2B28' },
  section: { fontSize: 16, fontFamily: 'Outfit-SemiBold', color: '#1B2B28', marginTop: 22, marginBottom: 10 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: '#CFDCD8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  qty: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1B2B28', minWidth: 24, textAlign: 'center' },
  qtyHint: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#5F6F6B' },
  notes: { backgroundColor: '#FFF', borderRadius: 14, padding: 12, minHeight: 80, textAlignVertical: 'top', fontFamily: 'Outfit-Regular', fontSize: 15, color: '#1B2B28' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E6EBE9' },
  footerLabel: { fontSize: 13, fontFamily: 'Outfit-Regular', color: '#5F6F6B' },
  footerTotal: { fontSize: 20, fontFamily: 'Outfit-Bold', color: '#1B2B28' },
  orderBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: ACCENT, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 28 },
  orderText: { color: '#FFF', fontSize: 16, fontFamily: 'Outfit-SemiBold' },
});
