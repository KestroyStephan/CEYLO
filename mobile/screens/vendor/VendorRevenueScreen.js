// CEYLO Design System
// primary:#006A3B secondary:#006A6A tertiary:#735C00 error:#BA1A1A
// bg:#F6FBF3 surface:#FFFFFF surfaceContainer:#EBEFE8
// onSurface:#181D19 onSurfaceVariant:#3F4941
// outline:#6F7A70 outlineVariant:#BECABE

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Dimensions, TouchableOpacity, StatusBar,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';

const sw      = Dimensions.get('window').width;
const PRIMARY = '#006A3B';
const SECONDARY = '#006A6A';
const TERTIARY  = '#735C00';
const BG        = '#F6FBF3';
const SURFACE   = '#FFFFFF';
const SURFACE_C = '#EBEFE8';
const ON_SURF   = '#181D19';
const ON_SURF_V = '#3F4941';
const OUTLINE_V = '#BECABE';

const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getLast7Days() {
  const days=[],labels=[];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);days.push(new Date(d));labels.push(DAY_NAMES[d.getDay()]);}
  return {days,labels};
}
function getLast30Days() {
  const days=[],labels=[];
  for(let i=29;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);d.setHours(0,0,0,0);days.push(new Date(d));labels.push(i%5===0?d.getDate().toString():'');}
  return {days,labels};
}
function calcTrust(complRate,avgRating,total){
  const r=(avgRating||0)/5;const t=Math.min(total/100,1);const res=0.8;
  return Math.round((complRate*0.4+res*0.3+r*0.2+t*0.1)*100);
}

const TrustRing = ({ score }) => {
  const R=40;const CIRC=2*Math.PI*R;const dash=(score/100)*CIRC;
  const color = score>=80?PRIMARY:score>=60?'#D97706':'#BA1A1A';
  return (
    <View style={{alignItems:'center',justifyContent:'center',width:100,height:100}}>
      <Svg width={100} height={100} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r={R} stroke={OUTLINE_V} strokeWidth={8} fill="none" />
        <Circle cx="50" cy="50" r={R} stroke={color} strokeWidth={8} fill="none"
          strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      </Svg>
      <View style={{position:'absolute',alignItems:'center'}}>
        <Text style={{fontSize:22,fontWeight:'900',color}}>{score}</Text>
        <Text style={{fontSize:9,color:ON_SURF_V,fontWeight:'600'}}>/100</Text>
      </View>
    </View>
  );
};

