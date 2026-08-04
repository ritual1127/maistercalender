// ===== 저장소 =====
const store = {
  get(k, d){ try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)) }
};
let goals = store.get('goals', []);
let customEvents = store.get('customEvents', []);
let schoolEvents = store.get('schoolEvents', []);
let mySchool = store.get('mySchool', null);
let settings = store.get('settings', { notif:false, days:[7,3,1], time:'08:00' });
const NEIS_PROXY = 'https://meister-calendar-neis-proxy.smilepea.workers.dev';
let filter = 'all';
let cur = new Date(); cur.setDate(1);

function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function ddayOf(dateStr){
  const t = new Date(todayStr()), d = new Date(dateStr);
  return Math.round((d - t) / 86400000);
}
function ddayLabel(n){ return n===0 ? 'D-DAY' : n>0 ? 'D-'+n : 'D+'+(-n); }

// 모든 일정 합치기
function allEvents(){
  const evs = [...EXAMS];
  schoolEvents.forEach(e => evs.push({cat:'school', date:e.date, title:e.title}));
  goals.filter(g=>g.date).forEach(g => evs.push({cat:'goal', date:g.date, title:'🎯 '+g.title}));
  customEvents.forEach(e => evs.push({cat:e.cat, date:e.date, title:e.title, id:e.id, custom:true}));
  return evs.sort((a,b)=>a.date.localeCompare(b.date));
}

// ===== 탭 =====
document.querySelectorAll('nav button').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('nav button').forEach(x=>x.classList.remove('on'));
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    b.classList.add('on');
    document.getElementById(b.dataset.pg).classList.add('active');
  };
});

// ===== 캘린더 =====
const ALL_CATS = ['comp','gisa','hist','kor','toeic','opic','school','goal','custom'];
function moveMonth(d){ cur.setMonth(cur.getMonth()+d); renderCal(); }
function renderCal(){
  const y=cur.getFullYear(), m=cur.getMonth();
  document.getElementById('calTitle').textContent = y+'년 '+(m+1)+'월';
  const grid = document.getElementById('calGrid');
  grid.innerHTML = ['일','월','화','수','목','금','토'].map(w=>`<div class="wd">${w}</div>`).join('');
  const first = new Date(y,m,1).getDay(), last = new Date(y,m+1,0).getDate();
  const prevLast = new Date(y,m,0).getDate();
  const evs = allEvents().filter(e => filter==='all' || e.cat===filter);
  const today = todayStr();
  let cells = '';
  for(let i=first-1;i>=0;i--) cells += `<div class="day other">${prevLast-i}</div>`;
  for(let d=1;d<=last;d++){
    const ds = y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const dow = new Date(y,m,d).getDay();
    const dayEvs = evs.filter(e=>e.date===ds);
    let dots = dayEvs.slice(0,4).map(e=>`<i class="dot" style="background:${CAT_COLOR[e.cat]}"></i>`).join('');
    if(dayEvs.length>4) dots += `<i class="dot more">+${dayEvs.length-4}</i>`;
    const dowClass = dow===0?'sun':dow===6?'sat':'';
    cells += `<div class="day ${ds===today?'today':''} ${dowClass}" onclick="openDay('${ds}')"><span class="num">${d}</span><div class="dots">${dots}</div></div>`;
  }
  grid.innerHTML += cells;
  renderUpcoming();
}
function openDay(ds){
  const evs = allEvents().filter(e=>e.date===ds);
  if(!evs.length){ openAddEvent(ds); return; }
  document.getElementById('dayModalTitle').textContent = ds.replaceAll('-','.');
  document.getElementById('dayModalList').innerHTML = evs.map(e=>`
    <div class="ev"><div class="bar" style="background:${CAT_COLOR[e.cat]}"></div>
    <div class="t"><b>${e.title}</b><small>${CAT_NAME[e.cat]}${e.src ? ' · 출처: '+e.src.name : ''}</small></div>
    ${e.custom ? `<button class="del" onclick="delCustomEvent(${e.id}); openDay('${ds}')">✕</button>` : ''}</div>`).join('');
  document.getElementById('dayModal').classList.add('show');
}

