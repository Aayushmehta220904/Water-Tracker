// users.js — per-user optional password (salt + SHA-256), gate select/rename/goal/delete

function $(...ids) { for (const id of ids) { const el = document.getElementById(id); if (el) return el; } return null; }
function el(tag, cls, text) { const e=document.createElement(tag); if(cls) e.className=cls; if(text) e.textContent=text; return e; }
function getSelectedUser(){ try{ return JSON.parse(localStorage.getItem("selectedUser")); }catch{ return null; } }
function setSelectedUser(u){ localStorage.setItem("selectedUser", JSON.stringify(u)); }

async function hashPassword(password, salt){
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}|${password}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  // buffer -> hex
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join("");
}
function makeSalt(len=16){
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return [...arr].map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function addUser(name, age, goalMl, passOpt) {
  await window.firebaseReady;

  let passwordHash = null, passwordSalt = null;
  if (passOpt && passOpt.length > 0) {
    passwordSalt = makeSalt();
    passwordHash = await hashPassword(passOpt, passwordSalt);
  }

  const payload = {
    name: name.trim(),
    age: Number(age),
    active: true,
    goalMl: Number(goalMl),
    streak: 0,
    bestStreak: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    // NEW:
    passwordHash: passwordHash || null,
    passwordSalt: passwordSalt || null
  };
  const docRef = await db.collection("users").add(payload);
  return { id: docRef.id, name: payload.name, age: payload.age, goalMl: payload.goalMl };
}
async function updateGoal(userId, goalMl){ await window.firebaseReady; await db.collection("users").doc(userId).update({ goalMl: Number(goalMl) }); }
async function renameUser(userId, name, age, goalMl){
  await window.firebaseReady;
  await db.collection("users").doc(userId).update({ name: name.trim(), age: Number(age), goalMl: Number(goalMl) });
}
async function deleteUser(userId, mode="soft"){
  await window.firebaseReady;
  const userRef = db.collection("users").doc(userId);
  if (mode==="hard"){
    const batch=db.batch(); batch.delete(userRef);
    const intakesSnap=await db.collection("intakes").where("userId","==",userId).get();
    intakesSnap.forEach(d=>batch.delete(d.ref)); await batch.commit();
  } else { await userRef.update({ active:false }); }
}
async function fetchUsers(){
  await window.firebaseReady;
  const snap = await db.collection("users").where("active","==",true).get();
  const items = snap.docs.map(d=>({ id:d.id, ...d.data() }));
  items.sort((a,b)=>(b.createdAt?.toMillis?.()??0)-(a.createdAt?.toMillis?.()??0));
  return items;
}

function hasPassword(u){ return Boolean(u.passwordHash && u.passwordSalt); }

async function promptPasswordAndVerify(u, title="Enter password"){
  const { value: pwd } = await Swal.fire({ title, input:"password", inputLabel:`for ${u.name}`, inputAttributes:{ autocapitalize:"off" }, showCancelButton:true });
  if (pwd === undefined) return false; // cancelled
  const h = await hashPassword(pwd, u.passwordSalt);
  const ok = (h === u.passwordHash);
  if (!ok) await Swal.fire({ icon:"error", title:"Incorrect password" });
  return ok;
}

function userCard(u){
  const card = el("div","user-card");
  const name = el("div","user-name",u.name);
  const info = el("div","user-age",`Age: ${u.age} • Goal: ${u.goalMl} ml ${hasPassword(u) ? "• 🔒" : ""}`);
  const actions = el("div","user-actions");

  const selectBtn = el("button","btn select","Select");
  selectBtn.onclick = async () => {
    if (hasPassword(u)) {
      const ok = await promptPasswordAndVerify(u, "Unlock user");
      if (!ok) return;
    }
    setSelectedUser({ id:u.id, name:u.name, age:u.age });
    window.location.href="index.html";
  };

  const goalBtn = el("button","btn home-link","Change Goal");
  goalBtn.onclick = async () => {
    if (hasPassword(u)) {
      const ok = await promptPasswordAndVerify(u, "Confirm password");
      if (!ok) return;
    }
    const { value: goal } = await Swal.fire({
      title:"Change Daily Goal", input:"number", inputLabel:"Goal (ml)",
      inputValue:u.goalMl, inputAttributes:{min:500,max:10000,step:50}, showCancelButton:true
    });
    const g = Number(goal);
    if (g && g>=500 && g<=10000){ await updateGoal(u.id,g); loadUsers(); }
  };

  const renameBtn = el("button","btn rename","Rename");
  renameBtn.onclick = async () => {
    if (hasPassword(u)) {
      const ok = await promptPasswordAndVerify(u, "Confirm password");
      if (!ok) return;
    }
    const { value: formValues } = await Swal.fire({
      title:"Edit user",
      html:
        `<input id="swal-name" class="swal2-input" placeholder="Name" value="${u.name}">`+
        `<input id="swal-age" class="swal2-input" placeholder="Age" type="number" min="5" max="120" value="${u.age}">`+
        `<input id="swal-goal" class="swal2-input" placeholder="Daily goal (ml)" type="number" min="500" max="10000" value="${u.goalMl}">`,
      focusConfirm:false,
      preConfirm:() => {
        const name=document.getElementById('swal-name').value.trim();
        const age=Number(document.getElementById('swal-age').value);
        const goal=Number(document.getElementById('swal-goal').value);
        if(!name || !(age>=5 && age<=120) || !(goal>=500 && goal<=10000)){
          Swal.showValidationMessage('Enter valid Name, Age (5–120), Goal (500–10000 ml).'); return;
        }
        return { name, age, goal };
      },
      showCancelButton:true
    });
    if(formValues){
      await renameUser(u.id, formValues.name, formValues.age, formValues.goal);
      if(getSelectedUser()?.id===u.id){ setSelectedUser({ id:u.id, name:formValues.name, age:formValues.age }); }
      loadUsers();
    }
  };

  const pwBtn = el("button","btn stats-link", hasPassword(u) ? "Change Password" : "Set Password");
  pwBtn.onclick = async () => {
    if (hasPassword(u)) {
      const ok = await promptPasswordAndVerify(u, "Current password");
      if (!ok) return;
    }
    const { value: formValues } = await Swal.fire({
      title: hasPassword(u) ? "Change Password" : "Set Password",
      html:
        `<input id="swal-pass1" class="swal2-input" type="password" placeholder="New password">`+
        `<input id="swal-pass2" class="swal2-input" type="password" placeholder="Confirm password">`,
      focusConfirm:false,
      preConfirm: () => {
        const p1 = document.getElementById('swal-pass1').value;
        const p2 = document.getElementById('swal-pass2').value;
        if(!p1 || p1.length < 4){ Swal.showValidationMessage('Use at least 4 characters.'); return; }
        if(p1 !== p2){ Swal.showValidationMessage('Passwords do not match.'); return; }
        return { p1 };
      },
      showCancelButton:true
    });
    if (formValues) {
      const salt = makeSalt();
      const hash = await hashPassword(formValues.p1, salt);
      await db.collection("users").doc(u.id).update({ passwordHash: hash, passwordSalt: salt });
      loadUsers();
    }
  };

  const delBtn = el("button","btn delete","Delete");
  delBtn.onclick = async () => {
    if (hasPassword(u)) {
      const ok = await promptPasswordAndVerify(u, "Confirm password");
      if (!ok) return;
    }
    const res = await Swal.fire({
      title:"Delete user?",
      text:"Soft delete keeps their data; Hard delete removes user and all water data.",
      icon:"warning", showCancelButton:true, confirmButtonText:"Soft delete",
      cancelButtonText:"Cancel", showDenyButton:true, denyButtonText:"Hard delete"
    });
    if(res.isDenied) await deleteUser(u.id,"hard");
    else if(res.isConfirmed) await deleteUser(u.id,"soft");
    else return;

    if(getSelectedUser()?.id===u.id) localStorage.removeItem("selectedUser");
    loadUsers();
  };

  actions.append(selectBtn, goalBtn, renameBtn, pwBtn, delBtn);
  card.append(name, info, actions);
  return card;
}

async function loadUsers(){
  const list = document.getElementById("usersList");
  if(!list) return;
  list.textContent="Loading...";
  try{
    const users=await fetchUsers();
    list.innerHTML="";
    if(!users.length){ list.append(el("div","empty","No users yet. Create your first user above.")); return; }
    users.forEach(u=>list.appendChild(userCard(u)));
  }catch(e){ list.textContent="Failed to load users. Check console."; console.error(e); }
}

const addBtn = document.getElementById("addUserBtn");
if(addBtn){
  addBtn.onclick = async () => {
    const name=(document.getElementById("newName")?.value||"").trim();
    const age=Number(document.getElementById("newAge")?.value||"");
    const goal=Number(document.getElementById("newGoal")?.value||"");
    const pass=(document.getElementById("newPass")?.value||"");
    const pass2=(document.getElementById("newPass2")?.value||"");

    if(!name || !(age>=5 && age<=120) || !(goal>=500 && goal<=10000)){
      Swal.fire("Please enter a valid name, age (5–120), and goal (500–10000 ml)."); return;
    }
    if (pass || pass2) {
      if (pass.length < 4) { Swal.fire("Password must be at least 4 characters."); return; }
      if (pass !== pass2) { Swal.fire("Passwords do not match."); return; }
    }

    try{
      const u=await addUser(name,age,goal,pass || null);
      // clear
      ["newName","newAge","newGoal","newPass","newPass2"].forEach(id => { const n=$(id); if(n) n.value=""; });
      setSelectedUser(u);
      loadUsers();
    }catch(e){ console.error(e); Swal.fire("Failed to add user. Check console."); }
  };
}

window.addEventListener("DOMContentLoaded", loadUsers);