export default function VendorRevenueScreen() {
  const [range,          setRange]          = useState('Week');
  const [revenueData,    setRevenueData]    = useState(Array(7).fill(0.01));
  const [ratingData,     setRatingData]     = useState(Array(7).fill(0));
  const [labels,         setLabels]         = useState(['','','','','','','']);
  const [loading,        setLoading]        = useState(true);
  const [periodTotal,    setPeriodTotal]    = useState(0);
  const [totalOrders,    setTotalOrders]    = useState(0);
  const [completedOrders,setCompletedOrders]= useState(0);
  const [avgRating,      setAvgRating]      = useState(0);
  const [topServices,    setTopServices]    = useState([]);
  const [reviews,        setReviews]        = useState([]);
  const [trustScore,     setTrustScore]     = useState(0);
  const uid = auth.currentUser?.uid;

  useEffect(()=>{if(uid){setLoading(true);fetchData();}},[uid,range]);

  const fetchData = async () => {
    try {
      const {days,labels:lbs} = range==='Week'?getLast7Days():getLast30Days();
      setLabels(lbs);
      const startDate=days[0];const endDate=new Date();
      const q = query(collection(db,'orders'),where('vendorId','==',uid),
        where('createdAt','>=',Timestamp.fromDate(startDate)),
        where('createdAt','<=',Timestamp.fromDate(endDate)));
      const snap = await getDocs(q);
      const dayRevMap={};const dayRatMap={};const svcMap={};
      let tot=0,compl=0,ratSum=0,ratCnt=0;const revList=[];
      days.forEach(d=>{const k=d.toDateString();dayRevMap[k]=0;dayRatMap[k]=0;});
      snap.forEach(d=>{
        const data=d.data();const dt=data.createdAt?.toDate?data.createdAt.toDate():new Date();
        const k=dt.toDateString();tot++;
        if(data.status==='completed'){compl++;const p=data.totalPrice||0;tot++;dayRevMap[k]=(dayRevMap[k]||0)+p;tot2=tot;setPeriodTotal(t=>t+p);}
        if(data.rating){ratSum+=data.rating;ratCnt++;dayRatMap[k]=(dayRatMap[k]||0)+data.rating;revList.push({...data,id:d.id});}
        if(data.serviceId){svcMap[data.serviceId]=(svcMap[data.serviceId]||{count:0,name:data.serviceName||'Service'});svcMap[data.serviceId].count++;}
      });
      const rev=days.map(d=>dayRevMap[d.toDateString()]||0.01);
      const rat=days.map(d=>Math.min(dayRatMap[d.toDateString()]||0,5));
      setPeriodTotal(snap.docs.filter(d=>d.data().status==='completed').reduce((a,d)=>a+(d.data().totalPrice||0),0));
      setRevenueData(rev.length?rev:[0.01]);
      setRatingData(rat.length?rat:[0]);
      setTotalOrders(tot);setCompletedOrders(compl);
      const ar=ratCnt?ratSum/ratCnt:0;setAvgRating(parseFloat(ar.toFixed(1)));
      setTrustScore(calcTrust(tot?compl/tot:0,ar,tot));
      setTopServices(Object.entries(svcMap).sort((a,b)=>b[1].count-a[1].count).slice(0,3).map(([k,v])=>v));
      setReviews(revList.slice(0,5));
    } catch(e){}
    finally{setLoading(false);}
  };

  const chartConfig = {
    backgroundGradientFrom:'#FFF',backgroundGradientTo:'#FFF',
    color:(o=1)=>`rgba(0,106,59,${o})`,labelColor:(o=1)=>`rgba(63,73,65,${o})`,
    barPercentage:0.6,decimalPlaces:0,
    propsForBackgroundLines:{strokeDasharray:'',stroke:'#EBEFE8'},
  };
  const ratingChartConfig = {
    ...chartConfig, color:(o=1)=>`rgba(115,92,0,${o})`,
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={PRIMARY} /></View>;

  const chartW = sw - 40;

  return (
    <ScrollView style={{flex:1,backgroundColor:BG}} contentContainerStyle={{paddingBottom:100}}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Revenue Analytics</Text>
        <View style={styles.rangeTabs}>
          {['Week','Month'].map(r=>(
            <TouchableOpacity key={r} onPress={()=>setRange(r)} style={[styles.rangeTab,range===r&&styles.rangeTabActive]}>
              <Text style={[styles.rangeTabText,range===r&&{color:'#FFF'}]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Total Revenue */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Revenue ({range})</Text>
        <Text style={styles.totalAmount}>LKR {periodTotal.toLocaleString()}</Text>
      </View>

      {/* Trust Score */}
      <View style={styles.trustCard}>
        <TrustRing score={trustScore} />
        <View style={{flex:1,marginLeft:16}}>
          <View style={styles.trustTitleRow}>
            <Text style={styles.trustTitle}>Trust Score</Text>
            {trustScore>=80&&<View style={styles.verifiedBadge}><Ionicons name="shield-checkmark" size={12} color={PRIMARY}/><Text style={styles.verifiedText}>Verified</Text></View>}
          </View>
          <Text style={styles.trustSub}>Completion Rate · Response Time · Rating · Tenure</Text>
          <View style={styles.trustBreakdown}>
            {[['Completion','40%'],['Response','30%'],['Rating','20%'],['Tenure','10%']].map(([l,p])=>(
              <View key={l} style={styles.trustBreakItem}>
                <Text style={styles.trustBreakLabel}>{l}</Text>
                <Text style={styles.trustBreakPct}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Bar Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Daily Revenue (LKR)</Text>
        <BarChart
          data={{labels,datasets:[{data:revenueData}]}}
          width={chartW} height={180} chartConfig={chartConfig} yAxisLabel="" yAxisSuffix=""
          style={{borderRadius:14}} fromZero />
      </View>

      {/* Rating Chart */}
      {ratingData.some(v=>v>0)&&(
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Rating Trend</Text>
          <LineChart
            data={{labels,datasets:[{data:ratingData,color:(o=1)=>`rgba(115,92,0,${o})`}]}}
            width={chartW} height={160} chartConfig={ratingChartConfig}
            style={{borderRadius:14}} fromZero bezier />
        </View>
      )}

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        {[
          {label:'Completed',value:`${completedOrders}/${totalOrders}`,icon:'checkmark-circle-outline',color:PRIMARY},
          {label:'Avg Rating',value:`${avgRating||'—'} ★`,icon:'star-outline',color:TERTIARY},
        ].map(s=>(
          <View key={s.label} style={styles.summaryCard}>
            <Ionicons name={s.icon} size={24} color={s.color} />
            <Text style={[styles.summaryValue,{color:s.color}]}>{s.value}</Text>
            <Text style={styles.summaryLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Top Services */}
      {topServices.length>0&&(
        <View style={styles.topServCard}>
          <Text style={styles.sectionTitle}>Top Services</Text>
          {topServices.map((s,i)=>(
            <View key={i} style={styles.topServRow}>
              <Text style={styles.topServRank}>{['🥇','🥈','🥉'][i]}</Text>
              <Text style={styles.topServName}>{s.name}</Text>
              <Text style={styles.topServCount}>{s.count} bookings</Text>
            </View>
          ))}
        </View>
      )}

      {/* Reviews */}
      {reviews.length>0&&(
        <View style={styles.reviewsCard}>
          <Text style={styles.sectionTitle}>Recent Reviews</Text>
          {reviews.map((r,i)=>(
            <View key={i} style={styles.reviewItem}>
              <View style={styles.reviewStars}>
                {Array(5).fill(0).map((_,j)=>(
                  <Ionicons key={j} name="star" size={14} color={j<(r.rating||0)?TERTIARY:OUTLINE_V} />
                ))}
              </View>
              {r.comment&&<Text style={styles.reviewText}>{r.comment}</Text>}
              <Text style={styles.reviewDate}>{r.createdAt?.toDate?.()?.toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center:       {flex:1,justifyContent:'center',alignItems:'center',backgroundColor:BG},
  header:       {flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:56,paddingHorizontal:20,paddingBottom:16,backgroundColor:SURFACE,borderBottomWidth:1,borderBottomColor:SURFACE_C},
  headerTitle:  {fontSize:22,fontWeight:'800',color:ON_SURF},
  rangeTabs:    {flexDirection:'row',gap:6},
  rangeTab:     {paddingHorizontal:14,paddingVertical:7,borderRadius:9999,borderWidth:1.5,borderColor:OUTLINE_V,backgroundColor:SURFACE},
  rangeTabActive:{backgroundColor:PRIMARY,borderColor:PRIMARY},
  rangeTabText: {fontSize:13,fontWeight:'600',color:ON_SURF_V},
  totalCard:    {margin:16,backgroundColor:SURFACE,borderRadius:20,padding:20,alignItems:'center',shadowColor:'#181D19',shadowOpacity:0.08,shadowRadius:12,elevation:3},
  totalLabel:   {fontSize:13,color:ON_SURF_V,fontWeight:'600',marginBottom:6},
  totalAmount:  {fontSize:32,fontWeight:'900',color:ON_SURF},
  trustCard:    {marginHorizontal:16,marginBottom:16,backgroundColor:SURFACE,borderRadius:20,padding:20,flexDirection:'row',alignItems:'center',shadowColor:'#181D19',shadowOpacity:0.08,shadowRadius:12,elevation:3},
  trustTitleRow:{flexDirection:'row',alignItems:'center',gap:8,marginBottom:4},
  trustTitle:   {fontSize:18,fontWeight:'800',color:ON_SURF},
  verifiedBadge:{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(0,106,59,0.1)',borderRadius:9999,paddingHorizontal:8,paddingVertical:3,gap:4},
  verifiedText: {fontSize:10,fontWeight:'700',color:PRIMARY},
  trustSub:     {fontSize:11,color:ON_SURF_V,marginBottom:10},
  trustBreakdown:{flexDirection:'row',flexWrap:'wrap',gap:8},
  trustBreakItem:{backgroundColor:SURFACE_C,borderRadius:8,paddingHorizontal:8,paddingVertical:4,alignItems:'center'},
  trustBreakLabel:{fontSize:10,color:ON_SURF_V,fontWeight:'600'},
  trustBreakPct:{fontSize:12,fontWeight:'800',color:PRIMARY},
  chartCard:    {marginHorizontal:16,marginBottom:16,backgroundColor:SURFACE,borderRadius:20,padding:16,shadowColor:'#181D19',shadowOpacity:0.07,shadowRadius:10,elevation:2},
  chartTitle:   {fontSize:16,fontWeight:'700',color:ON_SURF,marginBottom:12},
  summaryRow:   {flexDirection:'row',marginHorizontal:16,gap:12,marginBottom:16},
  summaryCard:  {flex:1,backgroundColor:SURFACE,borderRadius:18,padding:16,alignItems:'center',gap:6,shadowColor:'#181D19',shadowOpacity:0.06,shadowRadius:8,elevation:2},
  summaryValue: {fontSize:20,fontWeight:'900'},
  summaryLabel: {fontSize:12,color:ON_SURF_V,fontWeight:'600'},
  topServCard:  {marginHorizontal:16,backgroundColor:SURFACE,borderRadius:20,padding:16,marginBottom:16,shadowColor:'#181D19',shadowOpacity:0.06,shadowRadius:8,elevation:2},
  sectionTitle: {fontSize:18,fontWeight:'800',color:ON_SURF,marginBottom:12},
  topServRow:   {flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:SURFACE_C,gap:12},
  topServRank:  {fontSize:20},
  topServName:  {flex:1,fontSize:15,color:ON_SURF,fontWeight:'600'},
  topServCount: {fontSize:13,color:ON_SURF_V,fontWeight:'600'},
  reviewsCard:  {marginHorizontal:16,backgroundColor:SURFACE,borderRadius:20,padding:16,marginBottom:16,shadowColor:'#181D19',shadowOpacity:0.06,shadowRadius:8,elevation:2},
  reviewItem:   {paddingVertical:12,borderBottomWidth:1,borderBottomColor:SURFACE_C},
  reviewStars:  {flexDirection:'row',gap:2,marginBottom:6},
  reviewText:   {fontSize:14,color:ON_SURF,lineHeight:20,marginBottom:4},
  reviewDate:   {fontSize:11,color:ON_SURF_V},
});
