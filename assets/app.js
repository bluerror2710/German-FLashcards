const norm=(s)=>(s||'').toString().trim().toLowerCase().replaceAll('ß','ss').replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u').replace(/\s+/g,' ');
function iconSvg(kind){
  const s=(inner)=>`<svg viewBox="0 0 100 100">${inner}</svg>`;
  switch(kind){
    case 'station': return s(`<rect class="s" x="12" y="34" width="76" height="44" rx="7"/><polygon class="s" points="12,34 50,14 88,34"/><line class="s" x1="26" y1="78" x2="26" y2="52"/><line class="s" x1="44" y1="78" x2="44" y2="52"/><line class="s" x1="62" y1="78" x2="62" y2="52"/><line class="s" x1="80" y1="78" x2="80" y2="52"/>`);
    case 'delay': return s(`<circle class="s" cx="50" cy="50" r="30"/><line class="s" x1="50" y1="50" x2="50" y2="34"/><line class="s" x1="50" y1="50" x2="64" y2="60"/>`);
    case 'pay': return s(`<rect class="s" x="14" y="28" width="72" height="44" rx="10"/><line class="s" x1="22" y1="40" x2="78" y2="40"/>`);
    case 'calendar': return s(`<rect class="s" x="16" y="22" width="68" height="62" rx="10"/><line class="s" x1="16" y1="36" x2="84" y2="36"/><path class="s" d="M30,58 L42,70 L70,46"/>`);
    default: return s(`<circle class="s" cx="50" cy="50" r="30"/><path class="s" d="M30,50 L44,64 L72,36"/>`);
  }
}
async function loadLatest(){
  const res=await fetch('./data/latest.json',{cache:'no-store'});
  if(!res.ok) throw new Error('no latest');
  return await res.json();
}
function render(app){
  const words=app.words||[];
  const learnedKey=`learned_${app.date||'unknown'}`;
  const learned=new Set(JSON.parse(localStorage.getItem(learnedKey)||'[]'));
  const cardsEl=document.getElementById('cards');
  const quizEl=document.getElementById('quiz');
  function update(){
    document.getElementById('count').textContent=`${learned.size} / ${words.length} learned`;
    document.getElementById('bar').style.width=`${Math.round(100*learned.size/Math.max(1,words.length))}%`;
  }
  cardsEl.innerHTML=''; quizEl.innerHTML='';
  words.forEach((w,i)=>{
    const scene=document.createElement('div'); scene.className='scene';
    const card=document.createElement('div'); card.className='card';
    const icon=w.icon?iconSvg(w.icon):iconSvg('check');
    const front=document.createElement('div'); front.className='face front';
    front.innerHTML=`<div class="icon">${icon}</div><div><div class="word">${w.de}</div><div class="meta">${w.en}</div><div class="tag">${w.type||''}</div><div class="row"><button class="btn" data-action="learn">${learned.has(w.id)?'Learned ✓':'Mark learned'}</button></div></div><div class="hint">tap to flip</div>`;
    const back=document.createElement('div'); back.className='face back';
    back.innerHTML=`<h3>Example</h3><div class="ex"><span class="de">${w.example||''}</span></div><div class="row"><button class="btn" data-action="flip">Back</button></div><div class="hint">say it out loud</div>`;
    card.appendChild(front); card.appendChild(back); scene.appendChild(card); cardsEl.appendChild(scene);
    card.addEventListener('click',(e)=>{
      const btn=e.target.closest('button');
      if(btn){
        const act=btn.getAttribute('data-action');
        if(act==='learn'){e.stopPropagation(); learned.has(w.id)?learned.delete(w.id):learned.add(w.id); localStorage.setItem(learnedKey,JSON.stringify([...learned])); render(app); return;}
        if(act==='flip'){e.stopPropagation(); card.classList.remove('is-flipped'); return;}
      }
      card.classList.toggle('is-flipped');
    });

    const q=document.createElement('div'); q.className='q';
    q.innerHTML=`<div><div style="font-weight:900">${i+1}) ${w.quizQ||('Translate: '+w.de)}</div><div class="note">Hint: ${w.de}</div></div><div style="min-width:260px"><input id="ans_${w.id}" placeholder="type answer…"/><div id="res_${w.id}" style="margin-top:6px"></div></div>`;
    quizEl.appendChild(q);
  });
  update();
  document.getElementById('check').onclick=()=>{
    words.forEach(w=>{
      const val=norm(document.getElementById(`ans_${w.id}`).value);
      const out=document.getElementById(`res_${w.id}`);
      const ans=(w.quizA||[]).map(norm);
      let ok=false;
      if(ans.length===1 && ans[0]==='*'){ ok=val.includes(norm(w.de.split(' ').at(-1))); }
      else ok=ans.some(a=>val===a);
      out.innerHTML = ok?`<span class="result ok">Correct ✓</span>`:`<span class="result no">Not yet ✗</span>`;
    });
  };
  document.getElementById('reset').onclick=()=>{
    words.forEach(w=>{document.getElementById(`ans_${w.id}`).value=''; document.getElementById(`res_${w.id}`).innerHTML='';});
  };
  document.getElementById('markAll').onclick=()=>{words.forEach(w=>learned.add(w.id)); localStorage.setItem(learnedKey,JSON.stringify([...learned])); render(app);};
  document.getElementById('date').textContent = app.date?`Date: ${app.date}`:'';
  const g=document.getElementById('grammar'); g.innerHTML='';
  (app.grammar||[]).forEach((line,idx)=>{const div=document.createElement('div'); div.className='note'; div.style.color='rgba(246,247,251,.92)'; div.style.marginTop='6px'; div.textContent=`${idx+1}) ${line}`; g.appendChild(div);});
}
(async()=>{try{render(await loadLatest());}catch(e){document.getElementById('error').textContent='No data yet.';}})();
