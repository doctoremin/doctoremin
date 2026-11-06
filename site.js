/* doctoremin.com — ortak betik (tüm sayfalar) */

function toggleModal(show) {
  var m = document.getElementById('cvModal');
  if (m) m.style.display = show ? 'flex' : 'none';
}

function openOneriler() {
  var m = document.getElementById('onerilerModal');
  if (m) m.style.display = 'flex';
}

/* Hakkımda ve Öneriler pencereleri: Esc tuşu veya dış alana dokunma ile kapanır.
   Yasal uyarı penceresi yalnızca "Kabul Ediyorum" ile kapanır. */
(function () {
  ['cvModal', 'onerilerModal'].forEach(function (id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.addEventListener('click', function (ev) {
      if (ev.target === m) m.style.display = 'none';
    });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Escape') return;
    ['cvModal', 'onerilerModal'].forEach(function (id) {
      var m = document.getElementById(id);
      if (m) m.style.display = 'none';
    });
  });
})();

/* Türkçe karakterden bağımsız arama: "olu" -> "Ölü", "kibas" -> "KİBAS" */
var TR_HARF = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
function normalize(s) {
  return (s || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) { return TR_HARF[c]; });
}

function highlightText(element, query) {
  if (!element) return;

  // 1. Önceki vurguları temizle
  var marks = element.querySelectorAll('mark.search-highlight');
  marks.forEach(function (m) {
    var parent = m.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    }
  });

  if (!query || query.length < 2) return;

  // 2. Metin düğümlerini topla
  var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  var textNodes = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.trim().length > 0) textNodes.push(walker.currentNode);
  }

  // 3. Eşleşmeleri işaretle
  var first = null;
  textNodes.forEach(function (node) {
    var text = node.nodeValue;
    var low = normalize(text);
    if (low.length !== text.length || low.indexOf(query) === -1) return;
    var frag = document.createDocumentFragment();
    var pos = 0;
    while (true) {
      var idx = low.indexOf(query, pos);
      if (idx === -1) {
        frag.appendChild(document.createTextNode(text.substring(pos)));
        break;
      }
      if (idx > pos) frag.appendChild(document.createTextNode(text.substring(pos, idx)));
      var mark = document.createElement('mark');
      mark.className = 'search-highlight';
      mark.textContent = text.substring(idx, idx + query.length);
      frag.appendChild(mark);
      if (!first) first = mark;
      pos = idx + query.length;
    }
    if (node.parentNode) node.parentNode.replaceChild(frag, node);
  });
  return first;
}

var eminIndex = null;
var eminIndexLoading = false;

function loadSearchIndex(done) {
  if (eminIndex || eminIndexLoading) return;
  eminIndexLoading = true;
  fetch('/search-index.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      eminIndex = {};
      data.forEach(function (it) { eminIndex[it.s] = normalize(it.t + ' ' + it.x); });
      eminIndexLoading = false;
      done();
    })
    .catch(function (err) {
      eminIndexLoading = false;
      console.error('Arama dizini yüklenemedi:', err);
    });
}

function filterMenu() {
  try {
    var inputEl = document.getElementById('sidebarSearch');
    if (!inputEl) return;
    var q = normalize(inputEl.value).trim();

    try {
      if (q) sessionStorage.setItem('eminSearchQ', inputEl.value);
      else sessionStorage.removeItem('eminSearchQ');
    } catch (e) {}

    var isHome = document.body.classList.contains('page-home');
    var aside = document.querySelector('aside');
    var btn = document.querySelector('.list-toggle');
    if (aside && q && !isHome) {
      aside.classList.add('list-open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    var card = document.querySelector('main .card');
    if (card) highlightText(card, q);

    if (q && !eminIndex) loadSearchIndex(filterMenu);

    document.querySelectorAll('[data-slug]').forEach(function (el) {
      var slug = el.getAttribute('data-slug');
      var titleText = normalize(el.textContent);
      var cardText = (eminIndex && eminIndex[slug]) ? eminIndex[slug] : '';
      var isMatch = (q === '') || titleText.indexOf(q) !== -1 || cardText.indexOf(q) !== -1;
      el.style.display = isMatch ? '' : 'none';
    });

    document.querySelectorAll('[data-group]').forEach(function (g) {
      var any = Array.prototype.some.call(g.querySelectorAll('[data-slug]'), function (el) {
        return el.style.display !== 'none';
      });
      g.style.display = any ? '' : 'none';
    });

    var empty = document.getElementById('aramaSonucYok');
    if (empty) {
      var visible = Array.prototype.some.call(document.querySelectorAll('main [data-slug]'), function (el) {
        return el.style.display !== 'none';
      });
      empty.hidden = visible || (q !== '' && !eminIndex);
    }
  } catch (err) {
    console.error('Arama hatası:', err);
  }
}

(function () {
  var btn = document.querySelector('.list-toggle');
  var aside = document.querySelector('aside');
  if (btn && aside) {
    btn.addEventListener('click', function () {
      var open = aside.classList.toggle('list-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var inputEl = document.getElementById('sidebarSearch');
  var saved = null;
  try { saved = sessionStorage.getItem('eminSearchQ'); } catch (e) {}
  if (inputEl && saved) {
    inputEl.value = saved;
    filterMenu();
  }
})();
