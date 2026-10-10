/**
 * Chiraitori Portfolio - Sakura Theme Engine
 * 1. Falling Sakura Petals Animation (HTML5 Canvas + requestAnimationFrame)
 * 2. Live Discord Presence & Spotify (Lanyard WebSocket + REST)
 * 3. Vietnam Clock & Precision Live Age Ticker
 * 4. Pinned GitHub Projects Fetcher
 * 5. Interactive Notes / Posts Reader Modal
 * 6. Day / Night Bloom Theme Switcher
 */

// --- Configuration ---
const DISCORD_USER_ID = '685716988471148552';
const GITHUB_USERNAME = 'chiraitori';
const PINNED_REPOS_API = 'https://gh.chiraitori.dev/api/v1/pinned/chiraitori?raw=true';
const BIRTH_DATE = new Date('2005-10-28T00:00:00+07:00');

// Path to dynamic posts manifest
const POSTS_API = 'data/posts.json';

// ============================================================================
// 1. Initialization
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initVietnamClockAndAge();
  initLanyardPresence();
  initPinnedProjects();
  initWritingFeed();
  initNavScrollSpy();
  
  const yearEl = document.getElementById('current-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// ============================================================================
// 2. Day / Night Bloom Theme Engine
// ============================================================================
function initThemeEngine() {
  const root = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle-btn');
  const savedTheme = localStorage.getItem('chiraitori-theme');

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const willBeDark = !root.classList.contains('dark');
      root.classList.toggle('dark', willBeDark);
      localStorage.setItem('chiraitori-theme', willBeDark ? 'dark' : 'light');
    });
  }
}

// ============================================================================
// 3. Vietnam Clock & Precision Live Age
// ============================================================================
function initVietnamClockAndAge() {
  const timeEl = document.getElementById('live-time');
  const ageEl = document.getElementById('live-age');

  function update() {
    const now = new Date();

    // Vietnam Time (Asia/Ho_Chi_Minh)
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    if (timeEl) timeEl.textContent = `${timeStr} ICT`;

    // Decimal Age
    const ageMs = now.getTime() - BIRTH_DATE.getTime();
    const ageDec = (ageMs / 31536000000).toFixed(8);
    if (ageEl) ageEl.textContent = `${ageDec} yrs`;
  }

  update();
  setInterval(update, 1000);
}

