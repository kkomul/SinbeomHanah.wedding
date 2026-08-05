/* =========================================================
   복사 방지
   -----------------------------------------------------------
   완전히 막을 방법은 없습니다(브라우저 개발자도구, 화면 캡처 등은
   기술적으로 항상 우회 가능합니다). 다만 대다수 하객이 시도할 만한
   우클릭 저장, 이미지/텍스트 드래그 복사, 모바일 롱프레스 저장은
   막아 둡니다.
========================================================= */
document.addEventListener('contextmenu', (e)=> e.preventDefault());
document.addEventListener('dragstart', (e)=> e.preventDefault());
document.addEventListener('selectstart', (e)=>{
  const tag = e.target && e.target.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA') return; /* 방명록 입력창은 그대로 선택 가능하게 둠 */
  e.preventDefault();
});
document.addEventListener('keydown', (e)=>{
  const k = e.key ? e.key.toLowerCase() : '';
  if(e.key === 'F12') { e.preventDefault(); return; }
  if((e.ctrlKey || e.metaKey) && (k === 'u' || k === 's')) { e.preventDefault(); return; }
  if((e.ctrlKey || e.metaKey) && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) { e.preventDefault(); }
});

/* =========================================================
   배경음악(BGM)
   -----------------------------------------------------------
   모바일 브라우저는 사용자가 화면을 최소 한 번 터치/클릭하기 전에는
   오디오 자동재생을 허용하지 않습니다. 그래서 페이지의 아무 곳이나
   처음 터치/클릭하는 순간 재생을 시작하도록 만들고, 그 다음부터는
   loop 속성으로 계속 무한 반복됩니다.
========================================================= */
(function initBgm(){
  const audio = document.getElementById('bgmAudio');
  const btn = document.getElementById('bgmToggle');
  if(!audio || !btn) return;

  function updateBgmIcon(){
    btn.textContent = audio.muted ? '🔇' : '🔊';
  }
  updateBgmIcon();

  function startBgmOnce(){
    audio.play().catch(()=>{ /* 재생이 막히면 다음 터치 때 다시 시도됩니다 */ });
  }
  document.addEventListener('touchstart', startBgmOnce, { once:true, passive:true });
  document.addEventListener('click', startBgmOnce, { once:true });

  window.toggleBgm = function(){
    audio.muted = !audio.muted;
    if(!audio.muted){ audio.play().catch(()=>{}); }
    updateBgmIcon();
  };
})();

/* =========================================================
   PIXEL ART ENGINE
   캐릭터/아이콘은 코드로 그려집니다 (이미지 파일 없음).
   실제 이미지 리소스(배경/구름/땅/타이틀로고/날짜리본)는
   /images 폴더의 png 파일을 교체하면 바로 반영됩니다.
========================================================= */
function pixelIcon(id, rows, palette){
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById(id);
  if(!svg) return;
  const cols = rows[0].length;
  svg.setAttribute('viewBox', `0 0 ${cols} ${rows.length}`);
  const frag = document.createDocumentFragment();
  rows.forEach((row,y)=>{
    [...row].forEach((ch,x)=>{
      if(ch === '.') return;
      const rect = document.createElementNS(svgNS,'rect');
      rect.setAttribute('x',x); rect.setAttribute('y',y);
      rect.setAttribute('width',1); rect.setAttribute('height',1);
      rect.setAttribute('fill', palette[ch]);
      frag.appendChild(rect);
    });
  });
  svg.appendChild(frag);
}
function pixelIconAll(selector, rows, palette){
  document.querySelectorAll(selector).forEach(svg=>{
    if(!svg.id){ svg.id = 'ic_'+Math.random().toString(36).slice(2); }
    pixelIcon(svg.id, rows, palette);
  });
}

const HEART_ROWS = [
  ".11.11.",
  "1111111",
  "1111111",
  ".11111.",
  "..111..",
  "...1..."
];
const HEART_PAL = { '1':'#FF6F91' };

const COIN_ROWS = [
  "..2222..",
  ".211112.",
  "21111112",
  "21122112",
  "21122112",
  "21111112",
  ".211112.",
  "..2222.."
];
const COIN_PAL = { '1':'#FFD35C', '2':'#B8860B' };

