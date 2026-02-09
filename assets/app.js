const norm = (s) => (s||'')
  .toString().trim().toLowerCase()
  .replaceAll('ß','ss')
  .replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u')
  .replace(/\s+/g,' ');

function iconSvg(kind){
  const s = (inner)=>`<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  switch(kind){
    case 'station':
      return s(`<rect class="s" x="12" y="34" width="76" height="44" rx="7"/><polygon class="s" points="12,34 50,14 88,34"/><line class="s" x1="26" y1="78" x2="26" y2="52"/><line class="s" x1="44" y1="78" x2="44" y2="52"/><line class="s" x1="62" y1="78" x2="62" y2="52"/><line class="s" x1="80" y1="78" x2="80" y2="52"/>`);
    case 'delay':
      return s(`<circle class="s" cx="50" cy="50" r="30"/><line class="s" x1="50" y1="50" x2="50" y2="34"/><line class="s" x1="50" y1="50" x2="64" y2="60"/><line class="s" x1="18" y1="86" x2="82" y2="86"/>`);
    case 'pay':
      return s(`<rect class="s" x="14" y="28" width="72" height="44" rx="10"/><line class="s" x1="22" y1="40" x2="78" y2="40"/><circle class="s" cx="74" cy="60" r="6"/>`);
    case 'calendar':
      return s(`<rect class="s" x="16" y="22" width="68" height="62" rx="10"/><line class="s" x1="16" y1="36" x2="84" y2="36"/><path class="s" d="M30,58 L42,70 L70,46"/>`);
    default:
      return s(`<circle class="s" cx="50" cy="50" r="30"/><path class="s" d="M30,50 L44,64 L72,36"/>`);
  }
}

async function fetchJson(path){
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error(`Failed ${path}`);
  return await res.json();
}

function groupHourly(files){
  // expects filenames like YYYY-MM-DD_HH-MM_...
  const byDay = {};
  for(const f of files){
    const m = f.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})/);
    if(!m) continue;
    const day = m[1];
    const hm = m[2].replace('-',':');
    (byDay[day] ||= []).push({hm, file:f});
  }
  for(const day of Object.keys(byDay)){
    byDay[day].sort((a,b)=> a.hm.localeCompare(b.hm));
  }
  return byDay;
}

function setActive(el, selector){
  document.querySelectorAll(selector).forEach(x=>x.classList.remove('active'));
  if(el) el.classList.add('active');
}

function renderLesson(app){
  const words = app.words || [];
  const learnedKey = `learned_${app.date || 'unknown'}`;
  const learned = new Set(JSON.parse(localStorage.getItem(learnedKey) || '[]'));

  const cardsEl = document.getElementById('cards');
  const quizEl = document.getElementById('quiz');

  function updateProgress(){
    const learnedCount = learned.size;
    document.getElementById('count').textContent = `${learnedCount} / ${words.length} learned`;
    document.getElementById('bar').style.width = `${Math.round(100*learnedCount/Math.max(1,words.length))}%`;
  }

  cardsEl.innerHTML = '';
  quizEl.innerHTML = '';

  words.forEach((w, i)=>{
    const scene = document.createElement('div');
    scene.className = 'scene';

    const card = document.createElement('div');
    card.className = 'card';

    const icon = w.icon ? iconSvg(w.icon) : iconSvg('check');

    const front = document.createElement('div');
    front.className = 'face front';
    front.innerHTML = `
      <div class="icon">${icon}</div>
      <div>
        <div class="word">${w.de}</div>
        <div class="meta">${w.en}</div>
        <div class="tag">${w.type || ''}</div>
        <div class="row" style="margin-top:12px">
          <button class="btn" data-action="learn">${learned.has(w.id) ? 'Learned ✓' : 'Mark learned'}</button>
        </div>
      </div>
      <div class="hint">tap to flip</div>
    `;

    const back = document.createElement('div');
    back.className = 'face back';
    back.innerHTML = `
      <h3>Example</h3>
      <div class="ex"><span class="de">${w.example || ''}</span></div>
      <div class="row"><button class="btn" data-action="flip">Back</button></div>
      <div class="hint">say it out loud</div>
    `;

    card.appendChild(front);
    card.appendChild(back);
    scene.appendChild(card);
    cardsEl.appendChild(scene);

    card.addEventListener('click', (e)=>{
      const btn = e.target.closest('button');
      if (btn){
        const act = btn.getAttribute('data-action');
        if (act === 'learn'){
          e.stopPropagation();
          if (learned.has(w.id)) learned.delete(w.id); else learned.add(w.id);
          localStorage.setItem(learnedKey, JSON.stringify([...learned]));
          renderLesson(app);
          return;
        }
        if (act === 'flip'){
          e.stopPropagation();
          card.classList.remove('is-flipped');
          return;
        }
      }
      card.classList.toggle('is-flipped');
    });

    // Quiz
    const q = document.createElement('div');
    q.className = 'q';
    q.innerHTML = `
      <div>
        <div style="font-weight:900">${i+1}) ${w.quizQ || ('Translate: ' + w.de)}</div>
        <div class="note">Hint: ${w.de}</div>
      </div>
      <div style="min-width:260px">
        <input id="ans_${w.id}" placeholder="type answer…" />
        <div id="res_${w.id}" style="margin-top:6px"></div>
      </div>
    `;
    quizEl.appendChild(q);
  });

  updateProgress();

  document.getElementById('check').onclick = ()=>{
    words.forEach((w)=>{
      const input = document.getElementById(`ans_${w.id}`);
      const out = document.getElementById(`res_${w.id}`);
      const val = norm(input.value);
      const answers = (w.quizA || []).map(norm);

      let ok = false;
      if (answers.length === 0) ok = val.length > 0;
      else if (answers.length === 1 && answers[0] === '*') ok = val.includes(norm(w.de.split(' ').at(-1)));
      else ok = answers.some(a => val === a);

      out.innerHTML = ok
        ? `<span class="result ok">Correct ✓</span>`
        : `<span class="result no">Not yet ✗</span>`;
    });
  };

  document.getElementById('reset').onclick = ()=>{
    words.forEach(w=>{
      const input = document.getElementById(`ans_${w.id}`);
      const out = document.getElementById(`res_${w.id}`);
      if (input) input.value = '';
      if (out) out.innerHTML = '';
    });
  };

  document.getElementById('markAll').onclick = ()=>{
    words.forEach(w => learned.add(w.id));
    localStorage.setItem(learnedKey, JSON.stringify([...learned]));
    renderLesson(app);
  };

  document.getElementById('lessonTitle').textContent = app.title || 'Lesson';
  document.getElementById('lessonMeta').textContent = app.date ? `Date: ${app.date}` : '';

  const gEl = document.getElementById('grammar');
  gEl.innerHTML = '';
  (app.grammar || []).forEach((line, idx)=>{
    const div = document.createElement('div');
    div.className = 'note';
    div.style.marginTop = '6px';
    div.style.color = 'rgba(246,247,251,.92)';
    div.textContent = `${idx+1}) ${line}`;
    gEl.appendChild(div);
  });
}

function renderSidebar(index){
  const dailyEl = document.getElementById('dailyList');
  const hourlyEl = document.getElementById('hourlyList');

  const daily = (index.daily || []).slice().sort().reverse();
  const hourlyGrouped = groupHourly(index.hourly || []);
  const days = Object.keys(hourlyGrouped).sort().reverse();

  dailyEl.innerHTML='';
  for(const day of daily){
    const el = document.createElement('div');
    el.className = 'navItem';
    el.innerHTML = `<div><div class="name">${day}</div><div class="meta">Daily review</div></div><div class="meta">→</div>`;
    el.onclick = async ()=>{
      setActive(el, '#dailyList .navItem');
      const app = await fetchJson(`./daily/${day}.json`);
      renderLesson(app);
    };
    dailyEl.appendChild(el);
  }

  hourlyEl.innerHTML='';
  for(const day of days){
    const el = document.createElement('div');
    el.className = 'navItem';
    el.innerHTML = `<div><div class="name">${day}</div><div class="meta">Hourly lessons</div></div><div class="meta">${hourlyGrouped[day].length}</div>`;
    el.onclick = ()=>{
      // expand sublist
      const box = document.getElementById('hourSub');
      box.innerHTML = '';
      document.getElementById('hourSubTitle').textContent = `Hours on ${day}`;
      for(const h of hourlyGrouped[day].slice().reverse()){
        const it = document.createElement('div');
        it.className = 'navItem';
        it.innerHTML = `<div><div class="name">${h.hm}</div><div class="meta">Lesson</div></div><div class="meta">→</div>`;
        it.onclick = async ()=>{
          setActive(it, '#hourSub .navItem');
          const app = await fetchJson(`./hourly/${h.file.replace(/\.html$/,'')}.json`);
          renderLesson(app);
        };
        box.appendChild(it);
      }
    };
    hourlyEl.appendChild(el);
  }
}

(async ()=>{
  try{
    const index = await fetchJson('./data/index.json');
    renderSidebar(index);

    // load latest by default
    const latest = await fetchJson('./data/latest.json');
    renderLesson(latest);
  } catch (e){
    document.getElementById('errorTop').textContent = 'No data yet. Come back after the next batch.';
  }
})();