// ============================================================================
// 4. Rich Discord Presence & Telemetry (Lanyard Engine)
// ============================================================================
function initLanyardPresence() {
  const lanyardDot = document.getElementById('lanyard-dot');
  const statusPill = document.getElementById('lanyard-status-pill');
  const customStatusEl = document.getElementById('lanyard-custom-status');
  const heroStatusPill = document.getElementById('hero-status-pill');
  const locationEl = document.getElementById('lanyard-location');
  const loveEl = document.getElementById('lanyard-love');
  const activitiesWrap = document.getElementById('presence-activities');

  let spotifyProgressRaf = null;

  function formatTime(ms) {
    if (!ms || ms < 0) return '0:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function getActivityImageUrl(activity) {
    const image = activity.assets?.large_image || activity.assets?.small_image;
    if (!image || image.startsWith('spotify:')) return null;
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    if (image.startsWith('mp:external/')) return `https://media.discordapp.net/${image.slice(3)}`;
    if (image.startsWith('attachments/')) return `https://cdn.discordapp.com/${image}`;
    if (activity.application_id) {
      return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
    }
    return null;
  }

  function getFallbackInitials(name) {
    if (!name) return '??';
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase())
      .join('');
  }

  function applyPresence(data) {
    if (!data) return;
    const { discord_status, activities, spotify, listening_to_spotify, kv, discord_user } = data;

    // Dynamic Discord Avatar & Avatar Decoration
    const avatarEl = document.getElementById('card-avatar');
    const decorationEl = document.getElementById('card-avatar-decoration');
    if (avatarEl && discord_user?.id && discord_user?.avatar) {
      const ext = discord_user.avatar.startsWith('a_') ? 'gif' : 'webp';
      avatarEl.src = `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.${ext}?size=256`;
    }
    if (decorationEl) {
      if (discord_user?.avatar_decoration_data?.asset) {
        decorationEl.src = `https://cdn.discordapp.com/avatar-decoration-presets/${discord_user.avatar_decoration_data.asset}.png`;
        decorationEl.style.display = 'block';
      } else {
        decorationEl.style.display = 'none';
      }
    }

    // 1. Status Colors, Text & Animation Class
    const statusMeta = {
      online: { color: 'var(--status-online)', text: 'Online' },
      idle: { color: 'var(--status-idle)', text: 'Idle' },
      dnd: { color: 'var(--status-dnd)', text: 'Do Not Disturb' },
      offline: { color: 'var(--status-offline)', text: 'Offline' }
    };

    const currentStatus = statusMeta[discord_status] || statusMeta.offline;

    if (lanyardDot) {
      lanyardDot.style.backgroundColor = currentStatus.color;
      if (discord_status === 'online') {
        lanyardDot.classList.add('online');
      } else {
        lanyardDot.classList.remove('online');
      }
    }
    if (statusPill) {
      statusPill.textContent = currentStatus.text;
      statusPill.style.color = currentStatus.color;
    }

    // 2. Custom Status
    const customActivity = activities?.find(a => a.type === 4);
    const customStatusText = customActivity?.state || (discord_status === 'offline' ? "Offline right now" : "Active on Discord");
    if (customStatusEl) customStatusEl.textContent = customStatusText;

    // 3. Telemetry KV Data
    if (locationEl) locationEl.textContent = kv?.location || 'Ho Chi Minh, Vietnam';

    // 4. Presence Activities
    if (spotifyProgressRaf) {
      cancelAnimationFrame(spotifyProgressRaf);
      spotifyProgressRaf = null;
    }

    if (!activitiesWrap) return;
    activitiesWrap.innerHTML = '';

    // Robust Spotify Detection: check data.spotify OR activities array for Spotify
    let activeSpotify = (listening_to_spotify && spotify) ? spotify : null;
    if (!activeSpotify && activities && activities.length > 0) {
      const spotifyAct = activities.find(a => a.name?.toLowerCase() === 'spotify' || a.type === 2);
      if (spotifyAct) {
        let artUrl = null;
        if (spotifyAct.sync_id) {
          artUrl = `https://i.scdn.co/image/${spotifyAct.assets?.large_image?.replace('spotify:', '')}`;
        }
        activeSpotify = {
          track_id: spotifyAct.sync_id || '',
          song: spotifyAct.details || 'Unknown Track',
          artist: spotifyAct.state || 'Unknown Artist',
          album: spotifyAct.assets?.large_text || 'Album',
          album_art_url: artUrl || getActivityImageUrl(spotifyAct) || '',
          timestamps: spotifyAct.timestamps
        };
      }
    }

    // Spotify Card (Rendered FIRST)
    if (activeSpotify) {
      const spotifyEl = document.createElement('div');
      spotifyEl.className = 'activity-card spotify-kind';
      spotifyEl.innerHTML = `
        <div class="activity-card-art-wrap">
          <img src="${activeSpotify.album_art_url || ''}" alt="${escapeHtml(activeSpotify.album || 'Album Art')}" class="activity-card-art">
        </div>
        <div class="activity-card-body">
          <div class="activity-card-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.6.4-.9.2-2.4-1.5-5.5-1.8-9.1-1-.4.1-.7-.2-.8-.5-.1-.4.2-.7.5-.8 4-.9 7.4-.5 10.1 1.2.3.2.4.6.2.9zm1.2-2.7c-.3.4-.8.5-1.1.3-2.8-1.7-7-2.2-10.2-1.2-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 3.7-1.1 8.4-.6 11.6 1.4.3.1.4.6.2 1zm.1-2.8C14.5 9 8.2 8.8 4.8 9.9c-.5.2-1.1-.1-1.3-.6-.2-.5.1-1.1.6-1.3 4-1.2 10.9-1 14.8 1.4.5.3.6.9.3 1.4-.3.4-.9.6-1.3.1z"/>
            </svg>
            <span>Listening on Spotify</span>
            <span class="spotify-eq">
              <span class="spotify-eq-bar bar-1"></span>
              <span class="spotify-eq-bar bar-2"></span>
              <span class="spotify-eq-bar bar-3"></span>
            </span>
          </div>
          <a href="${activeSpotify.track_id ? `https://open.spotify.com/track/${activeSpotify.track_id}` : 'https://open.spotify.com'}" target="_blank" rel="noopener noreferrer" class="activity-card-title">
            ${escapeHtml(activeSpotify.song || 'Unknown Track')}
          </a>
          <div class="activity-card-sub">by ${escapeHtml(activeSpotify.artist || 'Unknown Artist')}</div>
          ${activeSpotify.timestamps?.start && activeSpotify.timestamps?.end ? `
          <div class="spotify-progress-row">
            <div class="spotify-progress-track">
              <div class="spotify-progress-fill" id="spotify-prog-fill"></div>
            </div>
            <span class="spotify-progress-time" id="spotify-prog-time">0:00 / 0:00</span>
          </div>` : ''}
        </div>
      `;
      activitiesWrap.appendChild(spotifyEl);

      // Start dynamic progress ticker
      if (activeSpotify.timestamps?.start && activeSpotify.timestamps?.end) {
        const fillEl = spotifyEl.querySelector('#spotify-prog-fill');
        const timeEl = spotifyEl.querySelector('#spotify-prog-time');
        const { start, end } = activeSpotify.timestamps;
        const totalDuration = end - start;

        function updateSpotifyProgress() {
          const current = Date.now() - start;
          const ratio = Math.min(Math.max(current / totalDuration, 0), 1);
          if (fillEl) fillEl.style.width = `${(ratio * 100).toFixed(1)}%`;
          if (timeEl) timeEl.textContent = `${formatTime(current)} / ${formatTime(totalDuration)}`;
          if (ratio < 1) {
            spotifyProgressRaf = requestAnimationFrame(updateSpotifyProgress);
          }
        }
        updateSpotifyProgress();
      }
    }

    // Other Rich Activities (VS Code, Games, Crunchyroll, etc.)
    const otherActivities = (activities || []).filter(a => a.type !== 4 && a.name?.toLowerCase() !== 'spotify');
    
    // Pick first non-spotify activity
    if (otherActivities.length > 0) {
      const act = otherActivities[0];
      const isCode = act.name?.toLowerCase().includes('visual studio code') || act.name?.toLowerCase() === 'code';
      const isCrunchyroll = /crunchyroll/i.test(act.name);
      
      let badgeLabel = act.type === 0 ? `Playing ${act.name}` : (act.type === 3 ? `Watching ${act.name}` : act.name);
      if (isCode) badgeLabel = 'Coding in VS Code';
      if (isCrunchyroll) badgeLabel = 'Watching Crunchyroll';

      const title = act.details?.trim() || act.name;
      const subtitle = act.state?.trim() || act.assets?.large_text || '';
      const imgUrl = getActivityImageUrl(act);

      const actEl = document.createElement('div');
      actEl.className = 'activity-card';
      actEl.innerHTML = `
        <div class="activity-card-art-wrap">
          ${imgUrl ? `<img src="${imgUrl}" alt="${escapeHtml(act.name)}" class="activity-card-art">` : `<div class="activity-fallback-badge">${getFallbackInitials(act.name)}</div>`}
        </div>
        <div class="activity-card-body">
          <div class="activity-card-badge">${escapeHtml(badgeLabel)}</div>
          <div class="activity-card-title">${escapeHtml(title)}</div>
          ${subtitle ? `<div class="activity-card-sub">${escapeHtml(subtitle)}</div>` : ''}
        </div>
      `;
      activitiesWrap.appendChild(actEl);
    }
  }

  async function fetchREST() {
    try {
      const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_USER_ID}`);
      const json = await res.json();
      if (json.success) applyPresence(json.data);
    } catch (e) {
      console.warn('Lanyard fallback error:', e);
    }
  }

  try {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    let heartbeat;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.op === 1) {
          heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
          }, msg.d.heartbeat_interval);

          ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: DISCORD_USER_ID }
          }));
        } else if (msg.op === 0) {
          applyPresence(msg.d);
        }
      } catch (err) {
        console.error('Lanyard ws parse error:', err);
      }
    };

    ws.onerror = () => fetchREST();
    ws.onclose = () => {
      clearInterval(heartbeat);
      fetchREST();
    };
  } catch {
    fetchREST();
  }
}