const GIFT_ROWS = [
  "...222...",
  "..22222..",
  ".1111111.",
  "111222111",
  "111222111",
  "111222111",
  "111222111",
  ".1111111.",
  "..11111.."
];
const GIFT_PAL = { '1':'#FF8FAB', '2':'#E85D89' };

const PIN_ROWS = [
  ".111.",
  "11111",
  "11111",
  ".111.",
  "..2..",
  "..2..",
  "..2..",
  "..2.."
];
const PIN_PAL = { '1':'#E85D89', '2':'#7A5B3F' };

const STAR_ROWS = [
  "...1...",
  "...1...",
  "..111..",
  "1111111",
  "..111..",
  ".1...1.",
  "1.....1"
];
const STAR_PAL = { '1':'#FFD35C' };

pixelIcon('iconHeart2', HEART_ROWS, HEART_PAL);
pixelIcon('storyDecoHeart', HEART_ROWS, HEART_PAL);
pixelIcon('storyDecoStar', STAR_ROWS, STAR_PAL);
pixelIconAll('.ic-coin', COIN_ROWS, COIN_PAL);
pixelIconAll('.ic-gift', GIFT_ROWS, GIFT_PAL);

/* =========================================================
   GALLERY (OUR STORY) — 가볍고 안정적인 무한 캐러셀
   -----------------------------------------------------------
   화면에는 이전(prev) / 현재(curr) / 다음(next) 딱 3장의 <img>만
   존재합니다. 이동할 때마다 이 3장의 src만 바꿔치기하기 때문에
   사진이 몇 장이든 DOM 크기가 늘어나지 않아 저사양 기기에서도 가볍고,
   "복제 슬라이드가 떨어지면 빈 화면이 나오는" 종류의 버그 자체가
   구조적으로 발생할 수 없습니다.
========================================================= */
const GALLERY_COUNT = 9;
const REST_PCT = 100 / 3;      /* 트랙 안에서 "현재 사진"이 보이는 기준 위치 */
const GALLERY_TAP_MAX_MOVE = 10;   /* 이보다 적게 움직였을 때만 "탭"으로 인정 (확대) */
const GALLERY_SWIPE_MIN_DX = 10;   /* 이보다 많이 가로로 움직여야 "스와이프 시도"로 인정 */
const GALLERY_DOMINANCE = 1.2;     /* 가로 이동이 세로 이동의 이 비율 이상이어야 가로로 판정 */
let galleryIndex = 0;          /* 0 ~ 8, 지금 보고 있는 실제 사진 번호 */
let galleryAnimating = false;  /* 애니메이션 도중 중복 입력 방지 */
let galleryDragging = false;
let galleryStartX = 0;
let galleryStartY = 0;
let galleryDeltaX = 0;
let galleryDeltaY = 0;
let galleryGesture = null; /* null(미결정) | 'horizontal'(캐러셀 조작) | 'vertical'(페이지 스크롤) */

const galleryTrack = document.getElementById('galleryTrack');
const galleryViewport = document.getElementById('galleryViewport');
const galleryDotsWrap = document.getElementById('galleryDots');
const slotPrev = document.getElementById('slotPrev');
const slotCurr = document.getElementById('slotCurr');
const slotNext = document.getElementById('slotNext');

function mod(n, m){ return ((n % m) + m) % m; }
function photoSrc(i){ return `images/gallery/photo${i + 1}.jpg`; }

function renderSlots(){
  if(!slotPrev) return;
  slotPrev.style.backgroundImage = `url(${photoSrc(mod(galleryIndex - 1, GALLERY_COUNT))})`;
  slotCurr.style.backgroundImage = `url(${photoSrc(galleryIndex)})`;
  slotNext.style.backgroundImage = `url(${photoSrc(mod(galleryIndex + 1, GALLERY_COUNT))})`;
}

