// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { db, storage } from '../../firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const PRIMARY   = '#006A3B';
const ERROR     = '#BA1A1A';
const BG        = '#F6FBF3';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';

export default function ProofOfServiceScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedUri, setCapturedUri]   = useState(null);
  const [uploading,   setUploading]     = useState(false);
  const [uploadPct,   setUploadPct]     = useState(0);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality:0.85 });
      setCapturedUri(photo.uri);
    } catch (e) { Alert.alert('Error',e.message); }
  };

  const submitProof = async () => {
    if (!capturedUri) return;
    setUploading(true);
    try {
      const res  = await fetch(capturedUri);
      const blob = await res.blob();
      const r    = ref(storage, `orders/${orderId}/proof.jpg`);
      const url  = await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(r, blob);
        task.on('state_changed',
          snap => setUploadPct(Math.round((snap.bytesTransferred/snap.totalBytes)*100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });
      await updateDoc(doc(db,'orders',orderId), {
        status:'completed', proofImageUrl:url, completedAt:serverTimestamp(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('✅ Order Completed!','Proof uploaded successfully.',[
        { text:'Done', onPress:()=>navigation.navigate('VendorOrders') },
      ]);
    } catch (e) { Alert.alert('Upload Error',e.message); setUploading(false); }
  };

  if (!permission) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY}/></View>;
  if (!permission.granted) return (
    <View style={styles.center}>
      <Ionicons name="camera-off-outline" size={52} color={ON_SURF_V}/>
      <Text style={styles.permText}>Camera permission required</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
        <Text style={styles.permBtnText}>Grant Access</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{flex:1,backgroundColor:'#000'}}>
      <StatusBar barStyle="light-content"/>

      {capturedUri ? (
        /* Preview */
        <View style={{flex:1}}>
          <Image source={{uri:capturedUri}} style={{flex:1,resizeMode:'cover'}}/>
          <View style={styles.previewOverlay}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>📷 Proof Captured</Text>
              <Text style={styles.previewSub}>Review your photo before submitting</Text>
            </View>
            <View style={styles.previewFooter}>
              {uploading ? (
                <View style={styles.uploadingRow}>
                  <ActivityIndicator color="#FFF"/>
                  <Text style={styles.uploadingText}>Uploading... {uploadPct}%</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={styles.retakeBtn} onPress={()=>setCapturedUri(null)}>
                    <Ionicons name="refresh" size={20} color="#FFF"/>
                    <Text style={styles.retakeBtnText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={submitProof} activeOpacity={0.85}>
                    <Ionicons name="cloud-upload-outline" size={20} color="#FFF"/>
                    <Text style={styles.submitBtnText}>Submit & Complete</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={styles.cancelTextBtn} onPress={()=>navigation.goBack()}>
                <Text style={styles.cancelTextBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        /* Camera */
        <View style={{flex:1}}>
          <CameraView style={{flex:1}} ref={cameraRef} facing="back"/>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity style={styles.closeBtn} onPress={()=>navigation.goBack()}>
                <Ionicons name="close" size={24} color="#FFF"/>
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Proof of Service</Text>
              <View style={{width:40}}/>
            </View>
            <Text style={styles.cameraInstruction}>Capture a photo confirming the service was delivered to the customer.</Text>
            <View style={styles.cameraFooter}>
              <TouchableOpacity style={styles.captureBtn} onPress={takePicture} activeOpacity={0.85}>
                <View style={styles.captureOuter}>
                  <View style={styles.captureInner}/>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center:      {flex:1,justifyContent:'center',alignItems:'center',backgroundColor:BG,gap:16},
  permText:    {fontSize:16,color:ON_SURF_V,textAlign:'center'},
  permBtn:     {backgroundColor:PRIMARY,paddingHorizontal:28,paddingVertical:14,borderRadius:14},
  permBtnText: {color:'#FFF',fontWeight:'700',fontSize:15},
  cameraOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'space-between'},
  cameraHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:'rgba(0,0,0,0.55)'},
  closeBtn:    {width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,0.15)',alignItems:'center',justifyContent:'center'},
  cameraTitle: {fontSize:18,fontWeight:'800',color:'#FFF'},
  cameraInstruction:{color:'rgba(255,255,255,0.85)',textAlign:'center',fontSize:14,paddingHorizontal:32,backgroundColor:'rgba(0,0,0,0.45)',paddingVertical:10},
  cameraFooter:{alignItems:'center',paddingBottom:56,backgroundColor:'rgba(0,0,0,0.45)',paddingTop:24},
  captureBtn:  {padding:4},
  captureOuter:{width:76,height:76,borderRadius:38,borderWidth:3,borderColor:'#FFF',alignItems:'center',justifyContent:'center'},
  captureInner:{width:60,height:60,borderRadius:30,backgroundColor:PRIMARY},
  previewOverlay:{position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'space-between'},
  previewHeader:{backgroundColor:'rgba(0,0,0,0.6)',paddingTop:56,paddingHorizontal:24,paddingBottom:20,alignItems:'center'},
  previewTitle:{fontSize:22,fontWeight:'900',color:'#FFF',marginBottom:6},
  previewSub:  {fontSize:14,color:'rgba(255,255,255,0.75)',textAlign:'center'},
  previewFooter:{backgroundColor:'rgba(0,0,0,0.6)',padding:24,gap:12,alignItems:'center'},
  uploadingRow:{flexDirection:'row',alignItems:'center',gap:12},
  uploadingText:{color:'#FFF',fontSize:16,fontWeight:'600'},
  retakeBtn:   {flexDirection:'row',alignItems:'center',gap:8,borderWidth:1.5,borderColor:'rgba(255,255,255,0.6)',borderRadius:14,paddingVertical:12,paddingHorizontal:24,alignSelf:'stretch',justifyContent:'center'},
  retakeBtnText:{color:'#FFF',fontWeight:'700',fontSize:15},
  submitBtn:   {flexDirection:'row',alignItems:'center',gap:8,backgroundColor:PRIMARY,borderRadius:14,paddingVertical:14,paddingHorizontal:24,alignSelf:'stretch',justifyContent:'center'},
  submitBtnText:{color:'#FFF',fontWeight:'800',fontSize:16},
  cancelTextBtn:{paddingVertical:10},
  cancelTextBtnText:{color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:'600'},
});
