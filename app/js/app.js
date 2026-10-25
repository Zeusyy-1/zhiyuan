/* ============================================================
   知源 · 应用逻辑
   1) 1440 画布等比缩放（不重排，保持设计稿像素关系）
   2) 五屏单页切换（含过渡动效、hash 同步、键盘 1–5）
   3) 页面内的轻交互：批注开关、复制引用、任务勾选、阶段页签
   ============================================================ */

(function () {
  'use strict';

  var CANVAS_WIDTH = 1440;
  var stage = document.getElementById('stage');
  var screens = Array.prototype.slice.call(document.querySelectorAll('[data-screen]'));
  var order = ['home', 'dashboard', 'reader', 'roadmap', 'verify', 'panel'];

  /* ---------------- 1. 等比缩放 ---------------- */
  // 窄屏（≤820）走 mobile.css 的单列重排，不再整体缩放
  var MOBILE_BREAKPOINT = 820;

  function fitScale() {
    var active = document.querySelector('.screen.is-active');
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (vw <= MOBILE_BREAKPOINT) {
      stage.style.zoom = '';
      stage.style.transform = '';
      stage.style.width = '';
      return;
    }

    // 以宽为准：1440 画布整体缩放，不重排
    var scale = Math.min(vw / CANVAS_WIDTH, 1);

    // 固定高度的应用屏（工作台 / 精读页）再受高度约束，尽量一屏看全
    if (active && active.dataset.fit === 'height') {
      var first = active.firstElementChild;
      var h = first ? first.offsetHeight : 0;
      if (h) scale = Math.min(scale, (vh - 28) / h);
    }

    stage.style.zoom = scale;
    stage.style.transform = '';
    stage.style.width = CANVAS_WIDTH + 'px';
  }

  /* ---------------- 2. 屏幕切换 ---------------- */
  var current = 'home';

  function show(name, opts) {
    if (order.indexOf(name) === -1) name = 'home';
    if (name === current && !(opts && opts.force)) return;
    current = name;

    screens.forEach(function (section) {
      var on = section.dataset.screen === name;
      section.classList.toggle('is-active', on);
      if (on) {
        // 重新触发入场动效
        section.style.animation = 'none';
        void section.offsetWidth;
        section.style.animation = '';
      }
    });

    if (!opts || opts.scroll !== false) {
      window.scrollTo(0, 0);
    }
    fitScale();
    if (window.location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-nav]');
    if (!link) return;
    e.preventDefault();
    show(link.dataset.nav);
  });

  window.addEventListener('hashchange', function () {
    var name = window.location.hash.replace('#', '');
    if (name && name !== current) show(name);
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    var index = parseInt(e.key, 10);
    if (index >= 1 && index <= order.length) {
      show(order[index - 1]);
    }
    if (e.key === 'ArrowRight') {
      show(order[Math.min(order.indexOf(current) + 1, order.length - 1)]);
    }
    if (e.key === 'ArrowLeft') {
      show(order[Math.max(order.indexOf(current) - 1, 0)]);
    }
  });

  /* ---------------- 3. 批注开关 ---------------- */
  var annoToggle = document.getElementById('annoToggle');
  var readerEl = document.querySelector('.reader');

  if (annoToggle && readerEl) {
    annoToggle.addEventListener('click', function () {
      var off = readerEl.classList.toggle('is-anno-off');
      annoToggle.classList.toggle('is-off', off);
      annoToggle.querySelector('span:last-child').textContent = off ? '批注 关' : '批注 开';
    });
  }

  /* ---------------- 4. 复制引用 ---------------- */
  var copyBtn = document.getElementById('copyCite');
  if (copyBtn) {
    var original = copyBtn.textContent;
    copyBtn.addEventListener('click', function () {
      var text = '马克思. 1844年经济学哲学手稿[M]//马克思恩格斯文集: 第1卷. 北京: 人民出版社, 2009: 519.';
      var done = function () {
        copyBtn.textContent = '已复制';
        setTimeout(function () { copyBtn.textContent = original; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        done();
      }
    });
  }

  /* ---------------- 5. 任务勾选 ---------------- */
  document.querySelectorAll('.task__box').forEach(function (box) {
    box.addEventListener('click', function () {
      var row = box.parentElement;
      var title = row.querySelector('.task__title');
      var done = box.classList.toggle('task__box--done');
      box.innerHTML = done
        ? '<svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1.5 6.2L4.4 9L10.5 2.8" stroke="#F7F4EB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '';
      if (title) title.classList.toggle('task__title--done', done);
      box.setAttribute('aria-label', done ? '取消完成' : '标记完成');
    });
  });

  /* ---------------- 6. 阶段页签（演示态） ---------------- */
  document.querySelectorAll('.tabs .tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tabs .tab').forEach(function (t) {
        t.classList.remove('is-active');
      });
      tab.classList.add('is-active');
    });
  });

  /* ---------------- 6b. 面板时间范围（演示态） ---------------- */
  document.querySelectorAll('.seg .seg__item').forEach(function (item) {
    item.addEventListener('click', function () {
      document.querySelectorAll('.seg .seg__item').forEach(function (i) {
        i.classList.remove('is-active');
      });
      item.classList.add('is-active');
    });
  });

  /* ---------------- 7. 初始化 ---------------- */
  window.addEventListener('resize', fitScale);
  fitScale();

  var initial = window.location.hash.replace('#', '');
  if (initial && order.indexOf(initial) !== -1) {
    show(initial, { force: true, scroll: false });
  }

  // 字重与字体加载完成后，重新校准一次（避免字体切换导致的换行差异）
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitScale);
  }
})();