function buildGalleryDots(){
  if(!galleryDotsWrap) return;
  galleryDotsWrap.innerHTML = '';
  for(let i=0;i<GALLERY_COUNT;i++){
    const d = document.createElement('div');
    d.className = 'dot' + (i===galleryIndex ? ' active' : '');
    d.onclick = ()=>goToGallerySlide(i);
    galleryDotsWrap.appendChild(d);
  }
}
function updateGalleryDots(){
  if(!galleryDotsWrap) return;
  [...galleryDotsWrap.children].forEach((d,i)=>d.classList.toggle('active', i===galleryIndex));
}

function setTrack(pct, withTransition){
  if(!galleryTrack) return;
  galleryTrack.style.transition = withTransition ? 'transform .3s ease' : 'none';
  galleryTrack.style.transform = `translateX(-${pct}%)`;
}

/* 트랙 이동 애니메이션이 끝나면(또는 안전장치로 타임아웃 되면) 정확히 한 번만 콜백 실행 */
function animateTrackTo(pct, onDone){
  let done = false;
  const finish = ()=>{
    if(done) return;
    done = true;
    galleryTrack.removeEventListener('transitionend', onTransitionEnd);
    clearTimeout(fallbackTimer);
    if(onDone) onDone();
  };
  const onTransitionEnd = (e)=>{
    if(e && e.propertyName && e.propertyName !== 'transform') return;
    finish();
  };
  galleryTrack.addEventListener('transitionend', onTransitionEnd);
  const fallbackTimer = setTimeout(finish, 400); /* transitionend 유실 대비 안전장치 */
  setTrack(pct, true);
}

/* 점(dot) 클릭 — 즉시 이동 (여러 장을 애니메이션으로 훑지 않아 가볍습니다) */
function goToGallerySlide(i){
  if(galleryAnimating) return;
  galleryIndex = mod(i, GALLERY_COUNT);
  renderSlots();
  setTrack(REST_PCT, false);
  updateGalleryDots();
}

/* 화살표 / 드래그 공용 — 한 칸 슬라이드 애니메이션 후 다음 사진으로 확정 */
function commitMove(dir, onFinished){
  galleryAnimating = true;
  const targetPct = dir === 1 ? REST_PCT * 2 : 0;
  animateTrackTo(targetPct, ()=>{
    galleryIndex = mod(galleryIndex + dir, GALLERY_COUNT);
    renderSlots();
    setTrack(REST_PCT, false); /* 갱신된 사진으로 즉시 가운데 위치로 복귀 (시각적으로 자연스럽게 이어짐) */
    updateGalleryDots();
    galleryAnimating = false;
    if(onFinished) onFinished();
  });
}
function galleryMove(dir){
  if(galleryAnimating) return;
  commitMove(dir);
}