// 필터 칩 & 범례
const CAT_EMOJI = {comp:'💻', gisa:'🔧', hist:'📜', kor:'🗣️', toeic:'🌎', opic:'🎤', school:'🏫', goal:'🎯', custom:'📌'};
function renderChips(){
  const cats = [['all','전체'], ...ALL_CATS.map(c=>[c,CAT_NAME[c]])];
  document.getElementById('filterChips').innerHTML = cats.map(([k,n])=>
    `<button class="${filter===k?'on':''}" onclick="setFilter('${k}')">${n}</button>`).join('');
  document.getElementById('calLegend').innerHTML = ALL_CATS.map(c=>
    `<span><i class="dot" style="background:${CAT_COLOR[c]}"></i>${CAT_NAME[c]}</span>`).join('');
}
function setFilter(k){ filter=k; renderChips(); renderCal(); }

// 스와이프로 월 이동
(function(){
  const wrap = document.getElementById('calWrap');
  let sx=0, sy=0, tracking=false;
  wrap.addEventListener('touchstart', e=>{
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
  }, {passive:true});
  wrap.addEventListener('touchend', e=>{
    if(!tracking) return; tracking = false;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)*1.5) moveMonth(dx < 0 ? 1 : -1);
  }, {passive:true});
})();

function renderUpcoming(){
  const evs = allEvents().filter(e => (filter==='all'||e.cat===filter) && ddayOf(e.date) >= 0).slice(0,15);
  document.getElementById('upcomingList').innerHTML = evs.length ? evs.map(e=>{
    const n = ddayOf(e.date);
    return `<div class="ev"><div class="bar" style="background:${CAT_COLOR[e.cat]}"></div>
      <div class="t"><b>${e.title}</b><small>${e.date.replaceAll('-','.')} · ${CAT_NAME[e.cat]}</small></div>
      <span class="dd">${ddayLabel(n)}</span></div>`;
  }).join('') : '<div class="empty">다가오는 일정이 없어요</div>';
  // 헤더 D-day
  const next = allEvents().find(e => ddayOf(e.date) >= 0 && e.cat !== 'comp');
  document.getElementById('nextDday').textContent = next ? `${CAT_NAME[next.cat]} ${ddayLabel(ddayOf(next.date))}` : '';
}

// ===== 목표 =====
function addGoal(){
  const title = document.getElementById('goalTitle').value.trim();
  if(!title) return alert('목표를 입력해줘!');
  goals.push({ id: Date.now(), title, date: document.getElementById('goalDate').value, cat: document.getElementById('goalCat').value, done:false });
  store.set('goals', goals);
  document.getElementById('goalTitle').value='';
  renderGoals(); renderCal(); scheduleAll();
}
function renderGoals(){
  const el = document.getElementById('goalList');
  el.innerHTML = goals.length ? goals.map(g=>`
    <div class="goal ${g.done?'done':''}">
      <input type="checkbox" ${g.done?'checked':''} onchange="toggleGoal(${g.id})">
      <div class="t"><b>${g.title}</b>
      <small>${g.date ? g.date.replaceAll('-','.')+' · '+ddayLabel(ddayOf(g.date)) : '기한 없음'} · ${CAT_NAME[g.cat]||'일반'}</small></div>
      <button class="del" onclick="delGoal(${g.id})">✕</button>
    </div>`).join('') : '<div class="empty">아직 목표가 없어요. 위에서 추가해봐!</div>';
}
function toggleGoal(id){ const g=goals.find(x=>x.id===id); g.done=!g.done; store.set('goals',goals); renderGoals(); }
function delGoal(id){ goals=goals.filter(x=>x.id!==id); store.set('goals',goals); renderGoals(); renderCal(); }