// ============================================================================
// 6. Pinned Repositories from GitHub
// ============================================================================
async function initPinnedProjects() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  try {
    const res = await fetch(PINNED_REPOS_API);
    if (!res.ok) throw new Error('API failed');
    const projects = await res.json();

    if (!Array.isArray(projects) || projects.length === 0) throw new Error('Empty');

    // Show only the top 4 featured repositories
    const topProjects = projects.slice(0, 4);

    grid.innerHTML = topProjects.map(p => `
      <a href="${p.link}" target="_blank" rel="noreferrer" class="project-card card">
        <div class="project-header">
          <div class="project-name">
            ${escapeHtml(p.repo)}
          </div>
          <svg class="project-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </div>
        <p class="project-desc">${escapeHtml(p.description || 'No description provided.')}</p>
        <div class="project-footer">
          <span class="project-lang">
            <span class="lang-dot" style="background-color: ${p.languageColor || 'var(--primary)'}"></span>
            ${escapeHtml(p.language || 'Code')}
          </span>
          <div class="project-metrics">
            <span class="metric-item">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ${p.stars || 0}
            </span>
            <span class="metric-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v12m12-6v-3a3 3 0 0 0-3-3H9"/></svg>
              ${p.forks || 0}
            </span>
          </div>
        </div>
      </a>
    `).join('');
  } catch (e) {
    console.warn('Projects API error:', e);
    grid.innerHTML = `
      <div class="card" style="grid-column: 1/-1; text-align: center; padding: 2rem;">
        <p style="color: var(--ink-muted); margin-bottom: 1rem;">View all open source repositories directly on GitHub.</p>
        <a href="https://github.com/${GITHUB_USERNAME}" target="_blank" rel="noreferrer" class="btn btn-primary" style="display:inline-flex;">
          Visit GitHub Profile
        </a>
      </div>
    `;
  }
}

