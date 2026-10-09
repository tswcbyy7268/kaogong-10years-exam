(() => {
  'use strict';
  const key = 'kaogong-practice-progress-v1';
  // Keep these totals in sync with the three question banks when adding questions.
  const modules = { analysis: { name: '资料分析', total: 325 }, reasoning: { name: '判断推理', total: 1050 }, essay: { name: '申论', total: 124 } };
  let memory = null;
  let unavailable = false;
  const fresh = () => ({ version: 1, round: 1, answers: { analysis: {}, reasoning: {}, essay: {} }, completions: [] });
  function read() {
    if (unavailable && memory) return memory;
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (!value) return memory || fresh();
      if (value.version !== 1 || !Number.isInteger(value.round) || value.round < 1 || !value.answers || !Array.isArray(value.completions)) throw new Error('Invalid progress');
      for (const id of Object.keys(modules)) {
        if(id==='essay' && value.answers[id]===undefined)value.answers[id]={};
        const entries = value.answers[id];
        if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw new Error('Invalid answers');
        for (const [question, answer] of Object.entries(entries)) {
          if (!answer || !(id==='essay'?answer.choice==='DONE':['A', 'B', 'C', 'D'].includes(answer.choice)) || answer.submitted !== true) delete entries[question];
        }
      }
      value.completions = value.completions.filter(c => c && Number.isInteger(c.round) && typeof c.completedAt === 'string' && Number.isFinite(Date.parse(c.completedAt)));
      for(const c of value.completions)if(!Array.isArray(c.modules))c.modules=['analysis','reasoning'];
      return value;
    } catch {
      unavailable = true;
      return memory || fresh();
    }
  }
  function write(value) {
    memory = value;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { unavailable = true; }
  }
  const count = (value, id) => Math.min(modules[id].total, Object.keys(value.answers[id]).length);
  const complete = value => Object.keys(modules).every(id => count(value, id) === modules[id].total);
  const recordCompletion = value => {
    if (complete(value) && !value.completions.some(c => c.round === value.round && Object.keys(modules).every(id=>(c.modules||[]).includes(id)))) {
      value.completions.push({ round: value.round, completedAt: new Date().toISOString(), modules: Object.keys(modules) });
    }
  };
  window.PracticeProgress = {
    attach(module, bank, onChange) {
      modules[module].total = bank.questions.length;
      const validIds = new Set(bank.questions.map(q => q.id));
      const panel = document.querySelector('#practice-progress');
      let value = read();
      for (const id of Object.keys(value.answers[module])) if (!validIds.has(id)) delete value.answers[module][id];
      recordCompletion(value);
      write(value);
      const answers = new Map(Object.entries(value.answers[module]));
      function refreshAnswers() {
        answers.clear();
        for (const [id, answer] of Object.entries(value.answers[module])) if (validIds.has(id)) answers.set(id, { ...answer });
      }
      function render() {
        const total = Object.values(modules).reduce((sum, m) => sum + m.total, 0);
        const done = Object.keys(modules).reduce((sum, id) => sum + count(value, id), 0);
        panel.innerHTML = `<div class="progress-heading"><div><strong>第 ${value.round} 轮训练</strong><p>行测提交答案、申论标记完成后计入进度；重复练习不重复计数。</p></div><span>全部 ${done} / ${total}</span></div><div class="progress-modules">${Object.entries(modules).map(([id, m]) => `<div class="progress-module"><div><a href="${id === 'analysis' ? 'index.html' : id === 'essay' ? 'essay.html' : 'judgment.html'}">${m.name}</a><span>${count(value, id)} / ${m.total} · ${Math.floor(count(value, id) / m.total * 100)}%</span></div><progress max="${m.total}" value="${count(value, id)}" aria-label="${m.name}做题进度"></progress></div>`).join('')}</div>${module === 'reasoning' ? `<div class="progress-groups">${bank.groups.map(g => `<span>${g.name} <b>${bank.questions.filter(q => q.group === g.name && value.answers[module][q.id]).length} / ${g.count}</b></span>`).join('')}</div>` : ''}<div class="progress-footer"><span role="status">${complete(value) ? '本轮全部完成，已记录完成时间。' : `累计完成 ${value.completions.filter(c=>(c.modules||[]).includes('essay')).length} 轮（全部模块）`}</span><button type="button" class="quiet-button" id="start-next-round" ${complete(value) ? '' : 'disabled'}>开始下一轮</button></div><details class="completion-history"><summary>完成记录（${value.completions.length} 次）</summary>${value.completions.length ? `<ol>${[...value.completions].reverse().map(c => `<li>第 ${c.round} 轮 · ${new Date(c.completedAt).toLocaleString('zh-CN', { hour12: false })}${(c.modules||[]).includes('essay')?' · 全部三模块':' · 历史行测两模块'}</li>`).join('')}</ol>` : '<p>完成三个模块的全部题目后，自动记录一次。</p>'}</details><p class="progress-storage-note">${unavailable ? '浏览器暂时无法保存记录，本次进度仅在当前页面有效。请允许网站存储后再练习。' : '进度保存在当前浏览器；清除网站数据会删除记录。不同设备或浏览器之间不会同步。'}</p>`;
      }
      panel.addEventListener('click', e => {
        if (!e.target.closest('#start-next-round')) return;
        value = read();
        if (!complete(value)) { refreshAnswers(); render(); onChange(); return; }
        recordCompletion(value);
        value.round += 1;
        value.answers = { analysis: {}, reasoning: {}, essay: {} };
        write(value);
        refreshAnswers();
        render();
        onChange();
      });
      window.addEventListener('storage', e => {
        if (e.key !== key && e.key !== null) return;
        memory = null;
        value = read();
        refreshAnswers();
        render();
        onChange();
      });
      render();
      return {
        answers,
        get round(){return value.round;},
        summary({ category = '', group = '', matches = null } = {}) {
          const questions = bank.questions.filter(q => (!matches || matches(q)) && (!category || (q.categoryIds || [q.category]).includes(category)) && (!group || (q.groupIds || [q.group]).includes(group)));
          const done = questions.filter(q => value.answers[module][q.id]).length;
          return { total: questions.length, done, remaining: questions.length - done };
        },
        submit(id, choice) {
          if (!validIds.has(id) || !(module==='essay'?choice==='DONE':['A', 'B', 'C', 'D'].includes(choice))) return;
          // Merge the latest stored answers so other open tabs keep their progress.
          value = read();
          value.answers[module][id] = { choice, submitted: true };
          recordCompletion(value);
          write(value);
          refreshAnswers();
          render();
        }
      };
    }
  };
})();