if(galleryViewport){
  renderSlots();
  buildGalleryDots();
  setTrack(REST_PCT, false);

  galleryViewport.addEventListener('pointerdown', (e)=>{
    if(galleryAnimating) return;
    galleryDragging = true;
    galleryGesture = null;
    galleryStartX = e.clientX;
    galleryStartY = e.clientY;
    galleryDeltaX = 0;
    galleryDeltaY = 0;
    galleryTrack.style.transition = 'none';
    /* 아직 pointer capture는 잡지 않습니다 — 방향이 정해지기 전에 잡아버리면
       세로 스크롤 도중에도 캐러셀이 반응하는 것처럼 보일 수 있습니다.
       확대 여부도 여기서 바로 정하지 않고, 손을 뗄 때(pointerup)까지 기다립니다. */
  });
  galleryViewport.addEventListener('pointermove', (e)=>{
    if(!galleryDragging) return;
    galleryDeltaX = e.clientX - galleryStartX;
    galleryDeltaY = e.clientY - galleryStartY;
    const absX = Math.abs(galleryDeltaX);
    const absY = Math.abs(galleryDeltaY);

    if(galleryGesture === null){
      /* 가로 이동이 충분하고 세로보다 확실히 더 크면 → 캐러셀 스와이프로 확정 */
      if(absX > GALLERY_SWIPE_MIN_DX && absX > absY * GALLERY_DOMINANCE){
        galleryGesture = 'horizontal';
        galleryViewport.setPointerCapture(e.pointerId);
      /* 세로 이동이 가로보다 확실히 더 크면 → 페이지 스크롤로 확정 (느리게 움직여도 감지되도록 낮은 기준 사용) */
      }else if(absY > GALLERY_TAP_MAX_MOVE && absY > absX * GALLERY_DOMINANCE){
        galleryGesture = 'vertical';
      }
      /* 그 외(아직 애매하게 조금만 움직인 상태)에는 계속 미결정으로 두고 다음 move에서 다시 판단 */
    }

    if(galleryGesture === 'horizontal'){
      galleryTrack.style.transform = `translateX(calc(-${REST_PCT}% + ${galleryDeltaX}px))`;
    }
    /* 'vertical' 이거나 아직 미결정인 동안은 캐러셀을 건드리지 않고 그대로 둡니다
       (미결정 상태에서 페이지가 스크롤되고 있다면 자연스럽게 스크롤되도록 방해하지 않음). */
  });
  function endGalleryDrag(e){
    if(!galleryDragging) return;
    galleryDragging = false;

    /* 브라우저가 세로 스크롤로 판단해 제스처를 가져간 경우(pointercancel) → 조용히 종료 */
    if(e && e.type === 'pointercancel'){
      galleryGesture = null;
      return;
    }

    if(galleryGesture === 'horizontal'){
      const threshold = galleryViewport.offsetWidth * 0.18;
      if(galleryDeltaX > threshold){
        commitMove(-1);
      }else if(galleryDeltaX < -threshold){
        commitMove(1);
      }else{
        setTrack(REST_PCT, true);
      }
    }else if(galleryGesture === 'vertical'){
      /* 페이지를 스크롤하려던 제스처 → 확대하지 않고 조용히 종료 */
    }else{
      /* 방향이 끝까지 확정되지 않은 경우 — 처음 누른 지점과 뗀 지점이
         실제로 거의 같은 자리일 때만(정확한 클릭/탭) 확대합니다. */
      const dist = Math.hypot(galleryDeltaX, galleryDeltaY);
      if(dist <= GALLERY_TAP_MAX_MOVE){
        openLightbox();
      }
    }
    galleryGesture = null;
  }
  galleryViewport.addEventListener('pointerup', endGalleryDrag);
  galleryViewport.addEventListener('pointercancel', endGalleryDrag);
}