// ===== 내 일정 추가 (캘린더 FAB) =====
function openAddEvent(prefillDate){
  document.getElementById('ceTitle').value = '';
  document.getElementById('ceDate').value = prefillDate || todayStr();
  document.getElementById('ceCat').value = 'custom';
  document.getElementById('addEventModal').classList.add('show');
}
function closeAddEvent(){ document.getElementById('addEventModal').classList.remove('show'); }
function addCustomEvent(){
  const title = document.getElementById('ceTitle').value.trim();
  const date = document.getElementById('ceDate').value;
  if(!title || !date) return alert('제목과 날짜를 모두 입력해줘!');
  customEvents.push({ id: Date.now(), title, date, cat: document.getElementById('ceCat').value });
  store.set('customEvents', customEvents);
  closeAddEvent(); renderCal(); scheduleAll();
}
function delCustomEvent(id){
  customEvents = customEvents.filter(x=>x.id!==id);
  store.set('customEvents', customEvents);
  renderCal();
}

// ===== 학교 검색 (NEIS 오픈 API) =====
async function searchSchool(){
  const q = document.getElementById('schoolQ').value.trim();
  if(!q) return;
  const box = document.getElementById('schoolResults');
  box.innerHTML = '<div class="empty">검색 중...</div>';
  try{
    const r = await fetch(`${NEIS_PROXY}/schoolInfo?Type=json&pSize=10&SCHUL_NM=${encodeURIComponent(q)}`, {cache:'no-store'});
    const j = await r.json();
    const rows = j.schoolInfo?.[1]?.row || [];
    box.innerHTML = rows.length ? rows.map(s=>`
      <div class="sch-item" onclick='pickSchool(${JSON.stringify({name:s.SCHUL_NM, edu:s.ATPT_OFCDC_SC_CODE, code:s.SD_SCHUL_CODE, addr:s.ORG_RDNMA||""})})'>
        <b>${s.SCHUL_NM}</b><small>${s.ORG_RDNMA||''}</small>
      </div>`).join('') : '<div class="empty">검색 결과가 없어요</div>';
  }catch(e){
    box.innerHTML = '<div class="empty">검색 실패 — 인터넷 연결을 확인해줘</div>';
  }
}
async function pickSchool(s){
  mySchool = s; store.set('mySchool', s);
  document.getElementById('schoolResults').innerHTML='';
  await loadSchoolEvents();
}
async function loadSchoolEvents(){
  if(!mySchool) return;
  document.getElementById('mySchoolCard').style.display='block';
  document.getElementById('mySchoolName').textContent = mySchool.name;
  const box = document.getElementById('schoolEvents');
  box.innerHTML = '<div class="empty">학사일정 불러오는 중...</div>';
  try{
    // 인증키 없는 NEIS는 요청당 결과 제한이 있어 월별로 나눠서 요청
    const y = new Date().getFullYear();
    const months = [];
    for(let m=1;m<=12;m++){
      const mm = String(m).padStart(2,'0');
      const lastDay = new Date(y, m, 0).getDate();
      months.push(fetch(`${NEIS_PROXY}/SchoolSchedule?Type=json&pSize=100&ATPT_OFCDC_SC_CODE=${mySchool.edu}&SD_SCHUL_CODE=${mySchool.code}&AA_FROM_YMD=${y}${mm}01&AA_TO_YMD=${y}${mm}${lastDay}`, {cache:'no-store'})
        .then(r=>r.json()).then(j=>j.SchoolSchedule?.[1]?.row || []).catch(()=>[]));
    }
    const rows = (await Promise.all(months)).flat();
    schoolEvents = rows.filter(e=>e.EVENT_NM && e.EVENT_NM!=='토요휴업일').map(e=>({
      date: e.AA_YMD.slice(0,4)+'-'+e.AA_YMD.slice(4,6)+'-'+e.AA_YMD.slice(6,8),
      title: '🏫 '+e.EVENT_NM
    }));
    store.set('schoolEvents', schoolEvents);
    box.innerHTML = schoolEvents.length ? schoolEvents.filter(e=>ddayOf(e.date)>=-1).slice(0,20).map(e=>`
      <div class="ev"><div class="bar" style="background:var(--c-school)"></div>
      <div class="t"><b>${e.title}</b><small>${e.date.replaceAll('-','.')}</small></div>
      <span class="dd">${ddayLabel(ddayOf(e.date))}</span></div>`).join('')
      : '<div class="empty">등록된 학사일정이 없어요 (NEIS에 학교가 일정을 등록해야 표시돼요)</div>';
    renderCal();
  }catch(e){
    box.innerHTML = '<div class="empty">학사일정을 불러오지 못했어요</div>';
  }
}
function clearSchool(){
  mySchool=null; schoolEvents=[];
  store.set('mySchool',null); store.set('schoolEvents',[]);
  document.getElementById('mySchoolCard').style.display='none';
  renderCal();
}

