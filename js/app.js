/* =====================================================================
   app.js — RENDU. Lit les tableaux de données (base.js, ex-*.js, cours.js, qcm.js)
   et les fonctions de calcul (calc.js). Aucune donnée de cours ici.
   ===================================================================== */
const $=(s,r=document)=>r.querySelector(s);
const K=(tex,disp)=>{ try{ if(window.katex) return katex.renderToString(tex,{displayMode:!!disp,throwOnError:false,strict:false}); }catch(e){} return `<code class="mfb">${tex}</code>`; };
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const store={get(k,d){try{const v=localStorage.getItem('apq:'+k);return v?JSON.parse(v):d;}catch(e){return d;}},set(k,v){try{localStorage.setItem('apq:'+k,JSON.stringify(v));}catch(e){}}};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const slug=s=>String(s).replace(/[^A-Za-z0-9]+/g,'-');

/* ---------- Index des exercices et questions (EXQ dérivé des exercices) ---------- */
const EXBY={}; EXERCISES.forEach(e=>{EXBY[e.id]=e; e.Q=e.qs(); e.Q.forEach(q=>q.sid=`st-${e.id}-${slug(q.q)}`);});
const SRC=id=>SOURCES.find(s=>s.id===id)||{};
/* Une entrée par question ET par sujet distinct : un sujet reconduit compte une fois par session, un fichier en double jamais. */
const EXQ=EXERCISES.flatMap(e=>e.Q.flatMap(q=>{const base={ex:e.id,type:e.type,q:q.q,titre:q.t,notions:q.notions||[],kind:q.kind||'',st:q.st};
  if(e.versions&&q.ver) return Object.entries(q.ver).map(([src,v])=>Object.assign({},base,{src,annee:SRC(src).annee,pts:v.pts||0}));
  return [Object.assign({},base,{src:e.src,annee:e.annee,pts:q.pts||0})];}));
const exLabel=e=>e.versions?'Examens '+e.versions.map(v=>SRC(v.src).annee).join(' + '):e.src.replace('E','Examen ');
const exYears=e=>e.versions?e.versions.map(v=>SRC(v.src).annee):[e.annee];
const nq=s=>String(s).replace(/^Q/i,'').toLowerCase();
function resolveRef(ref){ const [eid,qr]=String(ref).split(':'); const e=EXBY[eid]; if(!e) return null; if(!qr) return {e};
  const r=nq(qr); let q=e.Q.find(x=>nq(x.q)===r);
  if(!q) q=e.Q.find(x=>{const a=nq(x.q); return a.replace(/[a-z]?-[a-z0-9.]+$/,'')===r.replace(/[a-z]$/,'')&&a.includes('-');});
  if(!q) q=e.Q.find(x=>nq(x.q).startsWith(r)||r.startsWith(nq(x.q)));
  return {e,q}; }
const refLabel=ref=>{const r=resolveRef(ref); if(!r) return ref; return exLabel(r.e)+(r.q?' · '+r.q.q:'');};
const refChip=ref=>{const r=resolveRef(ref); if(!r) return ''; return `<a href="#exercices" class="chip" data-go="exercices:${r.e.id}/${r.q?r.q.sid:''}">${refLabel(ref)}</a>`;};

/* ---------- État ---------- */
const state={
  tab:'parcours', ex:store.get('ex','td1'),
  status:store.get('status',{}), stars:Object.assign({},STAR_DEFAULT,store.get('stars',{})),
  qstats:store.get('qstats',{}), errors:store.get('errors',[]),
  srcFilter:{formule:true,exercice:true,cours:true}, qNotion:'', vigFilter:'Tous', vigNotion:'', fTheme:'', exF:{type:'',annee:'',notion:'',diff:'',st:''}, coursF:'indispensable',
  quiz:null,timer:null, labs:{}, conv:'minus', variants:{}
};
const STATUS=[['none','Pas commencé'],['revoir','À revoir'],['cours','En cours'],['maitrise','Maîtrisé']];
const STATUS_COLOR={none:'var(--line-strong)',revoir:'var(--warn)',cours:'var(--accent)',maitrise:'var(--ok)'};
const ST_LABEL={off:['Corrigé officiel (recalculé)','ok'],offx:['Corrigé officiel · écart signalé','warn'],rec:['Corrigé reconstitué par Claude','src'],part:['Partiel · à compléter','todo'],todo:['À compléter','todo']};
const ICONS={
 parcours:'<path d="M4 19h16M7 16V10m5 6V5m5 11v-4"/>',exercices:'<path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/>',formules:'<path d="M18 5H7l6 7-6 7h11"/>',
 vigilance:'<path d="M12 4 3 20h18L12 4z"/><path d="M12 10v4m0 3v.01"/>',cours:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>',
 qcm:'<rect x="4.5" y="4.5" width="15" height="15" rx="2"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',examens:'<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',fiche:'<path d="m12 4 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8z"/>'};