function renderLightboxImage(){
  const src = photoSrc(galleryIndex);
  const box = document.getElementById('lightboxImg');
  const pre = new Image();
  pre.onload = ()=>{
    box.style.aspectRatio = pre.naturalWidth + ' / ' + pre.naturalHeight;
    box.style.backgroundImage = `url(${src})`;
  };
  pre.src = src;
}
function openLightbox(){
  renderLightboxImage();
  document.getElementById('lightboxOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox(){
  document.getElementById('lightboxOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function closeLightboxBg(e){
  if(e.target.id === 'lightboxOverlay') closeLightbox();
}
/* 확대 화면에서도 화살표/스와이프로 사진을 넘길 수 있게 합니다.
   갤러리 캐러셀(뒤 배경)도 같은 사진으로 맞춰둬서, 확대 화면을 닫아도
   보던 사진이 그대로 이어집니다. */
function lightboxMove(dir){
  galleryIndex = mod(galleryIndex + dir, GALLERY_COUNT);
  renderSlots();
  setTrack(REST_PCT, false);
  updateGalleryDots();
  renderLightboxImage();
}

let lbStartX = 0;
let lbDeltaX = 0;
let lbDragging = false;
const lightboxBoxEl = document.getElementById('lightboxImg');
if(lightboxBoxEl){
  lightboxBoxEl.addEventListener('pointerdown', (e)=>{
    lbDragging = true;
    lbStartX = e.clientX;
    lbDeltaX = 0;
  });
  lightboxBoxEl.addEventListener('pointermove', (e)=>{
    if(!lbDragging) return;
    lbDeltaX = e.clientX - lbStartX;
  });
  const endLbDrag = ()=>{
    if(!lbDragging) return;
    lbDragging = false;
    if(lbDeltaX > 40){
      lightboxMove(-1);
    }else if(lbDeltaX < -40){
      lightboxMove(1);
    }
    lbDeltaX = 0;
  };
  lightboxBoxEl.addEventListener('pointerup', endLbDrag);
  lightboxBoxEl.addEventListener('pointercancel', endLbDrag);
}

/* =========================================================
   꽃잎 파티클 생성
   -----------------------------------------------------------
   images/petals/petal1.png ~ petal4.png 4장을 랜덤하게 섞어서
   개수/위치/속도/오른쪽→왼쪽으로 부는 바람 세기를 각각 다르게 만든 뒤
   한 번만 DOM에 추가합니다. 전부 transform/opacity CSS 애니메이션이라
   가볍고(GPU 처리), JS는 최초 생성 시 한 번만 동작합니다(매 프레임 계산 없음).
========================================================= */
(function initPetals(){
  const layer = document.getElementById('petalLayer');
  if(!layer) return;
  const PETAL_IMAGES = [
    'images/petals/petal1.png',
    'images/petals/petal2.png',
    'images/petals/petal3.png',
    'images/petals/petal4.png'
  ];
  const PETAL_COUNT = 12; /* 개수를 늘리면 더 풍성해지지만 저사양 기기 부담도 늘어납니다 */

  const frag = document.createDocumentFragment();
  for(let i=0;i<PETAL_COUNT;i++){
    const img = document.createElement('img');
    img.className = 'petal';
    img.src = PETAL_IMAGES[i % PETAL_IMAGES.length];
    img.alt = '';
    img.onerror = function(){ this.style.display = 'none'; };

    const duration = (10 + Math.random()*10).toFixed(1) + 's';   /* 10~20초 */
    const delay = (-Math.random()*20).toFixed(1) + 's';          /* 처음부터 화면에 흩어져 보이도록 음수 지연 */
    const size = Math.round(14 + Math.random()*16);              /* 14~30px */
    const x = Math.round(Math.random()*115);                     /* 0~115% (오른쪽 바깥에서 들어오는 꽃잎 포함) */
    const drift = -Math.round(60 + Math.random()*540);           /* -60~-600px, 바람 세기를 훨씬 크게 랜덤화 (약한 산들바람 ~ 강한 돌풍) */
    const sway = Math.round(10 + Math.random()*22);               /* 10~32px, 드리프트 위에 얹히는 살랑거림 */
    const rot = Math.round(8 + Math.random()*16);                  /* 8~24deg, 완만하게 좌우로 흔들리는 회전 */

    img.style.setProperty('--duration', duration);
    img.style.setProperty('--delay', delay);
    img.style.setProperty('--size', size);
    img.style.setProperty('--x', x);
    img.style.setProperty('--drift', drift);
    img.style.setProperty('--sway', sway);
    img.style.setProperty('--rot', rot);

    frag.appendChild(img);
  }
  layer.appendChild(frag);
})();

/* ---------- scroll reveal ---------- */
const revealEls = document.querySelectorAll('.fade-up');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
},{threshold:0.15});
revealEls.forEach(el=>io.observe(el));

/* ---------- toast ---------- */
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(()=>t.classList.remove('show'), 1800);
}

/* ---------- copy ---------- */
async function copyText(text, btn){
  try{
    await navigator.clipboard.writeText(text);
  }catch(e){
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(err){}
    document.body.removeChild(ta);
  }
  showToast('복사 완료 !');
  if(btn){
    const orig = btn.textContent;
    btn.textContent = 'DONE';
    setTimeout(()=>btn.textContent = orig, 1200);
  }
}

/* 카카오페이 개인 송금 링크가 아직 등록되지 않았으면(플레이스홀더 상태) 이동을 막고 안내합니다.
   실제 링크를 넣으면(href가 "여기에_"로 시작하지 않으면) 정상적으로 새 탭에서 열립니다. */