// ============================================================================
// 7. Dynamic Writing Feed & Markdown Modal
// ============================================================================
async function initWritingFeed() {
  const feed = document.getElementById('writing-feed');
  const modal = document.getElementById('article-modal');
  const closeBtn = document.getElementById('modal-close-btn');
  const searchInput = document.getElementById('post-search-input');
  const tagsWrap = document.getElementById('filter-tags-wrap');
  const resultsBadge = document.getElementById('results-count-badge');

  if (!feed) return;

  const markdownCache = new Map();
  let allPosts = [];
  let currentTag = 'All';
  let searchTerm = '';

  function renderPosts() {
    const query = searchTerm.trim().toLowerCase();
    const filtered = allPosts.filter(post => {
      const matchesSearch = !query || [post.title, post.description, ...(post.tags || [])].some(v => v.toLowerCase().includes(query));
      const matchesTag = currentTag === 'All' || (post.tags && post.tags.includes(currentTag));
      return matchesSearch && matchesTag;
    });

    if (resultsBadge) resultsBadge.textContent = filtered.length;

    if (filtered.length === 0) {
      feed.innerHTML = `
        <div class="card" style="text-align: center; padding: 2rem; color: var(--ink-muted);">
          <p>No posts match your filters.</p>
          <button type="button" class="btn btn-secondary" id="clear-filters-btn" style="margin-top: 0.75rem; font-size: 0.85rem;">Clear filters</button>
        </div>
      `;
      const clearBtn = document.getElementById('clear-filters-btn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchTerm = '';
          currentTag = 'All';
          if (searchInput) searchInput.value = '';
          updateTagButtons();
          renderPosts();
        });
      }
      return;
    }

    feed.innerHTML = filtered.map(post => `
      <article class="post-card card" data-id="${post.id}">
        <div class="post-main">
          <div class="post-meta">
            <span>${post.date}</span>
            <span>•</span>
            <span>${post.readTime}</span>
          </div>
          <h3 class="post-title">${escapeHtml(post.title)}</h3>
          <p class="post-desc">${escapeHtml(post.description)}</p>
        </div>
        <div class="post-arrow-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </article>
    `).join('');

    feed.querySelectorAll('.post-card').forEach(card => {
      card.addEventListener('click', async () => {
        const id = card.getAttribute('data-id');
        const post = allPosts.find(p => p.id === id);
        if (!post || !modal) return;

        document.getElementById('modal-date').textContent = post.date;
        document.getElementById('modal-read-time').textContent = post.readTime;
        document.getElementById('modal-title').textContent = post.title;
        document.getElementById('modal-tags').innerHTML = (post.tags || []).map(t => `<span class="skill-pill">${escapeHtml(t)}</span>`).join('');
        
        const bodyEl = document.getElementById('modal-body');
        bodyEl.innerHTML = '<p style="color: var(--ink-muted);">Loading article...</p>';
        modal.showModal();

        try {
          let rawMd = markdownCache.get(post.file);
          if (!rawMd) {
            const res = await fetch(post.file);
            rawMd = await res.text();
            markdownCache.set(post.file, rawMd);
          }
          bodyEl.innerHTML = renderMarkdown(rawMd);
        } catch (err) {
          bodyEl.innerHTML = '<p style="color: var(--primary);">Failed to load post content.</p>';
        }
      });
    });
  }

  function updateTagButtons() {
    if (!tagsWrap) return;
    const buttons = tagsWrap.querySelectorAll('.filter-tag-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tag') === currentTag);
    });
  }

  try {
    const res = await fetch(POSTS_API);
    allPosts = await res.json();

    if (tagsWrap) {
      const tags = ['All', ...new Set(allPosts.flatMap(p => p.tags || []))];
      tagsWrap.innerHTML = tags.map(tag => `
        <button type="button" class="filter-tag-btn ${tag === currentTag ? 'active' : ''}" data-tag="${escapeHtml(tag)}">
          ${escapeHtml(tag)}
        </button>
      `).join('');

      tagsWrap.querySelectorAll('.filter-tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          currentTag = btn.getAttribute('data-tag');
          updateTagButtons();
          renderPosts();
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderPosts();
      });
    }

    renderPosts();
  } catch (err) {
    console.warn('Failed to load posts manifest:', err);
    feed.innerHTML = '<p style="color: var(--ink-muted);">Unable to load articles.</p>';
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  }
}

// Markdown Parser Helper
function renderMarkdown(md) {
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(md).replace(/<img /g, '<img referrerpolicy="no-referrer" loading="lazy" ');
  }
  return escapeHtml(md).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
}

// ============================================================================
// 8. Navigation & ScrollSpy
// ============================================================================
function initNavScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const desktopLinks = document.querySelectorAll('.nav-link');
  const dockLinks = document.querySelectorAll('.dock-item');
  const backToTopBtn = document.getElementById('back-to-top-btn');

  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function onScroll() {
    const scrollY = window.pageYOffset;

    sections.forEach(sec => {
      const top = sec.offsetTop - 120;
      const height = sec.offsetHeight;
      const id = sec.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        desktopLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
        dockLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
}

// Security Helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
