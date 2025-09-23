// script.js (Home)

const waterGoalDefault = 3000;
let consumed = 0;
let userDoc = null;

const glassRow = document.getElementById("glass-row");
const totalText = document.getElementById("total-water");
const todayDateText = document.getElementById("today-date");
const userBadge = document.getElementById("user-badge");
const goalLine = document.getElementById("goal-line");

function getSelectedUser(){ try{ return JSON.parse(localStorage.getItem("selectedUser")); }catch{return null;} }
function requireUserOrRedirect(){ const u=getSelectedUser(); if(!u) window.location.href="users.html"; return u; }
function pad2(n){return String(n).padStart(2,"0");}
function getTodayKey(){ const d=new Date(); return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`; }
function getYesterdayKey(){ const d=new Date(); d.setDate(d.getDate()-1); return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`; }
function intakeDocId(userId, dateKey){ return `${userId}_${dateKey}`; }

async function getIntakeDoc(userId, dateKey){
  await window.firebaseReady;
  return db.collection("intakes").doc(intakeDocId(userId, dateKey)).get();
}
async function getDayMl(userId, dateKey){
  const s = await getIntakeDoc(userId, dateKey);
  return s.exists ? Number(s.data().ml || 0) : 0;
}

function render(){
  const u=getSelectedUser();
  if(todayDateText){
    todayDateText.textContent=new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  }
  if(userBadge&&u) userBadge.textContent=`User: ${u.name}${userDoc?.age?` (Age ${userDoc.age})`:""}`;
  if(totalText) totalText.textContent=consumed;

  const goal=userDoc?.goalMl ?? waterGoalDefault;
  const pct=Math.min(100, Math.round((consumed/goal)*100)) || 0;
  const streak=userDoc?.streak ?? 0;
  const best=userDoc?.bestStreak ?? 0;
  if(goalLine) goalLine.textContent=`Goal: ${goal} ml • Progress: ${pct}% • 🔥 Streak: ${streak} • Best: ${best}`;

  if(!glassRow) return;
  glassRow.innerHTML="";
  const waterGoal=goal;
  const fullGlasses=Math.floor(consumed/waterGoal);
  const remainder=consumed%waterGoal;
  const totalGlasses=fullGlasses+(remainder>0?1:0);

  for(let i=0;i<totalGlasses;i++){
    const fillAmount=(i<fullGlasses)?100:(remainder/waterGoal)*100;
    const fillText=(i<fullGlasses)?`${waterGoal} ml`:`${remainder} ml`;
    const wrap=document.createElement("div"); wrap.className="glass-container";
    const g=document.createElement("div"); g.className="glass";
    const fill=document.createElement("div"); fill.className="fill"; fill.style.height=`${fillAmount}%`;
    const label=document.createElement("div"); label.className="glass-label"; label.textContent=fillText;
    g.append(fill,label); wrap.appendChild(g); glassRow.appendChild(wrap);
  }
}

async function loadUserDoc(){
  const u=requireUserOrRedirect();
  await window.firebaseReady;
  const doc=await db.collection("users").doc(u.id).get();
  userDoc = doc.exists ? { id:u.id, ...doc.data() } : { id:u.id, goalMl:waterGoalDefault, streak:0, bestStreak:0 };
}

async function loadToday(){
  const u=requireUserOrRedirect();
  await window.firebaseReady;

  await loadUserDoc();

  // New day reset if yesterday missed goal
  const goal=userDoc.goalMl ?? waterGoalDefault;
  const yMl=await getDayMl(u.id, getYesterdayKey());
  if(yMl < goal && userDoc.streak > 0){
    await db.collection("users").doc(u.id).update({ streak:0 });
    userDoc.streak = 0;
  }

  const tDoc=await getIntakeDoc(u.id, getTodayKey());
  consumed = tDoc.exists ? Number(tDoc.data().ml || 0) : 0;

  render();
}

async function saveTodayAndUpdateStreak(){
  const u=requireUserOrRedirect();
  await window.firebaseReady;

  const key=getTodayKey();
  const docRef=db.collection("intakes").doc(intakeDocId(u.id, key));

  // Read previous state first
  const prev=await docRef.get();
  const prevMl = prev.exists ? Number(prev.data().ml || 0) : 0;
  const prevMetFlag = prev.exists ? Boolean(prev.data().metGoal) : false;

  // Save new ml
  await docRef.set({
    userId:u.id,
    dateKey:key,
    ml:Number(consumed),
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });

  const goal=userDoc.goalMl ?? waterGoalDefault;
  const todayMet = consumed >= goal;
  const crossedThreshold = (prevMl < goal) && todayMet;

  if (todayMet) {
    if (crossedThreshold) {
      // First time hitting goal today → increment streak once
      const yMl = await getDayMl(u.id, getYesterdayKey());
      const yMet = yMl >= goal;
      const nextStreak = yMet ? (userDoc.streak ?? 0) + 1 : 1;
      const nextBest = Math.max(userDoc.bestStreak ?? 0, nextStreak);
      await Promise.all([
        db.collection("users").doc(u.id).update({ streak: nextStreak, bestStreak: nextBest }),
        docRef.set({ metGoal: true }, { merge: true })
      ]);
      userDoc.streak = nextStreak;
      userDoc.bestStreak = nextBest;
    } else if (!prevMetFlag) {
      // Already >= goal earlier but flag missing (legacy) → just set flag
      await docRef.set({ metGoal: true }, { merge: true });
    }
  }
}

async function addWater(amount){
  consumed += amount;
  await saveTodayAndUpdateStreak();  // wait so UI shows new streak immediately
  render();
}

function addCustom(){
  const v=parseInt(document.getElementById("custom-amount").value,10);
  if(isNaN(v)||v<=0) return alert("Please enter a valid amount in ml");
  document.getElementById("custom-amount").value="";
  addWater(v);
}

async function resetToday(){
  if(!confirm("Reset today's water intake?")) return;
  consumed=0;
  render();
  const u=requireUserOrRedirect();
  await window.firebaseReady;
  const key=getTodayKey();
  await db.collection("intakes").doc(intakeDocId(u.id, key)).set({
    userId:u.id, dateKey:key, ml:0, metGoal:false, updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}

async function deleteAll(){
  const u=requireUserOrRedirect();
  if(!confirm("Delete ALL water data for this user?")) return;
  await window.firebaseReady;

  // delete all intake docs
  const snap=await db.collection("intakes").where("userId","==",u.id).get();
  const batch=db.batch(); snap.forEach(d=>batch.delete(d.ref)); await batch.commit();

  // reset streaks
  await db.collection("users").doc(u.id).update({ streak:0, bestStreak:0 });
  consumed=0; if(userDoc){ userDoc.streak=0; userDoc.bestStreak=0; }
  render();
}

window.addEventListener("DOMContentLoaded", loadToday);