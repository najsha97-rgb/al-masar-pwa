/**
 * AL-MASAR PWA - CORE LOGIC
 * Fiqh Perancangan Dakwah - Syeikh Muhammad Ahmad Ar-Rasyid
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Data Initialization
  const data = (typeof window !== 'undefined' && window.ALMASAR_DATA)
    || (typeof ALMASAR_DATA !== 'undefined' ? ALMASAR_DATA : null);
  const allHikmahQuotes = (typeof window !== 'undefined' && window.ALMASAR_QUOTES)
    || (typeof ALMASAR_QUOTES !== 'undefined' ? ALMASAR_QUOTES : []);
  if (!data) {
    console.error('Data Al-Masar tidak dijumpai!');
    return;
  }

  // Update dynamic counters
  const promoTitleEl = document.querySelector('.hikmah-promo-title');
  const promoSubEl = document.querySelector('.hikmah-promo-sub');
  if (promoTitleEl && allHikmahQuotes.length > 0) {
    promoTitleEl.textContent = `${allHikmahQuotes.length} Mutiara Kata`;
  }
  if (promoSubEl) {
    promoSubEl.textContent = "(Hadis Nabi SAW + Tokoh & Pejuang)";
  }


  // App State
  const state = {
    currentChapter: 0,
    currentSubtopic: 0,
    layer: localStorage.getItem('almasar_layer') || 'layer1', // 'layer1' = Lengkap, 'layer2' = Ringkasan, 'layer3' = Mutiara Hikmah
    theme: localStorage.getItem('almasar_theme') || 'dark',
    fontSize: parseFloat(localStorage.getItem('almasar_fontsize') || '1.05'),
    bookmarks: JSON.parse(localStorage.getItem('almasar_bookmarks') || '[]'),
    mobileNavOpen: false,
    activeSearchQuery: null,
    activeMatchIndex: 0,
    searchResults: [],
    currentSearchResultIndex: -1
  };

  // DOM Elements
  const chapterNavList = document.getElementById('chapterNavList');
  const readerArea = document.getElementById('readerArea');
  const heroCard = document.getElementById('heroCard');
  const readerContainer = document.getElementById('readerContainer');
  const contentBody = document.getElementById('contentBody');
  
  const layerBtnLengkap = document.getElementById('btnLayerLengkap');
  const layerBtnRingkasan = document.getElementById('btnLayerRingkasan');
  const layerBtnHikmah = document.getElementById('btnLayerHikmah');
  const sidebarHikmahBtn = document.getElementById('sidebarHikmahBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const fontDecBtn = document.getElementById('fontDecBtn');
  const fontIncBtn = document.getElementById('fontIncBtn');
  const fontResetBtn = document.getElementById('fontResetBtn');
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  const copyBtn = document.getElementById('copyBtn');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const appSidebar = document.getElementById('appSidebar');

  const prevSubBtn = document.getElementById('prevSubBtn');
  const nextSubBtn = document.getElementById('nextSubBtn');

  const searchInput = document.getElementById('searchInput');
  const searchOverlay = document.getElementById('searchOverlay');
  const searchResultsList = document.getElementById('searchResultsList');
  const closeSearchBtn = document.getElementById('closeSearchBtn');
  const searchCountBadge = document.getElementById('searchCountBadge');

  const toast = document.getElementById('toastNotice');
  const toastMsg = document.getElementById('toastMsg');

  // 2. Initialize Theme & Font Size
  document.documentElement.setAttribute('data-theme', state.theme);
  updateThemeIcon();
  applyFontSize();

  // 3. Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('Service Worker Registered:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Versi baharu Al-Masar dikesan, memuat semula...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch(err => console.log('Service Worker Failed:', err));
  }

  // 4. Render Sidebar Tree
  function renderSidebar() {
    chapterNavList.innerHTML = '';

    data.chapters.forEach((ch, chIdx) => {
      const li = document.createElement('li');
      li.className = `chapter-nav-item ${chIdx === state.currentChapter ? 'active-chapter' : ''}`;
      li.id = `nav-ch-${chIdx}`;

      // Chapter Header Button
      const headerBtn = document.createElement('button');
      headerBtn.className = 'chapter-header-btn';
      headerBtn.innerHTML = `
        <span class="chapter-num-badge">${ch.number.replace('BAB ', '').replace('Bab ', 'B')}</span>
        <span class="chapter-title-text" title="${ch.title}">${ch.title}</span>
        <span class="chevron-icon">›</span>
      `;

      // Subtopics Container
      const subUl = document.createElement('ul');
      subUl.className = 'subtopic-list';

      ch.subtopics.forEach((sub, sIdx) => {
        const subLi = document.createElement('li');
        const subBtn = document.createElement('button');
        subBtn.className = `subtopic-nav-btn ${chIdx === state.currentChapter && sIdx === state.currentSubtopic ? 'active-sub' : ''}`;
        subBtn.textContent = `${sIdx + 1}. ${sub.title}`;
        subBtn.title = sub.title;

        subBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigateTo(chIdx, sIdx);
          if (window.innerWidth <= 900) {
            toggleMobileNav(false);
          }
        });

        subLi.appendChild(subBtn);
        subUl.appendChild(subLi);
      });

      headerBtn.addEventListener('click', () => {
        // Toggle open/close accordion
        const isOpen = li.classList.contains('open');
        document.querySelectorAll('.chapter-nav-item').forEach(item => item.classList.remove('open'));
        if (!isOpen) {
          li.classList.add('open');
        }
      });

      li.appendChild(headerBtn);
      li.appendChild(subUl);
      chapterNavList.appendChild(li);
    });

    // Auto-open current chapter
    const currentNavItem = document.getElementById(`nav-ch-${state.currentChapter}`);
    if (currentNavItem) {
      currentNavItem.classList.add('open');
    }
  }  // 5. Navigate to Chapter and Subtopic
  function navigateTo(chIdx, sIdx, targetLayer = null) {
    state.currentChapter = chIdx;
    state.currentSubtopic = sIdx;

    if (targetLayer && (targetLayer === 'layer1' || targetLayer === 'layer2')) {
      state.layer = targetLayer;
      localStorage.setItem('almasar_layer', targetLayer);
      layerBtnLengkap.classList.toggle('active', targetLayer === 'layer1');
      layerBtnRingkasan.classList.toggle('active', targetLayer === 'layer2');
      if (layerBtnHikmah) layerBtnHikmah.classList.remove('active');
    }
    state.currentChapter = chIdx;
    state.currentSubtopic = sIdx;

    if (state.layer === 'layer3') {
      state.layer = 'layer1';
      localStorage.setItem('almasar_layer', 'layer1');
      layerBtnLengkap.classList.add('active');
      layerBtnRingkasan.classList.remove('active');
      if (layerBtnHikmah) layerBtnHikmah.classList.remove('active');
      layerBtnLengkap.setAttribute('aria-selected', 'true');
      layerBtnRingkasan.setAttribute('aria-selected', 'false');
      if (layerBtnHikmah) layerBtnHikmah.setAttribute('aria-selected', 'false');
    }

    // Update active classes in sidebar
    document.querySelectorAll('.chapter-nav-item').forEach((item, idx) => {
      item.classList.toggle('active-chapter', idx === chIdx);
      if (idx === chIdx) item.classList.add('open');
    });

    document.querySelectorAll('.subtopic-nav-btn').forEach(btn => {
      btn.classList.remove('active-sub');
    });

    const activeChElem = document.getElementById(`nav-ch-${chIdx}`);
    if (activeChElem) {
      const activeSubBtn = activeChElem.querySelectorAll('.subtopic-nav-btn')[sIdx];
      if (activeSubBtn) activeSubBtn.classList.add('active-sub');
    }

    renderContent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 6. Render Reader Content
  function renderContent() {
    const ch = data.chapters[state.currentChapter];
    if (!ch) return;
    const sub = ch.subtopics[state.currentSubtopic];
    if (!sub) return;

    if (state.layer === 'layer3') {
      heroCard.style.display = 'none';
      readerContainer.style.display = 'block';

      document.getElementById('chBadgePill').textContent = '💎 KOLEKSI EMAS DAKWAH';
      document.getElementById('chArabicTitle').textContent = 'درر الحكمة والدعوة';
      document.getElementById('subtopicMainTitle').textContent = 'Mutiara Hikmah & Kata-Kata Tokoh';

      const modeBadge = document.getElementById('activeModeBadge');
      modeBadge.textContent = `${allHikmahQuotes.length} Mutiara Kata (Hadis Nabi SAW + Tokoh & Pejuang)`;

      updateBookmarkBtnStatus();
      const contentBody = document.getElementById('contentBody');
      contentBody.innerHTML = '';
      renderHikmahView(contentBody);
      updateBottomNav();
      return;
    }

    // Hide hero after navigation or show meta
    heroCard.style.display = (state.currentChapter === 0 && state.currentSubtopic === 0) ? 'block' : 'none';
    readerContainer.style.display = 'block';

    // Banner metadata
    document.getElementById('chBadgePill').textContent = ch.number;
    document.getElementById('chArabicTitle').textContent = ch.title_ar || 'المسار';
    document.getElementById('subtopicMainTitle').textContent = sub.title;

    // Active layer indicator text
    const modeBadge = document.getElementById('activeModeBadge');
    const subFnCount = (sub.footnotes && sub.footnotes.length > 0) ? sub.footnotes.length : 0;
    modeBadge.textContent = state.layer === 'layer1' 
      ? `Versi Lengkap (${sub.paragraphs ? sub.paragraphs.length : 0} Perenggan${subFnCount > 0 ? ` & ${subFnCount} Nota Kaki` : ''})` 
      : 'Ringkasan Eksklusif (Layer 2 - Fiqh Haraki & Intipati)';

    // Update bookmark status
    updateBookmarkBtnStatus();

    // Render Body according to layer
    const contentBody = document.getElementById('contentBody');
    contentBody.innerHTML = '';

    if (state.layer === 'layer1') {
      // LAYER 1: Full text paragraphs
      if (sub.paragraphs && sub.paragraphs.length > 0) {
        sub.paragraphs.forEach(para => {
          const trimmed = para.trim();

          // 1. Direct Custom HTML Block (e.g. Lauhah Khithathiyyah Infographic)
          if (trimmed.startsWith('<div') || trimmed.startsWith('<section')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'custom-html-block';
            wrapper.innerHTML = trimmed;
            contentBody.appendChild(wrapper);
            return;
          }

          const p = document.createElement('p');
          
          // Check if contains Arabic
          const arabicChars = (para.match(/[\u0600-\u06FF]/g) || []).length;
          const latinChars = (para.match(/[a-zA-Z]/g) || []).length;
          const isMainlyArabic = arabicChars > 0 && arabicChars >= latinChars;

          if (isMainlyArabic) {
            p.className = 'arabic-text';
            const cleanText = para.replace(/^[>\s]+/, '');
            p.innerHTML = cleanText;
          } else if (para.startsWith('“') || para.startsWith('"') || para.includes('berkata:') || para.includes('pesan:')) {
            p.className = 'quote-highlight-box';
            p.innerHTML = formatQuoteText(para);
          } else {
            // Check for numbered list item (e.g. 1. **Dua Peringkat...:** Penjelasan...)
            const numMatch = para.match(/^(\d+)\.\s+\*\*(.*?)\*\*:?\s*(.*)$/);
            if (numMatch) {
              p.className = 'numbered-item-card';
              const titleHtml = numMatch[2].replace(/\*(.*?)\*/g, '<em>$1</em>');
              let descHtml = numMatch[3]
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
              p.innerHTML = `
                <div class="num-card-badge">${numMatch[1]}</div>
                <div class="num-card-content">
                  <div class="num-card-title">${titleHtml}</div>
                  <div class="num-card-desc">${descHtml}</div>
                </div>
              `;
            } else {
              // Standard paragraph with markdown formatting (bold, italic)
              p.innerHTML = para
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
            }
          }
          contentBody.appendChild(p);
        });

        // ==================== SUBTOPIC FOOTNOTES SECTION (AL-MUNTALAQ DESIGN) ====================
        if (sub.footnotes && sub.footnotes.length > 0) {
          const fnSection = document.createElement('div');
          fnSection.className = 'chapter-footnotes-section';
          fnSection.id = 'chapterFootnotes';

          fnSection.innerHTML = `
            <div class="footnotes-title-bar">
              <div class="fn-title-group">
                <div class="fn-title-icon-wrap" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <div class="fn-title-text">
                  <h4>Nota Kaki & Rujukan Ilmiah</h4>
                  <span class="fn-arabic-subtitle">المراجع والهوامش</span>
                </div>
              </div>
              <span class="fn-total-pill">${sub.footnotes.length} Rujukan</span>
            </div>
            <div class="footnotes-list-box">
              ${sub.footnotes.map(fn => `
                <div id="fn-item-${fn.id}" class="footnote-card">
                  <div class="fn-card-topbar">
                    <button type="button" class="fn-card-badge-btn" data-fn-id="${fn.id}" aria-label="Kembali ke perenggan [${fn.id}] untuk sambung bacaan" title="Kembali ke perenggan [${fn.id}] (Klik untuk sambung bacaan)">
                      <span class="fn-islamic-star" aria-hidden="true">❖</span>
                      <svg class="fn-badge-arrow" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M7.5 5L2.5 10L7.5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2.5 10H13.5C15.7091 10 17.5 11.7909 17.5 14V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      <span class="fn-card-badge-num">[${fn.id}]</span>
                    </button>
                  </div>
                  <div class="fn-card-body">${fn.text}</div>
                </div>
              `).join('')}
            </div>
          `;

          contentBody.appendChild(fnSection);

          // 1. Attach interactive Click Handlers on in-text Footnote Citations (.fn-ref) (Atas-Bawah)
          contentBody.querySelectorAll('.fn-ref').forEach(el => {
            const fnId = el.getAttribute('data-fn-id');
            if (!el.id) {
              el.id = `fnref-${fnId}`;
            }
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.title = el.getAttribute('title') || `Lihat Nota Kaki [${fnId}]`;

            el.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
              }
            });
            el.addEventListener('click', (e) => {
              e.preventDefault();
              const targetFn = document.getElementById(`fn-item-${fnId}`);
              if (targetFn) {
                targetFn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetFn.classList.remove('fn-highlight');
                void targetFn.offsetWidth; // trigger reflow for animation
                targetFn.classList.add('fn-highlight');
                setTimeout(() => targetFn.classList.remove('fn-highlight'), 3000);
              }
              const fnData = sub.footnotes ? sub.footnotes.find(f => f.id == fnId) : null;
              if (fnData) {
                showToast(`[${fnId}] ${fnData.text}`);
              }
            });
          });

          // 2. Attach Click Handlers to the Left Badge Button (.fn-card-badge-btn) to jump back to text (Bawah-Atas)
          contentBody.querySelectorAll('.fn-card-badge-btn, .fn-back-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              const fnId = btn.getAttribute('data-fn-id');
              const targetRef = document.getElementById(`fnref-${fnId}`) || contentBody.querySelector(`.fn-ref[data-fn-id="${fnId}"]`);
              if (targetRef) {
                targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Denyutan warna emas/hijau pada nombor rujukan dalam perenggan
                targetRef.classList.remove('fn-ref-return-highlight');
                void targetRef.offsetWidth; // trigger reflow
                targetRef.classList.add('fn-ref-return-highlight');
                setTimeout(() => targetRef.classList.remove('fn-ref-return-highlight'), 3200);

                // Kilauan lembut pada perenggan agar mudah menyambung bacaan
                const parentBlock = targetRef.closest('.reader-paragraph, .reader-quran-box, .quote-highlight-box, .arabic-text, p');
                if (parentBlock) {
                  parentBlock.classList.remove('para-return-glow');
                  void parentBlock.offsetWidth;
                  parentBlock.classList.add('para-return-glow');
                  setTimeout(() => parentBlock.classList.remove('para-return-glow'), 2500);
                }

                showToast(`Kembali ke perenggan [${fnId}] • Sila sambung bacaan 📖`);
              } else {
                showToast(`Perenggan rujukan [${fnId}] tidak ditemui pada paparan ini.`);
              }
            });
          });
        }
      } else {
        contentBody.innerHTML = '<p class="text-muted">Tiada teks lanjutan bagi bahagian ini.</p>';
      }
    } else {
      // LAYER 2: Structured Exclusive Summary
      const summaryBox = document.createElement('div');
      summaryBox.className = 'summary-container';

      if (sub.summary && sub.summary.trim() !== '') {
        // Convert simple markdown bullets and bold into HTML
        let htmlContent = sub.summary
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\*\s/g, '</li><li>')
          .replace(/\n-\s/g, '</li><li>');

        htmlContent = htmlContent.replace(/\n\n/g, '<br><br>');
        summaryBox.innerHTML = `<div>${htmlContent}</div>`;
      } else {
        summaryBox.innerHTML = `
          <div style="text-align: center; padding: 2rem;">
            <p style="color: var(--gold-light); font-weight: 600;">Ringkasan Eksklusif Sedang Dikemas Kini</p>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Sahabat boleh meneliti versi lengkap (Layer 1) sementara ringkasan dimantapkan sepenuhnya.</p>
          </div>
        `;
      }
      contentBody.appendChild(summaryBox);
    }

    // Paparan Jalur Mutiara Hikmah Bab / Bahagian Ini (jika ada mutiara hikmah berkaitan)
    const currentSubQuotes = allHikmahQuotes.filter(q => 
      (q.subtopicId && q.subtopicId === sub.id) ||
      (q.chapterIndex === state.currentChapter && q.subtopicIndex === state.currentSubtopic)
    );
    if (currentSubQuotes.length > 0 && (state.layer === 'layer1' || state.layer === 'layer2')) {
      const chHikmahWrap = document.createElement('div');
      chHikmahWrap.className = 'chapter-hikmah-box';
      chHikmahWrap.innerHTML = `
        <div class="chapter-hikmah-title">
          <span>💎</span>
          <span>Mutiara Hikmah Topik Ini (${currentSubQuotes.length} Mutiara Emas)</span>
          <button class="hikmah-card-btn" id="btnViewChapterHikmah" style="margin-left: auto; color: var(--gold-light); border-color: rgba(212, 175, 55, 0.4);">
            Buka Semua Mutiara →
          </button>
        </div>
        <div style="font-size: 0.95rem; line-height: 1.7; color: var(--text-main);">
          <span class="hikmah-speaker-pill" style="font-size: 0.78rem; margin-bottom: 6px;">👤 ${currentSubQuotes[0].speaker}</span>
          <div style="margin-top: 6px;">${formatHikmahQuote(currentSubQuotes[0].quote)}</div>
        </div>
      `;
      contentBody.appendChild(chHikmahWrap);

      const btnViewAll = chHikmahWrap.querySelector('#btnViewChapterHikmah');
      if (btnViewAll) {
        btnViewAll.addEventListener('click', () => {
          setLayer('layer3');
        });
      }
    }

    // Update Bottom Navigation buttons
    updateBottomNav();

    // Sorotan Carian Dalam Laman & Navigasi Baris (In-Page Search Highlight)
    if (state.activeSearchQuery && (state.layer === 'layer1' || state.layer === 'layer2')) {
      let matchCount = highlightTextInElement(contentBody, state.activeSearchQuery);

      // Jika tiada padanan dalam mod semasa, semak mod satu lagi secara automatik
      if (matchCount === 0) {
        const otherLayer = (state.layer === 'layer1') ? 'layer2' : 'layer1';
        const ch = data.chapters[state.currentChapter];
        const sub = ch ? ch.subtopics[state.currentSubtopic] : null;
        let foundInOther = false;

        if (sub) {
          if (otherLayer === 'layer2') {
            if ((sub.summary || '').toLowerCase().includes(state.activeSearchQuery.toLowerCase())) {
              foundInOther = true;
            }
          } else {
            if (sub.paragraphs && sub.paragraphs.some(p => p.toLowerCase().includes(state.activeSearchQuery.toLowerCase()))) {
              foundInOther = true;
            }
          }
        }

        if (foundInOther) {
          setLayer(otherLayer);
          showToast(`Kata kunci ditemui dalam ${otherLayer === 'layer2' ? 'Ringkasan Eksklusif' : 'Versi Lengkap'}`);
          return;
        }
      }

      if (matchCount > 0) {
        showFloatingSearchToolbar(state.activeSearchQuery, matchCount);
        setTimeout(() => {
          focusSearchMatch(0);
        }, 180);
      } else if (state.searchResults && state.searchResults.length > 0) {
        // Kekalkan bar navigasi carian topik berbaki walaupun tiada padanan langsung dalam subtopik ini
        showFloatingSearchToolbar(state.activeSearchQuery, 0);
      } else {
        removeFloatingSearchToolbar();
      }
    } else {
      removeFloatingSearchToolbar();
    }
  }

  // ================= IN-PAGE SEARCH HIGHLIGHTING (Penyelidikan Lapangan) =================
  function highlightTextInElement(element, query) {
    if (!query || !element) return 0;
    removeHighlightsInElement(element);

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexible = escaped.replace(/['\u2018\u2019\u02bb\u02bc`]/g, "['\\u2018\\u2019\\u02bb\\u02bc`]");
    const regex = new RegExp(`(${flexible})`, 'gi');
    const textNodes = [];
    const walk = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (parent && (
            parent.tagName === 'SCRIPT' ||
            parent.tagName === 'STYLE' ||
            parent.classList.contains('content-search-match') ||
            parent.classList.contains('chapter-hikmah-box') ||
            parent.closest('.chapter-hikmah-box')
          )) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walk.nextNode())) {
      if (regex.test(node.nodeValue)) {
        textNodes.push(node);
      }
      regex.lastIndex = 0;
    }

    let matchCount = 0;
    textNodes.forEach(tNode => {
      const parent = tNode.parentNode;
      if (!parent) return;
      const text = tNode.nodeValue;
      const parts = text.split(regex);

      const fragment = document.createDocumentFragment();
      for (let i = 0; i < parts.length; i++) {
        if (regex.test(parts[i])) {
          const mark = document.createElement('mark');
          mark.className = 'content-search-match';
          mark.setAttribute('data-match-idx', matchCount);
          mark.textContent = parts[i];
          fragment.appendChild(mark);
          matchCount++;
        } else if (parts[i]) {
          fragment.appendChild(document.createTextNode(parts[i]));
        }
        regex.lastIndex = 0;
      }
      parent.replaceChild(fragment, tNode);
    });

    return matchCount;
  }

  function removeHighlightsInElement(element) {
    if (!element) return;
    const marks = element.querySelectorAll('mark.content-search-match');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize();
      }
    });
  }

  function focusSearchMatch(idx) {
    const marks = contentBody.querySelectorAll('mark.content-search-match');
    if (!marks || marks.length === 0) return;

    marks.forEach(m => m.classList.remove('active-match'));

    const safeIdx = (idx + marks.length) % marks.length;
    state.activeMatchIndex = safeIdx;

    const targetMark = marks[safeIdx];
    if (targetMark) {
      targetMark.classList.add('active-match');

      // Auto-buka details / accordion jika match berada di dalamnya
      const parentDetails = targetMark.closest('details');
      if (parentDetails) {
        parentDetails.open = true;
      }

      targetMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const countEl = document.getElementById('sfbCount');
    if (countEl) {
      countEl.textContent = `${safeIdx + 1}/${marks.length}`;
    }
  }

  function showFloatingSearchToolbar(query, totalMatches) {
    removeFloatingSearchToolbar();

    // Pastikan senarai hasil sentiasa diisi jika ada activeSearchQuery
    if ((!state.searchResults || state.searchResults.length === 0) && query) {
      performSearch(query);
    }
    const totalTopics = state.searchResults ? state.searchResults.length : 0;
    let curTopicIdx = state.currentSearchResultIndex;
    if (curTopicIdx < 0 && state.searchResults && state.searchResults.length > 0) {
      curTopicIdx = state.searchResults.findIndex(r => r.chIdx === state.currentChapter && r.sIdx === state.currentSubtopic);
      if (curTopicIdx >= 0) state.currentSearchResultIndex = curTopicIdx;
    }

    const hasMultiTopics = totalTopics > 0;
    const topicLabel = hasMultiTopics ? `📋 Hasil (${Math.max(1, curTopicIdx + 1)}/${totalTopics})` : `📋 Hasil Carian`;

    const bar = document.createElement('div');
    bar.className = 'search-floating-bar';
    bar.id = 'searchFloatingBar';
    bar.innerHTML = `
      <div class="sfb-badge">
        <span class="sfb-icon">🔍</span>
        <span class="sfb-text">"<span class="sfb-query" title="${query}">${query}</span>"</span>
        <span class="sfb-count" id="sfbCount" title="Kedudukan baris dalam subtopik ini">${totalMatches > 0 ? `1/${totalMatches}` : `0/0`}</span>
      </div>
      <div class="sfb-actions">
        <button class="sfb-btn" id="sfbPrevBtn" title="Baris Sebelumnya Dalam Subtopik Ini" aria-label="Baris Sebelumnya" ${totalMatches <= 1 ? 'disabled' : ''}>▲</button>
        <button class="sfb-btn" id="sfbNextBtn" title="Baris Seterusnya Dalam Subtopik Ini" aria-label="Baris Seterusnya" ${totalMatches <= 1 ? 'disabled' : ''}>▼</button>
        
        ${hasMultiTopics ? `
          <div class="sfb-divider"></div>
          <button class="sfb-topic-btn" id="sfbTopicListBtn" title="Buka Semula Senarai Semua ${totalTopics} Hasil Carian">${topicLabel}</button>
          <button class="sfb-btn" id="sfbPrevTopicBtn" title="Subtopik Hasil Carian Sebelumnya" aria-label="Subtopik Sebelumnya" ${curTopicIdx <= 0 ? 'disabled' : ''}>⏮</button>
          <button class="sfb-btn" id="sfbNextTopicBtn" title="Subtopik Hasil Carian Seterusnya" aria-label="Subtopik Seterusnya" ${curTopicIdx >= totalTopics - 1 ? 'disabled' : ''}>⏭</button>
        ` : ''}

        <div class="sfb-divider"></div>
        <button class="sfb-btn sfb-close-btn" id="sfbCloseBtn" title="Padam Sorotan & Tutup" aria-label="Padam Sorotan">✕</button>
      </div>
    `;

    document.body.appendChild(bar);

    const prevBtn = bar.querySelector('#sfbPrevBtn');
    const nextBtn = bar.querySelector('#sfbNextBtn');
    const topicListBtn = bar.querySelector('#sfbTopicListBtn');
    const prevTopicBtn = bar.querySelector('#sfbPrevTopicBtn');
    const nextTopicBtn = bar.querySelector('#sfbNextTopicBtn');
    const closeBtn = bar.querySelector('#sfbCloseBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        focusSearchMatch(state.activeMatchIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        focusSearchMatch(state.activeMatchIndex + 1);
      });
    }

    if (topicListBtn) {
      topicListBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.searchResults && state.searchResults.length > 0) {
          renderSearchResults(state.searchResults, state.activeSearchQuery);
        } else if (state.activeSearchQuery) {
          performSearch(state.activeSearchQuery);
        }
        searchOverlay.classList.add('open');
      });
    }

    if (prevTopicBtn) {
      prevTopicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.searchResults && curTopicIdx > 0) {
          const prevRes = state.searchResults[curTopicIdx - 1];
          state.currentSearchResultIndex = curTopicIdx - 1;
          navigateTo(prevRes.chIdx, prevRes.sIdx, prevRes.targetLayer || 'layer1');
        }
      });
    }

    if (nextTopicBtn) {
      nextTopicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.searchResults && curTopicIdx < totalTopics - 1) {
          const nextRes = state.searchResults[curTopicIdx + 1];
          state.currentSearchResultIndex = curTopicIdx + 1;
          navigateTo(nextRes.chIdx, nextRes.sIdx, nextRes.targetLayer || 'layer1');
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeSearchQuery = null;
        state.searchResults = [];
        state.currentSearchResultIndex = -1;
        searchInput.value = '';
        removeFloatingSearchToolbar();
        removeHighlightsInElement(contentBody);
      });
    }
  }

  function removeFloatingSearchToolbar() {
    const existing = document.getElementById('searchFloatingBar');
    if (existing) {
      existing.remove();
    }
  }

  function formatQuoteText(text) {
    // Highlight potential names (dengan ejaan standard kemas kini)
    const names = ['Imam Hasan al-Banna', 'Hasan al-Banna', 'Sayyid Qutb', 'Umar bin al-Khattab', 'Abu al-Dardak', 'Abu ad-Darda\'', 'Ibn al-Qayyim', 'Ibnu Taimiyah', 'Ibnu Taimiyah', 'Imam Ahmad', 'Yahya bin Mu\'az', 'Abdullah bin Wahab', 'al-Ma’mun', 'Rasulullah saw', 'Rasulullah SAW', 'Nabi saw', 'Iqbal', 'Muhammad Iqbal', 'Hasan al-Hudhaibi'];
    let formatted = text;
    names.forEach(name => {
      const regex = new RegExp(`(${name})`, 'gi');
      formatted = formatted.replace(regex, '<span class="tokoh-name">$1</span>');
    });
    return formatted;
  }

  // 7. Bottom Navigation (Prev / Next)
  function updateBottomNav() {
    if (state.layer === 'layer3') {
      prevSubBtn.disabled = false;
      nextSubBtn.disabled = false;
      prevSubBtn.innerHTML = '← Baca Versi Lengkap';
      prevSubBtn.title = 'Buka Versi Lengkap Topik Semasa';
      nextSubBtn.innerHTML = 'Baca Ringkasan Topik →';
      nextSubBtn.title = 'Buka Ringkasan Topik Semasa';
      return;
    }

    const ch = data.chapters[state.currentChapter];
    
    // Check Previous
    if (state.currentSubtopic > 0) {
      prevSubBtn.disabled = false;
      prevSubBtn.innerHTML = `← ${ch.subtopics[state.currentSubtopic - 1].title}`;
    } else if (state.currentChapter > 0) {
      const prevCh = data.chapters[state.currentChapter - 1];
      prevSubBtn.disabled = false;
      prevSubBtn.innerHTML = `← ${prevCh.title}`;
    } else {
      prevSubBtn.disabled = true;
      prevSubBtn.innerHTML = `← Permulaan Kitab`;
    }

    // Check Next
    if (state.currentSubtopic < ch.subtopics.length - 1) {
      nextSubBtn.disabled = false;
      nextSubBtn.innerHTML = `${ch.subtopics[state.currentSubtopic + 1].title} →`;
    } else if (state.currentChapter < data.chapters.length - 1) {
      const nextCh = data.chapters[state.currentChapter + 1];
      nextSubBtn.disabled = false;
      nextSubBtn.innerHTML = `${nextCh.title} →`;
    } else {
      nextSubBtn.disabled = true;
      nextSubBtn.innerHTML = `Tamat Kitab →`;
    }
  }

  prevSubBtn.addEventListener('click', () => {
    if (state.layer === 'layer3') {
      setLayer('layer1');
      return;
    }
    if (state.currentSubtopic > 0) {
      navigateTo(state.currentChapter, state.currentSubtopic - 1);
    } else if (state.currentChapter > 0) {
      const prevChIdx = state.currentChapter - 1;
      const lastSubIdx = data.chapters[prevChIdx].subtopics.length - 1;
      navigateTo(prevChIdx, lastSubIdx);
    }
  });

  nextSubBtn.addEventListener('click', () => {
    if (state.layer === 'layer3') {
      setLayer('layer2');
      return;
    }
    const ch = data.chapters[state.currentChapter];
    if (state.currentSubtopic < ch.subtopics.length - 1) {
      navigateTo(state.currentChapter, state.currentSubtopic + 1);
    } else if (state.currentChapter < data.chapters.length - 1) {
      navigateTo(state.currentChapter + 1, 0);
    }
  });

  // 8. Layer Switching (Lengkap vs Ringkasan vs Mutiara Hikmah)
  function setLayer(layerName) {
    state.layer = layerName;
    localStorage.setItem('almasar_layer', layerName);

    layerBtnLengkap.classList.toggle('active', layerName === 'layer1');
    layerBtnRingkasan.classList.toggle('active', layerName === 'layer2');
    if (layerBtnHikmah) {
      layerBtnHikmah.classList.toggle('active', layerName === 'layer3');
      layerBtnHikmah.setAttribute('aria-selected', layerName === 'layer3');
    }
    layerBtnLengkap.setAttribute('aria-selected', layerName === 'layer1');
    layerBtnRingkasan.setAttribute('aria-selected', layerName === 'layer2');

    renderContent();
    let toastText = 'Mod Paparan: Versi Penuh';
    if (layerName === 'layer2') toastText = 'Mod Paparan: Ringkasan Eksklusif';
    if (layerName === 'layer3') toastText = 'Mod Mutiara Hikmah Dakwah dibuka 💎';
    showToast(toastText);
  }

  layerBtnLengkap.addEventListener('click', () => setLayer('layer1'));
  layerBtnRingkasan.addEventListener('click', () => setLayer('layer2'));
  if (layerBtnHikmah) {
    layerBtnHikmah.addEventListener('click', () => setLayer('layer3'));
  }
  if (sidebarHikmahBtn) {
    sidebarHikmahBtn.addEventListener('click', () => {
      setLayer('layer3');
      if (state.mobileNavOpen) {
        toggleMobileNav(false);
      }
    });
  }

  // 9. Theme Switching
  function updateThemeIcon() {
    themeToggleBtn.innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
  }

  themeToggleBtn.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('almasar_theme', state.theme);
    updateThemeIcon();
    showToast(`Tema ${state.theme === 'dark' ? 'Gelap' : 'Cerah'} Diaktifkan`);
  });

  // 10. Font Size Adjustments
  function applyFontSize() {
    document.documentElement.style.setProperty('--font-base', `${state.fontSize}rem`);
    localStorage.setItem('almasar_fontsize', state.fontSize.toString());
  }

  fontIncBtn.addEventListener('click', () => {
    if (state.fontSize < 1.4) {
      state.fontSize += 0.08;
      applyFontSize();
    }
  });

  fontDecBtn.addEventListener('click', () => {
    if (state.fontSize > 0.85) {
      state.fontSize -= 0.08;
      applyFontSize();
    }
  });

  fontResetBtn.addEventListener('click', () => {
    state.fontSize = 1.05;
    applyFontSize();
    showToast('Saiz Fon Ditetapkan Semula');
  });

  // 11. Bookmarks Management
  function getBookmarkKey() {
    return `${state.currentChapter}_${state.currentSubtopic}`;
  }

  function updateBookmarkBtnStatus() {
    const key = getBookmarkKey();
    const isBookmarked = state.bookmarks.includes(key);
    bookmarkBtn.innerHTML = isBookmarked ? '★ Disimpan' : '☆ Tanda Buku';
    bookmarkBtn.style.color = isBookmarked ? 'var(--gold-light)' : 'var(--text-muted)';
  }

  bookmarkBtn.addEventListener('click', () => {
    const key = getBookmarkKey();
    const idx = state.bookmarks.indexOf(key);
    if (idx > -1) {
      state.bookmarks.splice(idx, 1);
      showToast('Tanda buku dipadam');
    } else {
      state.bookmarks.push(key);
      showToast('Bahagian berjaya ditanda!');
    }
    localStorage.setItem('almasar_bookmarks', JSON.stringify(state.bookmarks));
    updateBookmarkBtnStatus();
  });

  // 12. Copy Link / Content
  copyBtn.addEventListener('click', () => {
    if (state.layer === 'layer3') {
      const item = allHikmahQuotes[currentFeaturedHikmahIndex] || allHikmahQuotes[0];
      if (item) copyHikmahToClipboard(item);
      return;
    }

    const ch = data.chapters[state.currentChapter];
    const sub = ch.subtopics[state.currentSubtopic];
    const textToCopy = `Al-Masar (${ch.title} - ${sub.title}):\n\n` + 
      (sub.paragraphs ? sub.paragraphs.slice(0, 2).join('\n\n') : sub.summary);

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => showToast('Petikan berjaya disalin ke papan klip!'))
        .catch(() => fallbackCopyText(textToCopy));
    } else {
      fallbackCopyText(textToCopy);
    }
  });

  // 13. Search Engine
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    if (query.length < 2) {
      searchOverlay.classList.remove('open');
      return;
    }
    performSearch(query);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim().toLowerCase();
      if (query.length >= 2) {
        performSearch(query);
        const firstItem = searchResultsList.querySelector('.search-result-item');
        if (firstItem) {
          firstItem.click();
        }
      }
    }
  });

  function normalizeSearchText(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[\u2018\u2019\u02bb\u02bc`]/g, "'");
  }

  function getApostropheRegex(query) {
    const escaped = (query || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexible = escaped.replace(/['\u2018\u2019\u02bb\u02bc`]/g, "['\\u2018\\u2019\\u02bb\\u02bc`]");
    return new RegExp(`(${flexible})`, 'gi');
  }

  function performSearch(query) {
    const results = [];
    const normQuery = normalizeSearchText(query);
    if (!normQuery) return;

    data.chapters.forEach((ch, chIdx) => {
      ch.subtopics.forEach((sub, sIdx) => {
        let foundInParas = false;

        // 1. KEUTAMAAN UTAMA (DEFAULT): Versi Penuh (Layer 1)
        if (sub.paragraphs) {
          for (let p of sub.paragraphs) {
            const normP = normalizeSearchText(p);
            if (normP.includes(normQuery)) {
              const startIdx = Math.max(0, normP.indexOf(normQuery) - 40);
              const snippet = p.substring(startIdx, startIdx + 140);
              results.push({
                chIdx,
                sIdx,
                targetLayer: 'layer1',
                layerLabel: 'Versi Penuh',
                title: `${ch.number}: ${sub.title}`,
                snippet: highlightText(snippet, query),
                chTitle: ch.title
              });
              foundInParas = true;
              break;
            }
          }
        }

        // Semak tajuk subtopik jika belum jumpa dalam perenggan
        if (!foundInParas && normalizeSearchText(sub.title).includes(normQuery)) {
          results.push({
            chIdx,
            sIdx,
            targetLayer: 'layer1',
            layerLabel: 'Versi Penuh',
            title: `${ch.number}: ${sub.title}`,
            snippet: `Tajuk sepadan: ${sub.title}`,
            chTitle: ch.title
          });
          foundInParas = true;
        }

        // 2. KEUTAMAAN KEDUA: Ringkasan Eksklusif (Layer 2)
        // Hanya jika kata kunci TIDAK ditemui dalam Versi Penuh
        if (!foundInParas && sub.summary && normalizeSearchText(sub.summary).includes(normQuery)) {
          const normSum = normalizeSearchText(sub.summary);
          const startIdx = Math.max(0, normSum.indexOf(normQuery) - 40);
          const snippet = sub.summary.substring(startIdx, startIdx + 140);
          results.push({
            chIdx,
            sIdx,
            targetLayer: 'layer2',
            layerLabel: 'Ringkasan',
            title: `${ch.number}: ${sub.title}`,
            snippet: highlightText(snippet, query),
            chTitle: ch.title
          });
        }
      });
    });

    state.searchResults = results;
    state.activeSearchQuery = query;
    renderSearchResults(results, query);
  }

  function highlightText(text, query) {
    if (!text || !query) return text || '';
    const regex = getApostropheRegex(query);
    return text.replace(regex, '<mark>$1</mark>');
  }

  function renderSearchResults(results, query) {
    searchResultsList.innerHTML = '';
    searchCountBadge.textContent = `${results.length} padanan untuk "${query}"`;

    if (results.length === 0) {
      searchResultsList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Tiada hasil dijumpai untuk carian ini.
        </div>
      `;
    } else {
      results.forEach((res, rIdx) => {
        const isCurrentReading = (res.chIdx === state.currentChapter && res.sIdx === state.currentSubtopic);
        const isLayer1 = (res.targetLayer !== 'layer2');
        const badgeClass = isLayer1 ? 'badge-layer1' : 'badge-layer2';
        const badgeText = isLayer1 ? '📖 Versi Penuh' : '📑 Ringkasan';

        const item = document.createElement('div');
        item.className = 'search-result-item' + (isCurrentReading ? ' active-reading' : '');
        item.style.padding = '12px';
        item.style.borderBottom = '1px solid var(--border-card)';
        item.style.cursor = 'pointer';
        item.innerHTML = `
          <div class="search-result-title" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <span>${res.title}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="search-layer-badge ${badgeClass}">${badgeText}</span>
              ${isCurrentReading ? '<span class="search-result-current-badge">Sedang Dibaca 📖</span>' : ''}
            </div>
          </div>
          <div class="search-result-snippet" style="margin-top: 6px;">...${res.snippet}...</div>
        `;
        item.addEventListener('click', () => {
          searchOverlay.classList.remove('open');
          state.activeSearchQuery = query;
          state.activeMatchIndex = 0;
          state.searchResults = results;
          state.currentSearchResultIndex = rIdx;
          searchInput.value = query;

          // Default ke targetLayer (Versi Penuh didahulukan)
          const chosenLayer = res.targetLayer || 'layer1';
          navigateTo(res.chIdx, res.sIdx, chosenLayer);
        });
        searchResultsList.appendChild(item);
      });
    }

    searchOverlay.classList.add('open');
  }

  closeSearchBtn.addEventListener('click', () => {
    searchOverlay.classList.remove('open');
  });

  // 14. Mobile Drawer Toggle
  function toggleMobileNav(force) {
    state.mobileNavOpen = typeof force === 'boolean' ? force : !state.mobileNavOpen;
    appSidebar.classList.toggle('open-mobile', state.mobileNavOpen);
  }

  mobileMenuBtn.addEventListener('click', () => toggleMobileNav());

  // 15. Toast Utility
  let toastTimer = null;
  function showToast(msg) {
    toastMsg.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // ==========================================================================
  // MUTIARA HIKMAH DAKWAH (LAYER 3 LOGIC)
  // ==========================================================================
  let currentFeaturedHikmahIndex = Math.floor(Math.random() * (allHikmahQuotes.length || 1));
  let activeHikmahCategory = 'all';
  let hikmahSearchQuery = '';

  function renderHikmahView(container) {
    if (!allHikmahQuotes || allHikmahQuotes.length === 0) {
      container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">Koleksi mutiara hikmah sedang dikemas kini.</p>';
      return;
    }

    const wrap = document.createElement('div');
    wrap.className = 'hikmah-container';

    // 1. Featured Hero Random Quote Card
    const heroCardEl = document.createElement('div');
    heroCardEl.className = 'hikmah-hero-card';
    heroCardEl.id = 'hikmahFeaturedCard';
    wrap.appendChild(heroCardEl);

    // 2. Toolbar (Search & Filter Chips)
    const toolbarEl = document.createElement('div');
    toolbarEl.className = 'hikmah-toolbar';
    toolbarEl.innerHTML = `
      <div class="hikmah-search-wrap">
        <span class="hikmah-search-icon">🔍</span>
        <input type="text" class="hikmah-search-input" id="hikmahSearchInput" placeholder="Cari kata hikmah, nama tokoh, dalil, atau topik..." value="${hikmahSearchQuery}">
      </div>
      <div class="hikmah-filter-chips" id="hikmahFilterChips">
        <button class="hikmah-chip-btn ${activeHikmahCategory === 'all' ? 'active' : ''}" data-cat="all">Semua (${allHikmahQuotes.length})</button>
        <button class="hikmah-chip-btn ${activeHikmahCategory === 'salaf' ? 'active' : ''}" data-cat="salaf">Ulama & Salaf</button>
        <button class="hikmah-chip-btn ${activeHikmahCategory === 'sahabat' ? 'active' : ''}" data-cat="sahabat">Sahabat & Khulafa' RA</button>
        <button class="hikmah-chip-btn ${activeHikmahCategory === 'rasyid' ? 'active' : ''}" data-cat="rasyid">Syeikh Ar-Rasyid</button>
        <button class="hikmah-chip-btn ${activeHikmahCategory === 'banna' ? 'active' : ''}" data-cat="banna">Imam Hasan Al-Banna</button>
        <button class="hikmah-chip-btn ${activeHikmahCategory === 'iqbal' ? 'active' : ''}" data-cat="iqbal">Pujangga Iqbal</button>
      </div>
    `;
    wrap.appendChild(toolbarEl);

    // 3. Grid List of Quotes
    const gridEl = document.createElement('div');
    gridEl.className = 'hikmah-grid';
    gridEl.id = 'hikmahGrid';
    wrap.appendChild(gridEl);

    container.appendChild(wrap);

    // Render Featured Quote and Grid
    updateFeaturedCard(heroCardEl);
    updateHikmahGrid(gridEl);

    // Attach Search listener
    const searchInputEl = toolbarEl.querySelector('#hikmahSearchInput');
    searchInputEl.addEventListener('input', (e) => {
      hikmahSearchQuery = e.target.value.toLowerCase().trim();
      updateHikmahGrid(gridEl);
    });

    // Attach Filter Chips listeners
    toolbarEl.querySelectorAll('.hikmah-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toolbarEl.querySelectorAll('.hikmah-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeHikmahCategory = btn.getAttribute('data-cat');
        updateHikmahGrid(gridEl);
      });
    });
  }

  function updateFeaturedCard(cardEl) {
    if (!cardEl) cardEl = document.getElementById('hikmahFeaturedCard');
    if (!cardEl) return;

    const item = allHikmahQuotes[currentFeaturedHikmahIndex] || allHikmahQuotes[0];

    cardEl.innerHTML = `
      <div class="hikmah-hero-header">
        <div class="hikmah-tag-group">
          <span class="hikmah-hero-badge">💎 MUTIARA HIKMAH PILIHAN</span>
          <span class="hikmah-speaker-pill">👤 ${item.speaker}</span>
        </div>
        <span style="font-size: 0.8rem; color: var(--gold-light); font-weight: 600;">#${currentFeaturedHikmahIndex + 1} daripada ${allHikmahQuotes.length}</span>
      </div>

      <div class="hikmah-hero-quote">
        ${formatHikmahQuote(item.quote)}
      </div>

      <div class="hikmah-hero-source">
        <span>📚 Sumber:</span>
        <strong>${item.chapterNumber} — ${item.chapterTitle} (${item.subtopicTitle})</strong>
      </div>

      <div class="hikmah-actions-row">
        <button class="hikmah-action-btn hikmah-btn-primary" id="btnNextRandomHikmah">
          <span>🔄</span>
          <span>Jana Hikmah Lain (Rawak)</span>
        </button>
        <button class="hikmah-action-btn hikmah-btn-secondary" id="btnCopyFeaturedHikmah">
          <span>📋</span>
          <span>Salin Hikmah</span>
        </button>
        <button class="hikmah-action-btn hikmah-btn-emerald" id="btnReadChapterFeatured">
          <span>📖</span>
          <span>Buka Bahagian Lengkap</span>
        </button>
      </div>
    `;

    // Action button listeners
    const btnNext = cardEl.querySelector('#btnNextRandomHikmah');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        let nextIdx = Math.floor(Math.random() * allHikmahQuotes.length);
        if (nextIdx === currentFeaturedHikmahIndex && allHikmahQuotes.length > 1) {
          nextIdx = (nextIdx + 1) % allHikmahQuotes.length;
        }
        currentFeaturedHikmahIndex = nextIdx;
        updateFeaturedCard(cardEl);
      });
    }

    const btnCopy = cardEl.querySelector('#btnCopyFeaturedHikmah');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        copyHikmahToClipboard(item);
      });
    }

    const btnRead = cardEl.querySelector('#btnReadChapterFeatured');
    if (btnRead) {
      btnRead.addEventListener('click', () => {
        navigateTo(item.chapterIndex, item.subtopicIndex);
        setLayer('layer1');
      });
    }
  }

  function filterHikmahQuotes() {
    return allHikmahQuotes.filter(item => {
      // 1. Search query match
      if (hikmahSearchQuery) {
        const textToSearch = `${item.speaker} ${item.quote} ${item.chapterNumber} ${item.chapterTitle} ${item.subtopicTitle}`.toLowerCase();
        if (!textToSearch.includes(hikmahSearchQuery)) {
          return false;
        }
      }

      // 2. Category match
      if (activeHikmahCategory === 'sahabat') {
        return item.category === 'sahabat';
      } else if (activeHikmahCategory === 'banna') {
        return item.category === 'banna';
      } else if (activeHikmahCategory === 'iqbal') {
        return item.category === 'iqbal';
      } else if (activeHikmahCategory === 'salaf') {
        return item.category === 'salaf';
      } else if (activeHikmahCategory === 'rasyid') {
        return item.category === 'rasyid';
      }

      return true; // 'all'
    });
  }

  function updateHikmahGrid(gridEl) {
    if (!gridEl) gridEl = document.getElementById('hikmahGrid');
    if (!gridEl) return;

    const filtered = filterHikmahQuotes();
    gridEl.innerHTML = '';

    if (filtered.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
          <p style="font-weight: 600; color: var(--gold-light);">Tiada kata hikmah ditemui bagi carian ini</p>
          <small>Sila cuba kata kunci lain atau pilih tab 'Semua'.</small>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'hikmah-card';
      card.innerHTML = `
        <div>
          <div class="hikmah-card-top">
            <span class="hikmah-card-speaker">👤 ${item.speaker}</span>
            <span class="hikmah-card-index">#${item.id}</span>
          </div>
          <div class="hikmah-card-body">
            ${formatHikmahQuote(item.quote)}
          </div>
        </div>
        <div class="hikmah-card-footer">
          <span class="hikmah-card-chapter" title="Buka bahagian ini">${item.chapterNumber}: ${item.subtopicTitle.length > 20 ? item.subtopicTitle.substring(0, 18) + '..' : item.subtopicTitle}</span>
          <div class="hikmah-card-actions">
            <button class="hikmah-card-btn btn-copy-card" title="Salin kata hikmah ini">
              <span>📋</span>
              <span>Salin</span>
            </button>
            <button class="hikmah-card-btn btn-read-card" title="Buka bahagian lengkap">
              <span>📖</span>
              <span>Topik</span>
            </button>
          </div>
        </div>
      `;

      // Copy listener
      card.querySelector('.btn-copy-card').addEventListener('click', () => {
        copyHikmahToClipboard(item);
      });

      // Read Chapter listener
      card.querySelector('.btn-read-card').addEventListener('click', () => {
        navigateTo(item.chapterIndex, item.subtopicIndex);
        setLayer('layer1');
      });

      card.querySelector('.hikmah-card-chapter').addEventListener('click', () => {
        navigateTo(item.chapterIndex, item.subtopicIndex);
        setLayer('layer1');
      });

      gridEl.appendChild(card);
    });
  }

  function formatHikmahQuote(text) {
    if (!text) return '';
    let formatted = text;
    // Highlight Arabic quotation brackets « ... »
    formatted = formatted.replace(/«\s*(.*?)\s*»/g, '<span class="ar-quote">« $1 »</span>');
    // Highlight Malay / English quoted speech “...”
    formatted = formatted.replace(/“\s*(.*?)\s*”/g, '<strong style="color: var(--gold-light);">“$1”</strong>');
    return formatted;
  }

  function copyHikmahToClipboard(item) {
    const textToCopy = `💎 ${allHikmahQuotes.length} MUTIARA KATA\n(Hadis Nabi SAW + Tokoh & Pejuang)\n` +
      `👤 ${item.speaker}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `"${item.quote}"\n\n` +
      `📚 Sumber: ${item.chapterNumber} — ${item.chapterTitle}\n` +
      `📑 Topik: ${item.subtopicTitle}\n` +
      `🌟 Kitab Al-Masar — Syeikh Muhammad Ahmad Ar-Rasyid\n` +
      `🌐 https://najsha97-rgb.github.io/al-masar-pwa/`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        showToast('Kata hikmah berjaya disalin! Sedia untuk dikongsi 💎');
      }).catch(() => {
        fallbackCopyText(textToCopy);
      });
    } else {
      fallbackCopyText(textToCopy);
    }
  }

  function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Kata hikmah berjaya disalin! Sedia untuk dikongsi 💎');
    } catch (err) {
      showToast('Gagal menyalin teks');
    }
    document.body.removeChild(textArea);
  }

  // Initial Boot
  renderSidebar();
  if (state.layer === 'layer3') {
    setLayer('layer3');
  } else {
    setLayer(state.layer);
    navigateTo(0, 0);
  }
});