const TABS=[['parcours','Parcours','Parcours'],['exercices','Exercices','Exos'],['formules','Formules','Formules'],['vigilance','Vigilance','Pièges'],['cours','Cours ciblé','Cours'],['qcm','QCM','QCM'],['examens','Examens','Examens'],['fiche','Fiche','Fiche']];
const icon=id=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[id]}</svg>`;

/* ---------- Petits composants ---------- */
const chip=(t,c='')=>`<span class="chip ${c}">${t}</span>`;
const notionName=id=>(NOTIONS.find(n=>n.id===id)||{nom:id}).nom;
const goChip=(tab,id,label)=>`<a href="#${tab}" class="chip" data-go="${tab}:${id}">${label}</a>`;
const vigChip=id=>{const v=VIG.find(x=>x.id===id); return v?goChip('vigilance',id,'⚠ '+v.titre.split(':')[0]):'';};
const stChip=st=>{const s=ST_LABEL[st]||ST_LABEL.rec; return chip(s[0],s[1]);};
const pagehead=(eyebrow,title,sub,right='')=>`<div class="pagehead"><div><div class="eyebrow">${eyebrow}</div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${right}</div>`;
const srcOfNotion=id=>[...new Set(EXQ.filter(e=>e.notions.includes(id)).map(e=>e.src))];
const weight=id=>srcOfNotion(id).reduce((s,x)=>s+(SRC(x).type==='Examen'?2:1),0); // sujets distincts : examen = 2, TD = 1
const nExamSrc=id=>srcOfNotion(id).filter(x=>SRC(x).type==='Examen').length;
const N_EXAMS=SOURCES.filter(s=>s.type==='Examen').length;
const examPts=id=>EXQ.filter(e=>e.type==='Examen'&&e.notions.includes(id)).reduce((s,e)=>s+(e.pts||0),0);
const exOfNotion=id=>[...new Set(EXQ.filter(e=>e.notions.includes(id)).map(e=>e.ex))];
const sel=(id,opts,val,label)=>`<label class="fsel"><span>${label}</span><select data-f="${id}">${opts.map(([v,l])=>`<option value="${v}" ${val===v?'selected':''}>${l}</option>`).join('')}</select></label>`;

function brandTrace(){const w=46,h=34,n=160;let d='';for(let i=0;i<=n;i++){const t=i/n*5.2*D.TD,x=2+i/n*(w-4),y=h/2-ut(D,t,'minus')/D.U*(h/2-3);d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1);}
  return `<line x1="0" y1="${h/2}" x2="${w}" y2="${h/2}" stroke="var(--line-strong)" stroke-width="1"/><path d="${d}" fill="none" stroke="var(--trace)" stroke-width="1.8" stroke-linejoin="round"/>`;}

/* ---------- Figures ---------- */
const FIG={
 silo:()=>`<svg class="silo" viewBox="0 0 320 250" role="img" aria-label="Schéma du silo : plaque rigide de masse m sur quatre colonnes de hauteur h, déplacée par la force P">
 <defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="var(--muted)" stroke-width="1.2"/></pattern></defs>
 <rect x="40" y="204" width="210" height="12" fill="url(#hatch)"/><line x1="40" y1="204" x2="250" y2="204" stroke="var(--ink)" stroke-width="2.5"/>
 <g stroke="var(--muted)" stroke-width="1.6" fill="none" stroke-dasharray="5 4"><path d="M76 204 C76 160, 96 140, 96 104"/><path d="M90 204 C90 160, 110 140, 110 104"/><path d="M196 204 C196 160, 216 140, 216 104"/><path d="M210 204 C210 160, 230 140, 230 104"/><rect x="80" y="58" width="166" height="46" rx="2"/></g>
 <g stroke="var(--ink)" stroke-width="3"><line x1="76" y1="104" x2="76" y2="204"/><line x1="90" y1="104" x2="90" y2="204"/><line x1="196" y1="104" x2="196" y2="204"/><line x1="210" y1="104" x2="210" y2="204"/></g>
 <rect x="60" y="58" width="166" height="46" rx="2" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2.2"/><text x="143" y="86" text-anchor="middle" style="font-size:17px;font-style:italic;font-weight:600">m</text>
 <line x1="226" y1="81" x2="282" y2="81" stroke="var(--trace)" stroke-width="2.4"/><path d="M290 81 l-11 -6 v12z" fill="var(--trace)"/><text x="268" y="72" style="font-size:15px;font-style:italic;font-weight:600;fill:var(--trace)">P</text>
 <line x1="60" y1="38" x2="104" y2="38" stroke="var(--accent)" stroke-width="1.6"/><path d="M110 38 l-9 -5 v10z" fill="var(--accent)"/><text x="116" y="43" style="font-size:14px;font-style:italic;fill:var(--accent)">u(t)</text>
 <g stroke="var(--muted)" stroke-width="1.2"><line x1="34" y1="104" x2="34" y2="204"/><line x1="28" y1="104" x2="54" y2="104"/><line x1="28" y1="204" x2="40" y2="204"/></g><text x="20" y="160" style="font-size:15px;font-style:italic">h</text>
 <text x="160" y="238" text-anchor="middle" style="font-size:12px;fill:var(--muted)">4 colonnes a × a encastrées en pied</text><text x="143" y="22" text-anchor="middle" style="font-size:11.5px;fill:var(--muted)">plaque rigide</text></svg>`,
 tank:()=>`<svg class="silo" viewBox="0 0 320 260" role="img" aria-label="Château d'eau : réservoir de 150 t sur un fût creux de 15 m, modèle console 3EI/L³">
 <rect x="40" y="226" width="240" height="10" fill="var(--sunken)" stroke="var(--ink)"/><rect x="110" y="70" width="40" height="156" fill="var(--sunken)" stroke="var(--ink)" stroke-width="2"/><rect x="118" y="70" width="24" height="156" fill="var(--surface)" stroke="var(--muted)" stroke-dasharray="3 3"/>
 <path d="M80 70 h100 l-10 -46 h-80z" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><text x="130" y="54" text-anchor="middle" style="font-size:13px;font-weight:600">M_rés = 150 t</text>
 <line x1="180" y1="44" x2="232" y2="44" stroke="var(--trace)" stroke-width="2.4"/><path d="M240 44 l-10 -6 v12z" fill="var(--trace)"/><text x="214" y="36" style="font-size:13px;fill:var(--trace);font-style:italic">F = M·Sa</text>
 <g stroke="var(--muted)"><line x1="70" y1="70" x2="70" y2="226"/></g><text x="56" y="152" style="font-size:13px;font-style:italic">L = 15 m</text>
 <text x="200" y="140" style="font-size:12px">D = 2,00 m</text><text x="200" y="156" style="font-size:12px">e = 0,30 m</text><text x="200" y="172" style="font-size:12px">C25/30</text><text x="200" y="196" style="font-size:12px;fill:var(--accent)">K = 3EI/L³</text></svg>`,
 bridge:()=>`<svg class="silo" viewBox="0 0 340 200" role="img" aria-label="Pont-dalle à 3 travées : tablier sur 2 piles et 2 culées, néoprènes, butées transversales sur culées">
 <rect x="10" y="50" width="320" height="16" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="2"/><text x="170" y="42" text-anchor="middle" style="font-size:12px">tablier 12,25 m × 0,60 m (diaphragme rigide)</text>
 ${[[24,4],[112,5.5],[228,5.5],[316,4]].map(([x,h],i)=>`<rect x="${x-7}" y="66" width="14" height="5" fill="var(--ink)"/><rect x="${x-5}" y="71" width="10" height="${h*18}" fill="var(--sunken)" stroke="var(--ink)" stroke-width="1.6"/><text x="${x+(i<2?9:-9)}" y="150" text-anchor="${i<2?'start':'end'}" style="font-size:11px">${i===0||i===3?'culée':'pile'}</text>`).join('')}
 <line x1="0" y1="174" x2="340" y2="174" stroke="var(--ink)" stroke-width="2"/>
 <text x="68" y="110" text-anchor="middle" style="font-size:11px;fill:var(--muted)">9,715</text><text x="170" y="110" text-anchor="middle" style="font-size:11px;fill:var(--muted)">16,191</text><text x="272" y="110" text-anchor="middle" style="font-size:11px;fill:var(--muted)">9,715</text>
 <text x="170" y="194" text-anchor="middle" style="font-size:11px;fill:var(--muted)">néoprènes (noir) : 40×40 sur piles, 40×35 sur culées, e = 60 mm</text></svg>`,
 brochette:()=>{const c=C4,m=c.modes;const col=(V,x0,lab)=>{const s=V.map(v=>v/Math.max(...V.map(Math.abs)));const ys=[40,100,160];return `<line x1="${x0}" y1="210" x2="${x0}" y2="30" stroke="var(--line-strong)" stroke-dasharray="3 3"/><path d="M${x0} 210 ${s.map((v,i)=>`L${(x0+v*38).toFixed(1)} ${ys[i]}`).join(' ').replace(/^/,'')}" fill="none" stroke="var(--trace)" stroke-width="2"/>${s.map((v,i)=>`<circle cx="${(x0+v*38).toFixed(1)}" cy="${ys[i]}" r="5" fill="var(--accent)"/>`).join('')}<text x="${x0}" y="236" text-anchor="middle" style="font-size:12px">${lab}</text>`;};
  return `<svg class="silo" viewBox="0 0 330 250" role="img" aria-label="Déformées des 3 modes de la brochette à 3 ddl"><line x1="10" y1="210" x2="320" y2="210" stroke="var(--ink)" stroke-width="2"/>${col(m[0].V,60,'mode 1 · '+nf(m[0].T,2)+' s')}${col(m[1].V,165,'mode 2 · '+nf(m[1].T,2)+' s')}${col(m[2].V,270,'mode 3 · '+nf(m[2].T,2)+' s')}</svg>`;},
 plan5:()=>`<svg class="silo" viewBox="0 0 320 220" role="img" aria-label="Plan du bâtiment 26 × 16 m avec 2 voiles par direction en façade">
 <rect x="30" y="30" width="260" height="160" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.5"/>
 <rect x="130" y="26" width="60" height="8" fill="var(--accent)"/><rect x="130" y="186" width="60" height="8" fill="var(--accent)"/><rect x="26" y="80" width="8" height="60" fill="var(--trace)"/><rect x="286" y="80" width="8" height="60" fill="var(--trace)"/>
 <circle cx="160" cy="110" r="4" fill="var(--ink)"/><text x="168" y="106" style="font-size:12px">G = C</text>
 <text x="160" y="18" text-anchor="middle" style="font-size:12px;fill:var(--accent)">voiles // X (6 m), à ±8 m</text><text x="160" y="212" text-anchor="middle" style="font-size:12px">26 m (X) × 16 m (Y)</text><text x="300" y="72" style="font-size:12px;fill:var(--trace)">// Y à ±13 m</text></svg>`,
 plan21:()=>{const X=x=>20+x*8.6, Y=y=>170-y*9.5; const yl={A:0,B:3.1,C:6.1,D:11.9,E:15.4};
  const wx=[['E',0,5.6,'L1'],['C',0,5.6,'L2'],['D',26,31.6,'L3'],['B',26,31.6,'L4']];
  const wy=[[0,'C','E','T1'],[5.6,'A','C','T2'],[10.8,'C','D','T3'],[13.8,'C','D','T4'],[26,'D','E','T5'],[26,'A','B','T6']];
  return `<svg class="silo" viewBox="0 0 320 200" role="img" aria-label="Plan simplifié de l'examen 2021 : voiles L1 à L4 suivant X et T1 à T6 suivant Y"><rect x="${X(0)}" y="${Y(15.4)}" width="${X(31.6)-X(0)}" height="${Y(0)-Y(15.4)}" fill="var(--surface)" stroke="var(--line-strong)"/>
  ${wx.map(([f,a,b,l])=>`<line x1="${X(a)}" y1="${Y(yl[f])}" x2="${X(b)}" y2="${Y(yl[f])}" stroke="var(--accent)" stroke-width="4"/><text x="${(X(a)+X(b))/2}" y="${Y(yl[f])-4}" text-anchor="middle" style="font-size:10px;fill:var(--accent)">${l}</text>`).join('')}
  ${wy.map(([x,a,b,l])=>`<line x1="${X(x)}" y1="${Y(yl[a])}" x2="${X(x)}" y2="${Y(yl[b])}" stroke="var(--trace)" stroke-width="4"/><text x="${X(x)+4}" y="${(Y(yl[a])+Y(yl[b]))/2}" style="font-size:10px;fill:var(--trace)">${l}</text>`).join('')}
  <line x1="${X(CE21.XCT)}" y1="${Y(15.4)-6}" x2="${X(CE21.XCT)}" y2="${Y(0)+6}" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="${X(CE21.XCT)+3}" y="${Y(0)+16}" style="font-size:10px">X_CT ≈ ${nf(CE21.XCT,3)} m</text>
  <line x1="${X(15.53)}" y1="${Y(15.4)-6}" x2="${X(15.53)}" y2="${Y(0)+6}" stroke="var(--muted)" stroke-dasharray="1 3"/><text x="${X(15.53)+3}" y="${Y(15.4)-8}" style="font-size:10px">X_G = 15,53</text>
  <text x="160" y="196" text-anchor="middle" style="font-size:10px;fill:var(--muted)">31,60 × 15,40 m · lecture du plan à confirmer</text></svg>`;},
 spectre22:()=>{const W=320,H=200,L=36,B=24,T=10,X=t=>L+t/1.6*(W-L-8),Y=v=>H-B-v/3.2*(H-B-T);const c1=calcE22(E22P),c2=calcE22(Object.assign({},E22P,{withGammaI:false}));const sp=(c)=>({ag:c.ag,S:1.2,TB:.15,TC:.5,TD:2,q:4});
  const path=c=>{let d='';for(let i=0;i<=160;i++){const t=1.6*i/160;d+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(sdEC8(t,sp(c))).toFixed(1);}return d;};
  return `<svg class="silo" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spectre 2022 : avec γI (palier 2,7) et tracé de l'énoncé sans γI (palier 2,25)">${[0,1,2,3].map(v=>`<line class="ax" x1="${L}" x2="${W-8}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-5}" y="${Y(v)+4}" text-anchor="end">${v}</text>`).join('')}${[0,0.5,1,1.5].map(t=>`<text x="${X(t)}" y="${H-8}" text-anchor="middle">${nf(t,2)}</text>`).join('')}
  <path d="${path(c1)}" fill="none" stroke="var(--trace)" stroke-width="2"/><path d="${path(c2)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4"/><line x1="${X(c1.T1)}" x2="${X(c1.T1)}" y1="${Y(0)}" y2="${Y(3.2)}" stroke="var(--ink)" stroke-dasharray="2 3"/>
  <text class="lbl tr" x="${X(.18)}" y="${Y(2.7)-6}">avec γI : 2,7</text><text class="lbl acc" x="${X(.55)}" y="${Y(2.25)+16}">énoncé : 2,25</text><text class="lbl" x="${X(c1.T1)+4}" y="${Y(3)}">T₁ = ${nf(c1.T1,3)} s</text></svg>`;},
 plan24:()=>`<svg class="silo" viewBox="0 0 320 210" role="img" aria-label="Plan 30 × 18 m : portiques en files A et D, palées en files 1 et 5, centre de torsion x = 12 m, centre de masse x = 15 m">
 <rect x="20" y="30" width="270" height="150" fill="var(--surface)" stroke="var(--line-strong)"/>${[0,1,2,3,4,5].map(i=>`<line x1="${20+i*54}" y1="30" x2="${20+i*54}" y2="180" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${20+i*54}" y="196" text-anchor="middle" style="font-size:10px">${i+1}</text>`).join('')}
 <line x1="20" y1="180" x2="290" y2="180" stroke="var(--accent)" stroke-width="4"/><line x1="20" y1="30" x2="290" y2="30" stroke="var(--accent)" stroke-width="4"/><text x="296" y="184" style="font-size:10px">A</text><text x="296" y="34" style="font-size:10px">D</text>
 <line x1="20" y1="80" x2="20" y2="130" stroke="var(--trace)" stroke-width="5"/><line x1="236" y1="80" x2="236" y2="130" stroke="var(--trace)" stroke-width="5"/>
 <line x1="128" y1="24" x2="128" y2="186" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="124" y="20" text-anchor="end" style="font-size:10px">C (x = 12)</text><line x1="155" y1="24" x2="155" y2="186" stroke="var(--muted)" stroke-dasharray="1 3"/><text x="159" y="20" style="font-size:10px">G (x = 15)</text>
 <text x="160" y="110" text-anchor="middle" style="font-size:11px;fill:var(--muted)">e₀,x = 3 m + eₐ = 1,5 m</text></svg>`
};

/* ---------- Graphiques ---------- */
function niceStep(range,target){const raw=range/target,p=Math.pow(10,Math.floor(Math.log10(raw))),m=raw/p;return (m<1.5?1:m<3?2:m<7?5:10)*p;}
function plotSpec(o,W){ // o:{fn,Tmax,marks:[[T,label]],title}
  W=Math.max(300,Math.round(W||640)); const sm=W<560,H=sm?220:260,L=44,R=12,T=24,B=32;
  let ymax=0; for(let i=0;i<=200;i++) ymax=Math.max(ymax,o.fn(o.Tmax*i/200)); ymax*=1.18;
  const X=t=>L+t/o.Tmax*(W-L-R), Y=v=>H-B-v/ymax*(H-B-T); let d='';
  for(let i=0;i<=300;i++){const t=o.Tmax*i/300; d+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(o.fn(t)).toFixed(1);}
  const xs=niceStep(o.Tmax,sm?5:8), ys=niceStep(ymax,4); let g='';
  for(let t=0;t<=o.Tmax+1e-9;t+=xs) g+=`<line class="ax" x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${H-B}"/><text x="${X(t)}" y="${H-B+15}" text-anchor="middle">${nf(+t.toFixed(6),3)}</text>`;
  for(let v=0;v<=ymax+1e-9;v+=ys) g+=`<line class="${v===0?'zero':'ax'}" x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-6}" y="${Y(v)+4}" text-anchor="end">${nf(+v.toFixed(6),3)}</text>`;
  const mk=(o.marks||[]).map(([t,lab],i)=>{const v=o.fn(t);return `<line class="drop" x1="${X(t)}" x2="${X(t)}" y1="${Y(v)}" y2="${H-B}"/><circle cx="${X(t)}" cy="${Y(v)}" r="5.5" fill="var(--trace)" stroke="var(--sunken)" stroke-width="2"/><text class="lbl tr" x="${Math.min(X(t)+8,W-120)}" y="${Y(v)-10-(i%2)*14}" font-weight="600">${lab} : ${nf(v,3)} m/s²</text>`;}).join('');
  return `<div class="plotbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title||'Spectre')}">${g}<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.2"/>${mk}<text x="${W-R}" y="${H-3}" text-anchor="end">T (s)</text><text x="4" y="${T-8}">Sa (m/s²)</text></svg></div>`;
}
function plotUt(c,conv,t1,W){
  W=Math.max(300,Math.round(W||680)); const sm=W<560,H=sm?260:330,L=sm?46:54,R=sm?10:18,T=30,B=34;
  const n=c.p.n,tmax=Math.max(n*c.TD*1.15,t1*1.1,3*c.TD),A=c.U*1000,ymax=A*1.18,half=(H-T-B)/2,mid=T+half,X=t=>L+(t/tmax)*(W-L-R),Y=v=>mid-(v/ymax)*half;
  let cu='',ep='',em='';for(let i=0;i<=700;i++){const t=tmax*i/700,e=A*Math.exp(-c.xi*c.w0*t);cu+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(ut(c,t,conv)*1000).toFixed(1);ep+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(e).toFixed(1);em+=(i?'L':'M')+X(t).toFixed(1)+' '+Y(-e).toFixed(1);}
  const xs=niceStep(tmax,sm?5:9),ys=niceStep(2*ymax,sm?4:6);let g='';
  for(let t=0;t<=tmax+1e-9;t+=xs/5)g+=`<line class="gmin" x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${H-B}"/>`;
  for(let t=0;t<=tmax+1e-9;t+=xs)g+=`<line class="ax" x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${H-B}"/><text x="${X(t)}" y="${H-B+16}" text-anchor="middle">${nf(+t.toFixed(6),3)}</text>`;
  const yk=Math.floor(ymax/ys);for(let k=-yk;k<=yk;k++){const v=k*ys;g+=`<line class="${k===0?'zero':'ax'}" x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L-7}" y="${Y(v)+4}" text-anchor="end">${nf(+v.toFixed(6),3)}</text>`;}
  const tn_=n*c.TD,un=ut(c,tn_,conv)*1000,u1=ut(c,t1,conv)*1000,u00=ut(c,0,conv)*1000,tp1=(conv==='minus'?c.phi:-c.phi)/c.wD+c.TD,tp2=tp1+c.TD,ya=Y(A*Math.exp(-c.xi*c.w0*tp1))-12;
  const lx=(x)=>Math.max(x,L+90),ly1=u1<0?Math.min(Y(u1)+20,H-B-6):Math.max(Y(u1)-12,T+12),anc1=X(t1)>W*0.7?'end':'start';
  return `<div class="plotbox"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe u(t) en mm avec enveloppe ; u(t₁) = ${nf(u1,3)} mm">${g}<path class="env" d="${ep}"/><path class="env" d="${em}"/><path class="curve" d="${cu}"/>
   ${tp2<tmax?`<g stroke="var(--ink)" stroke-width="1.2"><line x1="${X(tp1)}" x2="${X(tp2)}" y1="${ya}" y2="${ya}"/><line x1="${X(tp1)}" x2="${X(tp1)}" y1="${ya-5}" y2="${ya+5}"/><line x1="${X(tp2)}" x2="${X(tp2)}" y1="${ya-5}" y2="${ya+5}"/></g><text class="lbl" x="${(X(tp1)+X(tp2))/2}" y="${ya-7}" text-anchor="middle">T<tspan dy="3" font-size="9.5">D</tspan><tspan dy="-3"> = ${nf(c.TD,3)} s</tspan></text>`:''}
   <circle cx="${X(0)}" cy="${Y(u00)}" r="4.5" fill="var(--accent)"/><text class="lbl acc" x="${X(0)+9}" y="${Y(u00)-8}">u₀ = ${nf(u00,3)} mm</text>
   <text class="lbl acc" x="${X(tmax*0.72)}" y="${Y(-A*Math.exp(-c.xi*c.w0*tmax*0.72))+20}" text-anchor="middle">−U·e<tspan dy="-5" font-size="9.5">−ξω₀t</tspan></text>
   <path d="M${X(tn_)} ${Y(un)-6} l6 6 l-6 6 l-6 -6z" fill="var(--ink)"/><text class="lbl" x="${lx(X(tn_))}" y="${Y(un)-12}" text-anchor="end">u(n·T<tspan dy="3" font-size="9.5">D</tspan><tspan dy="-3">) = ${nf(un,3)} mm</tspan></text>
   <line class="drop" x1="${X(t1)}" x2="${X(t1)}" y1="${Y(u1)}" y2="${H-B}"/><circle cx="${X(t1)}" cy="${Y(u1)}" r="6" fill="var(--trace)" stroke="var(--sunken)" stroke-width="2"/><text class="lbl tr" x="${X(t1)+(anc1==='end'?-10:10)}" y="${ly1}" text-anchor="${anc1}" font-weight="600">u(t₁) = ${nf(u1,3)} mm</text>
   <text x="${W-R}" y="${H-4}" text-anchor="end">t (s)</text><text x="4" y="${T-12}">u (mm)</text></svg></div>
   <div class="legend"><span><i></i>u(t)</span><span><i class="e"></i>enveloppe ±U·e<sup>−ξω₀t</sup></span><span><i class="d"></i>u(n·T<sub>D</sub>) = ${nf(un,3)} mm</span><span><i class="p"></i>u(t₁) = ${nf(u1,3)} mm à t₁ = ${nf(t1,3)} s</span></div>`;
}