// ===== 알림 =====
function renderDayChips(){
  const opts = [1,2,3,5,7,14,30];
  document.getElementById('dayChips').innerHTML = opts.map(d=>
    `<button class="${settings.days.includes(d)?'on':''}" onclick="toggleDay(${d})">${d}일 전</button>`).join('');
}
function toggleDay(d){
  settings.days = settings.days.includes(d) ? settings.days.filter(x=>x!==d) : [...settings.days,d].sort((a,b)=>a-b);
  saveSettings(); renderDayChips(); scheduleAll();
}
function saveSettings(){
  settings.time = document.getElementById('notifTime').value;
  settings.notif = document.getElementById('notifOn').checked;
  store.set('settings', settings);
}
async function toggleNotif(){
  const on = document.getElementById('notifOn').checked;
  if(on){
    if(!('Notification' in window)){ alert('이 브라우저는 알림을 지원하지 않아요'); document.getElementById('notifOn').checked=false; return; }
    const perm = await Notification.requestPermission();
    if(perm !== 'granted'){
      alert('알림 권한이 거부됐어요. 브라우저/앱 설정에서 알림을 허용해줘!');
      document.getElementById('notifOn').checked=false; return;
    }
    new Notification('🔔 알림 설정 완료!', { body:'이제 시험 D-day 알림을 받을 수 있어요', icon:'icon-192.png' });
  }
  saveSettings(); scheduleAll();
}

// 오늘 보낼 알림 확인 (앱 열릴 때 + 주기 체크)
function checkNotifications(){
  if(!settings.notif || Notification.permission!=='granted') return;
  const sent = store.get('sentNotifs', {});
  const now = new Date();
  const [hh,mm] = (settings.time||'08:00').split(':').map(Number);
  if(now.getHours()*60+now.getMinutes() < hh*60+mm) return; // 설정 시간 전이면 대기
  allEvents().forEach(e=>{
    const n = ddayOf(e.date);
    if(!settings.days.includes(n) && n!==0) return;
    const key = e.date+'|'+e.title+'|'+n;
    if(sent[key]) return;
    const body = n===0 ? '오늘이에요! 화이팅! 💪' : `${n}일 전입니다!`;
    if(navigator.serviceWorker?.controller){
      navigator.serviceWorker.ready.then(reg=>reg.showNotification('⏰ '+e.title, {
        body, icon:'icon-192.png', badge:'icon-192.png', tag:key, vibrate:[200,100,200]
      }));
    } else {
      new Notification('⏰ '+e.title, { body, icon:'icon-192.png', tag:key });
    }
    sent[key]=true;
  });
  store.set('sentNotifs', sent);
}
function scheduleAll(){ checkNotifications(); }
setInterval(checkNotifications, 60000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) checkNotifications(); });

