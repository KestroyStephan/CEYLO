// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

const PRIMARY   = '#006A3B';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';

const STEPS   = ['accepted','preparing','ready','completed'];
const STEP_LABELS = { accepted:'Accepted', preparing:'Preparing', ready:'Ready', completed:'Completed' };
const STEP_ICONS  = { accepted:'checkmark-circle-outline', preparing:'construct-outline', ready:'cube-outline', completed:'flag-outline' };

export default function VendorOrderManagementScreen({ route, navigation }) {
  const { orderId, order: initialOrder } = route.params;
  const [order,    setOrder]    = useState(initialOrder);
  const [loading,  setLoading]  = useState(!initialOrder);
  const [advancing,setAdvancing]= useState(false);

  useEffect(() => {
    if (!orderId) return;
    const unsub = onSnapshot(doc(db,'orders',orderId), snap => {
      if (snap.exists()) setOrder({ id:snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [orderId]);

  const advanceStatus = async () => {
    const idx = STEPS.indexOf(order?.status);
    if (idx < 0 || idx >= STEPS.length-1) return;
    const next = STEPS[idx+1];
    if (next === 'completed') {
      navigation.navigate('ProofOfService', { orderId });
      return;
    }
    setAdvancing(true);
    try { await updateDoc(doc(db,'orders',orderId), { status:next }); }
    catch (e) { Alert.alert('Error',e.message); }
    finally { setAdvancing(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;
  if (!order)  return <View style={styles.center}><Text style={styles.noOrderText}>Order not found</Text></View>;

  const currentIdx = STEPS.indexOf(order.status);
  const isCompleted = order.status === 'completed';
  const nextLabel = currentIdx < STEPS.length-1 ? `→ Mark as ${STEP_LABELS[STEPS[currentIdx+1]]}` : null;

  return (
    <View style={{flex:1,backgroundColor:BG}}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={()=>navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={ON_SURF} />
        </TouchableOpacity>
        <View style={{flex:1,marginLeft:12}}>
          <Text style={styles.headerTitle}>Order #{order.id?.slice(-8)}</Text>
          <Text style={styles.headerSub}>{order.customerName||'Tourist'}</Text>
        </View>
        <Text style={styles.headerTotal}>LKR {(order.totalPrice||0).toLocaleString()}</Text>
      </View>

      <ScrollView contentContainerStyle={{padding:20,paddingBottom:120}} showsVerticalScrollIndicator={false}>
        {/* Status Stepper */}
        <View style={styles.stepperCard}>
          <Text style={styles.stepperTitle}>Order Progress</Text>
          <View style={styles.stepper}>
            {STEPS.map((step,i)=>{
              const done    = i <  currentIdx;
              const current = i === currentIdx;
              const future  = i >  currentIdx;
              return (
                <React.Fragment key={step}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle,done&&styles.stepCircleDone,current&&styles.stepCircleCurrent,future&&styles.stepCircleFuture]}>
                      {done
                        ? <Ionicons name="checkmark" size={16} color="#FFF" />
                        : current
                          ? <View style={styles.stepPulse}/>
                          : <Ionicons name={STEP_ICONS[step]} size={14} color={OUTLINE_V} />}
                    </View>
                    <Text style={[styles.stepLabel,done&&{color:PRIMARY},current&&{color:PRIMARY,fontWeight:'700'}]}>
                      {STEP_LABELS[step]}
                    </Text>
                  </View>
                  {i<STEPS.length-1&&<View style={[styles.stepConnector,done&&styles.stepConnectorDone]}/>}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <Text style={styles.cardTitle}>Order Items</Text>
          {order.items?.map((it,i)=>(
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemName}>{it.name}</Text>
              <Text style={styles.itemQty}>×{it.qty||1}</Text>
              <Text style={styles.itemPrice}>LKR {((it.price||0)*(it.qty||1)).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>LKR {(order.totalPrice||0).toLocaleString()}</Text>
          </View>
        </View>

        {order.notes&&(
          <View style={styles.notesCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={ON_SURF_V}/>
            <View style={{flex:1,marginLeft:10}}>
              <Text style={styles.notesLabel}>Customer Notes</Text>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.chatFooterBtn} onPress={()=>navigation.navigate('VendorChat',{bookingId:orderId,order})}>
          <Ionicons name="chatbubble-outline" size={20} color={PRIMARY}/>
          <Text style={styles.chatFooterText}>Chat</Text>
        </TouchableOpacity>
        {!isCompleted&&nextLabel&&(
          <TouchableOpacity style={[styles.advanceBtn,advancing&&{opacity:0.6}]} onPress={advanceStatus} disabled={advancing} activeOpacity={0.85}>
            {advancing?<ActivityIndicator color="#FFF"/>:
              <><Ionicons name="arrow-forward-circle" size={22} color="#FFF"/>
              <Text style={styles.advanceBtnText}>{order.status==='ready'?'Complete & Upload Proof':nextLabel}</Text></>}
          </TouchableOpacity>
        )}
        {isCompleted&&(
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={22} color={PRIMARY}/>
            <Text style={styles.completedText}>Order Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center:       {flex:1,justifyContent:'center',alignItems:'center',backgroundColor:BG},
  noOrderText:  {fontSize:16,color:ON_SURF_V},
  header:       {flexDirection:'row',alignItems:'center',paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:SURFACE,borderBottomWidth:1,borderBottomColor:SURFACE_C},
  backBtn:      {width:38,height:38,borderRadius:12,backgroundColor:SURFACE_C,alignItems:'center',justifyContent:'center'},
  headerTitle:  {fontSize:18,fontWeight:'800',color:ON_SURF},
  headerSub:    {fontSize:13,color:ON_SURF_V},
  headerTotal:  {fontSize:18,fontWeight:'900',color:PRIMARY},
  stepperCard:  {backgroundColor:SURFACE,borderRadius:20,padding:20,marginBottom:16,shadowColor:'#181D19',shadowOpacity:0.08,shadowRadius:12,elevation:3},
  stepperTitle: {fontSize:16,fontWeight:'700',color:ON_SURF,marginBottom:20},
  stepper:      {flexDirection:'row',alignItems:'flex-start'},
  stepItem:     {alignItems:'center',flex:1},
  stepCircle:   {width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',marginBottom:8},
  stepCircleDone:{backgroundColor:PRIMARY},
  stepCircleCurrent:{backgroundColor:'rgba(0,106,59,0.12)',borderWidth:2,borderColor:PRIMARY},
  stepCircleFuture:{backgroundColor:SURFACE_C},
  stepPulse:    {width:12,height:12,borderRadius:6,backgroundColor:PRIMARY},
  stepLabel:    {fontSize:10,color:OUTLINE_V,fontWeight:'600',textAlign:'center'},
  stepConnector:{flex:1,height:2,backgroundColor:SURFACE_C,marginTop:18,marginHorizontal:-8},
  stepConnectorDone:{backgroundColor:PRIMARY},
  itemsCard:    {backgroundColor:SURFACE,borderRadius:20,padding:20,marginBottom:16,shadowColor:'#181D19',shadowOpacity:0.07,shadowRadius:10,elevation:2},
  cardTitle:    {fontSize:16,fontWeight:'700',color:ON_SURF,marginBottom:14},
  itemRow:      {flexDirection:'row',alignItems:'center',marginBottom:10,gap:10},
  itemName:     {flex:1,fontSize:14,color:ON_SURF,fontWeight:'600'},
  itemQty:      {fontSize:13,color:ON_SURF_V},
  itemPrice:    {fontSize:14,fontWeight:'700',color:PRIMARY},
  totalRow:     {flexDirection:'row',justifyContent:'space-between',borderTopWidth:1,borderTopColor:SURFACE_C,paddingTop:12,marginTop:4},
  totalLabel:   {fontSize:14,fontWeight:'700',color:ON_SURF_V},
  totalAmount:  {fontSize:18,fontWeight:'900',color:PRIMARY},
  notesCard:    {flexDirection:'row',backgroundColor:SURFACE,borderRadius:16,padding:16,marginBottom:16,gap:10,shadowColor:'#181D19',shadowOpacity:0.06,shadowRadius:8,elevation:2},
  notesLabel:   {fontSize:12,fontWeight:'700',color:ON_SURF_V,marginBottom:4},
  notesText:    {fontSize:14,color:ON_SURF,lineHeight:20},
  footer:       {position:'absolute',bottom:0,left:0,right:0,flexDirection:'row',gap:10,padding:16,paddingBottom:32,backgroundColor:'rgba(246,251,243,0.95)',borderTopWidth:0.5,borderTopColor:OUTLINE_V},
  chatFooterBtn:{width:52,height:52,borderRadius:16,backgroundColor:SURFACE,borderWidth:1.5,borderColor:PRIMARY,alignItems:'center',justifyContent:'center'},
  chatFooterText:{fontSize:10,color:PRIMARY,fontWeight:'700',marginTop:2},
  advanceBtn:   {flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:PRIMARY,borderRadius:16,paddingVertical:14,gap:8},
  advanceBtnText:{fontSize:15,fontWeight:'800',color:'#FFF'},
  completedBadge:{flex:1,flexDirection:'row',alignItems:'center',justifyContent:'center',backgroundColor:'rgba(0,106,59,0.1)',borderRadius:16,paddingVertical:14,gap:8},
  completedText: {fontSize:15,fontWeight:'700',color:PRIMARY},
});
