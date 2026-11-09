/* UrinaMotion — jogo educativo sensorial. JavaScript puro, utilizável offline. */
'use strict';
const ASSET = (name) => `./assets/${name}.webp`;
const app = document.getElementById('app');
const toast = document.getElementById('toast');
const storageKey = 'urinamotion-v1-progress';
const STAGES = [
 {n:1,title:'O filtro glomerular',detail:'Descubra o que passa para o filtrado e o que permanece no sangue.',image:'glomerulo',label:'Filtração'},
 {n:2,title:'O labirinto do néfron',detail:'Escolha entre reabsorção, secreção e continuação no túbulo.',image:'nefron',label:'Transporte tubular'},
 {n:3,title:'A onda do ureter',detail:'Coordene as contrações que levam a urina até a bexiga.',image:'ureter',label:'Peristaltismo'},
 {n:4,title:'A bexiga inteligente',detail:'Gerencie o enchimento e descubra como ocorre a micção.',image:'bexiga_cheia',label:'Armazenamento e micção'}
];
const PARTICLES = [
 {id:'water',name:'Água',image:'agua',target:'filtrate'},
 {id:'glucose',name:'Glicose',image:'glicose',target:'filtrate'},
 {id:'sodium',name:'Sódio',image:'sodio',target:'filtrate'},
 {id:'urea',name:'Ureia',image:'ureia',target:'filtrate'},
 {id:'rbc',name:'Hemácia',image:'hemacia',target:'blood'},
 {id:'albumin',name:'Albumina',image:'albumina',target:'blood'}
];
const CASES = [
 {where:'Túbulo contorcido proximal',title:'A glicose está no filtrado.',question:'Qual é o destino habitual da glicose filtrada em condições normais?',answer:'reabsorb',why:'A glicose é quase totalmente reabsorvida no túbulo proximal, retornando ao sangue.'},
 {where:'Túbulo contorcido proximal',title:'Íons H⁺ passam do sangue para o lúmen.',question:'Que processo tubular transporta H⁺ para o fluido tubular?',answer:'secrete',why:'A secreção tubular move substâncias do sangue/interstício para o lúmen do túbulo.'},
 {where:'Ramo descendente fino da alça de Henle',title:'Água deixa o líquido tubular.',question:'Como classificamos a saída de água em direção ao interstício?',answer:'reabsorb',why:'O ramo descendente fino é permeável à água, permitindo sua reabsorção.'},
 {where:'Ramo ascendente espesso',title:'Na⁺ e Cl⁻ saem do túbulo.',question:'Qual processo está representado?',answer:'reabsorb',why:'O ramo ascendente espesso reabsorve NaCl e é pouco permeável à água.'},
 {where:'Túbulo proximal',title:'Um ânion orgânico é transportado para o lúmen.',question:'Qual é o nome desse transporte do sangue para o túbulo?',answer:'secrete',why:'Transportadores do túbulo proximal secretam vários ânions orgânicos.'},
 {where:'Túbulo coletor',title:'Uma substância permanece no líquido tubular.',question:'Se não for reabsorvida, qual o caminho final dessa substância?',answer:'continue',why:'O que permanece no fluido tubular segue pelo sistema coletor e poderá ser excretado.'}
];
const DESTINATIONS = [
 {id:'reabsorb',name:'Reabsorver',subtitle:'Do túbulo para o sangue',symbol:'↖'},
 {id:'secrete',name:'Secretar',subtitle:'Do sangue para o túbulo',symbol:'↘'},
 {id:'continue',name:'Seguir adiante',subtitle:'Permanece no líquido tubular',symbol:'→'}
];
const NOTES = [
 {title:'Filtração glomerular',icon:'◉',text:'A pressão nos capilares glomerulares favorece a formação do filtrado. Água e pequenos solutos atravessam a barreira; hemácias e a maior parte da albumina permanecem no sangue em condições normais.'},
 {title:'Reabsorção e secreção',icon:'⇄',text:'Reabsorção é o transporte do fluido tubular de volta ao organismo. Secreção é o transporte de substâncias do sangue/interstício para dentro do túbulo. O jogo usa gotas coloridas como símbolos, não como aspecto físico real das moléculas.'},
 {title:'Ureteres e peristaltismo',icon:'≈',text:'A musculatura lisa da parede ureteral produz ondas peristálticas que conduzem a urina até a bexiga. A gravidade não é indispensável a esse transporte.'},
 {title:'Armazenamento e micção',icon:'◡',text:'Durante o armazenamento, a bexiga se distende e o detrusor permanece relativamente relaxado. Na micção, o detrusor se contrai e ocorre relaxamento coordenado dos esfíncteres.'},
 {title:'O que é uma analogia?',icon:'✧',text:'O Liquid Motion é a inspiração sensorial. O rim não contém gotas de óleo, bolhas decorativas nem um sistema que filtra por densidade. O objetivo é usar o movimento de líquidos como convite para explorar os verdadeiros mecanismos renais.'},
 {title:'Anatomia do caminho da urina',icon:'↝',text:'Depois de formada nos néfrons e ductos coletores, a urina passa pelas papilas renais, cálices menores, cálices maiores, pelve renal, ureter, bexiga e uretra.'}
];
let progress = loadProgress();
let run = freshRun();
let screen='home';
let toastTimer=null;
let soundEnabled=false;
let audioCtx=null;
let installEvent=null;
let tilt=0;
let dragging=null;
let ignoreNextClick=false;
let motionEnabled=false;
function loadProgress(){
 try{
  const value=JSON.parse(localStorage.getItem(storageKey)||'{}');
  return {completed:Array.from({length:4},(_,i)=>Boolean(value.completed?.[i])),score:Number(value.score)||0};
 }catch{return {completed:[false,false,false,false],score:0};}
}
function saveProgress(){try{localStorage.setItem(storageKey,JSON.stringify(progress));}catch{}}
function freshRun(){return {sort:{},selected:null,sortMessage:'',sortWrong:false,quiz1Done:false,tubuleIndex:0,tubuleAnswered:false,tubuleMessage:'',waveCount:0,waveMessage:'',quiz3Done:false,bladderLevel:0,quiz4Done:false,emptied:false,wrongOption:''};}
const completedCount=()=>progress.completed.filter(Boolean).length;
const unlocked=(n)=>n===1||progress.completed[n-2];
const htmlSafe=(s)=>String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function img(name,alt='',cls='',other=''){return `<img src="${ASSET(name)}" alt="${htmlSafe(alt)}" class="${cls}" ${other}>`;}
function announce(message,kind='info'){
 toast.textContent=message;toast.hidden=false;
 toast.style.borderColor=kind==='wrong'?'#ff819b':kind==='correct'?'#78e5b9':'#81e4ff';
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true;},2800);
}
function sound(kind='tap'){
 if(!soundEnabled)return;
 try{
  audioCtx??=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  const start=audioCtx.currentTime;
  const tones=kind==='correct'?[440,660,880]:kind==='wrong'?[205,170]:[420];
  tones.forEach((freq,i)=>{
   const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(freq,start+i*.07);
   gain.gain.setValueAtTime(.0001,start+i*.07);
   gain.gain.exponentialRampToValueAtTime(.09,start+i*.07+.017);
   gain.gain.exponentialRampToValueAtTime(.0001,start+i*.07+.19);
   osc.connect(gain).connect(audioCtx.destination);osc.start(start+i*.07);osc.stop(start+i*.07+.2);
  });
 }catch{}
}
function speak(){
 if(!('speechSynthesis' in window)){announce('Este navegador não oferece leitura por voz.');return;}
 window.speechSynthesis.cancel();
 const text=document.querySelector('[data-narration]')?.getAttribute('data-narration')||'Bem-vindo ao UrinaMotion, um laboratório sensorial do sistema urinário.';
 const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=.93;u.pitch=1;
 window.speechSynthesis.speak(u);
}
function stageCard(stage){
 const done=progress.completed[stage.n-1],locked=!unlocked(stage.n);
 return `<button type="button" class="stage-card ${done?'done':''} ${locked?'locked':''}" data-stage="${stage.n}" ${locked?'disabled aria-label="Missão bloqueada"':''}>
  <span class="stage-preview">${img(stage.image,stage.title)}<span class="stage-n">MISSÃO 0${stage.n}</span></span>
  <span class="stage-body"><span class="stage-badge">${done?'✓ CONCLUÍDA':locked?'◌ BLOQUEADA':'● DISPONÍVEL'}</span><h3>${stage.title}</h3><p>${stage.detail}</p><span class="card-link">${done?'Jogar novamente →':locked?'Conclua a anterior':'Explorar missão →'}</span></span></button>`;
}
function renderHome(){
 const next=progress.completed.findIndex(v=>!v)+1;
 return `<section class="home-hero">
  <div class="hero-copy"><span class="eyebrow">ANATOMIA + CIÊNCIA + SENSAÇÃO</span>
   <h1>A ciência renal<br><span class="accent">ganhou movimento.</span></h1>
   <p class="lead">Entre em um universo de gotas luminosas e descubra como os rins filtram, como o néfron transforma o filtrado e como a urina chega à bexiga.</p>
   <div class="hero-ctas"><button class="primary-button" data-stage="${next||1}">▶ ${completedCount()===4?'Jogar novamente':'Começar aventura'}</button><button class="secondary-button" data-nav="stages">Explorar missões ↗</button></div>
   <div class="hero-features"><span><b>✓</b> Interativo por toque</span><span><b>✓</b> Áudio explicativo</span><span><b>✓</b> Funciona offline*</span></div>
   <p class="tiny" style="margin:15px 0 0">*Depois de instalado por HTTPS e carregado ao menos uma vez.</p>
  </div>
  <div class="sensory-card" data-narration="Este é um brinquedo sensorial inspirado em Liquid Motion. As gotas ilustram conceitos, mas os mecanismos do sistema urinário são filtração, reabsorção, secreção e contração muscular.">
    <div class="sensor-particles" aria-hidden="true">${Array.from({length:13},(_,i)=>`<i class="floating-bubble" style="top:${10+(i*43)%80}%;left:${5+(i*29)%91}%;animation-delay:-${i*.4}s;transform:scale(${.5+i%3*.3})"></i>`).join('')}</div>
    <div class="sensor-capsule" id="sensory-capsule">${img('capsula','Cápsula Liquid Motion futurista com gotas em movimento')}</div>
    <div class="capsule-hud"><div><strong>Experimente o Liquid Motion</strong><small>Incline a cápsula e explore as gotas</small></div><div class="tilt-actions"><button type="button" data-tilt="-1" aria-label="Inclinar à esquerda">↶</button><button type="button" data-tilt="1" aria-label="Inclinar à direita">↷</button><button type="button" data-motion="1" aria-label="Usar movimento do aparelho" title="Usar sensor de movimento">◉</button></div></div>
  </div>
 </section>
 <div class="stats-bar"><div class="stat-box"><strong>${completedCount()}/4</strong><small>Missões concluídas</small></div><div class="stat-box"><strong>${progress.score}</strong><small>Pontos científicos</small></div><div class="stat-box"><strong>${Math.round(completedCount()/4*100)}%</strong><small>Da jornada concluída</small></div></div>
 <div class="progress-track" aria-label="Progresso da jornada"><span style="width:${completedCount()/4*100}%"></span></div>
 <div class="section-head"><div><span class="eyebrow">MAPA DE APRENDIZAGEM</span><h2>Quatro missões, uma jornada</h2></div><p>Experimente cada etapa no seu ritmo. As fases seguintes são liberadas conforme você aprende.</p></div>
 <div class="stage-grid">${STAGES.map(stageCard).join('')}</div>
 <section class="science-note" style="margin-top:22px"><span>✦</span><div><strong>Rigor anatômico com criatividade</strong><br>As gotas são metáforas visuais. O UrinaMotion não representa óleo dentro dos rins, e cada fase explica o processo fisiológico correto.</div></section>`;
}
function renderStages(){return `<div class="screen-heading"><div><span class="eyebrow">ESCOLHA SUA MISSÃO</span><h1 style="font-size:clamp(35px,4.6vw,55px)">Mapa <span class="accent">renal</span></h1><p class="lead">Quatro desafios sensoriais para conectar anatomia, função e movimento.</p></div></div><div class="stats-bar"><div class="stat-box"><strong>${completedCount()}/4</strong><small>Missões concluídas</small></div><div class="stat-box"><strong>${progress.score}</strong><small>Pontos</small></div><div class="stat-box"><strong>${completedCount()===4?'✓':'↗'}</strong><small>${completedCount()===4?'Jornada completa':'Continue explorando'}</small></div></div><div class="stage-grid">${STAGES.map(stageCard).join('')}</div>`;}
function stageShell(n,content,art,caption,extraClass=''){
 const s=STAGES[n-1];
 return `<section class="stage-container"><div class="screen-heading"><button type="button" class="back-button" data-nav="stages">← Missões</button><div class="step-dots" aria-label="Missão ${n} de 4">${STAGES.map(st=>`<span class="${st.n<n?'done':st.n===n?'active':''}"></span>`).join('')}</div></div>
 <div class="stage-overline">MISSÃO 0${n} • ${s.label}</div><h2 class="stage-title">${s.title}</h2><p class="stage-subtitle">${s.detail}</p>
 <div class="game-layout"><section class="game-panel">${content}</section><div class="art-panel ${extraClass}"><span class="art-label">ANATOMIA INTERATIVA</span>${art}<span class="art-caption">${caption}</span></div></div>
 <footer class="stage-footer"><span>URINAMOTION 3D · DESAFIO ${n}/4</span><button class="tertiary-button" data-nav="journal" type="button">Consultar diário científico ↗</button></footer></section>`;
}
function stageCompletion(n){
 return `<div class="completion-banner"><div><h3>✧ Missão ${n} concluída!</h3><p>Você desbloqueou um novo passo da jornada renal.</p></div><button type="button" class="primary-button" data-stage="${n===4?1:n+1}">${n===4?'Jogar de novo':'Próxima missão →'}</button></div>`;
}
function questionHTML(question,opts,answerAction){
 return `<div class="panel-label">DESAFIO DE CONHECIMENTO</div><h3>${question}</h3><div class="question-options">${opts.map(o=>`<button type="button" class="option-button" data-action="${answerAction}" data-answer="${o.id}">${o.text}<span class="opt-icon">↗</span></button>`).join('')}</div>`;
}
function renderStage1(){
 const placed=Object.keys(run.sort).length;
 const complete=placed===PARTICLES.length;
 let left=`<div class="panel-label">ETAPA 1 · SEPARE AS PARTÍCULAS</div><h3>Quem atravessa o filtro?</h3><p class="hint" data-narration="Selecione uma gota e toque no destino. Água e pequenas substâncias passam normalmente à cápsula de Bowman. Hemácias e a maior parte das proteínas plasmáticas permanecem nos capilares.">Toque em uma partícula e depois no destino, ou <strong>arraste-a</strong> para o recipiente correto. Observe o que atravessa a barreira glomerular.</p>
 <div class="chip-list"><span class="chip">${placed}/6 partículas classificadas</span><span class="chip">+100 pontos ao concluir</span></div>`;
 if(!complete){
  const remain=PARTICLES.filter(p=>!run.sort[p.id]);
  left+=`<div class="particle-bank">${remain.map(p=>`<button type="button" class="token ${run.selected===p.id?'selected':''}" data-item="${p.id}" aria-label="Selecionar ${p.name}">${img(p.image,'')}<span>${p.name}</span></button>`).join('')}${Array.from({length:Math.max(0,3-remain.length)},()=>'<div class="token-placeholder">✓</div>').join('')}</div>
  <div class="drop-zones"><button class="drop-zone" data-zone="filtrate"><strong>✧ FILTRADO</strong><small>Espaço da cápsula de Bowman</small><span class="sorted-items">${PARTICLES.filter(p=>run.sort[p.id]==='filtrate').map(p=>p.name).join(' · ')||'Solte aqui'}</span></button><button class="drop-zone" data-zone="blood"><strong>♥ SANGUE</strong><small>Permanece no capilar</small><span class="sorted-items">${PARTICLES.filter(p=>run.sort[p.id]==='blood').map(p=>p.name).join(' · ')||'Solte aqui'}</span></button></div>
  <div class="feedback ${run.sortWrong?'wrong':''}">${run.sortMessage||'Dica: a barreira glomerular normalmente retém células sanguíneas e a maior parte da albumina.'}</div>`;
 }else if(!run.quiz1Done){
  left+=`<div class="feedback correct"><strong>✓ Excelente!</strong>Você separou todos os componentes. Agora responda ao desafio final.</div>`;
  left+=questionHTML('Em qual espaço o filtrado glomerular é inicialmente coletado?', [
   {id:'bowman',text:'Espaço capsular da cápsula de Bowman'},
   {id:'pelvis',text:'Pelve renal'},
   {id:'ureter',text:'Luz do ureter'}], 'quiz1');
 }else {left+=`<div class="feedback correct"><strong>Resposta correta!</strong>O filtrado chega primeiro ao espaço capsular e segue para o túbulo proximal.</div>${stageCompletion(1)}`;}
 const art=`<div class="illustration-stack">${img('glomerulo','Corpúsculo renal em corte, com glomérulo e cápsula de Bowman')}
 <i class="fluid-dot" style="top:22%;left:70%;width:15px;height:15px"></i><i class="fluid-dot gold" style="top:42%;left:78%;width:11px;height:11px;animation-delay:-1.1s"></i><i class="fluid-dot" style="top:61%;left:67%;width:9px;height:9px;animation-delay:-2.3s"></i></div>`;
 return stageShell(1,left,art,'O sangue circula nos capilares; o filtrado surge no espaço capsular.','wide-art');
}
function renderStage2(){
 const i=run.tubuleIndex,done=progress.completed[1],caseInfo=CASES[Math.min(i,CASES.length-1)];
 let left=`<div class="panel-label">ETAPA 2 · DECISÃO TUBULAR</div><h3>Escolha o caminho correto</h3><p class="hint" data-narration="Nos néfrons, substâncias podem ser reabsorvidas, secretadas ou permanecer no líquido tubular. Leia a situação e escolha a direção correspondente.">O movimento de cada gota depende da <strong>função do segmento tubular</strong>. Qual processo está acontecendo?</p>
 <div class="case-progress">${CASES.map((_,j)=>`<span class="${j<i?'passed':j===i?'now':''}"></span>`).join('')}</div>
 <div class="chip-list"><span class="chip">Caso ${Math.min(i+1,CASES.length)} de ${CASES.length}</span><span class="chip">${caseInfo.where}</span></div>
 <div class="feedback"><strong>${caseInfo.title}</strong>${caseInfo.question}</div>`;
 if(!run.tubuleAnswered){
  left+=`<div class="question-options">${DESTINATIONS.map(d=>`<button type="button" class="option-button flow-choice" data-action="tubule" data-answer="${d.id}"><span><strong>${d.name}</strong><br><span class="tiny">${d.subtitle}</span></span><span class="opt-icon">${d.symbol}</span></button>`).join('')}</div>`;
  if(run.tubuleMessage)left+=`<div class="feedback wrong">${run.tubuleMessage}</div>`;
 }else{
  left+=`<div class="feedback correct"><strong>✓ Muito bem!</strong>${caseInfo.why}</div>`;
  if(done){left+=stageCompletion(2);} else left+=`<button class="primary-button push-bottom" data-action="next-case" type="button">${i===CASES.length-1?'Concluir':'Próximo caso →'}</button>`;
 }
 left+=`<div class="micro-divider"></div><div class="tubule-cards"><div class="tubule-info"><strong>REABSORVER</strong>Volta ao organismo</div><div class="tubule-info"><strong>SECRETAR</strong>Entra no túbulo</div><div class="tubule-info"><strong>SEGUIR</strong>Percorre o lúmen</div></div>`;
 const art=`<div class="illustration-stack">${img('nefron','Néfron com corpúsculo renal, túbulos e alça de Henle')}
 <i class="fluid-dot" style="top:21%;left:31%;width:10px;height:10px"></i><i class="fluid-dot gold" style="top:48%;left:53%;width:12px;height:12px;animation-delay:-1.3s"></i><i class="fluid-dot purple" style="top:76%;left:58%;width:9px;height:9px;animation-delay:-2s"></i></div>`;
 return stageShell(2,left,art,'O túbulo modifica o filtrado antes de a urina seguir para os ductos coletores.','wide-art');
}
function renderStage3(){
 const n=run.waveCount;const active=n%3;
 let left=`<div class="panel-label">ETAPA 3 · COMANDE O PERISTALTISMO</div><h3>Faça a urina avançar</h3><p class="hint" data-narration="A musculatura lisa do ureter produz ondas peristálticas. Toque nos três pontos de contração na sequência, começando mais perto do rim e seguindo em direção à bexiga. Repita três ondas.">Toque nos <strong>anéis de contração 1 → 2 → 3</strong>, sempre no sentido do rim para a bexiga. Complete três ondas.</p>
 <div class="chip-list"><span class="chip">${Math.min(Math.floor(n/3),3)}/3 ondas completas</span><span class="chip">Toque no anel ${active+1}</span></div>
 <div class="wave-meter">${Array.from({length:9},(_,i)=>`<span class="${i<n?'on':''}"></span>`).join('')}</div>`;
 if(n<9){
  left+=`<div class="question-options">${[1,2,3].map(pos=>`<button class="option-button ${pos===active+1?'good':''}" type="button" data-action="wave" data-wave="${pos}"><span>Ativar contração ${pos}</span><span class="opt-icon">${pos===active+1?'◎':'○'}</span></button>`).join('')}</div><div class="feedback ${run.waveMessage.startsWith('A sequência')?'wrong':''}">${run.waveMessage||'Quando uma região do ureter se contrai, a urina é impulsionada para o segmento seguinte.'}</div>`;
 }else if(!run.quiz3Done){left+=`<div class="feedback correct">✓ Três ondas completas! Agora explique o mecanismo.</div>`+questionHTML('Por que a urina pode avançar no ureter mesmo contra a gravidade?',[
  {id:'muscle',text:'Pelas ondas de contração da musculatura lisa'},
  {id:'oil',text:'Porque a urina tem óleo, como um Liquid Motion'},
  {id:'gravity',text:'Porque a gravidade sempre puxa para a bexiga'}],'quiz3');
 }else{left+=`<div class="feedback correct"><strong>✓ Exatamente.</strong>O peristaltismo impulsiona a urina e não depende exclusivamente da gravidade.</div>${stageCompletion(3)}`;}
 const nodes=[1,2,3].map(pos=>`<button class="wave-node ${n<9?(pos<active+1?'completed':pos===active+1?'active':''): 'completed'}" type="button" data-action="wave" data-wave="${pos}" aria-label="Ativar contração ${pos}">${pos}</button>`).join('');
 const art=`<div class="peristaltic-art">${img('ureter','Ureter em corte, mostrando a parede muscular e a urina no interior')}${n<9?nodes:''}</div>`;
 return stageShell(3,left,art,'As ondas musculares do ureter transportam a urina até a bexiga.');
}
function renderStage4(){
 const level=run.bladderLevel,pct=level*25;
 let left=`<div class="panel-label">ETAPA 4 · RESERVATÓRIO INTELIGENTE</div><h3>Armazenar e esvaziar</h3><p class="hint" data-narration="A bexiga armazena urina enquanto o músculo detrusor permanece relativamente relaxado. A micção requer contração do detrusor e relaxamento coordenado dos esfíncteres.">Receba quatro porções de urina para visualizar a distensão da bexiga. Depois, descubra qual músculo participa da micção.</p>
 <div class="big-number">${pct}%</div><div class="fill-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Nível didático de enchimento"><span style="width:${pct}%"></span></div><p class="tiny">Escala ilustrativa de progresso do jogo; não representa capacidade ou volume vesical clínico.</p>`;
 if(!run.emptied&&level<4){left+=`<button type="button" class="primary-button" data-action="fill">＋ Receber porção de urina</button><div class="feedback">${pct===0?'A bexiga começa pouco preenchida.':'A parede vesical se adapta ao enchimento. O detrusor fica relativamente relaxado durante o armazenamento.'}</div>`;}
 if(!run.emptied&&level===4&&!run.quiz4Done){left+=`<div class="feedback correct">✓ Bexiga preenchida para este desafio!</div>`+questionHTML('Qual músculo se contrai durante a micção?',[
  {id:'detrusor',text:'Músculo detrusor da bexiga'},
  {id:'ureter',text:'Músculo liso do ureter apenas'},
  {id:'diaphragm',text:'Diafragma torácico'}],'quiz4');}
 if(!run.emptied&&level===4&&run.quiz4Done){left+=`<div class="feedback correct"><strong>✓ Correto!</strong>O detrusor se contrai enquanto há relaxamento coordenado dos esfíncteres para permitir o esvaziamento.</div><button type="button" class="primary-button" data-action="empty">↘ Realizar micção</button>`;}
 if(run.emptied){left+=`<div class="feedback correct"><strong>✧ Jornada concluída!</strong>Você percorreu filtração, transporte tubular, ureter e bexiga.</div><button class="primary-button" data-nav="finish">Ver minha conquista ✨</button>`;}
 const opacity=run.emptied?0:level/4;
 const art=`<div class="bladder-art">${img('bexiga_vazia','Bexiga urinária pouco preenchida')}${img('bexiga_cheia','Bexiga urinária preenchida','filled-img',`style="opacity:${opacity}"`)}<div class="bladder-level"><strong>${pct}%</strong><small>ENCHIMENTO<br>ILUSTRATIVO</small></div></div>`;
 return stageShell(4,left,art,'Distensão vesical e coordenação muscular durante a micção.');
}
function renderJournal(){
 return `<section class="stage-container"><span class="eyebrow">CONHECIMENTO PARA LEVAR</span><h1 style="font-size:clamp(35px,4.6vw,55px)">Diário <span class="accent">científico</span></h1><p class="lead journal-intro">O Liquid Motion inspira os efeitos sensoriais. Estas são as explicações fisiológicas para levar à aula de Anatomia Humana.</p>
 <div class="journal-grid">${NOTES.map(n=>`<article class="journal-card"><div class="journal-icon">${n.icon}</div><h3>${n.title}</h3><p>${n.text}</p></article>`).join('')}</div>
 <div class="award" style="margin-top:21px"><span class="award-icon">✧</span><div><strong>Seu progresso: ${completedCount()} de 4 missões</strong><p>Conhecimento se constrói observando, testando hipóteses e relacionando forma e função.</p></div></div>
 <div class="journal-reset"><button class="secondary-button" type="button" data-action="reset">↺ Reiniciar progresso</button></div></section>`;
}
function renderFinish(){
 return `<section class="finisher"><div><span class="eyebrow">CONQUISTA DESBLOQUEADA</span><h1>Você é um<br><span class="accent">explorador renal!</span></h1><p class="lead">Quatro missões concluídas. Você relacionou a filtração, o transporte tubular, o peristaltismo e a micção em uma jornada sensorial.</p><div class="award"><span class="award-icon">✦</span><div><strong>Certificado simbólico: Explorador do UrinaMotion</strong><p>${progress.score} pontos científicos • 4 de 4 missões</p></div></div><div class="hero-ctas" style="margin-top:22px"><button class="primary-button" data-nav="stages">Revisar desafios</button><button class="secondary-button" data-nav="journal">Diário científico →</button></div></div>${img('rim','Rim humano em corte mostrando córtex medula cálices pelve renal e ureter')}</section>`;
}
function render(){
 let content='';
 if(screen==='home')content=renderHome();
 else if(screen==='stages')content=renderStages();
 else if(screen==='journal')content=renderJournal();
 else if(screen==='finish')content=renderFinish();
 else if(screen==='stage1')content=renderStage1();
 else if(screen==='stage2')content=renderStage2();
 else if(screen==='stage3')content=renderStage3();
 else if(screen==='stage4')content=renderStage4();
 app.innerHTML=content;
 document.querySelectorAll('.mobile-nav button').forEach(el=>el.classList.toggle('active',el.dataset.nav===(screen.startsWith('stage')?'stages':screen)));
 const capsule=document.getElementById('sensory-capsule');if(capsule)capsule.style.transform=`rotate(${tilt}deg)`;
}
function navigate(dest){
 if(dest.startsWith('stage')){
  const n=Number(dest.slice(5));if(!unlocked(n)){announce('Conclua a missão anterior para desbloquear esta fase.');return;}
  run=freshRun();
 }
 screen=dest;
 if('speechSynthesis' in window)window.speechSynthesis.cancel();
 render();window.scrollTo({top:0,behavior:'instant'});
}
function completeStage(n){
 if(!progress.completed[n-1]){progress.completed[n-1]=true;progress.score+=100;saveProgress();sound('correct');announce('Missão concluída! +100 pontos científicos','correct');}
}
function chooseDestination(zone){
 const p=PARTICLES.find(p=>p.id===run.selected);if(!p){announce('Selecione uma gota primeiro.');return;}
 if(run.sort[p.id])return;
 if(p.target!==zone){run.sortWrong=true;run.sortMessage=`${p.name}: tente novamente. Pense no tamanho das células e nas características da barreira glomerular.`;sound('wrong');}
 else {run.sort[p.id]=zone;run.selected=null;run.sortWrong=false;run.sortMessage=`✓ ${p.name} classificado corretamente. Continue!`;sound('correct');}
 render();
}
function chooseQuiz(which,answer){
 const expected=which==='quiz1'?'bowman':which==='quiz3'?'muscle':'detrusor';
 if(answer!==expected){sound('wrong');announce('Ainda não. Releia a pergunta e tente novamente.','wrong');return;}
 sound('correct');
 if(which==='quiz1'){run.quiz1Done=true;completeStage(1);}
 else if(which==='quiz3'){run.quiz3Done=true;completeStage(3);}
 else {run.quiz4Done=true;}
 render();
}
function chooseTubule(answer){
 const c=CASES[run.tubuleIndex];if(run.tubuleAnswered)return;
 if(answer!==c.answer){run.tubuleMessage='Quase! Compare a direção do transporte: do túbulo para o sangue, do sangue para o túbulo ou continuação no lúmen.';sound('wrong');announce('Reveja a direção do transporte.','wrong');render();return;}
 run.tubuleAnswered=true;run.tubuleMessage='';sound('correct');
 if(run.tubuleIndex===CASES.length-1)completeStage(2);
 render();
}
function wave(pos){
 if(run.waveCount>=9)return;
 const next=run.waveCount%3+1;
 if(Number(pos)!==next){run.waveMessage='A sequência é 1 → 2 → 3, no sentido do rim para a bexiga. Tente novamente.';sound('wrong');render();return;}
 run.waveCount++;run.waveMessage=run.waveCount%3===0?`✓ Onda ${run.waveCount/3} concluída. O transporte continua!`:'✓ Contração coordenada. Continue a onda!';sound('tap');render();
}
function toggleTilt(direction){tilt=Math.max(-50,Math.min(50,tilt+direction*18));const capsule=document.getElementById('sensory-capsule');if(capsule)capsule.style.transform=`rotate(${tilt}deg)`;sound('tap');}
async function enableMotion(){
 if(motionEnabled){announce('O sensor de movimento já está ativado.');return;}
 if(!('DeviceOrientationEvent' in window)){announce('Este aparelho não oferece sensor de orientação; use as setas.');return;}
 try{
  if(typeof DeviceOrientationEvent.requestPermission==='function'){
   const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted'){announce('Permissão não concedida; use as setas.');return;}
  }
  window.addEventListener('deviceorientation', e=>{
   if(typeof e.gamma!=='number')return;
   tilt=Math.max(-45,Math.min(45,e.gamma));
   const capsule=document.getElementById('sensory-capsule');if(capsule)capsule.style.transform=`rotate(${tilt}deg)`;
  },{passive:true});
  motionEnabled=true;announce('Sensor ativado! Incline o aparelho para mover a cápsula.','correct');
 }catch{announce('Não foi possível ativar o sensor. Use as setas.');}
}
function openDialog(){
 const box=document.getElementById('dialog-body');
 let content='';
 if(location.protocol==='file:')content='<p>O jogo pode ser aberto localmente, mas <strong>para instalar como PWA</strong> ele deve ser publicado em um endereço HTTPS (por exemplo, GitHub Pages). As instruções acompanham o pacote.</p>';
 else if(/iPad|iPhone|iPod/.test(navigator.userAgent))content='<p>No iPhone ou iPad:</p><ol><li>Abra o endereço deste jogo no <strong>Safari</strong>.</li><li>Toque em <strong>Compartilhar</strong> (quadrado com seta).</li><li>Escolha <strong>Adicionar à Tela de Início</strong> e confirme.</li></ol><p>Depois, abra pelo ícone criado na tela inicial.</p>';
 else content='<p>No Android ou tablet:</p><ol><li>Abra este site no <strong>Chrome</strong> por HTTPS.</li><li>Toque no menu <strong>⋮</strong>.</li><li>Selecione <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li></ol><p>A opção depende do navegador e dos requisitos de instalação.</p>';
 box.innerHTML=content;document.getElementById('dialog-backdrop').hidden=false;document.getElementById('dialog-ok').focus();
}
function closeDialog(){document.getElementById('dialog-backdrop').hidden=true;document.getElementById('install-button').focus();}
// Toque, teclado e botões de decisão em um único manipulador.
document.addEventListener('click',async e=>{
 const install=e.target.closest('#install-button');if(install){if(installEvent){installEvent.prompt();try{await installEvent.userChoice;}catch{}installEvent=null;}else openDialog();return;}
 const nav=e.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return;}
 const stage=e.target.closest('[data-stage]');if(stage){navigate(`stage${stage.dataset.stage}`);return;}
 const til=e.target.closest('[data-tilt]');if(til){toggleTilt(Number(til.dataset.tilt));return;}
 if(e.target.closest('[data-motion]')){enableMotion();return;}
 if(e.target.closest('#sound-toggle')){soundEnabled=!soundEnabled;document.getElementById('sound-toggle').classList.toggle('on',soundEnabled);announce(soundEnabled?'Efeitos sonoros ativados':'Efeitos sonoros desativados');if(soundEnabled)sound('correct');return;}
 if(e.target.closest('#voice-toggle')){speak();return;}
 if(e.target.closest('#dialog-close')||e.target.closest('#dialog-ok')){closeDialog();return;}
 const item=e.target.closest('[data-item]');
 if(item){if(ignoreNextClick){ignoreNextClick=false;return;}run.selected=item.dataset.item;run.sortWrong=false;run.sortMessage='Toque no recipiente correspondente à partícula selecionada.';sound('tap');render();return;}
 const zone=e.target.closest('[data-zone]');if(zone){chooseDestination(zone.dataset.zone);return;}
 const action=e.target.closest('[data-action]');if(!action)return;
 const kind=action.dataset.action;
 if(kind.startsWith('quiz')){chooseQuiz(kind,action.dataset.answer);return;}
 if(kind==='tubule'){chooseTubule(action.dataset.answer);return;}
 if(kind==='next-case'){
  if(!run.tubuleAnswered)return;
  if(run.tubuleIndex<CASES.length-1){run.tubuleIndex++;run.tubuleAnswered=false;run.tubuleMessage='';render();}
  return;
 }
 if(kind==='wave'){wave(action.dataset.wave);return;}
 if(kind==='fill'&&run.bladderLevel<4){run.bladderLevel++;sound('tap');render();return;}
 if(kind==='empty'){run.emptied=true;run.bladderLevel=0;completeStage(4);render();return;}
 if(kind==='reset'){
  if(!window.confirm('Deseja apagar o progresso das quatro missões neste aparelho?'))return;
  progress={completed:[false,false,false,false],score:0};saveProgress();run=freshRun();render();announce('Progresso reiniciado.');return;
 }
});
// Arraste de verdade com Pointer Events (touch, mouse e stylus).
document.addEventListener('pointerdown',e=>{
 const token=e.target.closest('.token[data-item]');if(!token||!screen.startsWith('stage1'))return;
 dragging={id:token.dataset.item,startX:e.clientX,startY:e.clientY,active:false,ghost:null,origin:token,pointerId:e.pointerId};
 token.setPointerCapture?.(e.pointerId);
});
document.addEventListener('pointermove',e=>{
 if(!dragging||dragging.pointerId!==e.pointerId)return;
 const d=dragging;
 if(!d.active&&Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>9){
  d.active=true;d.ghost=document.createElement('div');d.ghost.className='ghost-token';
  const p=PARTICLES.find(p=>p.id===d.id);d.ghost.innerHTML=img(p.image,'');document.body.append(d.ghost);d.origin.style.opacity='.35';
 }
 if(d.active){d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
  document.querySelectorAll('.drop-zone').forEach(zone=>{
   const r=zone.getBoundingClientRect();zone.classList.toggle('over',e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom);
  });
 }
});
document.addEventListener('pointerup',e=>{
 if(!dragging||dragging.pointerId!==e.pointerId)return;
 const d=dragging;dragging=null;
 if(d.active){
  d.ghost?.remove();d.origin.style.opacity='';
  const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-zone]');
  document.querySelectorAll('.drop-zone').forEach(z=>z.classList.remove('over'));
  ignoreNextClick=true;setTimeout(()=>{ignoreNextClick=false;},250);
  run.selected=d.id;
  if(target)chooseDestination(target.dataset.zone);
  else {run.sortMessage='Arraste a gota até um dos dois recipientes.';render();}
 }
});
document.addEventListener('pointercancel',()=>{dragging?.ghost?.remove();dragging=null;document.querySelectorAll('.drop-zone').forEach(z=>z.classList.remove('over'));});
document.getElementById('dialog-backdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeDialog();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.getElementById('dialog-backdrop').hidden)closeDialog();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;});
window.addEventListener('appinstalled',()=>{announce('Aplicativo instalado!','correct');installEvent=null;});
function updateNetwork(){document.getElementById('connection-label').textContent=navigator.onLine?'Pronto para jogar':'Modo offline';}
window.addEventListener('online',updateNetwork);window.addEventListener('offline',updateNetwork);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
updateNetwork();render();
