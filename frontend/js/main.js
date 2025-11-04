function getApiBase() {
  const saved = localStorage.getItem('API_BASE');
  if (saved && /^https?:\/\//.test(saved)) return saved.replace(/\/$/, '');
  
  try {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If running locally (any localhost/127.0.0.1 port, or file://), use local backend
    // IMPORTANT: Use the same hostname as the frontend to avoid cookie issues
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || protocol === 'file:') {
      // Use the same hostname as the frontend for cookie sharing
      const backendHost = hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
      console.log(`Local development detected, using local backend at http://${backendHost}:4000`);
      return `http://${backendHost}:4000/api`;
    }
    
    // Otherwise use production backend
    console.log('Production detected, using deployed backend');
    return 'https://prototype-tkd-backend.onrender.com/api';
  } catch (e) {
    // Default to localhost for local development
    console.log('Error detecting environment, defaulting to local backend');
    return 'http://localhost:4000/api';
  }
}
const API_BASE = getApiBase();

// Toast Notification System
function createToastContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = 'success', duration = 4000) {
  const container = createToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icons based on type
  const icons = {
    success: '<i class="fas fa-check"></i>',
    error: '<i class="fas fa-times"></i>',
    warning: '<i class="fas fa-exclamation-triangle"></i>',
    info: '<i class="fas fa-info-circle"></i>'
  };
  
  const icon = icons[type] || icons.success;
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
    <button class="toast-close" aria-label="Close">&times;</button>
    <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    hideToast(toast);
  });
  
  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => {
      hideToast(toast);
    }, duration);
  }
  
  return toast;
}

function hideToast(toast) {
  toast.classList.add('hiding');
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

// Convenience functions
function showSuccess(message, duration = 4000) {
  return showToast(message, 'success', duration);
}

function showError(message, duration = 5000) {
  return showToast(message, 'error', duration);
}

function showWarning(message, duration = 4000) {
  return showToast(message, 'warning', duration);
}

function showInfo(message, duration = 4000) {
  return showToast(message, 'info', duration);
}

// Get Socket.io server URL
function getSocketUrl() {
  try {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || protocol === 'file:') {
      const backendHost = hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost';
      return `http://${backendHost}:4000`;
    }
    
    return 'https://prototype-tkd-backend.onrender.com';
  } catch (e) {
    return 'http://localhost:4000';
  }
}

// Initialize Socket.io connection
let socket = null;
let socketConnected = false;

// Global variables for user role and team (accessible to Socket.io handlers)
let currentUserRole = null;
let currentUserTeam = null;
let currentTeamFilter = 'all';

function initSocket() {
  if (typeof io === 'undefined') {
    console.warn('Socket.io library not loaded');
    return;
  }

  const socketUrl = getSocketUrl();
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true
  });

  socket.on('connect', () => {
    console.log('Socket.io connected:', socket.id);
    socketConnected = true;
  });

  socket.on('disconnect', () => {
    console.log('Socket.io disconnected');
    socketConnected = false;
  });

  socket.on('connect_error', (error) => {
    console.error('Socket.io connection error:', error);
  });

  // Player events
  socket.on('player:created', (player) => {
    console.log('Real-time: Player created', player);
    handlePlayerCreated(player);
  });

  socket.on('player:updated', (player) => {
    console.log('Real-time: Player updated', player);
    handlePlayerUpdated(player);
  });

  socket.on('player:deleted', (data) => {
    console.log('Real-time: Player deleted', data);
    handlePlayerDeleted(data.id);
  });

  // Account events
  socket.on('account:created', (account) => {
    console.log('Real-time: Account created', account);
    handleAccountCreated(account);
  });

  socket.on('account:updated', (account) => {
    console.log('Real-time: Account updated', account);
    handleAccountUpdated(account);
  });

  socket.on('account:deleted', (data) => {
    console.log('Real-time: Account deleted', data);
    handleAccountDeleted(data.id, data.role);
  });
}

