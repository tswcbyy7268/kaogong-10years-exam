(() => {
  'use strict';
  const bank = window.BANK;
  const $ = s => document.querySelector(s);
  if (!bank || !Array.isArray(bank.questions)) {
    $('#detail').innerHTML = '<div class="empty"><h2>题库数据未能加载</h2><p>请保留网页文件夹中的 data.js 与 assets 文件夹，再重新打开。</p></div>';
    return;
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const catMap = Object.fromEntries(bank.categories.map(c => [c.id, c]));
  const all = [...bank.questions].sort((a,b) => b.year-a.year || a.variant.localeCompare(b.variant,'zh') || a.number-b.number);
  const progress = window.PracticeProgress.attach('analysis', bank, () => { state.reveal=false; renderAll(); });
  const answers = progress.answers;
  const state = { category:'', year:'', variant:'', search:'', selected:all.find(q => q.year===2026 && q.variant==='副省级' && q.number===116)?.id || all[0]?.id, listPage:0, materialPage:0, reveal:false };
  const pageSize=8;
  let filtered=[];
  function answerState(q) { if (!answers.has(q.id)) answers.set(q.id,{choice:null,submitted:false}); return answers.get(q.id); }
  function filterQuestions() {
    const needle=state.search.trim().toLowerCase();
    filtered=all.filter(q => (!state.category || q.category===state.category) && (!state.year || q.year===Number(state.year)) && (!state.variant || q.variant===state.variant || q.aliases.some(a=>a.variant===state.variant)) && (!needle || `${q.year} ${q.variant} ${q.number} ${q.stem} ${catMap[q.category].name} ${q.aliases.map(a=>`${a.year} ${a.variant} ${a.number}`).join(' ')}`.toLowerCase().includes(needle)));
    if (!filtered.some(q=>q.id===state.selected)) { state.selected=filtered[0]?.id || null; state.materialPage=0; state.reveal=false; }
    const max=Math.max(0,Math.ceil(filtered.length/pageSize)-1); state.listPage=Math.min(max,state.listPage);
  }
  function renderCategories() {
    $('#categories').innerHTML=[{id:'',name:'全部考点',count:bank.questions.length},...bank.categories].map(c=>`<button type="button" class="category-button ${c.id===state.category?'active':''}" data-category="${c.id}" aria-pressed="${c.id===state.category}"><span class="category-code">${c.id||'全'}</span><span class="category-label">${esc(c.name)}</span><span class="category-count">${c.count}</span></button>`).join('');
    $('#total-count').textContent=bank.questions.length;
  }
  function renderList() {
    const category=catMap[state.category];
    $('#category-title').textContent=category?.name || '全部考点';
    $('#category-description').textContent=category?.description || '按考点挑选原题，先作答，再核对解析。';
    $('#filtered-count').textContent=filtered.length;
    const items=filtered.slice(state.listPage*pageSize,(state.listPage+1)*pageSize);
    $('#question-list').innerHTML=items.length?items.map(q=>{
      const a=answerState(q);
      const status=a.submitted?(a.choice===q.answer?'已答对':'待复盘'):catMap[q.category].name;
      return `<button type="button" class="question-item ${q.id===state.selected?'active':''}" data-question="${q.id}" aria-current="${q.id===state.selected?'true':'false'}"><span class="question-meta"><b>${q.year} · ${esc(q.variant)}</b><span>第${q.number}题</span></span><span class="question-preview">${esc(q.stem || '图表与计算题，请阅读原卷题目')}</span><span class="question-tag">${esc(status)}</span></button>`;
    }).join(''):'<div class="filter-empty">没有符合条件的题目。<br>试试其他年份或重置筛选。</div>';
    const total=Math.max(1,Math.ceil(filtered.length/pageSize));
    $('#list-page').textContent=`${state.listPage+1} / ${total}`;
    $('#list-prev').disabled=state.listPage===0;
    $('#list-next').disabled=state.listPage+1>=total;
    $('#result-info').textContent=`共${filtered.length}题 · 年份由近到远`;
  }
  function getCurrent(){ return filtered.find(q=>q.id===state.selected); }
  function analysisHtml(q) {
    const cat=catMap[q.category];
    return `<section class="analysis" id="analysis"><h3>答案与参考解析</h3><div class="answer-result"><span class="answer-letter">${esc(q.answer || '见原页')}</span><small>参考答案 · ${q.year}年${esc(q.variant)}第${q.number}题</small></div>${q.analysisImages.map((src,i)=>`<img class="analysis-image" src="${src}" alt="${q.year}年${esc(q.variant)}第${q.number}题参考解析，第${i+1}部分" loading="lazy" data-zoom="${src}" data-caption="第${q.number}题 · 参考解析">`).join('')}<div class="hint"><strong>本专项方法提醒</strong>${esc(cat.hint)}</div><p class="reference-name">解析来源：${esc(q.answerSourceName)}${q.analysisPage?`，第${q.analysisPage}页起`:''}。保留原文件图示与计算过程。</p></section>`;
  }
  function renderDetail() {
    const q=getCurrent();
    if (!q) { $('#detail').innerHTML='<div class="empty"><h2>没有匹配的题目</h2><p>调整筛选后继续练习。</p></div>'; return; }
    if(state.pageQuestion!==q.id){state.materialPage=Math.max(0,q.pages.findIndex(p=>p.page===q.focusPage));state.pageQuestion=q.id;}
    state.materialPage=Math.min(state.materialPage,q.pages.length-1);
    const page=q.pages[state.materialPage],a=answerState(q),cat=catMap[q.category];
    const index=filtered.findIndex(x=>x.id===q.id);
    const feedback=a.submitted?`<p class="feedback ${a.choice===q.answer?'':'wrong'}" role="status">${a.choice===q.answer?'作答正确。':'本题需要复盘。'}你的答案：${a.choice}；参考答案：${q.answer}。${a.choice===q.answer?'可以查看解析，核对方法是否简洁。':'展开解析，先核对找数与列式。'}</p>`:'';
    $('#detail').innerHTML=`<div class="detail-kicker"><span class="type-label">${esc(cat.name)}</span><span>${q.year}年国考 · ${esc(q.variant)}</span><span>第${q.number}题</span></div><h2>${esc(q.stem || `请阅读原卷第${q.number}题`)}</h2><div class="source-line">同题出处${q.aliases.length?`：${q.aliases.map(x=>`<span class="alias-chip">${x.year}${esc(x.variant)} · 第${x.number}题</span>`).join('')}`:'：本题保留当前原卷编号'}</div><section aria-label="完整材料与原题"><div class="material-heading"><strong>材料与原题</strong><button type="button" class="quiet-button" id="focus-question">定位第${q.number}题</button></div><div class="page-tabs"><span class="page-label">原卷页码</span>${q.pages.map((p,i)=>`<button type="button" class="page-tab ${i===state.materialPage?'active':''}" data-material-page="${i}" aria-pressed="${i===state.materialPage}">${p.page}</button>`).join('')}<button type="button" class="text-button" id="enlarge-page">放大阅读</button></div><div class="page-frame"><img class="source-image" src="${page.image}" alt="${q.year}年${esc(q.variant)}资料分析原卷第${page.page}页，包含本题材料或原题" data-zoom="${page.image}" data-caption="${q.year}年${esc(q.variant)} · 原卷第${page.page}页"></div><p class="page-help">请作答第${q.number}题。切换页码阅读材料与选项；点击图片可放大。</p></section><section class="answer-area" aria-label="选择答案"><div class="answer-label"><strong>选择你的答案</strong><span>答案默认收起</span></div><div class="answer-buttons">${['A','B','C','D'].map(letter=>`<button type="button" class="answer-choice ${a.choice===letter?'selected':''} ${a.submitted&&letter===q.answer?'correct':''} ${a.submitted&&letter===a.choice&&a.choice!==q.answer?'incorrect':''}" data-choice="${letter}" aria-pressed="${a.choice===letter}" ${a.submitted?'disabled':''}>${letter}</button>`).join('')}</div><div class="action-row"><button type="button" class="primary-button" id="submit-answer" ${(!a.choice || a.submitted)?'disabled':''}>${a.submitted?'已提交':'提交答案'}</button><button type="button" class="analysis-toggle" id="toggle-analysis" aria-expanded="${state.reveal}">${state.reveal?'收起解析':a.submitted?'查看解析':'直接查看解析'}</button>${a.submitted?'<button type="button" class="text-button" id="retry">重新作答</button>':''}</div>${feedback}</section>${state.reveal?analysisHtml(q):''}<div class="question-nav"><button type="button" class="quiet-button" id="previous-question" ${index<=0?'disabled':''}>上一题</button><span class="footer-status">${index+1} / ${filtered.length}</span><button type="button" class="quiet-button" id="next-question" ${index>=filtered.length-1?'disabled':''}>下一题</button></div><p class="reference-name">原题来源：${esc(q.sourceName)}</p>`;
    $('#detail').querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{img.replaceWith(Object.assign(document.createElement('p'),{className:'image-error',textContent:'图片未能加载，请刷新页面或检查 assets 文件夹是否完整。'}));},{once:true}));
  }
  function renderAll(){ filterQuestions();const index=filtered.findIndex(q=>q.id===state.selected);if(index>=0)state.listPage=Math.floor(index/pageSize);renderCategories();renderList();renderDetail(); }
  function selectQuestion(id){ state.selected=id;state.pageQuestion=null;state.reveal=false; const index=filtered.findIndex(q=>q.id===id);if(index>=0)state.listPage=Math.floor(index/pageSize);renderList();renderDetail(); }
  function showImage(src,caption){ $('#zoom-image').src=src;$('#zoom-image').alt=caption;$('#image-caption').textContent=caption;state.zoomWidth=innerWidth<600?900:Math.min(1200,innerWidth*.86);$('#zoom-image').style.width=state.zoomWidth+'px';$('#image-dialog').showModal();$('.zoom-viewport').scrollTo(0,0); }
  $('#year').insertAdjacentHTML('beforeend',bank.years.map(y=>`<option value="${y}">${y}年</option>`).join(''));
  $('#categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){state.category=b.dataset.category;state.listPage=0;renderAll();}});
  $('#question-list').addEventListener('click',e=>{const b=e.target.closest('[data-question]');if(b)selectQuestion(b.dataset.question);});
  $('#filters').addEventListener('submit',e=>e.preventDefault());
  $('#search').addEventListener('input',e=>{state.search=e.target.value;state.listPage=0;renderAll();});
  for(const key of ['year','variant']) $('#'+key).addEventListener('change',e=>{state[key]=e.target.value;state.listPage=0;renderAll();});
  $('#reset').addEventListener('click',()=>{state.category='';state.year='';state.variant='';state.search='';state.listPage=0;$('#year').value='';$('#variant').value='';$('#search').value='';renderAll();});
  $('#list-prev').addEventListener('click',()=>{state.listPage--;renderList();});
  $('#list-next').addEventListener('click',()=>{state.listPage++;renderList();});
  $('#detail').addEventListener('click',e=>{
    const q=getCurrent();if(!q)return;
    const b=e.target.closest('button'),image=e.target.closest('[data-zoom]');
    if(image){showImage(image.dataset.zoom,image.dataset.caption);return;}
    if(!b)return;
    if(b.dataset.materialPage!==undefined){state.materialPage=Number(b.dataset.materialPage);renderDetail();return;}
    if(b.dataset.choice){const a=answerState(q);if(!a.submitted){a.choice=b.dataset.choice;renderDetail();}return;}
    switch(b.id){
      case 'focus-question': state.materialPage=Math.max(0,q.pages.findIndex(p=>p.page===q.focusPage));renderDetail();break;
      case 'enlarge-page': showImage(q.pages[state.materialPage].image,`${q.year}年${q.variant} · 原卷第${q.pages[state.materialPage].page}页`);break;
      case 'submit-answer': {const a=answerState(q);if(a.choice){a.submitted=true;progress.submit(q.id,a.choice);renderList();renderDetail();}break;}
      case 'toggle-analysis': state.reveal=!state.reveal;renderDetail();if(state.reveal)$('#analysis').scrollIntoView({behavior:'smooth',block:'start'});break;
      case 'retry': answers.set(q.id,{choice:null,submitted:false});state.reveal=false;renderList();renderDetail();break;
      case 'previous-question': {const i=filtered.findIndex(x=>x.id===q.id);if(i>0)selectQuestion(filtered[i-1].id);break;}
      case 'next-question': {const i=filtered.findIndex(x=>x.id===q.id);if(i<filtered.length-1)selectQuestion(filtered[i+1].id);break;}
    }
  });
  $('#close-image').addEventListener('click',()=>$('#image-dialog').close());
  $('#zoom-in').addEventListener('click',()=>{state.zoomWidth=Math.min(2600,state.zoomWidth*1.25);$('#zoom-image').style.width=state.zoomWidth+'px';});
  $('#zoom-out').addEventListener('click',()=>{state.zoomWidth=Math.max(280,state.zoomWidth/1.25);$('#zoom-image').style.width=state.zoomWidth+'px';});
  $('#image-dialog').addEventListener('click',e=>{if(e.target===$('#image-dialog'))$('#image-dialog').close();});
  // Optional WebMCP access exposes only the same local question navigation and reveal actions.
  if(document.modelContext?.registerTool){
    const lifecycle=new AbortController();
    const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Ordinary browser controls remain available. */}};
    register({name:'filter_question_bank',description:'按考点、年份或试卷筛选资料分析真题。',annotations:{readOnlyHint:false,untrustedContentHint:false},inputSchema:{type:'object',properties:{category:{type:'string',enum:['','A','B','C','D','E','F','G','H','I']},year:{type:'string'},variant:{type:'string',enum:['','副省级','地市级','行政执法']},search:{type:'string'}},additionalProperties:false},execute:async args=>{if(!args||typeof args!=='object')throw new Error('筛选条件无效');if(args.category!==undefined&&args.category!==''&&!catMap[args.category])throw new Error('未知考点');if(args.year!==undefined&&args.year!==''&&!bank.years.includes(Number(args.year)))throw new Error('年份超出题库范围');if(args.variant!==undefined&&!['','副省级','地市级','行政执法'].includes(args.variant))throw new Error('未知试卷');if(args.search!==undefined&&typeof args.search!=='string')throw new Error('搜索内容必须是文字');for(const k of ['category','year','variant','search'])if(args[k]!==undefined)state[k]=args[k];$('#year').value=state.year;$('#variant').value=state.variant;$('#search').value=state.search;state.listPage=0;renderAll();return {count:filtered.length,questions:filtered.slice(0,12).map(q=>({id:q.id,stem:q.stem}))};}});
    register({name:'open_question',description:'打开题库中的一道题，默认不展示答案。',annotations:{readOnlyHint:false,untrustedContentHint:false},inputSchema:{type:'object',properties:{id:{type:'string'}},required:['id'],additionalProperties:false},execute:async args=>{if(!args||typeof args.id!=='string'||!all.some(q=>q.id===args.id))throw new Error('未找到此题');state.category='';state.year='';state.variant='';state.search='';$('#year').value='';$('#variant').value='';$('#search').value='';filterQuestions();selectQuestion(args.id);return {opened:args.id,answerVisible:false};}});
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
  renderAll();
})();
