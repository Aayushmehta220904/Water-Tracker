// stats.js

function getSelectedUser() {
  try { return JSON.parse(localStorage.getItem("selectedUser")); } catch { return null; }
}
function requireUserOrRedirect() {
  const u = getSelectedUser();
  if (!u) window.location.href = "users.html";
  return u;
}

function pad2(n){return String(n).padStart(2,"0");}
function formatKey(d){return `${pad2(d.getDate())}-${pad2(d.getMonth()+1)}-${d.getFullYear()}`;}
function startOfDay(d){const x=new Date(d); x.setHours(0,0,0,0); return x;}
function getMonday(date){const d=startOfDay(date); const day=d.getDay(); const diff=(day===0?-6:1-day); const m=new Date(d); m.setDate(d.getDate()+diff); return m;}
function getSunday(monday){const s=new Date(monday); s.setDate(monday.getDate()+6); return s;}
function daysRange(s,e){const A=[]; const c=startOfDay(s), last=startOfDay(e); while(c<=last){A.push(new Date(c)); c.setDate(c.getDate()+1);} return A;}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}

async function fetchRange(userId, fromDate, toDate) {
  await window.firebaseReady;
  const dates = daysRange(fromDate, toDate);
  const keys = dates.map(formatKey);
  const ids = keys.map(k => `${userId}_${k}`);

  const promises = ids.map(id => db.collection("intakes").doc(id).get());
  const snaps = await Promise.all(promises);
  const values = snaps.map(s => s.exists ? Number(s.data().ml || 0) : 0);
  return { dates, keys, values };
}

function sum(a){return a.reduce((x,y)=>x+y,0);}
function avg(total, n){return n>0 ? total/n : 0;}

function renderNumbers(weekly, monthly){
  document.getElementById("weekly-avg").textContent = Math.round(weekly.avg);
  document.getElementById("weekly-range").textContent = `${formatKey(weekly.monday)} → ${formatKey(weekly.today)}`;
  document.getElementById("monthly-avg").textContent = Math.round(monthly.avg);
  document.getElementById("monthly-range").textContent = `${formatKey(monthly.first)} → ${formatKey(monthly.today)}`;
}

function renderComboChart(canvasId, labels, values){
  const ctx = document.getElementById(canvasId).getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "ml (bars)", data: values },
        { type: "line", label: "ml (line)", data: values, tension: 0.25 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

(async function init(){
  const u = requireUserOrRedirect();
  await window.firebaseReady;

  const today = startOfDay(new Date());

  // Weekly
  const monday = getMonday(today), sunday = getSunday(monday);
  const weekAll = await fetchRange(u.id, monday, sunday);
  const weekElapsed = await fetchRange(u.id, monday, today);
  const weeklyAvg = avg(sum(weekElapsed.values), weekElapsed.values.length);

  // Monthly
  const y=today.getFullYear(), m=today.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m, daysInMonth(y, m));
  const monthAll = await fetchRange(u.id, first, last);
  const monthElapsed = await fetchRange(u.id, first, today);
  const monthlyAvg = avg(sum(monthElapsed.values), monthElapsed.values.length);

  renderNumbers({ avg: weeklyAvg, monday, today }, { avg: monthlyAvg, first, today });
  renderComboChart("weekly-chart", ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], weekAll.values);
  renderComboChart("monthly-chart", monthAll.dates.map(d => String(d.getDate())), monthAll.values);
})();