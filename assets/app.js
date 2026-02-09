const norm = (s) => (s||'')
  .toString().trim().toLowerCase()
  .replaceAll('ß','ss')
  .replaceAll('ä','a').replaceAll('ö','o').replaceAll('ü','u')
  .replace(/\s+/g,' ');

function iconSvg(kind){
  const s = (inner)=>`<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  switch(kind){
    case 'travel':
      return s(`<path class="s" d="M15,70 L85,70"/><path class="s" d="M30,70 L50,30 L70,70"/><path class="s" d="M42,55 L58,55"/>`);
    case 'time':
      return s(`<circle class="s" cx="50" cy="50" r="30"/><line class="s" x1="50" y1="50" x2="50" y2="32"/><line class="s" x1="50" y1="50" x2="66" y2="58"/>`);
    case 'money':
      return s(`<rect class="s" x="18" y="30" width="64" height="40" rx="10"/><circle class="s" cx="50" cy="50" r="9"/>`);
    case 'health':
      return s(`<path class="s" d="M50,76 C25,60 20,45 28,36 C34,30 44,32 50,40 C56,32 66,30 72,36 C80,45 75,60 50,76 Z"/>`);
    case 'home':
      return s(`<polygon class="s" points="20,48 50,24 80,48"/><rect class="s" x="30" y="48" width="40" height="28" rx="4"/><line class="s" x1="50" y1="76" x2="50" y2="60"/>`);
    case 'work':
      return s(`<rect class="s" x="22" y="38" width="56" height="40" rx="8"/><path class="s" d="M38,38 L38,30 L62,30 L62,38"/><line class="s" x1="22" y1="54" x2="78" y2="54"/>`);
    case 'food':
      return s(`<path class="s" d="M35,25 L35,75"/><path class="s" d="M45,25 L45,75"/><path class="s" d="M65,25 C55,35 55,45 65,55 C75,65 75,75 65,75"/>`);
    case 'chat':
      return s(`<path class="s" d="M20,30 H80 V62 H42 L30,74 V62 H20 Z"/>`);
    case 'check':
    default:
      return s(`<circle class="s" cx="50" cy="50" r="30"/><path class="s" d="M30,50 L44,64 L72,36"/>`);
  }
}

async function fetchJson(path){
  const res = await fetch(path, {cache:'no-store'});
  if(!res.ok) throw new Error(`Failed ${path}`);
  return await res.json();
}

function setActive(el, selector){
  document.querySelectorAll(selector).forEach(x=>x.classList.remove('active'));
  if(el) el.classList.add('active');
}

function renderLesson(app){
  const words = app.words || [];
  const learnedKey = `learned_${app.level}_${String(app.lesson).padStart(3,'0')}`;
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

    const icon = iconSvg(w.icon || 'check');

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
  document.getElementById('lessonMeta').textContent = `${app.level || ''} • Lesson ${String(app.lesson||'').padStart(3,'0')}`;

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
  const levels = index.levels || {};
  const levelList = document.getElementById('levelList');
  const lessonList = document.getElementById('lessonList');

  levelList.innerHTML='';
  lessonList.innerHTML='';

  const levelNames = Object.keys(levels);

  function showLevel(level, btnEl){
    setActive(btnEl, '#levelList .navItem');
    lessonList.innerHTML='';
    const lessons = (levels[level]?.lessons || []).slice();
    // newest first
    lessons.sort().reverse();

    for(const rel of lessons){
      const m = rel.match(/lesson_(\d{3})\.json$/);
      const num = m ? m[1] : rel;
      const it = document.createElement('div');
      it.className='navItem';
      it.innerHTML = `<div><div class="name">Lesson ${num}</div><div class="meta">${level}</div></div><div class="meta">→</div>`;
      it.onclick = async ()=>{
        setActive(it, '#lessonList .navItem');
        const app = await fetchJson(`./lessons/${rel}`);
        renderLesson(app);
      };
      lessonList.appendChild(it);
    }

    // auto load newest lesson
    if (lessons.length){
      const newest = lessons[0];
      lessonList.querySelector('.navItem')?.click();
    }
  }

  for(const level of levelNames){
    const btn = document.createElement('div');
    btn.className='navItem';
    btn.innerHTML = `<div><div class="name">${level}</div><div class="meta">5 words + 5 grammar</div></div><div class="meta">${(levels[level]?.lessons||[]).length}</div>`;
    btn.onclick = ()=> showLevel(level, btn);
    levelList.appendChild(btn);
  }

  // open first level
  levelList.querySelector('.navItem')?.click();
}

(async ()=>{
  try{
    const index = await fetchJson('./lessons/index.json');
    renderSidebar(index);
  } catch (e){
    document.getElementById('errorTop').textContent = 'No lessons yet. Wait for the next generation.';
  }
})();
