/**
 * AL-MASAR PWA - CORE LOGIC
 * Fiqh Perancangan Dakwah - Syeikh Muhammad Ahmad Ar-Rasyid
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Data Initialization
  const data = window.ALMASAR_DATA || null;
  if (!data) {
    console.error('Data Al-Masar tidak dijumpai!');
    return;
  }

  // App State
  const state = {
    currentChapter: 0,
    currentSubtopic: 0,
    layer: localStorage.getItem('almasar_layer') || 'layer1', // 'layer1' = Lengkap, 'layer2' = Ringkasan
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
  }

  // 5. Navigate to Chapter and Subtopic
  function navigateTo(chIdx, sIdx) {
    state.currentChapter = chIdx;
    state.currentSubtopic = sIdx;

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
          const p = document.createElement('p');
          
          // Check if contains Arabic
          const hasArabic = /[\u0600-\u06FF]/.test(para);
          if (hasArabic && para.length < 250) {
            p.className = 'arabic-text';
            p.textContent = para;
          } else if (para.startsWith('“') || para.startsWith('"') || para.includes('berkata:') || para.includes('pesan:')) {
            p.className = 'quote-highlight-box';
            p.innerHTML = formatQuoteText(para);
          } else {
            p.textContent = para;
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

    // Update Bottom Navigation buttons
    updateBottomNav();
  }

  function formatQuoteText(text) {
    // Highlight potential names
    const names = ['Imam Hasan al-Banna', 'Sayyid Qutb', 'Umar bin al-Khattab', 'Abu al-Dardak', 'Ibn al-Qayyim', 'Imam Ahmad', 'Yahya bin Mu’az', 'Abdullah bin Wahab', 'al-Ma’mun', 'Rasulullah saw', 'Nabi saw', 'Iqbal'];
    let formatted = text;
    names.forEach(name => {
      const regex = new RegExp(`(${name})`, 'gi');
      formatted = formatted.replace(regex, '<span class="tokoh-name">$1</span>');
    });
    return formatted;
  }

  // 7. Bottom Navigation (Prev / Next)
  function updateBottomNav() {
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
    if (state.currentSubtopic > 0) {
      navigateTo(state.currentChapter, state.currentSubtopic - 1);
    } else if (state.currentChapter > 0) {
      const prevChIdx = state.currentChapter - 1;
      const lastSubIdx = data.chapters[prevChIdx].subtopics.length - 1;
      navigateTo(prevChIdx, lastSubIdx);
    }
  });

  nextSubBtn.addEventListener('click', () => {
    const ch = data.chapters[state.currentChapter];
    if (state.currentSubtopic < ch.subtopics.length - 1) {
      navigateTo(state.currentChapter, state.currentSubtopic + 1);
    } else if (state.currentChapter < data.chapters.length - 1) {
      navigateTo(state.currentChapter + 1, 0);
    }
  });

  // 8. Layer Switching
  function setLayer(layerName) {
    state.layer = layerName;
    localStorage.setItem('almasar_layer', layerName);

    layerBtnLengkap.classList.toggle('active', layerName === 'layer1');
    layerBtnRingkasan.classList.toggle('active', layerName === 'layer2');

    renderContent();
    showToast(layerName === 'layer1' ? 'Mod Paparan: Versi Penuh' : 'Mod Paparan: Ringkasan Eksklusif');
  }

  layerBtnLengkap.addEventListener('click', () => setLayer('layer1'));
  layerBtnRingkasan.addEventListener('click', () => setLayer('layer2'));

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
    const ch = data.chapters[state.currentChapter];
    const sub = ch.subtopics[state.currentSubtopic];
    const textToCopy = `Al-Masar (${ch.title} - ${sub.title}):\n\n` + 
      (sub.paragraphs ? sub.paragraphs.slice(0, 2).join('\n\n') : sub.summary);

    navigator.clipboard.writeText(textToCopy)
      .then(() => showToast('Petikan berjaya disalin ke papan klip!'))
      .catch(() => showToast('Gagal menyalin petikan.'));
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

  // Initial Boot
  setLayer(state.layer);
  renderSidebar();
  navigateTo(0, 0);
});