/* ---------- Laboratoires et variantes (tout passe par les fonctions de calc.js) ---------- */
const sp5=c=>({ag:c.ag,S:c.p.S,TB:c.p.TB,TC:c.p.TC,TD:c.p.TD,q:c.p.q});
const LABS={
 td1:{base:TD1,calc:calc,fields:[['P','P (kN)'],['h','h (m)'],['a','a (m)'],['E','E (MPa)'],['m','m (t)'],['nc','Colonnes'],['n','n (cycles)'],['ratio','u₁/u₀'],['t1','t₁ (s)']],check:p=>p.ratio<1,
  out:c=>[['k (kN/m)',nf(c.k/1e3,5)],['u₀ (mm)',nf(c.u0*1000,4)],['ξ',nf(c.xi,4)],['ω₀ (rad/s)',nf(c.w0,5)],['T₀ (s)',nf(c.T0,4)],['ω_D (rad/s)',nf(c.wD,5)],['U (mm)',nf(c.U*1000,4)],['φ (rad)',nf(c.phi,4)],['u(t₁) (mm)',nf(ut(c,c.p.t1,state.conv)*1000,4),1],['u̇(0) (m/s)',nf(v0(c,state.conv),3)]],plot:(c,W)=>plotUt(c,state.conv,c.p.t1,W),conv:true},
 td2:{base:TD2P,calc:calcTD2,fields:[['D','D (m)'],['ep','e (m)'],['L','L (m)'],['E','E (MPa)'],['Mres','M réservoir (t)'],['plat','Palier (m/s²)'],['TC','Fin palier (s)']],check:p=>p.ep<p.D/2,
  out:c=>[['K (MN/m)',nf(c.K/1e6,4)],['M_sis (t)',nf(c.Msis,4)],['T (s)',nf(c.T,3)],['Sa (m/s²)',nf(c.Sa,3)],['F (MN)',nf(c.F/1e6,3),1],['x (mm)',nf(c.x*1e3,3)],['M pied (MN·m)',nf(c.M/1e6,3)],['N pied (kN)',nf(c.N,4)]],
  plot:(c,W)=>plotSpec({fn:T=>T<=c.p.TC?c.p.plat:c.p.plat*Math.pow(c.p.TC/T,2/3),Tmax:Math.max(2,c.T*1.4),marks:[[c.T,'T = '+nf(c.T,3)+' s']],title:'Spectre du TD2'},W)},
 td3:{base:TD3P,calc:calcTD3,fields:[['G','G néoprène (MPa)'],['e','e néoprène (m)'],['fck','fck (MPa)'],['eq','Équipements (t/ml)'],['frac','Part des piles'],['plat','Palier (m/s²)']],
  out:c=>[['k pile X (MN/m)',nf(c.kp,3)],['k culée X (MN/m)',nf(c.kcul,3)],['k pont X (MN/m)',nf(c.kX,3)],['M (t)',nf(c.Mtot,4)],['T_X (s)',nf(c.TX,3)],['a_X (m/s²)',nf(c.aX,3)],['F_X (MN)',nf(c.FX,3),1],['X (mm)',nf(c.dX*1e3,3)],['T_Y (s)',nf(c.TY,3)],['F_Y (MN)',nf(c.FY,3)]],
  plot:(c,W)=>plotSpec({fn:T=>T<=c.p.TC?c.p.plat:c.p.plat*c.p.TC/T,Tmax:Math.max(1.6,c.TX*1.4),marks:[[c.TY,'T_Y'],[c.TX,'T_X']],title:'Spectre du TD3'},W)},
 td4:{base:TD4P,calc:calcTD4,fields:[['fck','fck (MPa)'],['red','Réduction E (fissuration)'],['t','Épaisseur voile (m)'],['b','Largeur voile (m)'],['h','Hauteur d\'étage (m)'],['m','m (t)'],['plat','Palier (m/s²)'],['q','q']],
  out:c=>[...c.modes.map((m,i)=>['T'+(i+1)+' (s) · % masse',nf(m.T,3)+' · '+nf(m.Mmod/c.Mtot*100,3)+' %']),['V SRSS (kN)',nf(c.Vsrss,4),1],['M SRSS (kN·m)',nf(c.Msrss,4)],['u haut mode 1 (mm)',nf(c.modes[0].u[0]*1e3,3)],['SRSS valable',c.cqcOK?'oui':'non → CQC']],
  plot:(c,W)=>plotSpec({fn:c.Sa,Tmax:Math.max(1,c.modes[0].T*1.5),marks:c.modes.map((m,i)=>[m.T,'T'+(i+1)]),title:'Spectre du TD4'},W)},
 td5:{base:TD5P,calc:calcTD5,fields:[['G','G (kN)'],['CP','G₂ (kN)'],['Q','Q (kN)'],['phi','φ'],['w1','ω₁ (rad/s)'],['q','q'],['agR','agR (m/s²)'],['gI','γI']],
  out:c=>[['M_E (t)',nf(c.ME,4)],['T₁ (s)',nf(c.T1,3)],['Sd(T₁) (m/s²)',nf(c.Sd,3)],['λ',nf(c.lam,2)],['Fd (kN)',nf(c.Fd,4),1],['z éq. (m)',nf(c.zeq,3)],['V voile + torsion (kN)',nf(c.VEd,4)],['θ',nf(c.theta,2)]],
  plot:(c,W)=>plotSpec({fn:T=>sdEC8(T,sp5(c)),Tmax:2.4,marks:[[c.T1,'T₁ Robot'],[c.T1ec,'T₁ EC8']],title:'Spectre de calcul du TD5'},W)},
 e2022:{base:E22P,calc:calcE22,fields:[['q','q'],['agR','agR (m/s²)'],['gI','γI']],toggle:['withGammaI','Inclure γI dans ag'],
  out:c=>[['Palier (m/s²)',nf(c.plat,3)],['T₁ (s)',nf(c.T1,3)],['Sd(T₁) (m/s²)',nf(c.Sd,3)],['Fd (kN)',nf(c.Fd,4),1],['Z_E par palée (kN)',nf(c.ZE,4)],['Z_E × δ (kN)',nf(c.ZEm,4)],['σ diagonale (MPa)',nf(c.sig,3)]],
  plot:(c,W)=>plotSpec({fn:T=>sdEC8(T,{ag:c.ag,S:c.p.S,TB:c.p.TB,TC:c.p.TC,TD:c.p.TD,q:c.p.q}),Tmax:1.6,marks:[[c.T1,'T₁']],title:'Spectre 2022'},W)}
};
const R=(a)=>a[Math.floor(Math.random()*a.length)];
const VARIANTS={
 td1:{gen:()=>({P:R([100,150,200,250,300]),h:R([3,4,5,6]),a:R([0.25,0.3,0.35,0.4]),E:21000,m:R([50,80,100,120,150]),nc:4,n:R([3,4,5,6,8]),ratio:R([0.5,0.25,0.1,0.05]),t1:R([1,1.5,2,3])}),calc:calc,
  txt:v=>`Silo sur ${v.nc} colonnes ${nf(v.a,3)} × ${nf(v.a,3)} m, h = ${nf(v.h,3)} m, m = ${nf(v.m,3)} t, E = ${nf(v.E,5)} MPa, P = ${nf(v.P,3)} kN. Amplitude réduite à ${nf(v.ratio,3)}·u₀ après n = ${v.n} oscillations. Calculer k, u₀, ξ, ω₀, T₀, ω_D, u(t) et u(${nf(v.t1,3)} s).`,
  res:c=>[['k (kN/m)',nf(c.k/1e3,5)],['u₀ (mm)',nf(c.u0*1000,4)],['ξ',nf(c.xi,4)],['ω₀ (rad/s)',nf(c.w0,5)],['T₀ (s)',nf(c.T0,4)],['ω_D (rad/s)',nf(c.wD,5)],['U (mm) · φ (rad)',nf(c.U*1000,4)+' · '+nf(c.phi,4)],['u(t₁) (mm), forme −φ',nf(ut(c,c.p.t1,'minus')*1000,4)]]},
 td2:{gen:()=>Object.assign({},TD2P,{D:R([1.6,1.8,2.0,2.2,2.4]),ep:R([0.2,0.25,0.3]),L:R([12,15,18,20]),Mres:R([100,150,200,250])}),calc:calcTD2,
  txt:v=>`Château d'eau : fût creux D = ${nf(v.D,3)} m, e = ${nf(v.ep,3)} m, L = ${nf(v.L,3)} m, Ecm = 31 GPa ; réservoir ${nf(v.Mres,3)} t. Même spectre (5 m/s² jusqu'à 0,4 s, puis 5(0,4/T)^(2/3)). Calculer K, M_sis, T, Sa, F, x et M en pied.`,
  res:c=>[['K (MN/m)',nf(c.K/1e6,4)],['M_sis (t)',nf(c.Msis,4)],['T (s)',nf(c.T,3)],['Sa (m/s²)',nf(c.Sa,3)],['F (MN)',nf(c.F/1e6,3)],['x (mm)',nf(c.x*1e3,3)],['M pied (MN·m)',nf(c.M/1e6,3)]]},
 td3:{gen:()=>Object.assign({},TD3P,{G:R([0.9,1.0,1.1,1.2]),e:R([0.05,0.06,0.07,0.08]),fck:R([30,35,40]),eq:R([4.0,4.7,5.5])}),calc:calcTD3,
  txt:v=>`Même pont, avec G = ${nf(v.G,3)} MPa, néoprènes de ${nf(v.e*1000,3)} mm, fck = ${nf(v.fck,3)} MPa et ${nf(v.eq,3)} t/ml d'équipements. Calculer les raideurs (pile, culée, pont) en X, la masse, T_X, l'effort et le déplacement, puis T_Y et F_Y.`,
  res:c=>[['k pile (MN/m)',nf(c.kp,3)],['k culée (MN/m)',nf(c.kcul,3)],['k_X (MN/m)',nf(c.kX,3)],['M (t)',nf(c.Mtot,4)],['T_X (s)',nf(c.TX,3)],['F_X (MN) · X (mm)',nf(c.FX,3)+' · '+nf(c.dX*1e3,3)],['T_Y (s) · F_Y (MN)',nf(c.TY,3)+' · '+nf(c.FY,3)]]},
 td4:{gen:()=>Object.assign({},TD4P,{m:R([80,100,120]),h:R([8,10,12]),t:R([0.18,0.2,0.25])}),calc:calcTD4,
  txt:v=>`Brochette à 3 niveaux de ${nf(v.h,3)} m, masses ${nf(v.m,3)} / ${nf(v.m,3)} / ${nf(v.m/2,3)} t, voiles équivalents 2 × (${nf(6*v.t,3)} × 3,67 m), E = Ecm/2 (C30). Même spectre. Calculer périodes, masses modales, efforts modaux et V, M en SRSS.`,
  res:c=>[...c.modes.map((m,i)=>['Mode '+(i+1)+' : T (s) · Mmod (t)',nf(m.T,3)+' · '+nf(m.Mmod,4)]),['V SRSS (kN)',nf(c.Vsrss,4)],['M SRSS (kN·m)',nf(c.Msrss,4)]]},
 td5:{gen:()=>Object.assign({},TD5P,{w1:R([8.5,10.74,12,14]),q:R([2,3,3.5]),agR:R([1.1,1.6]),gI:R([1.0,1.2])}),calc:calcTD5,
  txt:v=>`Même bâtiment, avec ω₁ = ${nf(v.w1,4)} rad/s, q = ${nf(v.q,2)}, agR = ${nf(v.agR,2)} m/s², γI = ${nf(v.gI,2)}. Calculer le palier, Sd(T₁), Fd, la répartition par plancher et l'effort dans un voile // X avec torsion.`,
  res:c=>[['Palier (m/s²)',nf(c.plat,3)],['T₁ (s)',nf(c.T1,3)],['Sd(T₁) (m/s²)',nf(c.Sd,3)],['Fd (kN)',nf(c.Fd,4)],['F₅ (kN)',nf(c.Fi[4],4)],['V voile + torsion (kN)',nf(c.VEd,4)]]},
 e2022:{gen:()=>Object.assign({},E22P,{q:R([3,4,5]),agR:R([1.6,3.0]),gI:R([1.0,1.2,1.4])}),calc:calcE22,
  txt:v=>`Bâtiment acier de l'examen 2022 avec q = ${nf(v.q,2)}, agR = ${nf(v.agR,2)} m/s², γI = ${nf(v.gI,2)} (sol B zone 5 conservé). Calculer palier, Sd(T₁), Fd, Z_E en pied de palée, δ et la contrainte dans la diagonale.`,
  res:c=>[['Palier (m/s²)',nf(c.plat,3)],['Sd(T₁) (m/s²)',nf(c.Sd,3)],['Fd (kN)',nf(c.Fd,4)],['Z_E (kN)',nf(c.ZE,4)],['σ diagonale (MPa)',nf(c.sig,3)]]}
};
function labState(id){ if(!state.labs[id]) state.labs[id]=Object.assign({},LABS[id].base); return state.labs[id]; }
function labOut(id){
  const L=LABS[id], s=labState(id), p=Object.assign({},L.base); let bad=false;
  for(const [k] of L.fields){const v=parseFloat(String(s[k]).replace(',','.')); p[k]=v; if(!(v>0)) bad=true;}
  if(L.toggle) p[L.toggle[0]]=!!s[L.toggle[0]];
  if(!bad&&L.check&&!L.check(p)) bad=true;
  if(bad) return `<div class="note"><b>Valeurs à corriger.</b> Tous les champs doivent être positifs${id==='td1'?' et u₁/u₀ < 1':id==='td2'?' et e < D/2':''}.</div>`;
  const c=L.calc(p), host=$('#lab-out'), W=host&&host.clientWidth?host.clientWidth-10:640;
  return `<div class="out">${L.out(c).map(([l,v,k])=>`<div${k?' class="key"':''}><small>${l}</small><b>${v}</b></div>`).join('')}</div>${L.plot?L.plot(c,W):''}`;
}
function labHTML(id){
  const L=LABS[id]; if(!L) return ''; const s=labState(id);
  const inp=([k,l])=>`<div><label for="lab-${k}">${l}</label><input id="lab-${k}" data-lab="${k}" data-labid="${id}" inputmode="decimal" value="${String(s[k]).replace('.',',')}"></div>`;
  return `<div class="section-t"><h3>Laboratoire : fais varier les données</h3></div><div class="card"><p class="small muted" style="margin-top:0">Valeurs initiales de l'énoncé. Tout est recalculé par la même fonction que la correction.</p>
   <div class="lab">${L.fields.map(inp).join('')}</div>
   ${L.toggle?`<label class="row small" style="margin-top:10px"><input type="checkbox" data-labtoggle="${L.toggle[0]}" data-labid="${id}" ${s[L.toggle[0]]?'checked':''}> ${L.toggle[1]}</label>`:''}
   ${L.conv?`<div style="margin:14px 0 4px"><div class="eyebrow" style="margin-bottom:6px">Forme du cosinus</div><div class="seg" role="radiogroup" aria-label="Forme du cosinus"><label><input type="radio" name="conv" value="minus" ${state.conv==='minus'?'checked':''}> cos(ω<sub>D</sub>t − φ) · cohérent avec u̇(0) = 0</label><label><input type="radio" name="conv" value="plus" ${state.conv==='plus'?'checked':''}> cos(ω<sub>D</sub>t + φ) · énoncé</label></div></div>`:''}
   <div id="lab-out" data-labid="${id}">${labOut(id)}</div><button class="btn alt" data-a="labreset" data-id="${id}">Revenir aux données de l'énoncé</button></div>`;
}
function variantHTML(id){
  const V=VARIANTS[id]; if(!V) return ''; const v=state.variants[id];
  const body=v?(()=>{const c=V.calc(v);return `<div class="hint" style="color:var(--ink);border-style:solid;background:var(--sunken)"><div class="eyebrow">Énoncé de la variante</div><p>${V.txt(v)}</p><details><summary class="btn alt" style="list-style:none;display:inline-flex">Voir le corrigé (résultats)</summary><div class="out">${V.res(c).map(([l,x])=>`<div><small>${l}</small><b>${x}</b></div>`).join('')}</div></details></div>`;})():`<p class="muted">Génère un énoncé avec d'autres valeurs (mêmes hypothèses) pour t'entraîner, puis ouvre le corrigé.</p>`;
  return `<div class="section-t"><h3>Variante d'entraînement</h3></div><div class="card"><div class="row"><button class="btn" data-a="variant" data-id="${id}">Générer une variante</button></div><div id="variant-${id}" style="margin-top:12px">${body}</div></div>`;
}