/* ---------- tabs ---------- */
function switchTab(name){
  document.querySelectorAll('.acc-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  document.querySelectorAll('.acc-group').forEach(g=>g.classList.toggle('active', g.id==='tab-'+name));
}

/* ---------- calendar ---------- */
function buildCalendar(){
  const grid = document.getElementById('calGrid');
  const dows = ['일','월','화','수','목','금','토'];
  dows.forEach(d=>{
    const el = document.createElement('div');
    el.className='dow'; el.textContent=d;
    grid.appendChild(el);
  });
  const firstDow = new Date(2026,9,1).getDay();
  const daysInMonth = 31;
  for(let i=0;i<firstDow;i++){
    const el = document.createElement('div');
    el.className='day blank';
    grid.appendChild(el);
  }
  for(let d=1; d<=daysInMonth; d++){
    const el = document.createElement('div');
    el.className='day' + (d===31 ? ' dday' : '');
    el.textContent=d;
    if(d===31){
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 7 7');
      svg.id = 'dstar';
      el.appendChild(svg);
      setTimeout(()=>pixelIcon('dstar', STAR_ROWS, STAR_PAL),0);
    }
    grid.appendChild(el);
  }
  updateDday();
}
function updateDday(){
  /* 예식 시각(11:30)이 아니라 "날짜" 자체를 기준으로 비교합니다.
     그래서 10.31 00:00(자정)이 되는 순간 바로 "오늘"로 바뀝니다. */
  const targetMidnight = new Date(2026, 9, 31);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((targetMidnight - todayMidnight) / (1000*60*60*24));
  const el = document.getElementById('ddayCount');
  if(diff > 0){
    el.innerHTML = '신랑♥신부의 결혼식이 <b>'+diff+'일</b> 남았습니다';
  }else if(diff === 0){
    el.innerHTML = '신랑♥신부의 결혼식이 <b>오늘</b>입니다 !';
  }else{
    el.innerHTML = '신랑♥신부의 결혼식이 <b>'+Math.abs(diff)+'일</b> 지났습니다';
  }
}
buildCalendar();

/* =========================================================
   방명록 저장 방식 — Google 스프레드시트 연동
   -----------------------------------------------------------
   아래 두 값을 채우면 방명록이 구글 스프레드시트에 저장/조회됩니다.
   (설정 방법은 GOOGLE_SHEETS_SETUP.md 참고)
   - GUESTBOOK_API_URL : Apps Script를 "웹 앱"으로 배포하면 나오는 주소
   - GUESTBOOK_SECRET  : Apps Script 코드 안에 적어둔 것과 똑같은 문자열
                         (아무나 함부로 글을 써넣지 못하게 막는 간단한 암호입니다)

   두 값을 아직 채우지 않았다면(placeholder 상태) 자동으로 이 브라우저의
   localStorage에 저장하도록 동작해서, 설정 전에도 방명록 기능 자체는
   바로 테스트해볼 수 있습니다.
========================================================= */
const GUESTBOOK_API_URL = 'https://script.google.com/macros/s/AKfycbwhiaKBSUdI2yJaR8VT4AeasLyUFvkxEi378qrJm_BeEaBe3K_RHUIOjc-amCm6uxXB/exec';
const GUESTBOOK_SECRET = 'shinbeom-hana-2026-wedding-240731';
const GUESTBOOK_LOCAL_KEY = 'wedding-guestbook-pixel';

function guestbookConfigured(){
  return GUESTBOOK_API_URL && GUESTBOOK_API_URL.indexOf('PASTE_') !== 0;
}
/* 방명록 저장 확인용 고유 ID (예: "K3F8QZ1P") — 이름/메시지 비교보다 훨씬 정확합니다 */
function genId(){
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
/* new Date().toISOString()은 항상 UTC(런던 기준시)로 나와서 한국 시간과 9시간 차이가 납니다.
   시트에 저장될 때 한국 시간(KST, UTC+9)으로 보이도록 시간을 9시간 밀어서 만듭니다.
   (절대적인 시각 자체는 동일하고, 표기만 한국 시간 기준으로 바뀝니다) */
function nowKST(){
  return new Date(Date.now() + 9*60*60*1000).toISOString().replace('Z', '+09:00');
}
console.log(
  guestbookConfigured()
    ? '[방명록] 구글 스프레드시트 연동 사용 중 → ' + GUESTBOOK_API_URL
    : '[방명록] 아직 localStorage 사용 중 (GUESTBOOK_API_URL이 설정되지 않음)'
);

async function loadGuestbook(){
  if(!guestbookConfigured()){
    try{
      const raw = localStorage.getItem(GUESTBOOK_LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){
      return [];
    }
  }
  try{
    const res = await fetch(GUESTBOOK_API_URL);
    if(!res.ok){
      console.error('방명록 불러오기 실패 — HTTP 상태:', res.status, res.statusText);
      throw new Error('network error');
    }
    return await res.json();
  }catch(e){
    console.error('방명록 불러오기 중 오류:', e);
    showToast('방명록을 불러오지 못했습니다');
    return [];
  }
}

async function saveGuestbookEntry(entry){
  if(!guestbookConfigured()){
    try{
      const raw = localStorage.getItem(GUESTBOOK_LOCAL_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift(entry);
      localStorage.setItem(GUESTBOOK_LOCAL_KEY, JSON.stringify(list));
      return list;
    }catch(e){
      return null;
    }
  }
  try{
    /* Apps Script의 POST 응답은 내부적으로 리다이렉트를 거치기 때문에,
       일반 fetch로는 브라우저가 CORS 에러로 응답을 막아버리는 경우가 많습니다.
       no-cors 모드로 보내면 요청/데이터는 정상적으로 서버에 전달되지만,
       응답 내용은 읽을 수 없습니다(opaque response). 그래서 성공 여부는
       "저장 직후 목록을 다시 불러와서 방금 쓴 글이 실제로 있는지"로 확인합니다. */
    await fetch(GUESTBOOK_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify({ ...entry, secret: GUESTBOOK_SECRET })
    });

    const list = await loadGuestbook();
    const found = list.some(item => item.id && item.id === entry.id);
    if(!found){
      console.error('방명록 저장 확인 실패 — 방금 등록한 글(id: '+entry.id+')을 시트에서 찾지 못했습니다. 비밀문자열/시트 이름을 확인하세요.');
      return null;
    }
    return list;
  }catch(e){
    console.error('방명록 저장 중 오류:', e);
    return null;
  }
}

/* ---------- guestbook ---------- */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function formatDate(iso){
  const d = new Date(iso);
  return (d.getMonth()+1)+'.'+d.getDate();
}
function entryHtml(item){
  const pinId = 'pin_'+Math.random().toString(36).slice(2);
  setTimeout(()=>pixelIcon(pinId, PIN_ROWS, PIN_PAL),0);
  return '<div class="note-card"><svg id="'+pinId+'" viewBox="0 0 5 8"></svg><div class="note-top"><span class="note-name">'+escapeHtml(item.name)+'</span><span class="note-date">'+formatDate(item.createdAt)+'</span></div><div class="note-msg">'+escapeHtml(item.message)+'</div></div>';
}
function renderGuestbookPreview(list){
  const wrap = document.getElementById('gbPreview');
  const moreBtn = document.getElementById('gbMoreBtn');
  if(!list.length){
    wrap.innerHTML = '<div class="gb-empty">첫 번째 축하 메시지를 남겨주세요 !</div>';
    moreBtn.style.display = 'none';
    return;
  }
  const preview = list.slice(0,3);
  wrap.innerHTML = preview.map(entryHtml).join('');
  moreBtn.style.display = list.length > 3 ? 'block' : 'none';
}
async function submitGuestbook(){
  const nameEl = document.getElementById('gbName');
  const msgEl = document.getElementById('gbMsg');
  const name = nameEl.value.trim();
  const message = msgEl.value.trim();
  if(!name || !message){
    showToast('이름과 메시지를 모두 입력해 주세요');
    return;
  }
  const btn = document.getElementById('gbSubmit');
  btn.disabled = true;
  const list = await saveGuestbookEntry({ id: genId(), name, message, createdAt: nowKST() });
  if(list){
    nameEl.value=''; msgEl.value='';
    renderGuestbookPreview(list);
    showToast('방명록 등록 완료 !');
  }else{
    showToast('등록에 실패했습니다. 다시 시도해 주세요');
  }
  btn.disabled = false;
}
function openGuestbookModal(){
  /* 모달을 먼저 즉시 띄우고, 목록은 그 다음에 비동기로 채웁니다.
     (구글 스프레드시트 연동 시 fetch 응답을 기다리는 동안 모달 자체가
     늦게 뜨는 것처럼 보였던 문제를 고칩니다) */
  document.getElementById('gbFullList').innerHTML = '<div class="gb-empty">불러오는 중...</div>';
  document.getElementById('gbModal').classList.add('open');
  document.body.style.overflow = 'hidden'; /* 모바일에서 뒤쪽 페이지가 같이 스크롤되는 것을 방지 */

  loadGuestbook().then(list=>{
    document.getElementById('gbFullList').innerHTML = list.map(entryHtml).join('') || '<div class="gb-empty">등록된 메시지가 없습니다</div>';
  });
}
function closeGuestbookModal(){
  document.getElementById('gbModal').classList.remove('open');
  document.body.style.overflow = '';
}

/* ---------- 공유하기 ----------
   카카오톡 공식 "공유" 말풍선을 쓰려면 Kakao Developers에서 앱을 만들고
   JavaScript 키를 발급받아 Kakao SDK를 연결해야 합니다(README 참고).
   지금은 별도 설정 없이 바로 작동하도록, 모바일 브라우저의 기본 공유
   기능(Web Share API)을 사용합니다 — 공유 시트에서 카카오톡을 포함해
   원하는 앱을 골라 보낼 수 있습니다. 미지원 브라우저(주로 PC)에서는
   링크를 자동으로 복사해 드립니다. */
/* =========================================================
   카카오톡 공유 — Kakao SDK
   -----------------------------------------------------------
   KAKAO_JS_KEY 를 채우면 진짜 카카오톡 공유 카드(썸네일+제목+버튼)가 뜹니다.
   설정 방법은 KAKAO_SHARE_SETUP.md 참고.
   아직 채우지 않았다면(placeholder 상태) 자동으로 기존처럼
   모바일 기본 공유 기능(Web Share API) → 링크 복사 순서로 대체됩니다.
========================================================= */
const KAKAO_JS_KEY = '23ab99a5cfcb362b780e0cee91825956';

function kakaoConfigured(){
  return KAKAO_JS_KEY && KAKAO_JS_KEY.indexOf('PASTE_') !== 0 && typeof Kakao !== 'undefined';
}
if(kakaoConfigured() && !Kakao.isInitialized()){
  Kakao.init(KAKAO_JS_KEY);
}

async function shareKakao(){
  const pageUrl = window.location.href;

  if(kakaoConfigured()){
    try{
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '우신범 ♥ 김한아 결혼식에 초대합니다',
          description: '2026.10.31(토) 오전 11:30 · 대구중앙컨벤션센터',
          imageUrl: new URL('images/kakao-logo.png', pageUrl).href,
          link: { mobileWebUrl: pageUrl, webUrl: pageUrl }
        },
        buttons: [
          { title: '청첩장 보러가기', link: { mobileWebUrl: pageUrl, webUrl: pageUrl } }
        ]
      });
      return;
    }catch(e){
      console.error('카카오톡 공유 실패:', e);
      /* 실패 시 아래 대체 방식으로 계속 진행 */
    }
  }

  const shareData = {
    title: '우신범 ♥ 김한아 결혼식에 초대합니다',
    text: '10월 31일 토요일, 저희 두 사람의 새로운 시작에 함께해 주세요.',
    url: pageUrl
  };
  if(navigator.share){
    try{
      await navigator.share(shareData);
    }catch(e){ /* 사용자가 공유를 취소한 경우 등 — 별도 처리 없음 */ }
  }else{
    await copyText(pageUrl);
    showToast('링크가 복사되었습니다. 카카오톡에 붙여넣어 공유해 보세요');
  }
}
async function shareCopyLink(){
  await copyText(window.location.href);
}

/* ---------- init ---------- */
loadGuestbook().then(renderGuestbookPreview);
