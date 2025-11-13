const CBT = (() => {
  const QKEY = 'cbt_questions_v2';
  const PASSKEY = 'cbt_admin_pass_v2';
  const ATTEMPTS = 'cbt_attempts_v2';

  function load() {
    try { return JSON.parse(localStorage.getItem(QKEY)) || []; }
    catch { return []; }
  }
  function save(list){ localStorage.setItem(QKEY, JSON.stringify(list)); }
  function getAll(){ return load(); }
  function add(q){ const list = load(); q.id = Date.now(); list.push(q); save(list); }
  function update(id, q){ const list = load(); const i = list.findIndex(x=>x.id===id); if(i!==-1){ list[i]={id,...q}; save(list);} }
  function remove(id){ let list = load(); list = list.filter(x=>x.id!==id); save(list); }
  function getPass(){ return localStorage.getItem(PASSKEY) || 'MGASAL13579@'; }
  function setPass(p){ localStorage.setItem(PASSKEY,p); }
  function exportJSON(){ return JSON.stringify(load(),null,2); }
  function importJSON(txt){ try{ const d=JSON.parse(txt); if(Array.isArray(d)){ save(d); return true; } }catch{} return false; }

  function addAttempt(obj){
    const list = JSON.parse(localStorage.getItem(ATTEMPTS) || '[]');
    list.push(obj);
    localStorage.setItem(ATTEMPTS, JSON.stringify(list));
  }
  function getAttempts(){ return JSON.parse(localStorage.getItem(ATTEMPTS) || '[]'); }

  return { getAll, add, update, remove, getPass, setPass, exportJSON, importJSON, addAttempt, getAttempts };
})();

// Helper
const $ = id => document.getElementById(id);

// ---------------- Admin ----------------
document.addEventListener('DOMContentLoaded', ()=>{
  const page = location.pathname.split('/').pop();

  if(page==='admin.html'){
    const loginSection = $('login-section');
    const panel = $('admin-panel');
    $('login-btn').onclick = ()=>{
      if($('admin-pass').value === CBT.getPass()){
        loginSection.classList.add('hidden');
        panel.classList.remove('hidden');
        renderList(); renderAttempts();
      } else $('login-msg').textContent='Wrong password!';
    };
    $('logout').onclick = ()=>{ panel.classList.add('hidden'); loginSection.classList.remove('hidden'); };

    const renderList = ()=>{
      const list = CBT.getAll();
      $('questions-list').innerHTML = list.map(q=>`
        <div class='card'>
          <b>${q.question}</b><br>
          A: ${q.options.A} | B: ${q.options.B} | C: ${q.options.C} | D: ${q.options.D}
        </div>`).join('') || '<em>No questions yet.</em>';
    };
    $('export-json').onclick = ()=>{
      const blob = new Blob([CBT.exportJSON()],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='questions.json'; a.click();
    };
    $('import-file').onchange = e=>{
      const f = e.target.files[0]; if(!f)return;
      const r = new FileReader(); r.onload=()=>{ CBT.importJSON(r.result); renderList(); alert('Imported'); }; r.readAsText(f);
    };
    $('save-pass').onclick = ()=>{ CBT.setPass($('new-pass').value); alert('Password changed!'); };

    $('export-attempts').onclick = ()=>{
      const attempts = CBT.getAttempts();
      let csv = 'Name,Score,Date\\n';
      attempts.forEach(a=> csv+=`${a.name},${a.score},${a.date}\\n`);
      const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a');
      a.href=URL.createObjectURL(blob); a.download='attempts.csv'; a.click();
    };
    const renderAttempts = ()=>{
      const arr = CBT.getAttempts();
      $('attempts-list').innerHTML = arr.map(a=>`<div class='card'><b>${a.name}</b> scored ${a.score}% on ${a.date}</div>`).join('') || '<em>No attempts yet.</em>';
    };
  }

  // ---------------- Exam ----------------
  if(page==='exam.html'){
    const setup=$('setup'), exam=$('exam'), result=$('result');
    const nameInput=$('student-name'), numQ=$('num-q'), timeInput=$('exam-time');
    const qArea=$('q-area'), progress=$('progress'), timerP=$('timer');
    const prev=$('prev-btn'), next=$('next-btn'), finish=$('finish-btn');
    const scoreP=$('score'), retake=$('retake');

    let pool=[],idx=0,answers={},timer,remaining=0;

    $('start-btn').onclick=()=>{
      const all=CBT.getAll(); if(all.length===0)return alert('No questions yet.');
      const count=Math.min(Number(numQ.value),all.length);
      pool=all.slice(0,count);
      remaining=Number(timeInput.value)*60;
      idx=0; answers={};
      setup.classList.add('hidden'); exam.classList.remove('hidden');
      renderQ(); updateProgress(); startTimer();
    };
    function startTimer(){
      timer=setInterval(()=>{
        remaining--;
        let m=Math.floor(remaining/60),s=remaining%60;
        timerP.textContent=`Time: ${m}:${s.toString().padStart(2,'0')}`;
        if(remaining<=0){ clearInterval(timer); finishExam(); }
      },1000);
    }
    function renderQ(){
      const q=pool[idx];
      qArea.innerHTML=`<h3>${idx+1}. ${q.question}</h3>`+
        ['A','B','C','D'].map(opt=>`<label><input type='radio' name='opt' value='${opt}' ${answers[idx]===opt?'checked':''}> ${opt}: ${q.options[opt]}</label>`).join('');
      qArea.querySelectorAll('input').forEach(i=>i.onchange=e=>answers[idx]=e.target.value);
    }
    function updateProgress(){
      progress.textContent=`Question ${idx+1} of ${pool.length}`;
    }
    prev.onclick=()=>{ if(idx>0){idx--; renderQ(); updateProgress();}};
    next.onclick=()=>{ if(idx<pool.length-1){idx++; renderQ(); updateProgress();}};
    finish.onclick=finishExam;
    function finishExam(){
      clearInterval(timer);
      let correct=0;
      pool.forEach((q,i)=>{ if(answers[i]===q.answer) correct++; });
      const score=Math.round((correct/pool.length)*100);
      const name=nameInput.value||'Anonymous';
      CBT.addAttempt({name,score,date:new Date().toLocaleString()});
      exam.classList.add('hidden'); result.classList.remove('hidden');
      scoreP.textContent=`${name}, you scored ${score}%`;
    }
    retake.onclick=()=>{ result.classList.add('hidden'); setup.classList.remove('hidden'); };
  }
});