// Real-time player handlers
function handlePlayerCreated(player) {
  console.log('[Real-time Create] Player created:', player);
  const playerTeam = (player.team || '').trim();
  const userTeam = (currentUserTeam || '').trim();
  
  // Check if user can see this player (role-based filtering)
  if (currentUserRole === 'assistant' && currentUserTeam) {
    if (playerTeam.toUpperCase() !== userTeam.toUpperCase()) {
      // Assistant Coach can't see players from other teams
      console.log('[Real-time Create] Player from different team, skipping');
      return;
    }
  }

  // Check current filter
  const teamFilter = currentTeamFilter || 'all';
  const shouldShow = teamFilter === 'all' || playerTeam.toUpperCase() === teamFilter.toUpperCase();
  if (!shouldShow) {
    console.log('[Real-time Create] Player doesn\'t match filter, skipping');
    return;
  }

  const tbody = document.querySelector('#playerTable tbody');
  if (!tbody) {
    console.log('[Real-time Create] Table body not found');
    return;
  }

  // Check if player already exists
  const existingRow = tbody.querySelector(`tr[data-id="${player._id}"]`);
  if (existingRow) {
    console.log('[Real-time Create] Player already exists, skipping');
    return;
  }

  // Check search filter
  const searchTerm = document.getElementById('playerSearch')?.value.toLowerCase() || '';
  const playerName = (player.name || '').toLowerCase();
  if (searchTerm && !playerName.includes(searchTerm)) {
    console.log('[Real-time Create] Player doesn\'t match search, skipping');
    return;
  }

  // Create and add row
  const tr = document.createElement('tr');
  tr.setAttribute('data-id', player._id);
  tr.setAttribute('data-team', playerTeam);
  tr.setAttribute('data-gender', player.gender || '');
  tr.innerHTML = `
    <td>${player.nccRef || '-'}</td>
    <td>${player.name || '-'}</td>
    <td>${playerTeam || '-'}</td>
    <td>${player.beltRank || '-'}</td>
    <td>${player.birthdate ? player.birthdate.slice(0,10) : '-'}</td>
    <td>
      <button class="btn btn-edit" data-id="${player._id}" title="Edit Player">
        <i class="fas fa-edit"></i>
      </button>
      <button class="btn btn-delete" data-id="${player._id}" title="Delete Player">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  tr.addEventListener('click', () => {
    if (typeof showDetails === 'function') {
      showDetails(player);
    }
  });
  
  tbody.appendChild(tr);
  if (typeof attachEditDeleteListeners === 'function') {
    attachEditDeleteListeners();
  }
  updateKpis();
  console.log('[Real-time Create] Player row added successfully');
}

function handlePlayerUpdated(player) {
  console.log('[Real-time Update] Player updated:', player);
  console.log('[Real-time Update] Current user role:', currentUserRole);
  console.log('[Real-time Update] Current user team:', currentUserTeam);
  
  const row = document.querySelector(`#playerTable tbody tr[data-id="${player._id}"]`);
  const playerTeam = (player.team || '').trim();
  const userTeam = (currentUserTeam || '').trim();
  
  // Check if user can see this player (for Assistant Coach)
  if (currentUserRole === 'assistant' && currentUserTeam) {
    // Normalize team names for comparison
    if (playerTeam.toUpperCase() !== userTeam.toUpperCase()) {
      // Player moved to different team, remove from view if it exists
      console.log('[Real-time Update] Player moved to different team, removing from Assistant Coach view');
      if (row) {
        row.remove();
        updateKpis();
      }
      // Also hide the details card if it's open for this player
      const detailModal = document.querySelector('.player-detail-modal');
      if (detailModal && detailModal.style.display !== 'none') {
        const detailPlayerId = detailModal.getAttribute('data-player-id');
        if (detailPlayerId === player._id.toString()) {
          detailModal.style.display = 'none';
        }
      }
      return;
    }
  }

  // Check if player matches current filter
  const teamFilter = currentTeamFilter || 'all';
  const shouldShow = teamFilter === 'all' || playerTeam.toUpperCase() === teamFilter.toUpperCase();
  const searchTerm = document.getElementById('playerSearch')?.value.toLowerCase() || '';
  const playerName = (player.name || '').toLowerCase();
  const matchesSearch = !searchTerm || playerName.includes(searchTerm);

  console.log('[Real-time Update] Should show:', shouldShow, 'Matches search:', matchesSearch);

  if (shouldShow && matchesSearch) {
    // Update existing row or create new one
    if (row) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-id', player._id);
      tr.setAttribute('data-team', playerTeam);
      tr.setAttribute('data-gender', player.gender || '');
      tr.innerHTML = `
        <td>${player.nccRef || '-'}</td>
        <td>${player.name || '-'}</td>
        <td>${playerTeam || '-'}</td>
        <td>${player.beltRank || '-'}</td>
        <td>${player.birthdate ? player.birthdate.slice(0,10) : '-'}</td>
        <td>
          <button class="btn btn-edit" data-id="${player._id}" title="Edit Player">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-delete" data-id="${player._id}" title="Delete Player">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tr.addEventListener('click', () => {
        if (typeof showDetails === 'function') {
          showDetails(player);
        }
      });
      row.replaceWith(tr);
      if (typeof attachEditDeleteListeners === 'function') {
        attachEditDeleteListeners();
      }
      console.log('[Real-time Update] Updated existing row');
    } else {
      // Row doesn't exist but should be shown - create it
      console.log('[Real-time Update] Creating new row');
      handlePlayerCreated(player);
    }
  } else {
    // Player no longer matches filter, remove it
    if (row) {
      console.log('[Real-time Update] Removing row - no longer matches filter');
      row.remove();
    }
  }

  updateKpis();
}

function handlePlayerDeleted(playerId) {
  const row = document.querySelector(`#playerTable tbody tr[data-id="${playerId}"]`);
  if (row) {
    row.remove();
    updateKpis();
  }
}

// Real-time account handlers
function handleAccountCreated(account) {
  // Only update if we're on the accounts section and user is admin
  const accountsSection = document.getElementById('sec-accounts');
  if (!accountsSection || !accountsSection.classList.contains('visible')) {
    return;
  }

  if (currentUserRole !== 'admin') {
    return;
  }

  // Reload accounts table
  if (typeof loadAccounts === 'function') {
    loadAccounts();
  }
}

function handleAccountUpdated(account) {
  // Only update if we're on the accounts section and user is admin
  const accountsSection = document.getElementById('sec-accounts');
  if (!accountsSection || !accountsSection.classList.contains('visible')) {
    return;
  }

  if (currentUserRole !== 'admin') {
    return;
  }

  // Reload accounts table
  if (typeof loadAccounts === 'function') {
    loadAccounts();
  }
}

function handleAccountDeleted(accountId, role) {
  // Only update if we're on the accounts section and user is admin
  const accountsSection = document.getElementById('sec-accounts');
  if (!accountsSection || !accountsSection.classList.contains('visible')) {
    return;
  }

  if (currentUserRole !== 'admin') {
    return;
  }

  // Remove row directly
  const row = document.querySelector(`#accountsTableBody tr[data-id="${accountId}"][data-role="${role}"]`);
  if (row) {
    row.remove();
  }
}


const originalFetch = window.fetch;
window.fetch = function(url, options) {
  
  if (typeof url === 'string' && url.includes('/auth/login1')) {
    url = url.replace('/auth/login1', '/auth/login');
  }
  return originalFetch(url, options);
};

document.addEventListener('DOMContentLoaded', () => {
  // Reusable "Check Stats" modal open/close
  const statsModal = document.getElementById('statsModal');
  const closeStatsModalBtn = document.getElementById('closeStatsModal');
  const openStatsBtns = document.querySelectorAll('.js-open-stats');
  const loginModal = document.getElementById('loginModal');
  const closeLoginModalBtn = document.getElementById('closeLoginModal');
  const openLoginBtns = document.querySelectorAll('.js-open-login');
  function openStatsModal(e) {
    if (e) e.preventDefault();
    // Close login modal if it's open
    if (loginModal && !loginModal.classList.contains('hidden')) {
      loginModal.classList.add('hidden');
    }
    if (statsModal) statsModal.classList.remove('hidden');
  }
  function closeStatsModal() {
    if (statsModal) statsModal.classList.add('hidden');
  }
  if (openStatsBtns && openStatsBtns.length) {
    openStatsBtns.forEach(btn => btn.addEventListener('click', openStatsModal));
  }
  if (closeStatsModalBtn) closeStatsModalBtn.addEventListener('click', closeStatsModal);
  if (statsModal) {
    statsModal.addEventListener('click', (e) => {
      if (e.target === statsModal) closeStatsModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !statsModal.classList.contains('hidden')) closeStatsModal();
    });
  }

  function openLoginModalFn(e) {
    if (e) e.preventDefault();
    // Close stats modal if it's open
    if (statsModal && !statsModal.classList.contains('hidden')) {
      statsModal.classList.add('hidden');
    }
    if (loginModal) loginModal.classList.remove('hidden');
  }
  function closeLoginModalFn() {
    if (loginModal) loginModal.classList.add('hidden');
  }
  if (openLoginBtns && openLoginBtns.length) {
    openLoginBtns.forEach(btn => btn.addEventListener('click', openLoginModalFn));
  }
  if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', closeLoginModalFn);
  if (loginModal) {
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) closeLoginModalFn();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !loginModal.classList.contains('hidden')) closeLoginModalFn();
    });
  }

  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    // Password toggle
    const pwdInput = document.getElementById('loginPassword');
    const togglePwd = loginForm.querySelector('.toggle-password');
    if (togglePwd && pwdInput) {
      togglePwd.addEventListener('click', () => {
        const isPwd = pwdInput.getAttribute('type') === 'password';
        pwdInput.setAttribute('type', isPwd ? 'text' : 'password');
        const icon = togglePwd.querySelector('i');
        if (icon) {
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
        }
      });
    }

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData.entries());
      
      console.log('Login attempt:', data);
      
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.classList.add('btn-loading');
        submitBtn.setAttribute('disabled', 'true');
      }
      let res, result;
      try {
        // Use the deployed backend URL
        const loginUrl = `${API_BASE}/auth/login`;
        res = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include'
        });
        result = await res.json();
        console.log('Login response:', { status: res.status, result });
      } catch (networkErr) {
        console.error('Login network error:', networkErr);
        result = { message: 'Network error. Please try again.' };
        res = { ok: false };
      }
      if (res.ok) {
        // All authenticated users (admin, coach, assistant) - close modal and navigate
        console.log('Login successful for role:', result.role);
        
        // Close login modal
        if (loginModal) {
          loginModal.classList.add('hidden');
        }
        
        // Clear any error messages
        const errEl = document.getElementById('loginError');
        if (errEl) {
          errEl.textContent = '';
          errEl.classList.remove('shake');
        }
        
        // Reset form
        if (loginForm) {
          loginForm.reset();
        }
        
        // If on index page, navigate to dashboard
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
          window.location.href = 'dashboard.html';
        } else {
          // If already on dashboard, reload to refresh authentication state
          window.location.reload();
        }
      } else {
        const errEl = document.getElementById('loginError');
        if (errEl) {
          errEl.textContent = result.message || 'Invalid Credentials';
          errEl.classList.remove('shake');
          // Trigger reflow for restarting animation
          void errEl.offsetWidth;
          errEl.classList.add('shake');
        }
      }
      if (submitBtn) {
        submitBtn.classList.remove('btn-loading');
        submitBtn.removeAttribute('disabled');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.href = 'index.html';
    });
  }

  // Check My Stats
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nccRef = searchForm.nccRef.value;
      const res = await fetch(`${API_BASE}/player/search?nccRef=${encodeURIComponent(nccRef)}`);
      const result = await res.json();
      const searchResult = document.getElementById('searchResult');
      if (res.ok) {
        // Link to player profile page
        searchResult.innerHTML = `<a href="player-profile.html?nccRef=${result.nccRef}">View Profile: ${result.name}</a>`;
      } else {
        searchResult.textContent = result.message || 'Record not found';
      }
    });
  }

  // Player Profile (public) - Enhanced Modern Version
  if (window.location.pathname.endsWith('player-profile.html')) {
    const params = new URLSearchParams(window.location.search);
    const nccRef = params.get('nccRef');
    const loadingScreen = document.getElementById('loadingScreen');
    const errorMessage = document.getElementById('errorMessage');
    
    // Show loading screen
    if (loadingScreen) {
      loadingScreen.classList.remove('hidden');
    }
    
    if (nccRef) {
      fetch(`${API_BASE}/player/search?nccRef=${encodeURIComponent(nccRef)}`)
        .then(res => res.json())
        .then(player => {
          // Hide loading screen
          if (loadingScreen) {
            loadingScreen.classList.add('hidden');
          }
          
          if (player && player.nccRef) {
            loadPlayerProfile(player);
            // Hide error message if it was showing
            if (errorMessage) {
              errorMessage.classList.add('hidden');
            }
          } else {
            showErrorMessage();
          }
        })
        .catch(error => {
          console.error('Error loading player profile:', error);
          if (loadingScreen) {
            loadingScreen.classList.add('hidden');
          }
          showErrorMessage();
        });
    } else {
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
      }
      showErrorMessage();
    }
    
    function loadPlayerProfile(player) {
      // Set dynamic background based on team
      const heroBackground = document.querySelector('.hero-background');
      const profileHero = document.querySelector('.profile-hero');
      if (heroBackground && player.team) {
        // Map team names to background images
        const teamImages = {
          'EARIST': '../public/EARIST.jpg',
          'ERVHS': '../public/ERVHS.jpg',
          'ARISE': '../public/1bg_arise.png',
          'TONDO': '../public/TONDO.png',
          'RECTO': '../public/RECTO.jpg'
        };
        
        const teamName = (player.team || '').toUpperCase().trim();
        const backgroundImage = teamImages[teamName] || teamImages['ARISE']; // Default to ARISE
        
        // Set background image with overlay
        heroBackground.style.backgroundImage = `linear-gradient(rgba(10,10,20,0.7), rgba(10,10,20,0.7)), url('${backgroundImage}')`;
        heroBackground.style.backgroundSize = 'cover';
        heroBackground.style.backgroundPosition = 'center center';
        heroBackground.style.backgroundRepeat = 'no-repeat';
        
        // Also update profile-hero background for consistency
        if (profileHero) {
          profileHero.style.backgroundImage = `linear-gradient(rgba(156, 51, 40, 0.6), rgba(156, 51, 40, 0.6)), url('${backgroundImage}')`;
          profileHero.style.backgroundSize = 'cover';
          profileHero.style.backgroundPosition = 'center center';
          profileHero.style.backgroundRepeat = 'no-repeat';
        }
      }
      
      // Hero Section
            document.getElementById('profileName').textContent = player.name;
            document.getElementById('profileNccRef').textContent = player.nccRef;
            document.getElementById('profileGender').textContent = player.gender || '-';
      
      // Set team meta-item
      const profileTeamEl = document.getElementById('profileTeam');
      if (profileTeamEl) {
        profileTeamEl.textContent = player.team ? `Team: ${player.team}` : '-';
      }
      
      // Calculate age
      if (player.birthdate) {
        const age = calculateAge(new Date(player.birthdate));
        document.getElementById('profileAge').textContent = `${age} years old`;
      }
      
      // Set avatar badge with belt rank
      const beltBadge = document.getElementById('beltBadge');
      if (beltBadge) {
        beltBadge.textContent = player.beltRank || '-';
      }
      
      // Handle profile image
      const profileAvatar = document.getElementById('profileAvatar');
      if (profileAvatar) {
        if (player.photoUrl && player.photoUrl.trim()) {
          // If player has a photo URL, display the image
          profileAvatar.innerHTML = `<img src="${player.photoUrl}" alt="${player.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
        } else {
          // If no photo, show default icon
          profileAvatar.innerHTML = '<i class="fas fa-user"></i>';
        }
      }
      
      // Personal Information Card
      document.getElementById('profileFullName').textContent = player.name;
      document.getElementById('profileBirthdate').textContent = player.birthdate ? 
        new Date(player.birthdate).toLocaleDateString() : '-';
      document.getElementById('profileAddress').textContent = player.address || '-';
      document.getElementById('profileContact').textContent = player.contactNumber || '-';
      
      // Belt & Training Card
      document.getElementById('currentBeltRank').textContent = player.beltRank || '-';
      document.getElementById('nextBeltRank').textContent = player.nextBelt || '-';
      document.getElementById('lastPromotionExam').textContent = player.lastPromotionExam ? 
        new Date(player.lastPromotionExam).toLocaleDateString() : '-';
      
      // Animate belt progress (mock progress for demo)
      setTimeout(() => {
        const progressFill = document.getElementById('beltProgress');
        if (progressFill) {
          progressFill.style.width = '65%'; // Mock progress
        }
      }, 1000);
      
      // Competition Statistics Card
      const medals = player.stats?.medals || 0;
      const competitions = player.stats?.competitions || [];
      
      document.getElementById('statMedals').textContent = medals;
      document.getElementById('statCompetitions').textContent = competitions.length;
      
      // Load competitions list
      const competitionsList = document.getElementById('competitionsList');
      if (competitionsList && competitions.length > 0) {
        competitionsList.innerHTML = competitions.map(comp => 
          `<span class="competition-tag">${comp}</span>`
        ).join('');
      } else {
        competitionsList.innerHTML = '<span class="competition-tag">No competitions yet</span>';
      }
      
      // Achievements Card
      const achievementsList = document.getElementById('achievementsList');
      if (achievementsList) {
        const achievements = player.achievements || [];
        if (achievements.length > 0) {
          achievementsList.innerHTML = achievements.map(achievement => `
            <div class="achievement-item">
              <div class="achievement-icon">
                <i class="fas fa-trophy"></i>
              </div>
              <div class="achievement-text">${achievement}</div>
            </div>
          `).join('');
        } else {
          achievementsList.innerHTML = `
            <div class="achievement-item">
              <div class="achievement-icon">
                <i class="fas fa-star"></i>
              </div>
              <div class="achievement-text">Keep training to earn achievements!</div>
            </div>
          `;
        }
      }
      
      // Self-Defense Card
      const selfDefenseForms = document.getElementById('selfDefenseForms');
      if (selfDefenseForms) {
        // Get requiredForms from the direct field on the player
        const requiredForms = player.requiredForms || '';
        if (requiredForms && requiredForms.trim()) {
          // Split by lines and filter out empty lines
          const forms = requiredForms.split('\n').filter(form => form.trim()).map(form => form.trim());
          if (forms.length > 0) {
            selfDefenseForms.innerHTML = forms.map(form => `
              <div class="self-defense-form-item">
                <div class="self-defense-form-icon">
                  <i class="fas fa-shield-alt"></i>
                </div>
                <div class="self-defense-form-text">${form}</div>
              </div>
            `).join('');
            selfDefenseForms.classList.remove('empty');
          } else {
            selfDefenseForms.innerHTML = '<div class="self-defense-form-item"><div class="self-defense-form-text">No specific forms required yet.</div></div>';
            selfDefenseForms.classList.remove('empty');
          }
        } else {
          selfDefenseForms.innerHTML = '<div class="self-defense-form-item"><div class="self-defense-form-text">No specific forms required yet.</div></div>';
          selfDefenseForms.classList.remove('empty');
        }
      }
      
      // Animate cards on load
      const cards = document.querySelectorAll('.profile-card');
      cards.forEach((card, index) => {
        setTimeout(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, index * 200);
      });
    }
    
    function showErrorMessage() {
      if (errorMessage) {
        errorMessage.classList.remove('hidden');
      }
    }
    
    function calculateAge(birthDate) {
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    
  }
  

  // NCC Ref Auto-generation Function
  function generateNccRef(name) {
    if (!name) return null;
    
    // Get last 3 letters of surname (last word)
    const nameParts = name.trim().split(' ');
    const surname = nameParts[nameParts.length - 1];
    const lastThreeLetters = surname.slice(-3).toUpperCase();
    
    // Generate unique number (timestamp based for uniqueness)
    const uniqueNumber = Date.now().toString().slice(-6);
    
    return `${lastThreeLetters}${uniqueNumber}`;
  }

  // Dashboard logic (fetch stats, players, handle add/edit/delete/export)
  if (window.location.pathname.endsWith('dashboard.html')) {
    // Fetch current user data and update greeting
    async function loadUserData() {
      try {
        console.log('Loading user data...');
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('User data received:', userData);
          
          const userNameEl = document.getElementById('userName');
          if (userNameEl) {
            // Use the actual name from the database, not just username
            const displayName = userData.name || userData.username || 'User';
            userNameEl.textContent = displayName;
            console.log('User name updated to:', displayName);
          }
          
          // Update admin role text in sidebar
          const adminRoleTextEl = document.getElementById('adminRoleText');
          if (adminRoleTextEl) {
            let roleText = 'ARISE Admin';
            if (userData.role === 'coach') {
              roleText = 'ARISE Coach';
            } else if (userData.role === 'assistant') {
              roleText = 'ARISE Assistant Coach';
            }
            adminRoleTextEl.textContent = roleText;
            console.log('Updated admin role text:', roleText);
          }
          
          // Ensure greeting is visible
          const greeting = document.getElementById('userGreeting');
          if (greeting) {
            greeting.style.display = 'block';
            greeting.style.visibility = 'visible';
            console.log('Greeting displayed with user data:', userData);
          } else {
            console.error('Greeting element not found!');
          }
        } else if (response.status === 401) {
          // User not authenticated - silently handle (checkAuth will handle redirect)
          const greeting = document.getElementById('userGreeting');
          if (greeting) {
            greeting.style.display = 'none';
          }
          // Don't show modal on dashboard - checkAuth will redirect
          return;
        } else {
          console.log('Failed to fetch user data, status:', response.status);
          const userNameEl = document.getElementById('userName');
          if (userNameEl) {
            userNameEl.textContent = 'User';
          }
          // Show greeting even if user data fails to load
          const greeting = document.getElementById('userGreeting');
          if (greeting) {
            greeting.style.display = 'block';
          }
        }
      } catch (error) {
        console.log('Error loading user data:', error);
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
          userNameEl.textContent = 'User';
        }
        // Show greeting even on error
        const greeting = document.getElementById('userGreeting');
        if (greeting) {
          greeting.style.display = 'block';
        }
      }
    }
    
    // Check if user is authenticated first
    async function checkAuth() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        // Only log auth status in development or if there's an actual error
        if (!response.ok && response.status !== 401) {
          console.log('Auth response status:', response.status);
        }

        if (response.ok) {
          // User is authenticated, load data and show greeting
          const userData = await response.json();
          console.log('User authenticated with role:', userData.role);
          console.log('User data:', userData);
          
          // Set currentUserTeam immediately for Socket.io handlers
          if (userData.team) {
            currentUserTeam = userData.team;
            console.log('[Auth] Set currentUserTeam:', currentUserTeam);
          }
          
          // Update navigation based on user role
          updateNavigationForRole(userData.role);
          
          // Immediately remove team tabs if Assistant Coach (before async operations)
          if (userData.role === 'assistant' && userData.team) {
            updateTeamFilterVisibility(userData.role, userData.team);
          }
          
          await loadUserData();
          const greeting = document.getElementById('userGreeting');
          if (greeting) {
            // Clear any login message if it exists
            const loginMsg = greeting.querySelector('div[style*="color: #dc2626"]');
            if (loginMsg) {
              greeting.innerHTML = ''; // Clear the login message
            }
            greeting.style.display = 'block';
          }
          
          // Restore the last active section after user data and role are loaded
          setTimeout(() => {
            restoreLastActiveSection();
          }, 100);
        } else {
          // User not authenticated → hard redirect to login/home
          if (!window.location.pathname.endsWith('index.html')) {
            window.location.replace('index.html');
          }
          return;
        }
      } catch (error) {
        console.log('Auth check failed:', error);
        // On error, be safe and redirect to login/home
        if (!window.location.pathname.endsWith('index.html')) {
          window.location.replace('index.html');
        }
        return;
      }
    }
    
    // Initialize Socket.io connection
    initSocket();
    
    // Check authentication and load data
    checkAuth();
    
    // Initialize greeting visibility for home section
    document.body.classList.add('home-section');
    const greeting = document.getElementById('userGreeting');
    if (greeting) {
      greeting.style.display = 'block';
      greeting.style.visibility = 'visible';
      console.log('Initial greeting display set');
    }
    
    // Ensure greeting is visible after a short delay
    setTimeout(() => {
      const greeting = document.getElementById('userGreeting');
      if (greeting) {
        greeting.style.display = 'block';
        greeting.style.visibility = 'visible';
        console.log('Greeting visibility ensured after timeout');
      }
    }, 100);
    
    // Also load user data when page becomes visible (in case of session refresh)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        loadUserData();
      }
    });
    
    // Attach export listeners on page load
    attachExportListeners();

    // Role-based navigation control
    // currentUserRole is declared globally above for Socket.io handlers

    // Function to update team filter buttons based on user role and team
    function updateTeamFilterVisibility(role, team) {
      const teamFilterButtons = document.querySelectorAll('.team-filter-btn');
      
      if (role === 'assistant' && team) {
        // For Assistant Coach, remove all team tabs except their assigned team
        teamFilterButtons.forEach(btn => {
          const btnTeam = btn.getAttribute('data-team');
          if (btnTeam === 'all' || btnTeam !== team) {
            // Remove buttons that are not the Assistant Coach's assigned team
            btn.remove();
          } else {
            // Keep and activate their assigned team button
            btn.classList.add('active');
          }
        });
      } else {
        // For Admin and Coach, ensure all team buttons are present and visible
        // (Buttons should already exist in HTML, just make sure they're visible)
        teamFilterButtons.forEach(btn => {
          btn.style.display = '';
        });
      }
    }

    // Function to update navigation based on user role
    function updateNavigationForRole(role) {
      console.log('Updating navigation for role:', role);
      currentUserRole = role;
      
      const accountsNavLink = document.querySelector('[data-section="accounts"]');
      
      if (role === 'admin') {
        // Admin can see all sections
        if (accountsNavLink) {
          accountsNavLink.style.display = 'flex';
          console.log('Admin access: Showing Accounts section');
        }
      } else if (role === 'coach' || role === 'assistant') {
        // Coach and Assistant Coach cannot see Accounts section
        if (accountsNavLink) {
          accountsNavLink.style.display = 'none';
          console.log(`${role} access: Hiding Accounts section`);
        }
      } else {
        // Not authenticated or unknown role - show all sections (for login page)
        if (accountsNavLink) {
          accountsNavLink.style.display = 'flex';
          console.log('Not authenticated: Showing all sections');
        }
      }
    }

    // Function to get current user role
    async function getCurrentUserRole() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('Current user role:', userData.role);
          // Also set currentUserTeam if available
          if (userData.team && typeof currentUserTeam !== 'undefined') {
            currentUserTeam = userData.team;
            console.log('Current user team set:', currentUserTeam);
          }
          return userData.role;
        } else {
          console.log('Failed to get user role');
          return null;
        }
      } catch (error) {
        console.error('Error getting user role:', error);
        return null;
      }
    }

    // Custom notification functions
    function showAccessDeniedNotification() {
      const container = document.getElementById('notificationContainer');
      const notification = document.getElementById('notification');
      
      if (container && notification) {
        // Show the notification with animation
        container.classList.add('show');
        notification.classList.remove('hidden');
        notification.classList.add('slide-in');
        
        // No auto-hide - user must close manually
      }
    }

    function hideNotification() {
      const container = document.getElementById('notificationContainer');
      const notification = document.getElementById('notification');
      
      if (container && notification) {
        // Remove slide-in class first
        notification.classList.remove('slide-in');
        
        // Small delay to ensure smooth transition
        setTimeout(() => {
          // Add slide-out class for animation
          notification.classList.add('slide-out');
          
          // Wait for slide-out animation to complete
          setTimeout(() => {
            container.classList.remove('show');
            notification.classList.add('hidden');
            notification.classList.remove('slide-out');
          }, 300);
        }, 50);
      }
    }

    // Add event listeners for notification (moved outside DOMContentLoaded)
    const closeBtn = document.getElementById('notificationClose');
    const container = document.getElementById('notificationContainer');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', hideNotification);
    }
    
    if (container) {
      container.addEventListener('click', (e) => {
        if (e.target === container) {
          hideNotification();
        }
      });
    }

    // Accounts Management - Add New Account functionality
    const addAccountBtn = document.getElementById('addAccountBtn');
    const accountModal = document.getElementById('accountModal');
    const closeAccountModal = document.getElementById('closeAccountModal');
    const accountForm = document.getElementById('accountForm');
    const modalTitle = document.getElementById('modalTitle');

    // Open Add Account Modal
    if (addAccountBtn) {
      addAccountBtn.addEventListener('click', () => {
        console.log('Add Account button clicked');
        if (accountModal) {
          accountModal.classList.remove('hidden');
          if (modalTitle) modalTitle.textContent = 'Add New Account';
          if (accountForm) {
            accountForm.reset();
            accountForm.setAttribute('data-mode', 'add');
            document.getElementById('accountId').value = '';
            // Make password field required for add mode
            const passwordField = document.getElementById('accountPassword');
            if (passwordField) {
              passwordField.setAttribute('required', 'required');
              passwordField.placeholder = 'Enter password';
            }
            // Reset team field
            const teamField = document.getElementById('accountTeam');
            if (teamField) {
              teamField.removeAttribute('disabled');
              teamField.removeAttribute('required');
              teamField.value = '';
            }
            // Reset role field to trigger team field requirement logic
            const roleField = document.getElementById('accountRole');
            if (roleField) {
              roleField.value = '';
            }
          }
        }
      });
    }

    // Close Account Modal
    if (closeAccountModal) {
      closeAccountModal.addEventListener('click', () => {
        if (accountModal) {
          accountModal.classList.add('hidden');
        }
      });
    }

    // Close modal when clicking outside
    if (accountModal) {
      accountModal.addEventListener('click', (e) => {
        if (e.target === accountModal) {
          accountModal.classList.add('hidden');
        }
      });
    }

    // Cancel button handler
    const cancelAccountBtn = document.getElementById('cancelAccountBtn');
    if (cancelAccountBtn) {
      cancelAccountBtn.addEventListener('click', () => {
        if (accountModal) {
          accountModal.classList.add('hidden');
        }
      });
    }

    // Handle Account Role Change - Show/hide team requirement
    const accountRoleField = document.getElementById('accountRole');
    const accountTeamField = document.getElementById('accountTeam');
    if (accountRoleField && accountTeamField) {
      accountRoleField.addEventListener('change', (e) => {
        const selectedRole = e.target.value;
        if (selectedRole === 'admin') {
          accountTeamField.disabled = true;
          accountTeamField.removeAttribute('required');
          accountTeamField.value = '';
          accountTeamField.title = 'Admin accounts have access to all teams';
        } else if (selectedRole === 'assistant') {
          accountTeamField.disabled = false;
          accountTeamField.setAttribute('required', 'required');
          accountTeamField.title = 'Team is required for Assistant Coach';
        } else if (selectedRole === 'coach') {
          accountTeamField.disabled = false;
          accountTeamField.removeAttribute('required');
          accountTeamField.value = '';
          accountTeamField.title = 'Coach can be assigned to a specific team or have access to all teams';
        } else {
          accountTeamField.disabled = false;
          accountTeamField.removeAttribute('required');
          accountTeamField.title = '';
        }
      });
    }

    // Handle Account Form Submission
    if (accountForm) {
      accountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Account form submitted');
        console.log('Form element:', accountForm);
        console.log('Form data-mode:', accountForm.getAttribute('data-mode'));
        
        const formData = new FormData(accountForm);
        const data = Object.fromEntries(formData.entries());
        const mode = accountForm.getAttribute('data-mode');
        
        console.log('Account data being sent:', data);
        console.log('Mode:', mode);
        console.log('Role value:', data.role);
        console.log('Role type:', typeof data.role);
        console.log('Account ID:', data.id);
        
        try {
          let response;
          let successMessage;
          
          if (mode === 'edit') {
            // Update existing account
            const accountId = data.id;
            delete data.id; // Remove id from data
            
            // Don't send password if it's empty (for edit mode)
            if (!data.password || data.password.trim() === '') {
              delete data.password;
            }
            
            response = await fetch(`${API_BASE}/accounts/${accountId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify(data)
            });
            successMessage = 'Account updated successfully!';
          } else {
            // Create new account
            response = await fetch(`${API_BASE}/accounts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify(data)
            });
            successMessage = 'Account created successfully!';
          }

          const result = await response.json();

          console.log('Response status:', response.status);
          console.log('Response result:', result);

          if (response.ok) {
            showSuccess(successMessage);
            accountModal.classList.add('hidden');
            accountForm.reset();
            accountForm.setAttribute('data-mode', 'add');
            document.getElementById('accountId').value = '';
            // Reset password field to required for add mode
            const passwordField = document.getElementById('accountPassword');
            if (passwordField) {
              passwordField.setAttribute('required', 'required');
              passwordField.placeholder = 'Enter password';
            }
            
            // Log activity
            const action = accountForm.getAttribute('data-mode') === 'edit' ? 'updated' : 'created';
            await logActivity(`${action} an account`, `Role: ${data.role}, Name: ${data.name || data.username}`);
            loadRecentHistory(); // Refresh recent history
            
            // Re-enable all fields for add mode
            const nameField = document.getElementById('accountName');
            const emailField = document.getElementById('accountEmail');
            const teamField = document.getElementById('accountTeam');
            
            if (nameField) {
              nameField.disabled = false;
              nameField.placeholder = '';
              nameField.title = '';
            }
            if (emailField) {
              emailField.disabled = false;
              emailField.placeholder = '';
              emailField.title = '';
            }
            if (teamField) {
              teamField.disabled = false;
              teamField.removeAttribute('required');
              teamField.value = '';
              teamField.title = '';
            }
            // Refresh the accounts list with a small delay to ensure DB is updated
            console.log('Refreshing accounts list after successful update...');
            setTimeout(() => {
              loadAccounts();
            }, 500);
          } else {
            console.error('Error response:', result);
            showError(result.message || `Error ${mode === 'edit' ? 'updating' : 'creating'} account`);
          }
        } catch (error) {
          console.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} account:`, error);
          showError(`Error ${mode === 'edit' ? 'updating' : 'creating'} account. Please try again.`);
        }
      });
    }

    // Load and display accounts
    async function loadAccounts() {
      try {
        console.log('Loading accounts...');
        const response = await fetch(`${API_BASE}/accounts`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (response.ok) {
          const accounts = await response.json();
          console.log('Accounts loaded:', accounts);
          allAccounts = accounts; // Store all accounts for filtering
          displayAccounts(accounts);
          } else {
            console.error('Failed to load accounts - Status:', response.status);
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error('Error details:', errorData);
            showError(`Failed to load accounts: ${errorData.message || 'Unknown error'}`);
          }
      } catch (error) {
        console.error('Error loading accounts:', error);
      }
    }

    // Display accounts in the table
    function displayAccounts(accounts) {
      console.log('displayAccounts called with:', accounts);
      const tbody = document.getElementById('accountsTableBody');
      console.log('Table body element:', tbody);
      
      if (!tbody) {
        console.error('Table body not found!');
        return;
      }

      tbody.innerHTML = '';

      if (accounts.length === 0) {
        console.log('No accounts to display');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #666;">No accounts found</td></tr>';
        return;
      }

      console.log('Displaying', accounts.length, 'accounts');

      accounts.forEach((account, index) => {
        console.log(`Account ${index + 1}:`, account);
        console.log(`  - Name: ${account.name || account.username}`);
        console.log(`  - Username: ${account.username}`);
        console.log(`  - Email: ${account.email || '-'}`);
        console.log(`  - Role: ${account.role}`);
        console.log(`  - ID: ${account._id}`);
        
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${account.name || account.username}</td>
          <td>${account.username}</td>
          <td>
            <span class="role-badge role-${account.role}">
              ${account.role.charAt(0).toUpperCase() + account.role.slice(1)}
            </span>
          </td>
          <td>${account.email || '-'}</td>
          <td>${account.team || (account.role === 'admin' ? 'All Teams' : '-')}</td>
          <td>
            <button class="btn btn-sm btn-edit" onclick="editAccount('${account._id}', '${account.role}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-delete" onclick="deleteAccount('${account._id}', '${account.role}')">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(row);
        console.log(`Row ${index + 1} added to table`);
      });
      
      console.log('Table update completed. Total rows in table:', tbody.children.length);
      
      // Add scrollable indicator if content overflows
      setTimeout(() => {
        const container = document.querySelector('.accounts-table-container');
        if (container) {
          const isScrollable = container.scrollHeight > container.clientHeight;
          if (isScrollable) {
            container.classList.add('scrollable');
          } else {
            container.classList.remove('scrollable');
          }
        }
      }, 100);
      
      // Add a visual indicator that the table was updated
      tbody.style.backgroundColor = '#e8f5e8';
      setTimeout(() => {
        tbody.style.backgroundColor = '';
      }, 1000);
    }

    // Edit account function
    window.editAccount = async function(accountId, role) {
      console.log('Edit account:', accountId, role);
      
      try {
        // Fetch account details
        const response = await fetch(`${API_BASE}/accounts`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (response.ok) {
          const accounts = await response.json();
          const account = accounts.find(acc => acc._id === accountId);
          
          if (account) {
            console.log('Account found for editing:', account);
            
            // Populate form with account data
            document.getElementById('accountId').value = account._id;
            document.getElementById('accountName').value = account.name || account.username;
            document.getElementById('accountUsername').value = account.username;
            document.getElementById('accountEmail').value = account.email || '';
            document.getElementById('accountTeam').value = account.team || '';
            document.getElementById('accountRole').value = account.role;
            
            console.log('Form populated with values:');
            console.log('ID:', document.getElementById('accountId').value);
            console.log('Name:', document.getElementById('accountName').value);
            console.log('Username:', document.getElementById('accountUsername').value);
            console.log('Email:', document.getElementById('accountEmail').value);
            console.log('Role:', document.getElementById('accountRole').value);
            
            // Set form to edit mode
            accountForm.setAttribute('data-mode', 'edit');
            modalTitle.textContent = 'Edit Account';
            
            console.log('Form mode set to:', accountForm.getAttribute('data-mode'));
            
            // Make password field optional for edit mode
            const passwordField = document.getElementById('accountPassword');
            if (passwordField) {
              passwordField.removeAttribute('required');
              passwordField.placeholder = 'Leave blank to keep current password';
            }
            
            // Disable name, email, and team fields for admin accounts
            const nameField = document.getElementById('accountName');
            const emailField = document.getElementById('accountEmail');
            const teamField = document.getElementById('accountTeam');
            
            if (account.role === 'admin') {
              if (nameField) {
                nameField.disabled = true;
                nameField.placeholder = 'Name not supported for admin accounts';
                nameField.title = 'Admin accounts only have username, not name';
              }
              if (emailField) {
                emailField.disabled = true;
                emailField.placeholder = 'Email not supported for admin accounts';
                emailField.title = 'Admin accounts do not have email';
              }
              if (teamField) {
                teamField.disabled = true;
                teamField.value = '';
                teamField.title = 'Admin accounts have access to all teams';
              }
            } else {
              if (nameField) {
                nameField.disabled = false;
                nameField.placeholder = '';
                nameField.title = '';
              }
              if (emailField) {
                emailField.disabled = false;
                emailField.placeholder = '';
                emailField.title = '';
              }
              if (teamField) {
                teamField.disabled = false;
                // Team is required for Assistant Coach
                if (account.role === 'assistant') {
                  teamField.setAttribute('required', 'required');
                } else {
                  teamField.removeAttribute('required');
                }
                teamField.title = '';
              }
            }
            
            // Show modal
            accountModal.classList.remove('hidden');
          } else {
            showError('Account not found');
          }
        } else {
          showError('Failed to load account details');
        }
      } catch (error) {
        console.error('Error loading account:', error);
        showError('Error loading account details');
      }
    };

    // Delete account function
    window.deleteAccount = function(accountId, role) {
      if (confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
        deleteAccountRequest(accountId, role);
      }
    };

    // Delete account request
    async function deleteAccountRequest(accountId, role) {
      try {
        const response = await fetch(`${API_BASE}/accounts/${accountId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ role: role })
        });

        const result = await response.json();

        if (response.ok) {
          showSuccess('Account deleted successfully!');
          loadAccounts(); // Refresh the list
        } else {
          showError(result.message || 'Error deleting account');
        }
      } catch (error) {
        console.error('Error deleting account:', error);
        showError('Error deleting account. Please try again.');
      }
    }

    // Load accounts when accounts section is shown
    const accountsNavLink = document.querySelector('[data-section="accounts"]');
    if (accountsNavLink) {
      accountsNavLink.addEventListener('click', () => {
        setTimeout(() => {
          loadAccounts();
        }, 100);
      });
    }

    // Role filter functionality
    const roleFilter = document.getElementById('roleFilter');
    const accountSearch = document.getElementById('accountSearch');
    let allAccounts = []; // Store all accounts for filtering

    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        const selectedRole = e.target.value;
        console.log('Role filter changed to:', selectedRole);
        applyFilters();
      });
    }

    if (accountSearch) {
      accountSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        console.log('Search term:', searchTerm);
        applyFilters();
      });
    }

    // Apply both role and search filters
    function applyFilters() {
      const selectedRole = roleFilter ? roleFilter.value : '';
      const searchTerm = accountSearch ? accountSearch.value.toLowerCase() : '';
      
      console.log('Applying filters - Role:', selectedRole, 'Search:', searchTerm);
      
      let filteredAccounts = allAccounts;
      
      // Filter by role
      if (selectedRole && selectedRole !== '') {
        filteredAccounts = filteredAccounts.filter(account => {
          return account.role === selectedRole;
        });
        console.log(`After role filter (${selectedRole}):`, filteredAccounts.length, 'accounts');
      }
      
      // Filter by search term
      if (searchTerm && searchTerm.trim() !== '') {
        filteredAccounts = filteredAccounts.filter(account => {
          const name = (account.name || account.username || '').toLowerCase();
          const username = (account.username || '').toLowerCase();
          const email = (account.email || '').toLowerCase();
          const role = (account.role || '').toLowerCase();
          
          return name.includes(searchTerm) || 
                 username.includes(searchTerm) || 
                 email.includes(searchTerm) || 
                 role.includes(searchTerm);
        });
        console.log(`After search filter ("${searchTerm}"):`, filteredAccounts.length, 'accounts');
      }
      
      console.log('Final filtered accounts:', filteredAccounts);
      displayAccounts(filteredAccounts);
    }
    
    // (Optional) fetch summary if needed elsewhere
    // Fetch players
    function loadPlayers() {
      const tbody = document.querySelector('#playerTable tbody');
      if (tbody) tbody.innerHTML = '';
      fetch(`${API_BASE}/player/search?nccRef=`)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to load players (${res.status})`);
          return res.json();
        })
        .then(players => {
          if (!tbody) return;
          if (Array.isArray(players)) {
            // For Assistant Coach: Filter players before displaying to prevent showing all teams
            let filteredPlayers = players;
            if (currentUserRole === 'assistant' && currentUserTeam) {
              const userTeamUpper = (currentUserTeam || '').toUpperCase().trim();
              filteredPlayers = players.filter(player => {
                const playerTeam = (player.team || '').toUpperCase().trim();
                return playerTeam === userTeamUpper;
              });
              // Ensure filter is set correctly
              currentTeamFilter = currentUserTeam;
            }
            
            filteredPlayers.forEach(player => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td>${player.nccRef}</td>
                <td>${player.name}</td>
                <td>${player.team || '-'}</td>
                <td>${player.beltRank}</td>
                <td>${player.birthdate ? player.birthdate.slice(0,10) : '-'}</td>
                <td>
                  <button class="btn btn-edit" data-id="${player._id}" title="Edit Player">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-delete" data-id="${player._id}" title="Delete Player">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              `;
              // Add data attributes for filtering
              tr.setAttribute('data-team', player.team || '');
              tr.setAttribute('data-gender', player.gender || '');
              tr.setAttribute('data-id', player._id);
              tr.addEventListener('click', () => showDetails(player));
              tbody.appendChild(tr);
            });
          }
          if (typeof attachEditDeleteListeners === 'function') {
          attachEditDeleteListeners();
          }
          attachExportListeners();
          
          // Apply filters immediately after loading players (especially for Assistant Coach)
          if (typeof applyPlayerFilters === 'function') {
            applyPlayerFilters();
          }
          
          // Add scrollable indicator if content overflows
          setTimeout(() => {
            const container = document.querySelector('.players-table-container') || document.querySelector('.player-table-section');
            if (container) {
              const isScrollable = container.scrollHeight > container.clientHeight;
              if (isScrollable) {
                container.classList.add('scrollable');
              } else {
                container.classList.remove('scrollable');
              }
            }
          }, 100);
        })
        .catch(err => {
          console.error(err);
          if (tbody) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="text-align:left; padding:0.8rem; color:#9C3328; background:#fff6f4;">Cannot reach server. Please start the backend or check API URL.</td>`;
            tbody.appendChild(tr);
          }
        });
    }
    loadPlayers();

    // Client-side filter on the table
    const searchInput = document.getElementById('playerSearch');
    // currentTeamFilter is declared globally above for Socket.io handlers
    
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        applyPlayerFilters();
      });
    }
    
    // Team filter buttons functionality
    const teamFilterButtons = document.querySelectorAll('.team-filter-btn');
    // currentUserTeam is declared globally above for Socket.io handlers
    
    // Get user's team information
    async function getUserTeam() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
          method: 'GET'
        });
        if (response.ok) {
          const userData = await response.json();
          return userData.team || null;
        }
      } catch (error) {
        console.error('Error getting user team:', error);
      }
      return null;
    }
    
    // Initialize team filter after user data is loaded
    setTimeout(async () => {
      currentUserTeam = await getUserTeam();
      setupTeamFilters();
      
      // For Assistant Coach, remove all team tabs except their assigned team
      if (currentUserRole === 'assistant' && currentUserTeam) {
        currentTeamFilter = currentUserTeam;
        // Use the updateTeamFilterVisibility function which removes buttons
        updateTeamFilterVisibility(currentUserRole, currentUserTeam);
        // Apply filter to show only their team
        applyPlayerFilters();
      } else {
        // For Admin and Coach, ensure all team buttons are visible
        const teamFilterButtons = document.querySelectorAll('.team-filter-btn');
        teamFilterButtons.forEach(btn => {
          btn.style.display = '';
        });
      }
    }, 100);
    
    function setupTeamFilters() {
      // Re-query buttons in case some were removed (for Assistant Coach)
      const currentButtons = document.querySelectorAll('.team-filter-btn');
      currentButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const selectedTeam = e.target.getAttribute('data-team');
          
          // Update active button
          document.querySelectorAll('.team-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentTeamFilter = selectedTeam;
          
          // Apply filters
          applyPlayerFilters();
        });
      });
    }
    
    // Apply both search and team filters
    function applyPlayerFilters() {
      const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const rows = document.querySelectorAll('#playerTable tbody tr');
      
        rows.forEach(row => {
        const team = row.getAttribute('data-team') || '';
          const text = row.textContent.toLowerCase();
        
        // Check team filter
        const teamMatch = currentTeamFilter === 'all' || team === currentTeamFilter;
        
        // Check search filter
        const searchMatch = !searchTerm || text.includes(searchTerm);
        
        // Show row if both filters match
        row.style.display = (teamMatch && searchMatch) ? '' : 'none';
      });
    }

    // --- Add/Edit Player Modal Logic ---
    const addPlayerBtn = document.getElementById('addPlayerBtn');
    const playerModal = document.getElementById('playerModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const playerForm = document.getElementById('playerForm');
    const photoFileInput = document.getElementById('photoFile');
    const photoPreview = document.getElementById('photoPreview');
    const formsTextarea = document.getElementById('requiredForms');
    const formsCounter = document.getElementById('formsCounter');
    const nccRefInput = document.getElementById('nccRefInput');
    const autoNccDisplay = document.getElementById('autoNccDisplay');
    const autoNccValue = document.getElementById('autoNccValue');
    let editingPlayerId = null;

    if (addPlayerBtn && playerModal && closeModalBtn && playerForm) {
      addPlayerBtn.addEventListener('click', () => {
        playerForm.reset();
        editingPlayerId = null;
        playerModal.classList.remove('hidden');
        // Reset preview and counters
        const preview = document.getElementById('photoPreview');
        if (preview) { preview.src = ''; preview.style.display = 'none'; }
        const counter = document.getElementById('formsCounter');
        if (counter) counter.textContent = '0/280';
        // Reset NCC Ref display
        if (autoNccDisplay) autoNccDisplay.style.display = 'none';
      });

      // NCC Ref input validation
      if (nccRefInput && autoNccDisplay && autoNccValue) {
        nccRefInput.addEventListener('input', (e) => {
          const value = e.target.value.trim().toUpperCase();
          const nameInput = document.querySelector('input[name="name"]');
          
          if (value === 'N/A' && nameInput && nameInput.value.trim()) {
            // Show auto-generated NCC Ref
            const autoNccRef = generateNccRef(nameInput.value.trim());
            if (autoNccRef) {
              autoNccValue.textContent = autoNccRef;
              autoNccDisplay.style.display = 'block';
            }
          } else {
            // Hide auto-generated display
            autoNccDisplay.style.display = 'none';
          }
        });

        // Also listen to name input changes
        const nameInput = document.querySelector('input[name="name"]');
        if (nameInput) {
          nameInput.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            const nccValue = nccRefInput.value.trim().toUpperCase();
            
            if (nccValue === 'N/A' && name) {
              const autoNccRef = generateNccRef(name);
              if (autoNccRef) {
                autoNccValue.textContent = autoNccRef;
                autoNccDisplay.style.display = 'block';
              }
            }
          });
        }
      }
      closeModalBtn.addEventListener('click', () => {
        playerModal.classList.add('hidden');
      });
      playerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(playerForm);
        const data = Object.fromEntries(formData.entries());
        
        // NCC Ref validation and auto-generation
        if (data.nccRef && data.nccRef.trim().toUpperCase() === 'N/A') {
          // Generate auto NCC Ref for players without NCC #
          const autoNccRef = generateNccRef(data.name);
          if (autoNccRef) {
            data.nccRef = autoNccRef;
            data.isAutoGenerated = true; // Flag to identify auto-generated NCC
          }
        } else if (data.nccRef && data.nccRef.trim().toUpperCase() !== 'N/A') {
          // Validate that it's not just "N/A" if they want to enter something else
          data.isAutoGenerated = false;
        }
        // Handle attached photo file -> convert to Data URL for photoUrl
        if (formData.get('photoFile') && formData.get('photoFile').size > 0) {
          const file = formData.get('photoFile');
          // Basic validation: type and size (<= 2MB)
          if (!/^image\//.test(file.type)) {
            showWarning('Please select a valid image file.');
            return;
          }
          if (file.size > 2 * 1024 * 1024) {
            showWarning('Image must be 2MB or smaller.');
            return;
          }
          const toDataUrl = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          try {
            data.photoUrl = await toDataUrl(file);
          } catch (err) {
            console.error('Failed to read photo file', err);
          }
          delete data.photoFile;
        }
        if (data.achievements) data.achievements = data.achievements.split(',').map(s => s.trim()).filter(Boolean);
        if (data.competitions) {
          data.stats = data.stats || {};
          data.stats.competitions = data.competitions.split(',').map(s => s.trim()).filter(Boolean);
          delete data.competitions;
        }
        // Keep requiredForms as a direct field on the player (not nested under stats)
        // The data.requiredForms is already in the correct location
        // Convert birthdate to ISO if present
        if (data.birthdate) data.birthdate = new Date(data.birthdate).toISOString();
        if (data.lastPromotionExam) data.lastPromotionExam = new Date(data.lastPromotionExam).toISOString();
        let url = `${API_BASE}/player/`;
        let method = 'POST';
        if (editingPlayerId) {
          url = `${API_BASE}/player/${editingPlayerId}`;
          method = 'PUT';
        }
        try {
          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(data)
          });
          if (res.ok) {
            playerModal.classList.add('hidden');
            
            // Log activity
            const action = editingPlayerId ? 'updated' : 'added';
            await logActivity(`${action} a player`, `Player: ${data.name}`);
            
            // Show success message
            showSuccess(`Player ${action} successfully!`);
            
            // For Assistant Coach: Ensure team filter is set before reloading
            if (currentUserRole === 'assistant' && currentUserTeam) {
              currentTeamFilter = currentUserTeam;
            }
            
            // Reload players to refresh the table (filter will be applied immediately in loadPlayers callback)
            loadPlayers();
            
            loadRecentHistory(); // Refresh recent history
          } else {
            const err = await res.json().catch(() => ({}));
            showError('Failed to ' + (editingPlayerId ? 'edit' : 'add') + ' player. ' + (err.message || ''));
          }
        } catch (networkErr) {
          showError('Cannot reach server. Please start the backend or check your connection.');
        }
      });
      // Live photo preview
      if (photoFileInput && photoPreview) {
        photoFileInput.addEventListener('change', () => {
          const file = photoFileInput.files && photoFileInput.files[0];
          if (!file) { photoPreview.src = ''; photoPreview.style.display = 'none'; return; }
          if (!/^image\//.test(file.type) || file.size > 2 * 1024 * 1024) {
            photoPreview.src = '';
            photoPreview.style.display = 'none';
            return;
          }
          const reader = new FileReader();
          reader.onload = () => { photoPreview.src = reader.result; photoPreview.style.display = 'block'; };
          reader.readAsDataURL(file);
        });
      }
      // Forms textarea counter
      if (formsTextarea && formsCounter) {
        const updateCount = () => { formsCounter.textContent = `${formsTextarea.value.length}/280`; };
        formsTextarea.addEventListener('input', updateCount);
        updateCount();
      }
    }
    // --- End Add/Edit Player Modal Logic ---

    // Sidebar navigation and section switching
    const setSection = (key) => {
      const sections = {
        home: document.getElementById('sec-home'),
        players: document.getElementById('sec-players'),
        accounts: document.getElementById('sec-accounts'),
        settings: document.getElementById('sec-settings')
      };
      Object.values(sections).forEach(s => { if (s) s.classList.remove('visible'); });
      if (sections[key]) sections[key].classList.add('visible');
      
      // Save current section to localStorage for persistence across page reloads
      localStorage.setItem('lastActiveSection', key);
      // Header title/actions
      const title = document.getElementById('sectionTitle');
      const greeting = document.getElementById('userGreeting');
      if (title) title.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      // Show greeting only on Home page
      if (greeting) {
        if (key === 'home') {
          // Show greeting on home section
          document.body.classList.add('home-section');
          greeting.style.display = 'block';
          greeting.style.visibility = 'visible';
        } else {
          // Hide greeting on other sections
          document.body.classList.remove('home-section');
          greeting.style.display = 'none';
        }
      }

      // Check if user has permission to access this section
      if (key === 'accounts') {
        if (currentUserRole === null) {
          // Role not loaded yet, get it first
          getCurrentUserRole().then(role => {
            if (role !== 'admin') {
              console.log('Access denied: Only admins can access Accounts section');
              showAccessDeniedNotification();
              // Switch back to home section
              const homeLink = document.querySelector('[data-section="home"]');
              if (homeLink) {
                homeLink.click();
              }
            }
          });
        } else if (currentUserRole !== 'admin') {
          console.log('Access denied: Only admins can access Accounts section');
          showAccessDeniedNotification();
          // Switch back to home section
          const homeLink = document.querySelector('[data-section="home"]');
          if (homeLink) {
            homeLink.click();
          }
          return;
        }
      }
      const searchWrap = document.getElementById('playersSearchWrap');
      const teamsFilterContainer = document.getElementById('teamsFilterContainer');
      const addBtn = document.getElementById('addPlayerBtn');
      const ex1 = document.getElementById('exportExcelBtn');
      const ex2 = document.getElementById('importExcelBtn');
      const isPlayers = key === 'players';
      [searchWrap, teamsFilterContainer, addBtn, ex1, ex2].forEach(el => { if (!el) return; el.style.display = isPlayers ? '' : 'none'; });
      
      // Load accounts when accounts section is shown
      if (key === 'accounts') {
        setTimeout(() => {
          loadAccounts();
        }, 100);
      }
    };

    // Function to restore the last active section from localStorage
    const restoreLastActiveSection = () => {
      const lastSection = localStorage.getItem('lastActiveSection');
      if (lastSection && ['home', 'players', 'accounts', 'settings'].includes(lastSection)) {
        // Check if user has permission to access the saved section
        if (lastSection === 'accounts') {
          // For accounts section, check if user is admin
          if (currentUserRole === 'admin') {
            setSection(lastSection);
            // Update navigation to show correct active state
            updateNavigationActiveState(lastSection);
          } else {
            // User doesn't have permission, default to home
            setSection('home');
            updateNavigationActiveState('home');
          }
        } else {
          // For other sections, user has permission
          setSection(lastSection);
          updateNavigationActiveState(lastSection);
        }
      } else {
        // No saved section or invalid section, default to home
        setSection('home');
        updateNavigationActiveState('home');
      }
      
      // Update KPIs if we're on the home section
      const currentSection = localStorage.getItem('lastActiveSection');
      if (currentSection === 'home' || !currentSection) {
        updateKpis();
      }
    };

    // Function to update navigation active state
    const updateNavigationActiveState = (sectionKey) => {
      document.querySelectorAll('.admin-nav .nav-link').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-section') === sectionKey) {
          btn.classList.add('active');
        }
      });
    };

    document.querySelectorAll('.admin-nav .nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.admin-nav .nav-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sec = btn.getAttribute('data-section');
        setSection(sec);
        if (sec === 'home') updateKpis();
      });
    });

    // KPIs from loaded table rows (basic client-side computation)
    function updateKpis() {
      const rows = Array.from(document.querySelectorAll('#playerTable tbody tr'));
      const total = rows.length;
      let male = 0, female = 0;
      rows.forEach(r => {
        // Count by gender from data attribute
        const gender = r.getAttribute('data-gender') || '';
        if (gender.toUpperCase() === 'MALE') {
          male++;
        } else if (gender.toUpperCase() === 'FEMALE') {
          female++;
        }
      });
      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = String(v); };
      setText('kpiPlayers', total);
      setText('kpiMale', male);
      setText('kpiFemale', female);
    }
    // Recompute when players load
    setTimeout(updateKpis, 800);
    
    // Load recent history
    loadRecentHistory();
    
    // Load accounts on initial page load
    setTimeout(() => {
      loadAccounts();
    }, 1000);
    
    // Function to load recent history
    async function loadRecentHistory() {
      try {
        const response = await fetch(`${API_BASE}/activity/recent?limit=10`, {
          credentials: 'include',
          method: 'GET'
        });
        
        if (response.ok) {
          const data = await response.json();
          displayRecentHistory(data.activities || []);
        } else if (response.status === 401) {
          // Silently handle 401 - user not authenticated, checkAuth will handle redirect
          displayRecentHistory([]);
        } else {
          // Only log non-auth errors
          console.error('Failed to load recent history:', response.status);
          displayRecentHistory([]);
        }
      } catch (error) {
        // Only log network errors, not auth failures
        if (error.message && !error.message.includes('401')) {
          console.error('Error loading recent history:', error);
        }
        displayRecentHistory([]);
      }
    }
    
    // Function to display recent history
    function displayRecentHistory(activities) {
      const container = document.getElementById('recentHistory');
      if (!container) return;
      
      if (activities.length === 0) {
        container.innerHTML = '<div class="recent-history-empty">No recent activities found</div>';
        return;
      }
      
      const historyHTML = activities.map(activity => {
        const timeAgo = getTimeAgo(activity.timestamp);
        const roleClass = activity.userRole;
        const roleIcon = getRoleIcon(activity.userRole);
        
        return `
          <div class="recent-history-item">
            <div class="recent-history-icon ${roleClass}">${roleIcon}</div>
            <div class="recent-history-content">
              <div class="recent-history-activity">${activity.activity}</div>
              <div class="recent-history-user">${activity.userName} (${activity.userRole.toUpperCase()})</div>
              <div class="recent-history-time">${timeAgo}</div>
            </div>
          </div>
        `;
      }).join('');
      
      container.innerHTML = historyHTML;
    }
    
    // Helper function to get time ago
    function getTimeAgo(timestamp) {
      const now = new Date();
      const activityTime = new Date(timestamp);
      const diffInSeconds = Math.floor((now - activityTime) / 1000);
      
      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      }
    }
    
    // Helper function to get role icon
    function getRoleIcon(role) {
      switch (role) {
        case 'admin': return 'A';
        case 'coach': return 'C';
        case 'assistant': return 'AC';
        default: return '?';
      }
    }
    
    // Function to log activity
    async function logActivity(activity, details = '') {
      try {
        await fetch(`${API_BASE}/activity/log`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            activity: activity,
            details: details
          })
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    }

    // --- Export/Import Functionality ---
    function attachExportListeners() {
      const exportExcelBtn = document.getElementById('exportExcelBtn');
      const importExcelBtn = document.getElementById('importExcelBtn');
      
      if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', async () => {
          try {
            console.log('Export Excel clicked');
            exportExcelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
            exportExcelBtn.disabled = true;
            
            console.log('Proceeding with export...');
            
            const response = await fetch(`${API_BASE}/stats/export/excel`, {
              credentials: 'include',
              method: 'GET'
            });
            
            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `players_export_${new Date().toISOString().split('T')[0]}.xlsx`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              console.log('Excel export completed');
              
              // Log activity
              await logActivity('exported players data to Excel', `File: players_export_${new Date().toISOString().split('T')[0]}.xlsx`);
              loadRecentHistory(); // Refresh recent history
            } else {
              console.error('Export failed with status:', response.status);
              let errorMessage = 'Export failed';
              
              try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
                console.error('Export error details:', error);
                
                // Handle authentication errors specifically
                if (response.status === 401) {
                  errorMessage = 'Your session has expired. Please log in again.';
                  showWarning(errorMessage);
                  // Show login modal instead of redirecting
                  if (loginModal) {
                    loginModal.classList.remove('hidden');
                  } else if (!window.location.pathname.endsWith('index.html')) {
                    window.location.href = 'index.html';
                  }
                  return;
                }
              } catch (e) {
                console.error('Could not parse error response:', e);
                errorMessage = `Export failed with status ${response.status}`;
              }
              
              if (response.status !== 401) {
                showError(`Export failed: ${errorMessage}`);
              }
            }
          } catch (error) {
            console.error('Export error:', error);
            showError('Export failed. Please try again.');
          } finally {
            exportExcelBtn.innerHTML = '<i class="fas fa-file-excel"></i> Export Excel';
            exportExcelBtn.disabled = false;
          }
        });
      }
      
      if (importExcelBtn) {
        // Create hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx,.xls';
        fileInput.style.display = 'none';
        fileInput.id = 'excelFileInput';
        document.body.appendChild(fileInput);
        
        importExcelBtn.addEventListener('click', () => {
          console.log('Import Excel clicked');
          fileInput.click();
        });
        
        fileInput.addEventListener('change', async (event) => {
          const file = event.target.files[0];
          if (!file) return;

          // Validate file type
          const allowedTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
          if (!allowedTypes.includes(file.type)) {
            showWarning('Please select a valid Excel file (.xlsx or .xls)');
            return;
          }

          // Validate file size (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            showWarning('File size must be less than 10MB');
            return;
          }

          try {
            console.log('Starting Excel import...');
            importExcelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importing...';
            importExcelBtn.disabled = true;

            // Check session before import
            console.log('Checking session before import...');
            const sessionCheck = await fetch(`${API_BASE}/auth/me`, {
              credentials: 'include',
              method: 'GET'
            });
            console.log('Session check status:', sessionCheck.status);
            
            if (!sessionCheck.ok) {
              console.log('Session invalid, aborting import');
              showWarning('Your session has expired. Please log in again.');
              // Show login modal instead of redirecting
              if (loginModal) {
                loginModal.classList.remove('hidden');
              } else if (!window.location.pathname.endsWith('index.html')) {
                window.location.href = 'index.html';
              }
              return;
            }

            const formData = new FormData();
            formData.append('excelFile', file);

            const response = await fetch(`${API_BASE}/stats/import/excel`, {
              method: 'POST',
              credentials: 'include',
              body: formData
            });

            if (response.ok) {
              const result = await response.json();
              console.log('Import completed:', result);
              const imported = result.imported || 0;
              const updated = result.updated || 0;
              const errors = result.errors || 0;
              
              let message = `Import successful! `;
              if (imported > 0) message += `${imported} players imported`;
              if (updated > 0) {
                if (imported > 0) message += `, `;
                message += `${updated} players updated`;
              }
              if (errors > 0) message += `, ${errors} errors`;
              message += `.`;
              
              showInfo(message);
              
              // Log activity
              await logActivity('imported players data from Excel', `Imported: ${imported}, Updated: ${updated}, Errors: ${errors}`);
              loadRecentHistory(); // Refresh recent history
              
              // Refresh the players table
              loadPlayers();
            } else {
              console.error('Import failed with status:', response.status);
              let errorMessage = 'Import failed';
              
              try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
                console.error('Import error details:', error);
                
                // Handle authentication errors specifically
                if (response.status === 401) {
                  errorMessage = 'Your session has expired. Please log in again.';
                  showWarning(errorMessage);
                  // Show login modal instead of redirecting
                  if (loginModal) {
                    loginModal.classList.remove('hidden');
                  } else if (!window.location.pathname.endsWith('index.html')) {
                    window.location.href = 'index.html';
                  }
                  return;
                }
              } catch (e) {
                console.error('Could not parse error response:', e);
                errorMessage = `Import failed with status ${response.status}`;
              }
              
              if (response.status !== 401) {
                showError(`Import failed: ${errorMessage}`);
              }
            }
          } catch (error) {
            console.error('Import error:', error);
            showError('Import failed. Please try again.');
          } finally {
            importExcelBtn.innerHTML = '<i class="fas fa-file-import"></i> Import Excel';
            importExcelBtn.disabled = false;
            // Clear the file input
            fileInput.value = '';
          }
        });
      }
    }

    // --- Edit/Delete Logic ---
    window.attachEditDeleteListeners = function() {
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          // Fetch player data
          const res = await fetch(`${API_BASE}/player/${id}`);
          if (res.ok) {
            const player = await res.json();
            playerForm.nccRef.value = player.nccRef;
            playerForm.name.value = player.name;
            playerForm.beltRank.value = player.beltRank;
            playerForm.birthdate.value = player.birthdate ? player.birthdate.slice(0,10) : '';
            if (playerForm.gender) { playerForm.gender.value = player.gender || ''; }
            if (playerForm.team) { playerForm.team.value = player.team || ''; }
            // No text field for photo URL now
            playerForm.address.value = player.address || '';
            playerForm.contactNumber.value = player.contactNumber || '';
            playerForm.lastPromotionExam.value = player.lastPromotionExam ? player.lastPromotionExam.slice(0,10) : '';
            playerForm.nextBelt.value = player.nextBelt || '';
            playerForm.achievements.value = Array.isArray(player.achievements) ? player.achievements.join(', ') : '';
            playerForm.competitions.value = (player.stats && Array.isArray(player.stats.competitions)) ? player.stats.competitions.join(', ') : '';
            playerForm.requiredForms.value = player.requiredForms || '';
            editingPlayerId = id;
            playerModal.classList.remove('hidden');
          } else {
            showError('Failed to fetch player data.');
          }
        });
      });
      document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (confirm('Are you sure you want to delete this player?')) {
            const res = await fetch(`${API_BASE}/player/${id}`, {
              method: 'DELETE',
              credentials: 'include'
            });
            if (res.ok) {
              showSuccess('Player deleted successfully!');
              loadPlayers();
            } else {
              const err = await res.json();
              showError('Failed to delete player. ' + (err.message || ''));
            }
          }
        });
      });
    };
    // --- End Edit/Delete Logic ---

    // Details panel
    function showDetails(player) {
      const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '-'; };
      const photo = document.getElementById('detailPhoto'); if (photo) photo.src = player.photoUrl || '';
      setText('detailName', player.name);
      setText('detailNcc', player.nccRef);
      setText('detailBirth', player.birthdate ? player.birthdate.slice(0,10) : '-');
      setText('detailAddress', player.address);
      setText('detailContact', player.contactNumber);
      setText('detailBelt', player.beltRank);
      setText('detailLastExam', player.lastPromotionExam ? player.lastPromotionExam.slice(0,10) : '-');
      setText('detailNextBelt', player.nextBelt);
      const compUl = document.getElementById('detailCompetitions');
      if (compUl) {
        compUl.innerHTML = '';
        const comps = (player.stats && Array.isArray(player.stats.competitions)) ? player.stats.competitions : [];
        comps.forEach(c => { const li = document.createElement('li'); li.textContent = c; compUl.appendChild(li); });
      }
      const achUl = document.getElementById('detailAchievements');
      if (achUl) {
        achUl.innerHTML = '';
        const ach = Array.isArray(player.achievements) ? player.achievements : [];
        ach.forEach(a => { const li = document.createElement('li'); li.textContent = a; achUl.appendChild(li); });
      }
    }
  }

  // Theme toggle (persists)
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('THEME');
  if (savedTheme === 'dark') document.body.classList.add('theme-dark');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      document.body.classList.toggle('theme-dark');
      localStorage.setItem('THEME', document.body.classList.contains('theme-dark') ? 'dark' : 'light');
    });
  }

// Hamburger / Sidebar toggle for both client-side and admin pages
const navToggle = document.getElementById('ptaNavbarToggle');
const navMenu = document.getElementById('ptaNavMenu');
const adminShell = document.querySelector('.admin-shell');
const adminSidebar = document.querySelector('.admin-sidebar');
const headerEl = document.querySelector('.pta-navbar');

// Client-side sidebar elements
const clientSidebar = document.getElementById('clientSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarClose = document.getElementById('sidebarClose');

const setHeaderVar = () => {
  if (!headerEl) return;
  const h = Math.round(headerEl.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--header-height', `${h}px`);
};
setHeaderVar();
window.addEventListener('resize', setHeaderVar);

if (navToggle) {
  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Handle client-side sidebar
    if (clientSidebar && !adminShell) {
      clientSidebar.classList.toggle('open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
      navToggle.classList.toggle('active');
    }
    
    // Handle admin sidebar
    if (adminShell && adminSidebar) {
      adminShell.classList.toggle('sidebar-open');
      navToggle.classList.toggle('active');
    }
  });
}

// Close client-side sidebar
if (sidebarClose) {
  sidebarClose.addEventListener('click', () => {
    if (clientSidebar) clientSidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    if (navToggle) navToggle.classList.remove('active');
  });
}

// Close sidebar when clicking overlay
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    if (clientSidebar) clientSidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    if (navToggle) navToggle.classList.remove('active');
  });
}

// Close sidebar when navigation links are clicked
if (clientSidebar && !adminShell) {
  const sidebarLinks = clientSidebar.querySelectorAll('a.sidebar-link');
  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      clientSidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
      if (navToggle) navToggle.classList.remove('active');
    });
  });
  
  // Close sidebar when action buttons are clicked
  const sidebarButtons = clientSidebar.querySelectorAll('a.btn-sidebar');
  sidebarButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      // Add a small delay to allow the modal to open first
      setTimeout(() => {
        clientSidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (navToggle) navToggle.classList.remove('active');
      }, 100);
    });
  });
}

// Close on outside click
document.addEventListener('click', (e) => {
  // Handle client-side sidebar
  if (clientSidebar && !adminShell) {
    if (clientSidebar.classList.contains('open')) {
      const insideSidebar = e.target.closest && e.target.closest('#clientSidebar');
      const clickedToggle = e.target.closest && e.target.closest('#ptaNavbarToggle');
      if (!insideSidebar && !clickedToggle) {
        clientSidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        if (navToggle) navToggle.classList.remove('active');
      }
    }
  }
  
  // Handle admin sidebar
  if (adminShell && adminSidebar) {
  if (!adminShell.classList.contains('sidebar-open')) return;
  const insideSidebar = e.target.closest && e.target.closest('.admin-sidebar');
  const clickedToggle = e.target.closest && e.target.closest('#ptaNavbarToggle');
  if (!insideSidebar && !clickedToggle) {
    adminShell.classList.remove('sidebar-open');
    if (navToggle) navToggle.classList.remove('active');
    }
  }
});

// Close on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Handle client-side sidebar
    if (clientSidebar && clientSidebar.classList.contains('open') && !adminShell) {
      clientSidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
      if (navToggle) navToggle.classList.remove('active');
    }
    
    // Handle admin sidebar
    if (adminShell && adminShell.classList.contains('sidebar-open')) {
    adminShell.classList.remove('sidebar-open');
    if (navToggle) navToggle.classList.remove('active');
  }
  }

  // Check Another Player Sliding Container Functions
  function showCheckPlayerContainer() {
    console.log('showCheckPlayerContainer called');
    const container = document.getElementById('checkPlayerContainer');
    console.log('Container found:', !!container);
    if (container) {
      // Force display and remove any conflicting classes
      container.style.display = 'flex';
      container.classList.remove('hidden');
      container.classList.add('show');
      console.log('Container show class added, display set to flex');
      
      // Force a reflow to ensure the transition works
      container.offsetHeight;
      
      // Double-check after a short delay
      setTimeout(() => {
        console.log('Container classes after show:', container.className);
        console.log('Container computed style display:', window.getComputedStyle(container).display);
        console.log('Container computed style opacity:', window.getComputedStyle(container).opacity);
        console.log('Container computed style visibility:', window.getComputedStyle(container).visibility);
      }, 100);
    } else {
      console.error('Check Player Container not found!');
    }
  }

  function hideCheckPlayerContainer() {
    console.log('hideCheckPlayerContainer called');
    const container = document.getElementById('checkPlayerContainer');
    if (container) {
      container.classList.remove('show');
      console.log('Container show class removed');
      
      // Hide after transition completes
      setTimeout(() => {
        if (!container.classList.contains('show')) {
          container.style.display = 'none';
        }
      }, 300);
    }
  }

  // Add event listeners for Check Another Player functionality
  // Only run on pages that have these elements (e.g., player profile page)
  function attachCheckPlayerListeners() {
    const checkAnotherPlayerBtn = document.getElementById('checkAnotherPlayerBtn');
    const checkPlayerClose = document.getElementById('checkPlayerClose');
    const checkPlayerContainer = document.getElementById('checkPlayerContainer');

    // Only proceed if at least the container exists (page has this feature)
    if (!checkPlayerContainer) {
      // Silently return if elements don't exist (not an error, just not on this page)
      return;
    }

    // Only log if we're actually attaching listeners
    console.log('Attaching Check Player listeners for player profile page...');

    if (checkAnotherPlayerBtn) {
      // Remove any existing listeners first
      checkAnotherPlayerBtn.removeEventListener('click', showCheckPlayerContainer);
      checkAnotherPlayerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Check Another Player button clicked');
        showCheckPlayerContainer();
      });
    }

    if (checkPlayerClose) {
      checkPlayerClose.removeEventListener('click', hideCheckPlayerContainer);
      checkPlayerClose.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Check Player close button clicked');
        hideCheckPlayerContainer();
      });
    }

    if (checkPlayerContainer) {
      checkPlayerContainer.removeEventListener('click', handleContainerClick);
      checkPlayerContainer.addEventListener('click', handleContainerClick);
    }
  }

  function handleContainerClick(e) {
    if (e.target === e.currentTarget) {
      console.log('Check Player container overlay clicked');
      hideCheckPlayerContainer();
    }
  }

  // Attach listeners once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachCheckPlayerListeners);
  } else {
    attachCheckPlayerListeners();
  }

  // Attach form listener separately
  function attachFormListener() {
    const checkPlayerForm = document.getElementById('checkPlayerForm');
    // Only attach if form exists (on player profile page)
    if (checkPlayerForm) {
    checkPlayerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(checkPlayerForm);
      const nccRef = formData.get('nccRef');
      
      if (!nccRef) {
        showWarning('Please enter an NCC reference number');
        return;
      }

      try {
        // Show loading state
        const submitBtn = checkPlayerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
        submitBtn.disabled = true;

        // Search for player
        console.log('Searching for player with NCC Ref:', nccRef);
        const searchUrl = `${API_BASE}/player/search?nccRef=${encodeURIComponent(nccRef)}`;
        console.log('Search URL:', searchUrl);
        const response = await fetch(searchUrl);
        console.log('Search response status:', response.status);
        
        if (response.ok) {
          const player = await response.json();
          
          // Display result
          const resultDiv = document.getElementById('checkPlayerResult');
          if (resultDiv) {
            resultDiv.innerHTML = `
              <a href="player-profile.html?nccRef=${encodeURIComponent(nccRef)}" 
                 style="display: inline-block; color: #2563eb; text-decoration: none; font-weight: 500; padding: 0.5rem 0;">
                View Profile: ${player.name}
              </a>
            `;
          }
        } else if (response.status === 404) {
          console.log('Player not found with NCC Ref:', nccRef);
          const resultDiv = document.getElementById('checkPlayerResult');
          if (resultDiv) {
            resultDiv.innerHTML = `
              <div style="text-align: center; padding: 1rem; background: #fef2f2; border-radius: 8px; border: 1px solid #fca5a5;">
                <h4 style="color: #dc2626; margin: 0 0 0.5rem 0;">Player Not Found</h4>
                <p style="color: #b91c1c; margin: 0;">No player found with NCC reference: ${nccRef}</p>
              </div>
            `;
          }
        } else {
          console.error('Search failed with status:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error('Search failed');
        }
      } catch (error) {
        console.error('Error searching for player:', error);
        const resultDiv = document.getElementById('checkPlayerResult');
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: #fef2f2; border-radius: 8px; border: 1px solid #fca5a5;">
              <h4 style="color: #dc2626; margin: 0 0 0.5rem 0;">Search Error</h4>
              <p style="color: #b91c1c; margin: 0;">Unable to search for player. Please try again.</p>
            </div>
          `;
        }
      } finally {
        // Reset button state
        const submitBtn = checkPlayerForm.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-search"></i> Search Player';
        submitBtn.disabled = false;
      }
    });
    }
  }

  // Attach form listener only if form exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachFormListener);
  } else {
    attachFormListener();
  }

  // Use event delegation for Check Another Player button (only works if button exists)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'checkAnotherPlayerBtn') {
      e.preventDefault();
      console.log('Check Another Player button clicked via delegation');
      showCheckPlayerContainer();
    }
  });

  // Test function to verify container works
  window.testCheckPlayer = function() {
    console.log('Testing Check Player Container...');
    showCheckPlayerContainer();
  };

  // Hide Check Stats button on player profile page
  function hideCheckStatsButton() {
    const checkStatsButton = document.querySelector('.pta-navbar-buttons');
    if (checkStatsButton) {
      checkStatsButton.style.display = 'none';
      console.log('Check Stats button hidden on player profile page');
    }
  }

  // Hide the button immediately if we're on player profile page
  if (document.querySelector('.profile-page')) {
    hideCheckStatsButton();
  }

  // Also hide it when the page loads completely
  window.addEventListener('load', () => {
    if (document.querySelector('.profile-page')) {
      hideCheckStatsButton();
    }
  });
});
});