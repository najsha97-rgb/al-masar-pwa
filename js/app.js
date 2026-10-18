/**
 * AL-MASAR PWA - CORE LOGIC
 * Fiqh Perancangan Dakwah - Syeikh Muhammad Ahmad Ar-Rasyid
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Data Initialization
  const data = window.ALMASAR_DATA || null;
  const allHikmahQuotes = window.ALMASAR_QUOTES || [];
  if (!data) {
    console.error('Data Al-Masar tidak dijumpai!');
    return;
  }

  // Update dynamic counters
  const promoSubEl = document.querySelector('.hikmah-promo-sub');
  if (promoSubEl && allHikmahQuotes.length > 0) {
    promoSubEl.textContent = allHikmahQuotes.length + " Kata Tokoh & Hadis Pejuang";
  }


  // App State
  const state = {
    currentChapter: 0,
    currentSubtopic: 0,
    layer: localStorage.getItem('almasar_layer') || 'layer1', // 'layer1' = Lengkap, 'layer2' = Ringkasan, 'layer3' = Mutiara Hikmah
    theme: localStorage.getItem('almasar_theme') || 'dark',
    fontSize: parseFloat(localStorage.getItem('almasar_fontsize') || '1.05'),
    bookmarks: JSON.parse(localStorage.getItem('almasar_bookmarks') || '[]'),
    mobileNavOpen: false
  };

  // DOM Elements
  const chapterNavList = document.getElementById('chapterNavList');
  const readerArea = document.getElementById('readerArea');
  const heroCard = document.getElementById('heroCard');
  const readerContainer = document.getElementById('readerContainer');
  
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
      .then(reg => console.log('Service Worker Registered:', reg.scope))
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
  function navigateTo(chIdx, sIdx) {
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
      modeBadge.textContent = `Koleksi ${allHikmahQuotes.length} Mutiara Hikmah (Nukilan Tokoh Salaf, Hadis & Taujih Ar-Rasyid)`;

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
    modeBadge.textContent = state.layer === 'layer1' 
      ? 'Versi Lengkap (Terjemahan Penuh)' 
      : 'Ringkasan Eksklusif (Layer 2)';

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
            p.textContent = cleanText;
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
  }

  function formatQuoteText(text) {
    // Highlight potential names (dengan ejaan standard kemas kini)
    const names = ['Imam Hasan al-Banna', 'Hasan al-Banna', 'Sayyid Qutb', 'Umar bin al-Khattab', 'Abu al-Dardak', 'Abu ad-Darda\'', 'Ibn al-Qayyim', 'Ibnu Taimiyah', 'Ibn Taimiyah', 'Imam Ahmad', 'Yahya bin Mu\'az', 'Abdullah bin Wahab', 'al-Ma’mun', 'Rasulullah saw', 'Rasulullah SAW', 'Nabi saw', 'Iqbal', 'Muhammad Iqbal', 'Hasan al-Hudhaibi'];
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

  function performSearch(query) {
    const results = [];

    data.chapters.forEach((ch, chIdx) => {
      ch.subtopics.forEach((sub, sIdx) => {
        // Search in title
        if (sub.title.toLowerCase().includes(query)) {
          results.push({
            chIdx,
            sIdx,
            title: `${ch.number}: ${sub.title}`,
            snippet: `Tajuk sepadan: ${sub.title}`,
            chTitle: ch.title
          });
          return;
        }

        // Search in paragraphs
        if (sub.paragraphs) {
          for (let p of sub.paragraphs) {
            if (p.toLowerCase().includes(query)) {
              const startIdx = Math.max(0, p.toLowerCase().indexOf(query) - 40);
              const snippet = p.substring(startIdx, startIdx + 140);
              results.push({
                chIdx,
                sIdx,
                title: `${ch.number}: ${sub.title}`,
                snippet: highlightText(snippet, query),
                chTitle: ch.title
              });
              break;
            }
          }
        }
      });
    });

    renderSearchResults(results, query);
  }

  function highlightText(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
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
      results.forEach(res => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
          <div class="search-result-title">${res.title}</div>
          <div class="search-result-snippet">...${res.snippet}...</div>
        `;
        item.addEventListener('click', () => {
          searchOverlay.classList.remove('open');
          searchInput.value = '';
          navigateTo(res.chIdx, res.sIdx);
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
    const textToCopy = `💎 MUTIARA HIKMAH DAKWAH\n` +
      `👤 ${item.speaker}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      `"${item.quote}"\n\n` +
      `📚 Sumber: ${item.chapterNumber} — ${item.chapterTitle}\n` +
      `📑 Topik: ${item.subtopicTitle}\n` +
      `🌟 Kitab Al-Masar — Syeikh Muhammad Ahmad Ar-Rasyid\n` +
      `🌐 https://al-masar-dakwah.netlify.app/`;

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
