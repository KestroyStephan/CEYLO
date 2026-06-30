// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Modal, Animated, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db } from '../../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const PRIMARY   = '#006A3B';
const ERROR     = '#BA1A1A';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';
const TIMER_SECONDS = 20;

const REJECT_REASONS = ['Too Busy','Item Unavailable','Out of Stock','Other'];

export default function VendorIncomingOrderScreen({ route, navigation }) {
  const { order } = route.params;
  const [timeLeft,         setTimeLeft]         = useState(TIMER_SECONDS);
  const [showRejectModal,  setShowRejectModal]  = useState(false);
  const [selectedReason,   setSelectedReason]   = useState(REJECT_REASONS[0]);
  const [submitting,       setSubmitting]       = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timerRef    = useRef(null);
  const autoRejected = useRef(false);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.timing(progressAnim, { toValue:0, duration:TIMER_SECONDS*1000, useNativeDriver:false }).start();
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!autoRejected.current) { autoRejected.current=true; handleReject('No response',true); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const barColor = progressAnim.interpolate({
    inputRange:[0,0.3,1], outputRange:[ERROR,'#D97706',PRIMARY],
  });

  const handleAccept = async () => {
    clearInterval(timerRef.current);
    setSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await updateDoc(doc(db,'orders',order.id), { status:'accepted' });
      navigation.replace('VendorOrderManagement',{ orderId:order.id, order });
    } catch (e) { Alert.alert('Error',e.message); setSubmitting(false); }
  };

  const handleReject = async (reason, auto=false) => {
    clearInterval(timerRef.current);
    if (!auto) setShowRejectModal(false);
    setSubmitting(true);
    try {
      await updateDoc(doc(db,'orders',order.id), { status:'rejected', rejectionReason:reason });
      navigation.goBack();
    } catch (e) { if(!auto)Alert.alert('Error',e.message); setSubmitting(false); }
  };

  return (
    <View style={styles.overlay}>
      <StatusBar barStyle="light-content" />
      <View style={styles.card}>
        {/* Timer Bar */}
        <View style={styles.timerRow}>
          <Text style={styles.timerLabel}>New Order!</Text>
          <View style={styles.timerBadge}>
            <Text style={[styles.timerText,{color:timeLeft<=5?ERROR:'#D97706'}]}>{timeLeft}s</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill,{width:progressAnim.interpolate({inputRange:[0,1],outputRange:['0%','100%']}),backgroundColor:barColor}]} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:8}}>
          {/* Customer */}
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerAvatarText}>{(order.customerName||'T')[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.customerName}>{order.customerName||'Tourist'}</Text>
              <Text style={styles.orderIdText}>#{order.id?.slice(-8)}</Text>
            </View>
          </View>

          {/* Items */}
          <View style={styles.itemsSection}>
            <Text style={styles.itemsSectionTitle}>Order Details</Text>
            {order.items?.map((it,i)=>(
              <View key={i} style={styles.itemRow}>
                <View style={styles.itemQtyBadge}><Text style={styles.itemQtyText}>×{it.qty||1}</Text></View>
                <Text style={styles.itemName}>{it.name}</Text>
                <Text style={styles.itemPrice}>LKR {((it.price||0)*(it.qty||1)).toLocaleString()}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>LKR {(order.totalPrice||0).toLocaleString()}</Text>
            </View>
          </View>

          {order.notes&&(
            <View style={styles.notesBox}>
              <Ionicons name="chatbubble-outline" size={14} color={ON_SURF_V}/>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        <TouchableOpacity style={[styles.acceptBtn,submitting&&{opacity:0.6}]} onPress={handleAccept} disabled={submitting} activeOpacity={0.85}>
          <Ionicons name="checkmark-circle" size={24} color="#FFF" />
          <Text style={styles.acceptBtnText}>ACCEPT ORDER</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.rejectBtn,submitting&&{opacity:0.4}]} onPress={()=>setShowRejectModal(true)} disabled={submitting} activeOpacity={0.85}>
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      </View>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide" onRequestClose={()=>setShowRejectModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={()=>setShowRejectModal(false)} />
        <View style={styles.bottomSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select a Reason</Text>
          {REJECT_REASONS.map(r=>(
            <TouchableOpacity key={r} style={[styles.reasonRow,selectedReason===r&&styles.reasonRowActive]} onPress={()=>setSelectedReason(r)}>
              <View style={[styles.reasonRadio,selectedReason===r&&styles.reasonRadioActive]}>
                {selectedReason===r&&<View style={styles.reasonRadioDot}/>}
              </View>
              <Text style={[styles.reasonText,selectedReason===r&&{color:PRIMARY,fontWeight:'700'}]}>{r}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.confirmRejectBtn} onPress={()=>handleReject(selectedReason)} activeOpacity={0.85}>
            <Text style={styles.confirmRejectText}>Confirm Rejection</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelSheetBtn} onPress={()=>setShowRejectModal(false)}>
            <Text style={styles.cancelSheetText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:      {flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'flex-end'},
  card:         {backgroundColor:SURFACE,borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:40,maxHeight:'90%'},
  timerRow:     {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:12},
  timerLabel:   {fontSize:20,fontWeight:'900',color:ON_SURF},
  timerBadge:   {backgroundColor:SURFACE_C,borderRadius:9999,paddingHorizontal:14,paddingVertical:6},
  timerText:    {fontSize:18,fontWeight:'900'},
  progressTrack:{height:6,backgroundColor:SURFACE_C,borderRadius:3,marginBottom:20,overflow:'hidden'},
  progressFill: {height:6,borderRadius:3},
  customerRow:  {flexDirection:'row',alignItems:'center',gap:12,marginBottom:16},
  customerAvatar:{width:50,height:50,borderRadius:25,backgroundColor:SURFACE_C,alignItems:'center',justifyContent:'center'},
  customerAvatarText:{fontSize:22,fontWeight:'800',color:PRIMARY},
  customerName: {fontSize:18,fontWeight:'800',color:ON_SURF},
  orderIdText:  {fontSize:12,color:ON_SURF_V,marginTop:2},
  itemsSection: {backgroundColor:SURFACE_C,borderRadius:16,padding:14,marginBottom:12},
  itemsSectionTitle:{fontSize:13,fontWeight:'700',color:ON_SURF_V,marginBottom:10,textTransform:'uppercase',letterSpacing:1},
  itemRow:      {flexDirection:'row',alignItems:'center',marginBottom:10,gap:10},
  itemQtyBadge: {backgroundColor:PRIMARY,borderRadius:9999,paddingHorizontal:8,paddingVertical:3},
  itemQtyText:  {fontSize:12,fontWeight:'800',color:'#FFF'},
  itemName:     {flex:1,fontSize:14,color:ON_SURF,fontWeight:'600'},
  itemPrice:    {fontSize:14,fontWeight:'700',color:PRIMARY},
  totalRow:     {flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderTopWidth:1,borderTopColor:OUTLINE_V,paddingTop:10,marginTop:4},
  totalLabel:   {fontSize:14,fontWeight:'700',color:ON_SURF_V},
  totalAmount:  {fontSize:20,fontWeight:'900',color:PRIMARY},
  notesBox:     {flexDirection:'row',gap:8,alignItems:'flex-start',backgroundColor:'#FFF7ED',borderRadius:12,padding:12,marginBottom:12},
  notesText:    {flex:1,fontSize:13,color:ON_SURF,lineHeight:20},
  acceptBtn:    {flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:PRIMARY,borderRadius:16,paddingVertical:18,gap:10,marginTop:12},
  acceptBtnText:{fontSize:18,fontWeight:'900',color:'#FFF',letterSpacing:1},
  rejectBtn:    {alignItems:'center',paddingVertical:14,marginTop:8},
  rejectBtnText:{fontSize:15,fontWeight:'700',color:ERROR},
  modalBackdrop:{flex:1},
  bottomSheet:  {backgroundColor:SURFACE,borderTopLeftRadius:28,borderTopRightRadius:28,padding:24,paddingBottom:40},
  sheetHandle:  {width:40,height:4,borderRadius:2,backgroundColor:OUTLINE_V,alignSelf:'center',marginBottom:20},
  sheetTitle:   {fontSize:20,fontWeight:'800',color:ON_SURF,marginBottom:16},
  reasonRow:    {flexDirection:'row',alignItems:'center',padding:14,borderRadius:14,borderWidth:1.5,borderColor:OUTLINE_V,marginBottom:8,gap:12},
  reasonRowActive:{borderColor:PRIMARY,backgroundColor:'rgba(0,106,59,0.05)'},
  reasonRadio:  {width:22,height:22,borderRadius:11,borderWidth:2,borderColor:OUTLINE_V,alignItems:'center',justifyContent:'center'},
  reasonRadioActive:{borderColor:PRIMARY},
  reasonRadioDot:{width:10,height:10,borderRadius:5,backgroundColor:PRIMARY},
  reasonText:   {fontSize:15,color:ON_SURF_V},
  confirmRejectBtn:{backgroundColor:ERROR,borderRadius:14,paddingVertical:16,alignItems:'center',marginTop:8},
  confirmRejectText:{color:'#FFF',fontSize:16,fontWeight:'800'},
  cancelSheetBtn:{alignItems:'center',paddingVertical:14},
  cancelSheetText:{fontSize:15,fontWeight:'600',color:ON_SURF_V},
});
