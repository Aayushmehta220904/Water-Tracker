// users.js — User management with DOB (required) + optional Password + SweetAlert2 + password check for all actions

function $(id){ return document.getElementById(id); }

function calcAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function getSelectedUser(){ try{ return JSON.parse(localStorage.getItem("selectedUser")); }catch{return null;} }
function setSelectedUser(u){ localStorage.setItem("selectedUser", JSON.stringify(u)); }

async function addUser(name, dob, goalMl, password) {
  await window.firebaseReady;
  const payload = {
    name: name.trim(),
    dob: dob,
    goalMl: Number(goalMl),
    password: password || null,
    streak: 0,
    bestStreak: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  const docRef = await db.collection("users").add(payload);
  return { id: docRef.id, ...payload };
}

async function updateGoal(userId, goalMl){ await db.collection("users").doc(userId).update({ goalMl:Number(goalMl) }); }
async function updateDob(userId, dob){ await db.collection("users").doc(userId).update({ dob }); }
async function renameUser(userId, name){ await db.collection("users").doc(userId).update({ name:name.trim() }); }
async function updatePassword(userId, password){ await db.collection("users").doc(userId).update({ password: password || null }); }

async function deleteUser(userId){
  await window.firebaseReady;
  const batch=db.batch();
  const userRef=db.collection("users").doc(userId);
  batch.delete(userRef);
  const ints=await db.collection("intakes").where("userId","==",userId).get();
  ints.forEach(d=>batch.delete(d.ref));
  await batch.commit();
}

async function fetchUsers(){
  await window.firebaseReady;
  const snap=await db.collection("users").get();
  return snap.docs.map(d=>({ id:d.id, ...d.data() }));
}

// 🔐 Password check helper
async function verifyPassword(u) {
  if (!u.password) return true; // no password set
  const { value: pw } = await Swal.fire({
    title: "Enter Password",
    input: "password",
    inputPlaceholder: "Password",
    showCancelButton: true,
    confirmButtonText: "OK"
  });
  if (pw === u.password) return true;
  if (pw) Swal.fire("Error","Incorrect password!","error");
  return false;
}

function userCard(u){
  const card=document.createElement("div"); card.className="user-card";
  const age=calcAge(u.dob);
  const lock = u.password ? "🔒" : "🔓";
  card.innerHTML=`
    <div class="user-name">${u.name} ${lock}</div>
    <div class="user-age">DOB: ${u.dob} • Age: ${age ?? "—"} • Goal: ${u.goalMl} ml</div>
    <div class="user-actions">
      <button class="btn select">Select</button>
      <button class="btn home-link">Change Goal</button>
      <button class="btn rename">Rename</button>
      <button class="btn stats-link">Change DOB</button>
      <button class="btn stats-link">Set/Change Password</button>
      <button class="btn reset">Remove Password</button>
      <button class="btn delete">Delete</button>
    </div>
  `;

  // Select
  card.querySelector(".select").onclick=async()=>{
    if (!(await verifyPassword(u))) return;
    setSelectedUser(u);
    window.location.href="index.html";
  };

  // Change Goal
  card.querySelectorAll(".home-link")[0].onclick=async()=>{
    if (!(await verifyPassword(u))) return;
    const { value: goal } = await Swal.fire({
      title: "Change Goal",
      input: "number",
      inputValue: u.goalMl,
      inputAttributes:{ min:500,max:10000,step:100 },
      showCancelButton:true,
      confirmButtonText:"Save"
    });
    if(goal){ await updateGoal(u.id,goal); loadUsers(); }
  };

  // Rename
  card.querySelector(".rename").onclick=async()=>{
    if (!(await verifyPassword(u))) return;
    const { value: name } = await Swal.fire({
      title:"Rename User",
      input:"text",
      inputValue:u.name,
      showCancelButton:true,
      confirmButtonText:"Save"
    });
    if(name){ await renameUser(u.id,name); loadUsers(); }
  };

  // Change DOB
  card.querySelectorAll(".stats-link")[0].onclick=async()=>{
    if (!(await verifyPassword(u))) return;
    const { value: dob } = await Swal.fire({
      title:"Change Date of Birth",
      input:"date",
      inputValue:u.dob,
      showCancelButton:true,
      confirmButtonText:"Save"
    });
    if(dob){ await updateDob(u.id,dob); loadUsers(); }
  };

  // Set/Change Password
  card.querySelectorAll(".stats-link")[1].onclick=async()=>{
    if (!(await verifyPassword(u))) return;
    const { value: pw } = await Swal.fire({
      title:u.password ? "Change Password":"Set Password",
      input:"password",
      inputPlaceholder:"Enter new password",
      showCancelButton:true,
      confirmButtonText:"Save"
    });
    if(pw){ await updatePassword(u.id,pw); loadUsers(); }
  };

  // Remove Password
  card.querySelector(".reset").onclick=async()=>{
    if (!(await verifyPassword(u))) return;
    const res=await Swal.fire({
      title:"Remove Password?",
      text:"User will no longer need a password.",
      icon:"warning",
      showCancelButton:true,
      confirmButtonText:"Yes, remove"
    });
    if(res.isConfirmed){ await updatePassword(u.id,null); loadUsers(); }
  };

  // Delete
  card.querySelector(".delete").onclick=async()=>{
    if (!(await verifyPassword(u))) return;
    const res=await Swal.fire({
      title:"Delete this user?",
      text:"All their data will also be deleted!",
      icon:"warning",
      showCancelButton:true,
      confirmButtonText:"Yes, delete"
    });
    if(res.isConfirmed){ await deleteUser(u.id); loadUsers(); }
  };

  return card;
}

async function loadUsers(){
  const list=$("usersList");
  list.textContent="Loading...";
  const users=await fetchUsers();
  list.innerHTML="";
  if(!users.length){ list.textContent="No users yet. Add one above."; return; }
  users.forEach(u=>list.appendChild(userCard(u)));
}

$("addUserBtn").onclick=async()=>{
  const name=$("newName").value.trim();
  const dob=$("newDob").value;
  const goal=$("newGoal").value;
  const password=$("newPassword").value;
  if(!name||!dob||!goal){
    Swal.fire("Missing Info","Please fill Name, DOB and Goal.","error");
    return;
  }
  const u=await addUser(name,dob,goal,password);
  setSelectedUser(u);
  $("newName").value=""; $("newDob").value=""; $("newGoal").value=""; $("newPassword").value="";
  loadUsers();
};

window.addEventListener("DOMContentLoaded",loadUsers);