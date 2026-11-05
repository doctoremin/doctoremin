function toggleModal(show) {
  var m = document.getElementById('cvModal');
  if (m) m.style.display = show ? 'flex' : 'none';
}

function openOneriler() {
  var m = document.getElementById('onerilerModal');
  if (m) m.style.display = 'flex';
}

function highlightText(element, query) {
  if (!element) return;

  // 1. Önceki tüm sarı vurguları temizle
  var marks = element.querySelectorAll('mark.search-highlight');
  marks.forEach(function(m) {
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
    if (walker.currentNode.nodeValue.trim().length > 0) {
      textNodes.push(walker.currentNode);
    }
  }

  // 3. Eşleşen kelimeleri sarı mark içine al
  textNodes.forEach(function(node) {
    var text = node.nodeValue;
    var lower = text.toLocaleLowerCase('tr');
    var matchPos = lower.indexOf(query);

    if (matchPos !== -1) {
      var frag = document.createDocumentFragment();
      var curText = text;
      var curLower = lower;

      while (true) {
        var idx = curLower.indexOf(query);
        if (idx === -1) {
          frag.appendChild(document.createTextNode(curText));
          break;
        }

        if (idx > 0) {
          frag.appendChild(document.createTextNode(curText.substring(0, idx)));
        }

        var mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.style.backgroundColor = '#ffeb3b';
        mark.style.color = '#000';
        mark.style.fontWeight = 'bold';
        mark.style.padding = '0 2px';
        mark.style.borderRadius = '2px';
        mark.textContent = curText.substring(idx, idx + query.length);
        frag.appendChild(mark);

        curText = curText.substring(idx + query.length);
        curLower = curLower.substring(idx + query.length);
      }

      if (node.parentNode) {
        node.parentNode.replaceChild(frag, node);
      }
    }
  });
}

var eminIndex = null;
var eminIndexLoading = false;

function loadSearchIndex(done) {
  if (eminIndex || eminIndexLoading) return;
  eminIndexLoading = true;
  fetch('/assets/search-index.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      eminIndex = {};
      data.forEach(function (it) { eminIndex[it.s] = (it.t + ' ' + it.x).toLocaleLowerCase('tr'); });
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
    var q = inputEl.value.toLocaleLowerCase('tr').trim();

    try {
      if (q) sessionStorage.setItem('eminSearchQ', inputEl.value);
      else sessionStorage.removeItem('eminSearchQ');
    } catch (e) {}

    var aside = document.querySelector('aside');
    var btn = document.querySelector('.list-toggle');
    if (aside && q) {
      aside.classList.add('list-open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
    }

    var card = document.querySelector('main .card');
    if (card) highlightText(card, q);

    if (q && !eminIndex) loadSearchIndex(filterMenu);

    document.querySelectorAll('[data-slug]').forEach(function (el) {
      var slug = el.getAttribute('data-slug');
      var titleText = (el.textContent || '').toLocaleLowerCase('tr');
      var cardText = (eminIndex && eminIndex[slug]) ? eminIndex[slug] : '';
      var isMatch = (q === '') || titleText.includes(q) || cardText.includes(q);
      el.style.display = isMatch ? '' : 'none';
    });

    document.querySelectorAll('[data-group]').forEach(function (g) {
      var any = Array.prototype.some.call(g.querySelectorAll('[data-slug]'), function (el) {
        return el.style.display !== 'none';
      });
      g.style.display = any ? '' : 'none';
    });
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
