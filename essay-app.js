(() => {
  'use strict';
  const bank=window.BANK,$=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cats=Object.fromEntries(bank.categories.map(c=>[c.id,c]));
  const papers=Object.fromEntries(bank.papers.map(p=>[p.id,p]));
  const all=[...bank.questions].sort((a,b)=>b.year-a.year||a.variant.localeCompare(b.variant,'zh')||a.number-b.number);
  const state={group:'',category:'',year:'',variant:'',search:'',selected:all[0].id,listPage:0,reveal:false,material:0,font:16,view:'text'};
  const draftKey='kaogong-essay-drafts-v1';
  let draftFallback=null,storageFailed=false,filtered=[];
  const progress=window.PracticeProgress.attach('essay',bank,()=>{state.reveal=false;renderAll();});
  function readDrafts(){
    if(storageFailed&&draftFallback?.round===progress.round)return draftFallback;
    try {
      const value=JSON.parse(localStorage.getItem(draftKey)||'null');
      if(value?.round===progress.round&&value.answers&&typeof value.answers==='object'&&!Array.isArray(value.answers))return value;
    }catch{storageFailed=true;}
    return draftFallback?.round===progress.round?draftFallback:{round:progress.round,answers:{}};
  }
  function draft(id){const value=readDrafts().answers[id];return typeof value==='string'?value:'';}
  function saveDraft(id,text){
    const value=readDrafts();value.answers[id]=text;draftFallback=value;
    try{localStorage.setItem(draftKey,JSON.stringify(value));storageFailed=false;}catch{storageFailed=true;}
  }
  const wordCount=text=>Array.from(text.replace(/\s/g,'')).length;
  const current=()=>filtered.find(q=>q.id===state.selected);
  function matches(q){
    const needle=state.search.trim().toLowerCase();
    return (!state.year||q.year===Number(state.year))&&(!state.variant||q.variant===state.variant)&&(!needle||`${q.year} ${q.variant} ${q.number} ${q.stem} ${q.requirements} ${q.categoryIds.map(id=>cats[id].name).join(' ')}`.toLowerCase().includes(needle));
  }
  const summary=options=>progress.summary({...options,matches});
  function filter(){
    filtered=all.filter(q=>matches(q)&&(!state.group||q.groupIds.includes(state.group))&&(!state.category||q.categoryIds.includes(state.category)));
    if(!filtered.some(q=>q.id===state.selected)){state.selected=filtered[0]?.id||null;state.material=0;state.reveal=false;}
    state.listPage=Math.min(state.listPage,Math.max(0,Math.ceil(filtered.length/8)-1));
  }
  function renderCategories(){
    const button=c=>{const s=summary({category:c.id,group:state.group});return `<button type="button" class="category-button ${state.category===c.id?'active':''}" data-category="${c.id}" aria-pressed="${state.category===c.id}"><span class="category-code">${c.id||'全'}</span><span class="category-label"><span class="category-name">${esc(c.name)}</span><span class="category-progress"><span>已做 ${s.done} 道</span> · <span>剩余 ${s.remaining} 道</span></span></span><span class="category-count">${s.total}</span></button>`;};
    $('#categories').innerHTML=button({id:'',name:state.group?'本题型全部':'全部考点'})+bank.groups.filter(g=>!state.group||g.name===state.group).map(g=>`<section class="category-section"><h2 class="category-group-title">${esc(g.name)}</h2>${bank.categories.filter(c=>c.group===g.name).map(button).join('')}</section>`).join('');
    $('#total-count').textContent=summary({}).total;
    $('#analysis-groups').innerHTML=[{name:''},...bank.groups].map(g=>{const s=summary({group:g.name});return `<button type="button" class="group-tab ${state.group===g.name?'active':''}" data-group="${esc(g.name)}" aria-pressed="${state.group===g.name}">${esc(g.name||'全部题型')}<span>${s.done} / ${s.total}</span></button>`;}).join('');
  }
  function renderGuide(){
    const visible=bank.categories.filter(c=>(!state.group||c.group===state.group)&&(!state.category||c.id===state.category));
    $('#analysis-guide-count').textContent=`${visible.length}个知识点`;
    $('#analysis-guide-content').innerHTML='<p class="guide-note">按实际作答任务分类，复合题可进入多个知识点；完成进度按原卷大题去重。完成由你主动标记，参考答案供自行核对。</p>'+visible.map(c=>`<section class="guide-item"><button type="button" class="guide-category" data-guide-category="${c.id}">${esc(c.group)} · ${esc(c.name)}<span>${summary({category:c.id}).total}道</span></button><p>${esc(c.hint)}</p></section>`).join('')+'<p class="guide-note"><a href="ESSAY_SOURCES.md" target="_blank" rel="noopener">查看收录来源与分类</a></p>';
  }
  function renderList(){
    const s=summary({category:state.category,group:state.group});
    $('#category-title').textContent=cats[state.category]?.name||state.group||'全部申论';
    $('#category-description').textContent='左侧对照给定资料，右侧独立作答，完成后自行核对参考答案。';
    $('#filtered-count').textContent=filtered.length;
    $('#knowledge-progress').textContent=`本轮${state.year||state.variant||state.search?'当前筛选 · ':''}进度：已做 ${s.done} 道，剩余 ${s.remaining} 道，共 ${s.total} 道`;
    $('#question-list').innerHTML=filtered.slice(state.listPage*8,state.listPage*8+8).map(q=>`<button type="button" class="question-item ${q.id===state.selected?'active':''}" data-question="${q.id}" aria-current="${q.id===state.selected}"><span class="question-meta"><b>${q.year} · ${esc(q.variant)}</b><span>第${q.number}题</span></span><span class="question-preview">${esc(q.stem)}</span><span class="question-tag">${progress.answers.get(q.id)?.submitted?'已完成':q.categoryIds.map(id=>cats[id].name).join(' · ')}</span></button>`).join('')||'<div class="filter-empty">没有符合筛选条件的申论题目。2026年目前仅收录行政执法卷。</div>';
    const pages=Math.max(1,Math.ceil(filtered.length/8));
    $('#list-page').textContent=`${state.listPage+1} / ${pages}`;$('#list-prev').disabled=!state.listPage;$('#list-next').disabled=state.listPage+1>=pages;
    $('#result-info').textContent=`共${filtered.length}题 · 年份由近到远`;
  }
  function renderMaterial(){
    const q=current();if(!q)return;
    const paper=papers[q.paperId],sections=state.material?paper.materials.filter(m=>m.number===state.material):paper.materials;
    $('#essay-material-view').innerHTML=state.view==='pdf'?`<p class="page-help">原卷只含试题部分；如浏览器无法内嵌显示，可用上方链接打开。</p><iframe class="essay-pdf" src="${paper.questionPdf}" title="${q.year}年${esc(q.variant)}申论原卷"></iframe>`:sections.map(m=>`<section class="essay-material" style="font-size:${state.font}px"><h3>给定资料 ${m.number}</h3><div>${esc(m.text)}</div></section>`).join('');
    $('#material-select').value=String(state.material);$('#essay-font-size').textContent=`${state.font}px`;
    document.querySelectorAll('[data-material-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.materialView===state.view)));
  }
  function updateDraftStatus(){
    const q=current();if(!q)return;
    const count=wordCount($('#essay-answer').value);
    $('#essay-word-count').textContent=`${count} 字${q.wordLimit?` / 参考上限 ${q.wordLimit} 字`:''}（含标点，不含空白）`;
    $('#essay-word-count').classList.toggle('over-limit',!!q.wordLimit&&count>q.wordLimit);
    $('#draft-status').textContent=storageFailed?'当前浏览器无法保存草稿，请先复制答案保留。':'草稿已自动保存到当前浏览器。';
    $('#mark-complete').disabled=!$('#essay-answer').value.trim()||!!progress.answers.get(q.id)?.submitted;
  }
  function renderDetail(){
    const q=current();if(!q){$('#detail').innerHTML='<div class="empty"><h2>没有匹配的题目</h2><p>调整年份、试卷等级或知识点后继续练习。</p></div>';return;}
    const paper=papers[q.paperId],done=!!progress.answers.get(q.id)?.submitted;
    if(state.detailQuestion!==q.id){state.material=paper.materials.some(m=>m.number===q.materialNumbers[0])?q.materialNumbers[0]:0;state.reveal=false;state.view='text';state.detailQuestion=q.id;}
    $('#detail').innerHTML=`<div class="reading-columns"><section class="material-pane essay-material-pane" aria-label="给定资料"><div class="material-heading"><strong>给定资料</strong><a class="text-button" href="${paper.questionPdf}" target="_blank" rel="noopener">打开原卷 PDF</a></div><div class="essay-material-controls"><label>材料 <select id="material-select"><option value="0">全部材料</option>${paper.materials.map(m=>`<option value="${m.number}">给定资料 ${m.number}</option>`).join('')}</select></label><button type="button" class="quiet-button" data-material-view="text">文字材料</button><button type="button" class="quiet-button" data-material-view="pdf">原卷</button><button type="button" class="quiet-button" data-font="-1" aria-label="缩小材料文字">−</button><span id="essay-font-size"></span><button type="button" class="quiet-button" data-font="1" aria-label="放大材料文字">＋</button></div><div id="essay-material-view"></div></section><section class="question-pane" aria-label="题目与作答"><div class="detail-kicker"><span class="type-label">${q.categoryIds.map(id=>esc(cats[id].name)).join(' · ')}</span><span>${q.year} · ${esc(q.variant)} · 第${q.number}题 · ${q.score}分</span></div>${paper.notice?`<p class="reference-alert">${esc(paper.notice)}</p>`:''}<h2>${esc(q.stem)}</h2><div class="essay-requirements">${esc(q.requirements)}</div><div class="hint"><strong>作答方法</strong>${esc(cats[state.category||q.category].hint)}</div><section class="answer-area"><label class="answer-label" for="essay-answer"><strong>我的答案</strong><span>参考答案默认收起</span></label><textarea id="essay-answer" class="essay-answer" placeholder="在此独立作答，也可粘贴你已完成的答案。" spellcheck="false">${esc(draft(q.id))}</textarea><p id="essay-word-count" class="page-help"></p><p id="draft-status" class="page-help" role="status"></p><div class="action-row"><button type="button" id="mark-complete" class="primary-button">${done?'已标记完成':'标记完成'}</button><button type="button" id="toggle-reference" class="analysis-toggle" aria-expanded="${state.reveal}">${state.reveal?'收起参考答案':'查看参考答案'}</button></div><p class="page-help">完成标记仅记录练习进度；请自行核对要点、结构和字数，不自动判分。</p><div id="essay-reference"></div></section><div class="question-nav"><button type="button" class="quiet-button" id="previous-question" ${filtered[0]?.id===q.id?'disabled':''}>上一题</button><button type="button" class="quiet-button" id="next-question" ${filtered.at(-1)?.id===q.id?'disabled':''}>下一题</button></div><p class="reference-name">来源：${esc(paper.sourceName)}</p></section></div>`;
    renderMaterial();renderReference();updateDraftStatus();
  }
  function renderReference(){
    const q=current();if(!q)return;const p=papers[q.paperId];
    $('#toggle-reference').textContent=state.reveal?'收起参考答案':'查看参考答案';$('#toggle-reference').setAttribute('aria-expanded',String(state.reveal));
    $('#essay-reference').innerHTML=state.reveal?`<section class="analysis"><h3>来源文件的参考答案与解析</h3><p class="page-help">按原卷第${q.number}题找到对应答案，供自行复盘。</p><a class="quiet-button" href="${p.referencePdf}" target="_blank" rel="noopener">打开参考答案 PDF</a><iframe class="essay-pdf" src="${p.referencePdf}" title="${q.year}年${esc(q.variant)}申论参考答案"></iframe></section>`:'';
  }
  function renderAll(){filter();renderCategories();renderGuide();renderList();renderDetail();}
  function select(id){state.selected=id;state.reveal=false;renderList();renderDetail();}
  $('#year').insertAdjacentHTML('beforeend',bank.years.map(y=>`<option value="${y}">${y}年</option>`).join(''));
  $('#categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){state.category=b.dataset.category;if(state.category)state.group=cats[state.category].group;state.listPage=0;renderAll();}});
  $('#analysis-groups').addEventListener('click',e=>{const b=e.target.closest('[data-group]');if(b){state.group=b.dataset.group;state.category='';state.listPage=0;renderAll();}});
  $('#analysis-guide-content').addEventListener('click',e=>{const b=e.target.closest('[data-guide-category]');if(b){state.category=b.dataset.guideCategory;state.group=cats[state.category].group;state.listPage=0;renderAll();}});
  $('#question-list').addEventListener('click',e=>{const b=e.target.closest('[data-question]');if(b)select(b.dataset.question);});
  $('#filters').addEventListener('submit',e=>e.preventDefault());
  for(const key of ['year','variant','search'])$('#'+key).addEventListener(key==='search'?'input':'change',e=>{state[key]=e.target.value;state.listPage=0;renderAll();});
  $('#reset').addEventListener('click',()=>{state.group=state.category=state.year=state.variant=state.search='';for(const id of ['year','variant','search'])$('#'+id).value='';state.listPage=0;renderAll();});
  $('#list-prev').addEventListener('click',()=>{state.listPage--;renderList();});$('#list-next').addEventListener('click',()=>{state.listPage++;renderList();});
  $('#detail').addEventListener('input',e=>{if(e.target.id==='essay-answer'){saveDraft(current().id,e.target.value);updateDraftStatus();}});
  $('#detail').addEventListener('change',e=>{if(e.target.id==='material-select'){state.material=Number(e.target.value);renderMaterial();}});
  $('#detail').addEventListener('click',e=>{
    const b=e.target.closest('button'),q=current();if(!b||!q)return;
    if(b.dataset.font){state.font=Math.max(14,Math.min(24,state.font+Number(b.dataset.font)));renderMaterial();return;}
    if(b.dataset.materialView){state.view=b.dataset.materialView;renderMaterial();return;}
    if(b.id==='mark-complete'&&$('#essay-answer').value.trim()){
      saveDraft(q.id,$('#essay-answer').value);progress.submit(q.id,'DONE');renderCategories();renderList();b.textContent='已标记完成';updateDraftStatus();
    }
    if(b.id==='toggle-reference'){state.reveal=!state.reveal;renderReference();}
    if(b.id==='previous-question'||b.id==='next-question'){const i=filtered.findIndex(x=>x.id===q.id)+(b.id==='next-question'?1:-1);if(filtered[i])select(filtered[i].id);}
  });
  window.addEventListener('storage',e=>{if(e.key===draftKey&&document.activeElement?.id!=='essay-answer')renderDetail();});
  renderAll();
})();
