
let MAP, MARKERS = [];
let STATE = { lang: 'ja', tag: 'all', q: '' };
let DATA = { places: [], maps: [], i18n: {} };

async function loadData(){
  const [p,m,i] = await Promise.all([
    fetch('data/places.json').then(r=>r.json()),
    fetch('data/maps.json').then(r=>r.json()),
    fetch('data/i18n.json').then(r=>r.json())
  ]);
  DATA.places = p;
  DATA.maps = m;
  DATA.i18n = i;
}

function t(key){
  const lang = STATE.lang;
  return (DATA.i18n[key] && (DATA.i18n[key][lang] || DATA.i18n[key]['en'])) || key;
}

function initUI(){
  document.getElementById('app-title').textContent = t('app_title');
  document.getElementById('subtitle').textContent = t('subtitle');
  document.getElementById('search').placeholder = t('search_placeholder');
  document.getElementById('lbl-filters').textContent = t('filters');
  document.getElementById('lbl-collections').textContent = t('collections');
  document.getElementById('lbl-places').textContent = t('places');
  document.getElementById('lbl-language').textContent = t('language');

  // tag chips
  document.querySelectorAll('.chip').forEach(ch=>{
    if(ch.dataset.tag==='all'){
      ch.textContent = t('all');
    }
    ch.classList.toggle('active', ch.dataset.tag===STATE.tag);
    ch.onclick = ()=>{ STATE.tag = ch.dataset.tag; render(); };
  });

  // language switch
  const sel = document.getElementById('langSelect');
  sel.value = STATE.lang;
  sel.onchange = ()=>{ STATE.lang = sel.value; render(); }

  // search
  const s = document.getElementById('search');
  s.oninput = ()=>{ STATE.q = s.value.toLowerCase(); render(); }
}

function initMap(){
  MAP = L.map('map', { zoomControl: true }).setView([35.68,139.76], 5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(MAP);
}

function clearMarkers(){
  MARKERS.forEach(m=>MAP.removeLayer(m));
  MARKERS = [];
}

function renderCollections(){
  const ul = document.getElementById('collections');
  ul.innerHTML = '';
  DATA.maps.forEach(col=>{
    const li = document.createElement('li');
    li.innerHTML = `<div><strong>${col.title[STATE.lang] || col.title['en']}</strong></div>`;
    li.onclick = ()=>{
      // filter to those places
      const ids = new Set(col.place_ids);
      const subset = DATA.places.filter(p=>ids.has(p.id));
      if(subset.length){
        const b = L.featureGroup(subset.map(p=>L.marker([p.lat,p.lng]))).getBounds();
        MAP.fitBounds(b.pad(0.2));
      }
    };
    ul.appendChild(li);
  });
}

function renderListAndMarkers(){
  const ul = document.getElementById('list');
  ul.innerHTML = '';
  clearMarkers();

  const q = STATE.q;
  const tag = STATE.tag;

  const filtered = DATA.places.filter(p=>{
    const name = (p.name[STATE.lang] || p.name['en'] || '').toLowerCase();
    const city = (p.city||'').toLowerCase();
    const tags = (p.tags||[]).join(',').toLowerCase();
    const hitQ = !q || name.includes(q) || city.includes(q) || tags.includes(q);
    const hitTag = (tag==='all') || (p.tags||[]).includes(tag);
    return hitQ && hitTag;
  });

  const group = L.featureGroup();
  filtered.forEach(p=>{
    const li = document.createElement('li');
    const premiumBadge = p.is_premium ? `<span class="meta">★ ${t('premium_only')}</span>` : '';
    li.innerHTML = `
      <div><strong>${p.name[STATE.lang] || p.name['en']}</strong></div>
      <div class="meta">${p.city}, ${p.country} ${premiumBadge}</div>
      <div class="meta">${(p.comment[STATE.lang] || p.comment['en'] || '')}</div>
      <a class="btn" href="${p.gm_url}" target="_blank" rel="noopener">${t('open_in_maps')}</a>
    `;
    ul.appendChild(li);

    const marker = L.marker([p.lat,p.lng]).addTo(MAP);
    marker.bindPopup(`<strong>${p.name[STATE.lang] || p.name['en']}</strong><br>${p.city}, ${p.country}`);
    MARKERS.push(marker);
    group.addLayer(marker);

    li.onclick = ()=>{
      marker.openPopup();
      MAP.setView([p.lat,p.lng], 14, {animate:true});
    };
  });

  if(filtered.length){
    try{
      MAP.fitBounds(group.getBounds().pad(0.2));
    }catch(e){/* ignore if single */}
  }
}

async function main(){
  await loadData();
  initUI();
  initMap();
  render();
}

function render(){
  initUI();
  renderCollections();
  renderListAndMarkers();
}

main();