/* ---------- Vue Parcours ---------- */
function viewParcours(){
  const total=NOTIONS.length,cnt={none:0,revoir:0,cours:0,maitrise:0}; NOTIONS.forEach(n=>cnt[state.status[n.id]||'none']++);
  const qs=Object.values(state.qstats),ok=qs.reduce((s,x)=>s+x.ok,0),ko=qs.reduce((s,x)=>s+x.ko,0);
  const prio=NOTIONS.filter(n=>state.status[n.id]!=='maitrise').sort((a,b)=>weight(b.id)-weight(a.id)||examPts(b.id)-examPts(a.id)).slice(0,5);
  const nx=prio[0]; let next='';
  if(nx){const f=FORMULAS.find(f=>f.notions.includes(nx.id)),nq_=Q.filter(q=>q.notions.includes(nx.id)).length,exs=exOfNotion(nx.id);
   next=`<div class="card next"><div><div class="eyebrow">Prochaine action · statut : ${STATUS.find(s=>s[0]===(state.status[nx.id]||'none'))[1]}</div><h3>${nx.nom}</h3><p class="muted" style="margin:0">${nx.desc} Présente dans ${nExamSrc(nx.id)} sujet(s) d'examen sur ${N_EXAMS} et dans ${srcOfNotion(nx.id).length-nExamSrc(nx.id)} TD.</p>
   <div class="links">${f?goChip('formules',f.id,'Formule : '+f.nom):''}${exs.slice(0,3).map(id=>goChip('exercices',id+'/',exLabel(EXBY[id]))).join('')}</div></div><div class="row">${nq_?`<button class="btn" data-a="qstart" data-m="rev" data-n="${nx.id}">QCM sur cette notion (${nq_})</button>`:''}</div></div>`;}
  const nEx=EXERCISES.length, nExam=EXERCISES.filter(e=>e.type==='Examen').length;
  return `${pagehead('Tableau de bord','Parcours de révision','Périmètre : les notions mobilisées par les TD et les sujets d\'examen du dossier. Priorité = nombre de sujets distincts où la notion apparaît (un sujet d\'examen compte double, une copie ou une version d\'un même TD ne compte qu\'une fois).')}
  <div class="stack"><div class="cartouche" aria-label="Cartouche"><div><small>Cours</small><b>Génie parasismique</b></div><div><small>Sources</small><b>${nEx-nExam} TD · ${N_EXAMS} sujets d'examen</b></div><div><small>Questions indexées</small><b>${EXQ.length}</b></div><div><small>Version</small><b>V4 · ${NOTIONS.length} notions · ${Q.length} QCM</b></div></div>
  ${next}
  <div class="grid g4"><div class="card stat wide"><b>${cnt.maitrise} / ${total}</b><span>notions maîtrisées</span><div class="segbar" role="img" aria-label="${cnt.maitrise} maîtrisées, ${cnt.cours} en cours, ${cnt.revoir} à revoir, ${cnt.none} pas commencées">${['maitrise','cours','revoir','none'].map(k=>cnt[k]?`<i class="k-${k}" style="width:${cnt[k]/total*100}%"></i>`:'').join('')}</div><div class="keys"><span style="--c:var(--ok)">Maîtrisé ${cnt.maitrise}</span><span style="--c:var(--accent)">En cours ${cnt.cours}</span><span style="--c:var(--warn)">À revoir ${cnt.revoir}</span><span style="--c:var(--line-strong)">Pas commencé ${cnt.none}</span></div></div>
   <div class="card stat"><b>${ok+ko?Math.round(ok/(ok+ko)*100)+' %':'—'}</b><span>${ok+ko?`réussite aux QCM (${ok+ko} réponses)`:'aucune réponse au QCM pour l\'instant'}</span></div>
   <div class="card stat"><b>${state.errors.length}</b><span>question(s) à refaire</span>${state.errors.length?`<div style="margin-top:8px"><button class="btn alt" data-a="qstart" data-m="errors">Refaire</button></div>`:''}</div></div>
  <div class="card"><h3>Plan de révision priorisé</h3><p class="small muted" style="margin-top:0">Les 5 notions non maîtrisées qui pèsent le plus dans tes sources.</p><ol class="prio">${prio.map(n=>`<li><div><b>${n.nom}</b><div class="small muted">${nExamSrc(n.id)}/${N_EXAMS} examens · poids ${weight(n.id)} · ${examPts(n.id)?nf(examPts(n.id),3)+' pts d\'examen cumulés':'pas de barème connu'}</div><div class="links">${exOfNotion(n.id).map(id=>goChip('exercices',id+'/',exLabel(EXBY[id]))).join('')}</div></div></li>`).join('')}</ol></div></div>
  ${THEMES.map(([th,tl])=>`<div class="section-t"><h3>${tl}</h3></div><div class="stack" style="gap:8px">${NOTIONS.filter(n=>n.th===th).map(n=>{const st=state.status[n.id]||'none',fs=FORMULAS.filter(f=>f.notions.includes(n.id)).length,vs=VIG.filter(v=>v.notions.includes(n.id)).length,qn=Q.filter(q=>q.notions.includes(n.id)).length;
   return `<div class="notion" style="--c:${STATUS_COLOR[st]}"><div><h4>${n.nom}</h4><div class="small muted">${n.desc}</div><div class="meta">${srcOfNotion(n.id).map(x=>chip(x.replace('E20','Ex. 20'),SRC(x).type==='Examen'?'warn':'src')).join('')}<span>${fs} formule(s)</span><span>${vs} vigilance(s)</span><span>${qn} QCM</span></div></div>
   <select class="st" style="--c:${STATUS_COLOR[st]}" data-notion="${n.id}" aria-label="Statut de ${n.nom}">${STATUS.map(([v,l])=>`<option value="${v}" ${st===v?'selected':''}>${l}</option>`).join('')}</select></div>`;}).join('')}</div>`).join('')}`;
}