// ===== 기업 검색기 =====
function getChosung(str){
  const cho=["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  let r=""; for(let i=0;i<str.length;i++){ const c=str.charCodeAt(i)-44032;
    r += (c>-1&&c<11172) ? cho[Math.floor(c/588)] : str.charAt(i); } return r;
}
let jwCat='전체';
const JW_CATS=['전체','삼성','공기업','방산','군무원/부사관','공무원'];
function renderJwFilters(){
  document.getElementById('jwFilters').innerHTML = JW_CATS.map(c=>
    `<button class="${jwCat===c?'on':''}" onclick="jwFilter('${c}')">${c==='군무원/부사관'?'군무원/군경':c}</button>`).join('');
}
function jwFilter(c){ jwCat=c; renderJwFilters(); jwApply(); }
function jwApply(){
  const kw = document.getElementById('jwInput').value.toLowerCase().replace(/\s+/g,'');
  const kwCho = getChosung(kw);
  const list = JOBS.filter(it=>{
    if(jwCat!=='전체'){
      if(jwCat==='삼성' && !it.group.includes('삼성')) return false;
      if(jwCat==='공기업' && !it.group.includes('공기업')) return false;
      if(jwCat==='방산' && !it.group.includes('방산')) return false;
      if(jwCat==='군무원/부사관' && !(it.group.includes('군무원')||it.group.includes('부사관'))) return false;
      if(jwCat==='공무원' && !it.group.includes('공무원')) return false;
    }
    if(!kw) return true;
    const n=it.name.toLowerCase().replace(/\s+/g,''), g=it.group.toLowerCase().replace(/\s+/g,''), d=it.desc.toLowerCase().replace(/\s+/g,'');
    return n.includes(kw)||getChosung(n).includes(kwCho)||g.includes(kw)||getChosung(g).includes(kwCho)||d.includes(kw);
  });
  document.getElementById('jwStats').textContent = list.length ? `조건에 맞는 기업 ${list.length}개` : '';
  document.getElementById('jwList').innerHTML = list.length ? list.map(it=>`
    <div class="jw-item">
      <div class="jw-top"><span class="jw-no">${it.id}</span><span class="jw-cat">${it.group}</span><span class="jw-name">${it.name}</span></div>
      <div class="jw-desc">${it.desc}</div>
    </div>`).join('') : '<div class="empty">검색 결과가 없어요. 다시 검색해봐!</div>';
}
document.getElementById('jwInput').addEventListener('input', jwApply);

// ===== PWA 설치 =====
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault(); deferredPrompt=e;
  document.getElementById('installBtn').style.display='block';
});
async function installApp(){
  if(!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice;
  deferredPrompt=null; document.getElementById('installBtn').style.display='none';
}
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

// ===== 출처 목록 =====
function renderSources(){
  const cats = ['gisa','comp','hist','kor','toeic','opic'];
  document.getElementById('sourceList').innerHTML = cats.map(c=>`
    <div class="set-row"><div><b>${CAT_NAME[c]}</b><small>${SOURCES[c].name}</small></div>
    <a class="btn ghost" style="width:auto;padding:6px 12px;font-size:.72rem;text-decoration:none;text-align:center" href="${SOURCES[c].url}" target="_blank" rel="noopener">바로가기</a></div>`).join('');
}

// ===== 더블탭 확대 방지 (일부 구형 iOS Safari 보정) =====
let lastTouchEnd = 0;
document.addEventListener('touchend', e=>{
  const now = Date.now();
  if(now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, {passive:false});

// ===== 초기화 =====
document.getElementById('notifOn').checked = settings.notif && Notification?.permission==='granted';
document.getElementById('notifTime').value = settings.time || '08:00';
renderChips(); renderCal(); renderGoals(); renderDayChips(); renderJwFilters(); jwApply(); renderSources();
if(mySchool) loadSchoolEvents();
checkNotifications();