/* ---------- Vue Exercices ---------- */
function stepHTML(e,s,i){
  const V=ids=>(ids||[]).map(vigChip).join('');
  const blocks=`${s.why?`<div class="lbl">Raisonnement</div><div class="val">${s.why}</div>`:''}
   ${s.f&&s.f.length?`<div class="lbl">Formule</div><div class="val">${s.f.map(x=>`<div class="f-line">${K(x,true)}</div>`).join('')}</div>`:''}
   ${(s.a&&s.a.length)||s.mid?`<div class="lbl">Calcul</div><div class="val">${s.mid||''}${(s.a||[]).map(x=>`<div class="c-line">${K(x,true)}</div>`).join('')}</div>`:''}
   ${s.r?`<div class="lbl res">Résultat</div><div class="val res"><div class="resbox">${K(s.r,true)}</div>${s.after||''}</div>`:(s.after?`<div class="lbl">Complément</div><div class="val">${s.after}</div>`:'')}`;
  return `<details class="step" id="${s.sid}"><summary><span class="stepno" aria-hidden="true">${esc(s.q)}</span><span class="step-t"><span class="sr">Question ${esc(s.q)} : </span>${s.t}</span>
   <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path class="dn" d="m6 9 6 6 6-6"/><path class="up" d="m6 15 6-6 6 6"/></svg>
   <span class="step-r">${s.res?K(s.res):''}</span></summary>
   <div class="body"><div class="qmeta">${stChip(s.st)}${s.ver?Object.entries(s.ver).map(([k,v])=>chip(SRC(k).annee+' · '+nf(v.pts,3)+' pt','warn')).join('')+(e.versions.filter(v=>!s.ver[v.src]).map(v=>chip('absente en '+SRC(v.src).annee,'todo')).join('')):(s.pts?chip(nf(s.pts,3)+' pt'+(s.pts>1?'s':'')):'')}${s.kind?chip(s.kind):''}${(s.notions||[]).map(n=>goChip('cours',n,notionName(n))).join('')}</div>
   ${s.ver&&Object.values(s.ver).some(v=>v.note)?`<div class="small muted" style="margin:6px 0">${Object.entries(s.ver).filter(([k,v])=>v.note).map(([k,v])=>`<b>${SRC(k).annee}</b> : ${v.note}`).join('<br>')}</div>`:''}<div class="calc">${blocks}</div>${s.ecart?`<div class="bad-box"><b>Écart avec le corrigé officiel.</b> ${s.ecart}</div>`:''}<div class="links">${V(s.vig)}</div></div></details>`;
}
function viewExercices(){
  const F=state.exF, years=[...new Set(EXERCISES.flatMap(exYears))].sort();
  const list=EXERCISES.filter(e=>(!F.type||e.type===F.type)&&(!F.annee||exYears(e).includes(F.annee))&&(!F.notion||e.Q.some(q=>(q.notions||[]).includes(F.notion)))&&(!F.diff||String(e.diff)===F.diff)&&(!F.st||e.Q.some(q=>q.st===F.st)));
  const e=EXBY[state.ex]||EXERCISES[0], ptsBy=e.versions?e.versions.map(v=>SRC(v.src).annee+' : '+nf(EXQ.filter(x=>x.ex===e.id&&x.src===v.src).reduce((s,x)=>s+x.pts,0),4)+' pts').join(' ; '):'', pts=e.Q.reduce((s,q)=>s+(q.pts||0),0), stc={}; e.Q.forEach(q=>stc[q.st]=(stc[q.st]||0)+1);
  return `${pagehead('TD, sujets et annales',"Exercices corrigés",`${EXERCISES.length} exercices · ${EXQ.length} questions. Chaque question indique si sa correction est le corrigé officiel (recalculé par code) ou une reconstitution.`)}
  <div class="filters">${sel('type',[['','Tous les types'],['TD','TD'],['Examen','Examens']],F.type,'Type')}${sel('annee',[['','Toutes'],...years.map(y=>[y,y])],F.annee,'Année')}${sel('notion',[['','Toutes les notions'],...NOTIONS.map(n=>[n.id,n.nom])],F.notion,'Notion')}${sel('diff',[['','Toutes'],['1','●'],['2','●●'],['3','●●●']],F.diff,'Difficulté')}${sel('st',[['','Tous'],...Object.entries(ST_LABEL).map(([k,v])=>[k,v[0]])],F.st,'Statut')}</div>
  <div class="excards">${list.map(x=>`<button class="excard ${x.id===e.id?'on':''}" data-a="exsel" data-id="${x.id}" aria-pressed="${x.id===e.id}"><span class="eyebrow">${exLabel(x)}${x.versions?'':' · '+x.annee}</span><b>${x.titre}</b><span class="small muted">${x.Q.length} questions · ${'●'.repeat(x.diff)}${'○'.repeat(3-x.diff)}</span>${stChip(x.statut)}</button>`).join('')||'<p class="muted">Aucun exercice avec ces filtres.</p>'}</div>
  <div class="card" id="ex-top" style="margin-top:16px"><div class="cardhead"><div><div class="eyebrow">${exLabel(e)} · ${e.type} · ${exYears(e).join(', ')}</div><h3 style="font-size:1.45rem">${e.titre}</h3></div><div>${stChip(e.statut)}</div></div>
   <p class="small muted" style="margin-top:0">${e.en?`Titre original : « ${e.en} ». `:''}</p>
   ${e.versions?`<div class="card" style="background:var(--sunken);box-shadow:none;padding:12px 14px;margin-bottom:10px"><div class="eyebrow">Versions du sujet</div>${e.versions.map(v=>`<p class="small" style="margin:4px 0"><b>${v.label}</b> (${SRC(v.src).duree||''}, ${SRC(v.src).bareme||''}) : ${v.note}</p>`).join('')}</div>`:''}
   <details class="prov"><summary class="small"><b>Provenances</b> (${(e.prov||[]).length} fichier(s))</summary><ul class="secs">${(e.prov||[]).map(p=>`<li><span>Dossier ${p.d} · ${p.f}${p.n?`<br><span class="muted">${p.n}</span>`:''}</span><span class="small">${chip(p.st)}</span></li>`).join('')}</ul></details>
   ${(e.liens||[]).length?`<p class="small" style="margin:8px 0">${e.liens.map(l=>`<b>Problème similaire :</b> ${goChip('exercices',l.ex+'/',exLabel(EXBY[l.ex])+' · '+EXBY[l.ex].titre)} ${l.n}`).join('<br>')}</p>`:''}
   ${e.meta?`<div class="row" style="margin-bottom:6px">${chip('Durée '+e.meta.duree)}${chip(e.meta.bareme)}${chip(e.meta.docs)}</div>`:''}
   <div class="row small" style="margin-bottom:8px">${Object.entries(stc).map(([k,v])=>`${stChip(k)}<span class="muted">× ${v}</span>`).join(' ')}</div>
   <div class="ex-head"><div>${e.enonce()}<div class="scroll"><table class="datat"><tr><th>Donnée</th><th>Valeur</th><th>Remarque</th></tr>${e.data.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</table></div></div>
   ${e.fig&&FIG[e.fig]?`<figure class="figure">${FIG[e.fig]()}<figcaption>Schéma redessiné à partir de l'énoncé.</figcaption></figure>`:''}</div>
   <div class="section-t" style="margin-top:18px"><h3 style="font-size:1.05rem">Questions${ptsBy?` · barèmes ${ptsBy}`:(pts?` · barème ${nf(pts,4)} pts`:'')}</h3></div>
   <ol class="qlist plain">${e.Q.map(q=>`<li><a href="#exercices" data-go="exercices:${e.id}/${q.sid}"><b>${q.q}</b> · ${q.t}</a>${q.ver?`<span class="muted small"> · ${Object.entries(q.ver).map(([k,v])=>SRC(k).annee+' : '+nf(v.pts,3)+' pt').join(' ; ')}</span>`:(q.pts?`<span class="muted small"> · ${nf(q.pts,3)} pt</span>`:'')}</li>`).join('')}</ol>
   <div class="links">${e.notions.map(n=>goChip('cours',n,notionName(n))).join('')}</div></div>
  <div class="section-t"><h3>Correction pas à pas</h3><div class="steps-tools"><button class="btn ghost" data-a="openall">Tout déplier</button><button class="btn ghost" data-a="closeall">Tout replier</button></div></div>
  <p class="small muted" style="margin-top:-4px">Chaque question repliée affiche son résultat. Déplie pour voir le raisonnement, la formule, le calcul et les écarts éventuels avec le corrigé officiel.</p>
  ${e.Q.map((s,i)=>stepHTML(e,s,i)).join('')}
  ${e.lab?labHTML(e.lab):''}${e.variant?variantHTML(e.variant):''}`;
}

/* ---------- Vue Formules ---------- */
function starBtn(id){return `<button class="star" data-a="star" data-id="${id}" aria-pressed="${state.stars[id]?'true':'false'}" aria-label="Ajouter à la fiche">${state.stars[id]?'★':'☆'}</button>`;}
function viewFormules(){
  const th=state.fTheme, list=FORMULAS.filter(f=>!th||f.th===th);
  return pagehead('Formulaire du périmètre d\'examen','Formules',`${FORMULAS.length} formules, regroupées par thème. Chacune indique ses variables, sa condition de validité, sa source et les questions où elle sert. L'étoile l'ajoute à la fiche.`)+
  `<div class="filterbar" role="group" aria-label="Thème"><button data-a="fth" data-t="" aria-pressed="${!th}">Tous</button>${THEMES.map(([k,l])=>`<button data-a="fth" data-t="${k}" aria-pressed="${th===k}">${l} · ${FORMULAS.filter(f=>f.th===k).length}</button>`).join('')}</div>`+
  THEMES.filter(([k])=>list.some(f=>f.th===k)).map(([k,l])=>`<div class="section-t"><h3>${l}</h3></div><div class="stack">${list.filter(f=>f.th===k).map(f=>`<div class="card fcard" id="${f.id}"><div class="cardhead"><h3>${f.nom}</h3>${starBtn(f.id)}</div>
   <div class="math big">${K(f.tex,true)}</div>${f.vars.length?`<ul class="vars">${f.vars.map(v=>`<li>${v}</li>`).join('')}</ul>`:''}<p class="cond"><b>Condition</b>${f.cond}</p>
   <div class="links">${chip(f.source,'src')}${f.notions.map(n=>goChip('cours',n,notionName(n))).join('')}${(f.ex||[]).map(refChip).join('')}${(f.vig||[]).map(vigChip).join('')}</div></div>`).join('')}</div>`).join('');
}

/* ---------- Vue Vigilance ---------- */
const VCOL={'Hypothèse':'var(--accent)','Piège':'var(--warn)','Contrôle':'var(--ok)','Cas':'var(--muted)','Unités':'var(--warn)','Convention':'var(--trace)'};
function viewVigilance(){
  const types=['Tous','Hypothèse','Piège','Cas','Unités','Convention','Contrôle'],f=state.vigFilter,nn=state.vigNotion;
  const list=VIG.filter(v=>(f==='Tous'||v.type===f)&&(!nn||v.notions.includes(nn)));
  const groups=NOTIONS.filter(n=>list.some(v=>v.notions[0]===n.id));
  return pagehead('Avant de calculer','Hypothèses et points de vigilance',`${VIG.length} cartes regroupées par notion : hypothèses, cas, pièges, erreurs d'unités, conventions et contrôles.`)+
  `<div class="card"><h3>Quel cas, quelle formule ?</h3><div class="cas">${CAS.map(c=>`<div><span>${c.cas}</span><span class="res">${c.res}</span><span>${chip(c.etat,c.cls||'todo')}</span></div>`).join('')}</div></div>
  <div class="section-t"><h3>Cartes</h3></div><div class="filterbar" role="group" aria-label="Filtrer par type">${types.map(t=>`<button data-a="vigf" data-t="${t}" aria-pressed="${f===t}">${t}${t==='Tous'?'':' · '+VIG.filter(v=>v.type===t).length}</button>`).join('')}</div>
  <div class="filters">${sel('vigNotion',[['','Toutes les notions'],...NOTIONS.filter(n=>VIG.some(v=>v.notions.includes(n.id))).map(n=>[n.id,n.nom])],nn,'Notion')}</div>`+
  groups.map(g=>`<div class="section-t"><h3 style="font-size:1.05rem">${g.nom}</h3></div><div class="stack">${list.filter(v=>v.notions[0]===g.id).map(v=>`<div class="card vcard" id="${v.id}" style="--c:${VCOL[v.type]||'var(--muted)'}"><div class="vt"><div>${chip(v.type,v.type==='Piège'||v.type==='Unités'?'warn':v.type==='Contrôle'?'ok':'src')}<h3>${v.titre}</h3></div>${starBtn(v.id)}</div><p>${v.texte}</p><div class="links">${v.notions.map(n=>goChip('cours',n,notionName(n))).join('')}${(v.ex||[]).map(refChip).join('')}</div></div>`).join('')}</div>`).join('');
}

/* ---------- Vue Cours ciblé ---------- */
const NIV={indispensable:['Indispensable','warn'],utile:['Utile pour comprendre','src'],hors:['Hors périmètre probable','todo']};
function viewCours(){
  const f=state.coursF, ns=COURS.notions.filter(n=>!f||n.niveau===f), X=COURS.extras||{};
  const cnt=k=>COURS.notions.filter(n=>n.niveau===k).length;
  const notionTarget=state.coursNotion;
  return pagehead('Le cours, filtré par les TD et les examens','Cours ciblé',`${COURS.notions.length} notions du support, classées en trois niveaux, avec renvoi aux pages du PDF des deux versions du support (2025-2026 et 2026-2027 ; 2 diapositives par page) et aux exercices qui les utilisent.`)+
  `<div class="grid g2">${COURS.chapitres.map(c=>`<div class="card"><div class="eyebrow">${c.id} · ${c.pages?c.pages+' p.':'fichier protégé'}${c.v2?' · version 2026-2027 : '+c.v2.pages+' p.':''}</div><h3>${c.titre}</h3>${c.v2?`<p class="small muted" style="margin:4px 0">${c.v2.remarque}</p>`:''}${c.sections&&c.sections.length?`<ul class="secs">${c.sections.map(s=>`<li><span>${s.titre}</span><span class="muted small">p. ${s.pages}</span></li>`).join('')}</ul>`:'<p class="note"><b>Illisible.</b> Fichier protégé par un mot de passe.</p>'}</div>`).join('')}</div>
  ${notionTarget?`<div class="card" style="margin-top:14px;border-left:5px solid var(--accent)"><div class="eyebrow">Notion d'exercice</div><h3>${notionName(notionTarget)}</h3><p class="muted">${(NOTIONS.find(n=>n.id===notionTarget)||{}).desc||''}</p><p class="small"><b>Passages du cours :</b> ${COURS.notions.filter(c=>c.lien.includes(notionTarget)).map(c=>`<a href="#cours" data-go="cours-n:${c.id}">${c.ch} ${c.pages} · ${c.titre}</a>`).join(' ; ')||'<span class="muted">aucun passage du cours lisible (formule apportée par un corrigé ou rappel).</span>'}</p><div class="links">${exOfNotion(notionTarget).map(id=>goChip('exercices',id+'/',exLabel(EXBY[id]))).join('')}${FORMULAS.filter(x=>x.notions.includes(notionTarget)).slice(0,4).map(x=>goChip('formules',x.id,x.nom)).join('')}</div><button class="btn ghost" data-a="coursclear">Fermer</button></div>`:''}
  <div class="section-t"><h3>Notions du cours</h3></div>
  <div class="filterbar" role="group" aria-label="Niveau">${Object.entries(NIV).map(([k,v])=>`<button data-a="coursf" data-t="${k}" aria-pressed="${f===k}">${v[0]} · ${cnt(k)}</button>`).join('')}<button data-a="coursf" data-t="" aria-pressed="${!f}">Toutes · ${COURS.notions.length}</button></div>
  <div class="stack">${ns.map(n=>{const ex=[...new Set(n.lien.flatMap(exOfNotion))];return `<div class="card vcard" id="cn-${n.id}" style="--c:${n.niveau==='indispensable'?'var(--warn)':n.niveau==='utile'?'var(--accent)':'var(--line-strong)'}"><div class="vt"><div>${chip(NIV[n.niveau][0],NIV[n.niveau][1])}${n.nouveau?chip(n.ch+' 2026-2027 · '+n.pages,'warn'):chip(n.ch+' 2025-26 · '+n.pages,'')+(n.pages2?chip('2026-27 · '+n.pages2,''):'')}${n.nouveau?chip('Seulement dans le support 2026-2027','todo'):''}<h3>${n.titre}</h3></div></div><p>${n.resume}</p>${n.diff&&n.diff.length?`<div class="note small"><b>Différences entre les versions du cours.</b><ul style="margin:4px 0 0;padding-left:1.1rem">${n.diff.map(d=>`<li>${d}</li>`).join('')}</ul></div>`:''}
   ${n.formules.length?`<div class="cformules">${n.formules.map(fm=>`<div class="cf"><div class="small"><b>${fm.nom}</b> <span class="muted">${fm.page||''}</span></div><div class="math">${fm.tex?K(fm.tex,true):esc(fm.unicode)}</div>${fm.conditions?`<div class="small muted">${fm.conditions}</div>`:''}</div>`).join('')}</div>`:''}
   <div class="links">${n.lien.map(l=>goChip('cours',l,notionName(l))).join('')}${ex.map(id=>goChip('exercices',id+'/',exLabel(EXBY[id]))).join('')}${!n.lien.length?chip('aucun exercice lié','todo'):''}</div></div>`;}).join('')}</div>
  ${COURS.torsion?`<div class="section-t"><h3>Chapitre 4 Torsion : conventions et exemples du cours</h3></div><div class="card"><ul class="secs">${Object.entries(COURS.torsion.conventions||{}).map(([k,v])=>`<li><span><b>${k}</b> : ${v}</span></li>`).join('')}</ul>${(COURS.torsion.hypotheses||[]).length?`<h3 style="margin-top:10px">Hypothèses</h3><ul>${COURS.torsion.hypotheses.map(h=>`<li class="small">${h}</li>`).join('')}</ul>`:''}<h3 style="margin-top:10px">Exemples du chapitre (recalculés)</h3><ul class="secs">${(COURS.torsion.exemples||[]).map(x=>`<li><span><b>${x.titre}</b> (${x.pages}) : ${x.resultats_cours||''}${x.ecart?`<br><span class="muted">Recalcul : ${x.recalcul||''} ${x.ecart}</span>`:''}</span></li>`).join('')}</ul></div>`:''}
  <div class="section-t"><h3>Hors périmètre probable (rien à réviser en priorité)</h3></div><div class="card"><ul class="secs">${(COURS.hors||[]).map(h=>`<li><span>${h.titre}</span><span class="muted small">${h.chapitre} ${h.pages}</span></li>`).join('')}</ul></div>
  <div class="section-t"><h3>Tables utiles tirées du cours</h3></div><div class="grid g2">
   <div class="card"><h3>agR par zone</h3><table>${(X.agR_zones||[]).map(z=>`<tr><td>Zone ${z.zone}</td><td class="num">${nf(z.agR,2)} m/s²</td><td class="muted small">${z.page}</td></tr>`).join('')}</table><h3 style="margin-top:12px">γI par catégorie</h3><table>${(X.gammaI||[]).map(z=>`<tr><td>Catégorie ${z.categorie}</td><td class="num">${nf(z.gammaI,2)}</td><td class="muted small">${z.page}</td></tr>`).join('')}</table></div>
   <div class="card"><h3>Paramètres de sol</h3><div class="scroll"><table><tr><th>Zone</th><th>Sol</th><th>S</th><th>TB</th><th>TC</th><th>TD</th></tr>${(X.parametres_sol_france||[]).map(s=>`<tr><td class="small">${s.zone_ou_type}</td><td>${s.sol}</td><td class="num">${s.S}</td><td class="num">${s.TB}</td><td class="num">${s.TC}</td><td class="num">${s.TD}</td></tr>`).join('')}</table></div></div>
   <div class="card"><h3>Valeurs de q (cours)</h3><ul class="secs">${(X.valeurs_q||[]).map(q=>`<li><span>${q.systeme} : <b>${q.valeur}</b></span><span class="muted small">${q.page}</span></li>`).join('')}</ul></div>
   <div class="card"><h3>Séismes réels cités</h3><ul class="secs">${(X.exemples_spectres_reels||[]).map(q=>`<li><span><b>${q.seisme}</b> : ${q.ce_que_dit_le_cours}</span><span class="muted small">${q.page}</span></li>`).join('')}</ul></div></div>
  <div class="section-t"><h3>Incohérences relevées dans le support de cours</h3></div><div class="card"><ul>${(X.anomalies||[]).map(a=>`<li class="small">${a}</li>`).join('')}</ul></div>`;
}

/* ---------- QCM ---------- */
const LET='ABCD';
function viewQcm(){
  const qz=state.quiz;
  if(!qz){const pool=Q.filter(q=>state.srcFilter[q.src]&&(!state.qNotion||q.notions.includes(state.qNotion)));
   return `${pagehead('Entraînement','QCM',`${Q.length} questions sur le cours, les exercices et les formules. Chacune renvoie à la question d'origine.`)}
   <div class="card"><h3>Sources des questions</h3><div class="filterbar" role="group" aria-label="Sources">${['formule','exercice','cours'].map(s=>`<button data-a="srcf" data-s="${s}" aria-pressed="${state.srcFilter[s]}">${state.srcFilter[s]?'✓ ':''}${s} · ${Q.filter(q=>q.src===s).length}</button>`).join('')}</div>
   <div class="filters">${sel('qNotion',[['','Toutes les notions'],...NOTIONS.filter(n=>Q.some(q=>q.notions.includes(n.id))).map(n=>[n.id,n.nom+' · '+Q.filter(q=>q.notions.includes(n.id)).length])],state.qNotion,'Notion')}</div><p class="small muted" style="margin:4px 0 0">${pool.length} question(s) sélectionnée(s)</p></div>
   <div class="section-t"><h3>Choisir un mode</h3></div><div class="modes">
    <button class="mode" data-a="qstart" data-m="rev"><b>Révision</b><span>Correction immédiate après chaque réponse, avec le lien vers la question d'origine.</span></button>
    <button class="mode" data-a="qstart" data-m="exam"><b>Mode examen</b><span>10 questions, 12 minutes. Correction à la fin seulement.</span></button>
    <button class="mode" data-a="qstart" data-m="errors" ${state.errors.length?'':'disabled'}><b>Refaire mes erreurs · ${state.errors.length}</b><span>${state.errors.length?'Les questions ratées reviennent jusqu\'à ce que tu les réussisses.':'Aucune erreur enregistrée pour l\'instant.'}</span></button></div><p id="qmsg" class="small" style="color:var(--bad)" role="status"></p>`;}
  if(qz.done) return resultsQcm();
  const it=qz.items[qz.i],q=it.q,exam=qz.mode==='exam',locked=!exam&&it.pick!==null;
  const modeName=exam?'Mode examen':qz.mode==='errors'?'Mes erreurs':qz.notion?'Révision · <span class="nc">'+notionName(qz.notion)+'</span>':'Révision';
  const dots=qz.items.map((x,k)=>{let c='';if(k===qz.i)c='cur';else if(x.pick!==null)c=exam?'ans':(x.order[x.pick]===x.q.a?'ok':'ko');return `<i class="${c}"></i>`;}).join('');
  const right=locked&&it.order[it.pick]===q.a;
  return `<div class="qtop"><div><div class="eyebrow">${modeName}</div><h2 style="font-size:1.5rem">Question ${qz.i+1} <span class="muted" style="font-weight:500">/ ${qz.items.length}</span></h2></div>${exam?`<span class="timer" id="timer" role="timer" aria-label="Temps restant"></span>`:''}</div>
  <div class="dots" aria-hidden="true">${dots}</div><div class="card"><div>${chip(q.src)}${q.notions.map(n=>chip(notionName(n))).join('')}</div><p class="qtext">${q.q}</p>
  <div role="group" aria-label="Réponses">${it.order.map((oi,pos)=>{let cl='opt',s='';if(locked){if(oi===q.a){cl+=' right';s='✓ Bonne réponse';}else if(pos===it.pick){cl+=' wrong';s='✗ Ta réponse';}else cl+=' dim';}else if(exam&&it.pick===pos){cl+=' sel';s='Choisie';}
   return `<button class="${cl}" data-a="qpick" data-pos="${pos}" ${locked?'disabled':''} aria-pressed="${it.pick===pos}"><span class="k">${LET[pos]}</span><span>${q.opts[oi]}</span><span class="s">${s}</span></button>`;}).join('')}</div>
  ${locked?`<div class="${right?'good':'bad-box'}" role="status"><b>${right?'Juste.':'Faux.'}</b> ${q.why} ${q.vig?vigChip(q.vig):''}${q.ref?refChip(q.ref):''}</div>`:''}
  <div class="row" style="margin-top:12px;justify-content:space-between"><button class="btn ghost" data-a="qquit">Quitter</button><button class="btn" data-a="qnext" ${it.pick===null?'disabled':''}>${qz.i===qz.items.length-1?'Terminer':'Suivante →'}</button></div></div>`;
}
function ring(sc,n){const r=50,C=2*Math.PI*r,p=n?sc/n:0;return `<svg class="ring" viewBox="0 0 120 120" role="img" aria-label="${sc} sur ${n}"><circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${p>=.7?'var(--ok)':p>=.4?'var(--warn)':'var(--bad)'}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${C*p} ${C}" transform="rotate(-90 60 60)"/><text class="t" x="60" y="62" text-anchor="middle">${sc}/${n}</text><text class="s" x="60" y="80" text-anchor="middle">justes</text></svg>`;}
function resultsQcm(){
  const qz=state.quiz,isOk=i=>i.pick!==null&&i.order[i.pick]===i.q.a,sc=qz.items.filter(isOk).length,by={};
  qz.items.forEach(i=>i.q.notions.forEach(n=>{by[n]=by[n]||{ok:0,t:0};by[n].t++;if(isOk(i))by[n].ok++;}));
  const rows=Object.entries(by).sort((a,b)=>a[1].ok/a[1].t-b[1].ok/b[1].t),wrong=qz.items.filter(i=>!isOk(i)),right=qz.items.filter(isOk);
  const item=i=>{const ok=isOk(i);return `<div class="ritem" style="--c:${ok?'var(--ok)':'var(--bad)'}"><p><b>${i.q.q}</b></p><p class="small">Ta réponse : ${i.pick===null?'<i>aucune</i>':i.q.opts[i.order[i.pick]]} ${ok?chip('✓ Juste','ok'):chip('✗ Faux','bad')}</p>${ok?'':`<p class="small">Bonne réponse : <b>${i.q.opts[i.q.a]}</b></p>`}<p class="small muted">${i.q.why}</p><div>${!ok&&i.q.vig?vigChip(i.q.vig):''}${i.q.ref?refChip(i.q.ref):''}</div></div>`;};
  return `${pagehead(qz.timeout?'Temps écoulé':'QCM terminé','Résultat','')}<div class="card score">${ring(sc,qz.items.length)}<div><h3>${sc===qz.items.length?'Sans faute.':wrong.length+' question(s) à revoir'}</h3><p class="muted" style="margin-top:4px">${state.errors.length} question(s) au total dans ta liste d'erreurs.</p><div class="row"><button class="btn" data-a="qstart" data-m="errors" ${state.errors.length?'':'disabled'}>Refaire mes erreurs</button><button class="btn alt" data-a="qquit">Nouveau QCM</button></div></div></div>
  <div class="card"><h3>Par notion</h3><div class="freq">${rows.map(([n,v])=>`<div><span>${notionName(n)}</span><span class="cnt">${v.ok}/${v.t}</span><div class="bar" style="height:10px"><i style="width:${v.ok/v.t*100}%;background:${v.ok===v.t?'var(--ok)':v.ok?'var(--warn)':'var(--bad)'}"></i></div></div>`).join('')}</div></div>
  ${wrong.length?`<div class="section-t"><h3>À revoir</h3></div><div class="rlist">${wrong.map(item).join('')}</div>`:''}${right.length?`<div class="section-t"><h3>Réussies</h3></div><details><summary class="btn alt" style="list-style:none;display:inline-flex;margin-bottom:8px">Afficher les ${right.length} réponse(s) justes</summary><div class="rlist">${right.map(item).join('')}</div></details>`:''}`;
}
function qFinish(timeout){const qz=state.quiz;if(qz.done)return;qz.done=true;qz.timeout=!!timeout;clearInterval(state.timer);qz.items.forEach(i=>{if(qz.mode==='exam')recordQ(i);});store.set('errors',state.errors);store.set('qstats',state.qstats);}
function recordQ(i){const ok=i.pick!==null&&i.order[i.pick]===i.q.a,s=state.qstats[i.q.id]||{ok:0,ko:0};if(ok){s.ok++;state.errors=state.errors.filter(x=>x!==i.q.id);}else{s.ko++;if(!state.errors.includes(i.q.id))state.errors.push(i.q.id);}state.qstats[i.q.id]=s;}
function startQuiz(mode,notion){
  let pool=Q.filter(q=>state.srcFilter[q.src]&&(!state.qNotion||q.notions.includes(state.qNotion)));
  if(notion) pool=Q.filter(q=>q.notions.includes(notion)); if(mode==='errors') pool=Q.filter(q=>state.errors.includes(q.id));
  if(!pool.length){const m=$('#qmsg');if(m)m.textContent='Aucune question disponible avec cette sélection.';return;}
  pool=shuffle(pool); if(mode==='exam') pool=pool.slice(0,10);
  state.quiz={mode,notion:notion||null,i:0,done:false,end:mode==='exam'?Date.now()+720000:null,items:pool.map(q=>({q,order:shuffle(q.opts.map((_,k)=>k)),pick:null}))};
  clearInterval(state.timer); if(mode==='exam') state.timer=setInterval(tick,500); go('qcm');
}
function tick(){const el=$('#timer'),qz=state.quiz;if(!qz||qz.done){clearInterval(state.timer);return;}const left=Math.max(0,qz.end-Date.now());if(el){const s=Math.ceil(left/1000);el.textContent='⏱ '+String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');el.classList.toggle('low',s<=120);}if(left<=0){qFinish(true);render();}}

/* ---------- Vue Examens ---------- */
function viewExamens(){
  const srcs=SOURCES, cols=srcs.map(s=>s.id);
  const rows=NOTIONS.map(n=>({n,c:cols.map(id=>EXQ.filter(e=>e.src===id&&e.notions.includes(n.id)).length),pts:examPts(n.id),w:weight(n.id)})).sort((a,b)=>b.w-a.w||b.pts-a.pts);
  const mx=Math.max(1,...rows.map(r=>r.w)), exams=EXERCISES.filter(e=>e.type==='Examen');
  const kinds={}; EXQ.filter(e=>e.type==='Examen').forEach(e=>{const k=(e.kind||'autre').split(' ')[0].replace(/[+,]/g,''); kinds[k]=kinds[k]||{n:0,p:0}; kinds[k].n++; kinds[k].p+=e.pts||0;});
  const heat=v=>v?`<td class="heat" style="--a:${Math.min(1,v/4)}">${v}</td>`:'<td class="muted">·</td>';
  return `${pagehead('Ce qui tombe','Carte examens et TD vers notions',`${EXQ.length} questions de ${srcs.length} sources rattachées aux notions. Les cases comptent les questions par sujet ; la priorité compte les sujets distincts (examen = 2, TD = 1) ; les points de barème connus sont cumulés.`)}
  <div class="card"><h3>Sources</h3><div class="scroll"><table><tr><th>Source</th><th>Type</th><th>Durée</th><th>Barème</th><th>Documents</th><th>Questions</th><th>Corrigé</th></tr>${srcs.map(s=>{const e=EXBY[s.fiche]||EXERCISES.find(x=>x.src===s.id);return `<tr><td><a href="#exercices" data-go="exercices:${e.id}/">${s.titre}</a></td><td>${chip(s.type,s.type==='Examen'?'warn':'src')}</td><td>${s.duree||'—'}</td><td class="small">${s.bareme||'—'}</td><td class="small">${s.docs||'—'}</td><td class="num">${EXQ.filter(x=>x.src===s.id).length}</td><td>${stChip(e.statut)}</td></tr>`;}).join('')}</table></div>
   <p class="small muted">Manquant dans les deux dossiers : sujet 2023 ; corrigés 2022 et 2025 ; corrigé complet 2021. Les sujets 2021 et 2025 sont un même sujet reconduit : une fiche, deux sujets dans les fréquences. Un fichier présent dans les deux dossiers n\'est compté qu\'une fois.</p></div>
  <div class="card" style="margin-top:14px"><div class="cardhead"><h3>Fréquence des notions par source</h3><span class="small muted">nombre de questions</span></div><div class="scroll"><table class="heatt"><tr><th>Notion</th>${cols.map(c=>`<th>${c.replace('E20','’')}</th>`).join('')}<th>Pts exam.</th><th style="min-width:110px">Priorité</th></tr>
   ${rows.map(r=>`<tr><td><a href="#cours" data-go="cours:${r.n.id}">${r.n.nom}</a></td>${r.c.map(heat).join('')}<td class="num">${r.pts?nf(r.pts,3):'·'}</td><td><div class="track"><i style="width:${r.w/mx*100}%"></i></div></td></tr>`).join('')}</table></div>
   <p class="small muted">Colonnes : TD1 à TD5 puis sujets d\'examen 2021, 2025, 2022, 2024.</p></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Typologie des questions d'examen</h3><div class="freq">${Object.entries(kinds).sort((a,b)=>b[1].p-a[1].p).map(([k,v])=>`<div><span>${k}</span><span class="cnt">${v.n}</span><div class="track"><i style="width:${v.p/Math.max(...Object.values(kinds).map(x=>x.p))*100}%"></i></div><div class="srcs small muted">${nf(v.p,3)} pts</div></div>`).join('')}</div></div>
   <div class="card"><h3>Ce qui revient à chaque examen</h3><ul class="secs">${NOTIONS.filter(n=>nExamSrc(n.id)===N_EXAMS).map(n=>`<li><span>${n.nom}</span><span class="muted small">${nf(examPts(n.id),3)} pts</span></li>`).join('')}</ul><p class="small muted">Notions présentes dans les ${N_EXAMS} sujets d\'examen (2021, 2022, 2024, 2025).</p><h3 style="margin-top:12px">Dans au moins 3 sujets</h3><ul class="secs">${NOTIONS.filter(n=>nExamSrc(n.id)===N_EXAMS-1).map(n=>`<li><span>${n.nom}</span><span class="muted small">${nExamSrc(n.id)}/${N_EXAMS}</span></li>`).join('')}</ul></div></div>
  ${exams.map(e=>`<div class="section-t"><h3>${e.titre}</h3></div><div class="card"><ol class="qlist plain">${e.Q.map(q=>`<li><div><a href="#exercices" data-go="exercices:${e.id}/${q.sid}"><b>${q.q}</b> · ${q.t}</a> <span class="muted small">${q.ver?Object.entries(q.ver).map(([k,v])=>SRC(k).annee+' '+nf(v.pts,3)+' pt').join(' / ')+' · ':(q.pts?nf(q.pts,3)+' pt · ':'')}${q.kind||''}</span><div>${(q.notions||[]).map(n=>chip(notionName(n))).join('')}</div></div></li>`).join('')}</ol></div>`).join('')}`;
}

/* ---------- Fiche ---------- */
function ficheText(){const fs=FORMULAS.filter(f=>state.stars[f.id]),vs=VIG.filter(v=>state.stars[v.id]);
  return 'FICHE DE RÉVISION · GÉNIE PARASISMIQUE\n\nFORMULES\n'+fs.map(f=>`- ${f.nom}\n  ${f.expr.replace(/\n/g,'\n  ')}\n  Condition : ${f.cond}`).join('\n')+'\n\nÀ SURVEILLER\n'+vs.map(v=>`- ${v.titre} : ${v.texte}`).join('\n');}
function viewFiche(){const fs=FORMULAS.filter(f=>state.stars[f.id]),vs=VIG.filter(v=>state.stars[v.id]),top=NOTIONS.slice().sort((a,b)=>examPts(b.id)-examPts(a.id)).slice(0,8);
  return `${pagehead('Dernière relecture','Fiche avant l\'examen',`Construite à partir des éléments étoilés (${fs.length} formules, ${vs.length} points). Les étoiles par défaut couvrent ce qui revient le plus aux examens.`,`<div class="row"><button class="btn" data-a="copyfiche">Copier le texte</button><span id="copymsg" class="small muted" role="status"></span></div>`)}
  <div class="sheet"><div class="cartouche" style="margin-bottom:16px"><div><small>Cours</small><b>Génie parasismique</b></div><div><small>Sources</small><b>TD1-5, examens 2021-2025</b></div><div><small>Formules</small><b>${fs.length}</b></div><div><small>Points</small><b>${vs.length}</b></div></div>
  <h3>Ce qui pèse le plus aux examens</h3><ol>${top.map(n=>`<li>${n.nom} <span class="muted small">(${nf(examPts(n.id),3)} pts cumulés)</span></li>`).join('')}</ol>
  ${THEMES.filter(([k])=>fs.some(f=>f.th===k)).map(([k,l])=>`<h3 style="margin-top:20px">${l}</h3>${fs.filter(f=>f.th===k).map(f=>`<div class="fi"><b>${f.nom}</b><div style="overflow-x:auto;padding:4px 0">${K(f.tex,true)}</div><div class="small muted">${f.cond}</div></div>`).join('')}`).join('')||'<p class="muted">Aucune formule étoilée.</p>'}
  <h3 style="margin-top:22px">À surveiller</h3><ul>${vs.map(v=>`<li><b>${v.titre}.</b> ${v.texte}</li>`).join('')||'<li class="muted">Aucun point étoilé.</li>'}</ul></div>`;}

/* ---------- Navigation, recherche, événements ---------- */
const VIEWS={parcours:viewParcours,exercices:viewExercices,formules:viewFormules,vigilance:viewVigilance,cours:viewCours,qcm:viewQcm,examens:viewExamens,fiche:viewFiche};
function render(){
  $('#tabs').innerHTML=TABS.map(([id,l,s])=>`<button class="tab" role="tab" data-a="tab" data-id="${id}" aria-selected="${state.tab===id}" ${state.tab===id?'aria-current="page"':''}>${icon(id)}<span class="long">${l}</span><span class="short">${s}</span></button>`).join('');
  $('#view').innerHTML=VIEWS[state.tab]();
  if(state.tab==='exercices'){const h=$('#lab-out'); if(h) h.innerHTML=labOut(h.dataset.labid);}
  if(state.tab==='qcm'&&state.quiz&&state.quiz.mode==='exam'&&!state.quiz.done) tick();
}
function scrollToEl(id){const el=document.getElementById(id); if(el){ if(el.tagName==='DETAILS') el.open=true; el.scrollIntoView({block:'start'}); el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'),1700); return true;} return false;}
function go(tab,id){
  if(tab==='exercices'&&id&&id.includes('/')){const [ex,sid]=id.split('/'); if(EXBY[ex]){state.ex=ex; store.set('ex',ex); state.exF={type:'',annee:'',notion:'',diff:'',st:''};} id=sid||'ex-top';}
  if(tab==='cours'&&id&&NOTIONS.some(n=>n.id===id)){state.coursNotion=id; id='view';}
  if(tab==='cours-n'){tab='cours'; state.coursF=''; id='cn-'+id;}
  state.tab=tab; if(location.hash!=='#'+tab) location.hash=tab; render();
  if(id&&id!=='view'){ if(!scrollToEl(id)) window.scrollTo(0,0); } else window.scrollTo(0,0);
}
window.addEventListener('hashchange',()=>{const t=location.hash.slice(1); if(VIEWS[t]&&t!==state.tab){state.tab=t;render();}});
const INDEX=[].concat(
  FORMULAS.map(f=>({go:'formules:'+f.id,t:f.nom,s:'Formule',x:f.nom+' '+f.expr+' '+f.cond})),
  VIG.map(v=>({go:'vigilance:'+v.id,t:v.titre,s:v.type,x:v.titre+' '+v.texte})),
  NOTIONS.map(n=>({go:'cours:'+n.id,t:n.nom,s:'Notion',x:n.nom+' '+n.desc})),
  COURS.notions.map(n=>({go:'cours-n:'+n.id,t:n.titre,s:'Cours '+n.ch+' '+n.pages,x:n.titre+' '+n.resume})),
  EXERCISES.flatMap(e=>e.Q.map(q=>({go:'exercices:'+e.id+'/'+q.sid,t:q.t,s:e.src+' · '+q.q,x:e.titre+' '+q.t}))),
  Q.map(q=>({go:'qcm:',t:q.q,s:'QCM',x:q.q}))
);
const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function closeSearch(){$('#results').hidden=true;$('#top').classList.remove('searching');$('#searchBtn').setAttribute('aria-expanded','false');}
$('#q').addEventListener('input',e=>{const v=norm(e.target.value.trim()),box=$('#results');if(v.length<2){box.hidden=true;return;}
  const hits=INDEX.filter(i=>norm(i.x).includes(v)).slice(0,14);
  box.innerHTML=hits.length?hits.map(h=>`<button data-go="${h.go}"><small>${h.s}</small>${h.t.length>90?h.t.slice(0,90)+'…':h.t}</button>`).join(''):`<div style="padding:12px 14px" class="muted">Aucun résultat dans les sources chargées.</div>`;box.hidden=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch();});
document.addEventListener('click',e=>{
  const g=e.target.closest('[data-go]');
  if(g){e.preventDefault();const s=g.dataset.go,i=s.indexOf(':');closeSearch();$('#q').value='';go(s.slice(0,i),s.slice(i+1));return;}
  const b=e.target.closest('[data-a]'); if(!b){if(!e.target.closest('.search'))closeSearch();return;}
  const a=b.dataset.a;
  if(a==='tab') go(b.dataset.id);
  else if(a==='searchtoggle'){const h=$('#top'),on=!h.classList.contains('searching');h.classList.toggle('searching',on);b.setAttribute('aria-expanded',on);if(on)setTimeout(()=>$('#q').focus(),0);else closeSearch();}
  else if(a==='star'){const id=b.dataset.id;state.stars[id]=state.stars[id]?0:1;store.set('stars',state.stars);b.setAttribute('aria-pressed',state.stars[id]?'true':'false');b.textContent=state.stars[id]?'★':'☆';}
  else if(a==='srcf'){state.srcFilter[b.dataset.s]=!state.srcFilter[b.dataset.s];render();}
  else if(a==='vigf'){state.vigFilter=b.dataset.t;render();}
  else if(a==='fth'){state.fTheme=b.dataset.t;render();}
  else if(a==='coursf'){state.coursF=b.dataset.t;render();}
  else if(a==='coursclear'){state.coursNotion=null;render();}
  else if(a==='exsel'){state.ex=b.dataset.id;store.set('ex',state.ex);render();scrollToEl('ex-top');}
  else if(a==='qstart') startQuiz(b.dataset.m,b.dataset.n);
  else if(a==='qpick'){const qz=state.quiz,it=qz.items[qz.i];if(qz.mode!=='exam'&&it.pick!==null)return;it.pick=+b.dataset.pos;if(qz.mode!=='exam'){recordQ(it);store.set('errors',state.errors);store.set('qstats',state.qstats);}render();}
  else if(a==='qnext'){const qz=state.quiz;if(qz.i===qz.items.length-1)qFinish(false);else qz.i++;render();window.scrollTo(0,0);}
  else if(a==='qquit'){clearInterval(state.timer);state.quiz=null;render();window.scrollTo(0,0);}
  else if(a==='openall'||a==='closeall'){document.querySelectorAll('details.step').forEach(d=>d.open=a==='openall');}
  else if(a==='variant'){const id=b.dataset.id;state.variants[id]=VARIANTS[id].gen(); render(); scrollToEl('variant-'+id);}
  else if(a==='labreset'){const id=b.dataset.id;state.labs[id]=Object.assign({},LABS[id].base);state.conv='minus';render();scrollToEl('lab-out');}
  else if(a==='copyfiche'){const m=$('#copymsg');try{navigator.clipboard.writeText(ficheText()).then(()=>{m.textContent='Texte copié.';},()=>{m.textContent='Copie refusée : ouvre la page dans un onglet et réessaie.';});}catch(err){m.textContent='Copie indisponible ici.';}}
});
document.addEventListener('change',e=>{
  const s=e.target.closest('select[data-notion]'); if(s){const id=s.dataset.notion;state.status[id]=s.value;store.set('status',state.status);render();const n=$(`select[data-notion="${id}"]`);if(n)n.focus({preventScroll:true});return;}
  const f=e.target.closest('select[data-f]'); if(f){const k=f.dataset.f; if(k in state.exF) state.exF[k]=f.value; else state[k]=f.value; render(); const n=$(`select[data-f="${k}"]`); if(n) n.focus({preventScroll:true}); return;}
  if(e.target.name==='conv'){state.conv=e.target.value;const h=$('#lab-out');h.innerHTML=labOut(h.dataset.labid);}
  if(e.target.dataset&&e.target.dataset.labtoggle){labState(e.target.dataset.labid)[e.target.dataset.labtoggle]=e.target.checked;const h=$('#lab-out');h.innerHTML=labOut(h.dataset.labid);}
});
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.lab;if(k){labState(e.target.dataset.labid)[k]=e.target.value;const h=$('#lab-out');h.innerHTML=labOut(h.dataset.labid);}});
let rz; window.addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{const h=$('#lab-out');if(h&&state.tab==='exercices')h.innerHTML=labOut(h.dataset.labid);},150);});
$('#brandTrace').innerHTML=brandTrace();
const h0=location.hash.slice(1); if(VIEWS[h0]) state.tab=h0;
render();
