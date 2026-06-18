/* ==========================================================================
   SCORE TRACKER APPLICATION LOGIC
   ========================================================================== */

// Helper: UUID Generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Helper: Vibrate / Haptic simulation
function triggerHaptic(type) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        switch (type) {
            case 'light':
                navigator.vibrate(12);
                break;
            case 'medium':
                navigator.vibrate(35);
                break;
            case 'heavy':
                navigator.vibrate(60);
                break;
            case 'success':
                navigator.vibrate([30, 40, 30]);
                break;
            case 'warning':
                navigator.vibrate([40, 80]);
                break;
            case 'error':
                navigator.vibrate([80, 50, 80]);
                break;
        }
    }
}

// Helper: Toast Notification
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-msg show ${type}`;
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'warning') icon = 'alert-triangle';
    if (type === 'error') icon = 'alert-circle';
    
    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// State Manager
const Store = {
    state: {
        currentScreen: 'dashboard', // dashboard, giocatori, game
        activeGameId: null, // scopa, briscola, bisca, ciccopaolo, scala-quaranta, standard
        players: [],
        
        // Active Game Configurations
        currentGame: null,
        scopaGame: null,
        briscolaGame: null,
        biscaGame: null,
        ciccopaoloGame: null,
        scalaQuarantaGame: null
    },

    load() {
        const saved = localStorage.getItem('scorekeeper_state');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
                // Ensure screens default to dashboard on restart
                this.state.currentScreen = 'dashboard';
            } catch (e) {
                console.error("Error loading state", e);
            }
        }
    },

    save() {
        localStorage.setItem('scorekeeper_state', JSON.stringify(this.state));
    },

    // Player Actions
    addPlayer(name) {
        const trimmed = name.trim();
        if (!trimmed) return null;
        
        const duplicate = this.state.players.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
        if (duplicate) {
            showToast("Giocatore già esistente", "warning");
            return duplicate;
        }

        const newPlayer = {
            id: generateUUID(),
            name: trimmed,
            createdAt: new Date().toISOString()
        };
        this.state.players.push(newPlayer);
        this.save();
        triggerHaptic('success');
        return newPlayer;
    },

    deletePlayer(id) {
        // Check if player is currently in any active games
        const inUse = [
            this.state.currentGame,
            this.state.scopaGame,
            this.state.briscolaGame,
            this.state.biscaGame,
            this.state.ciccopaoloGame,
            this.state.scalaQuarantaGame
        ].some(game => {
            if (!game) return false;
            // standard points uses participantIds, others have .players array with id fields
            if (game.participantIds) return game.participantIds.includes(id);
            if (game.players) return game.players.some(p => p.id === id);
            return false;
        });

        if (inUse) {
            showToast("Impossibile eliminare: giocatore impegnato in una partita attiva", "error");
            triggerHaptic('error');
            return false;
        }

        this.state.players = this.state.players.filter(p => p.id !== id);
        this.save();
        triggerHaptic('warning');
        return true;
    },

    getPlayerName(id) {
        const p = this.state.players.find(x => x.id === id);
        return p ? p.name : "Sconosciuto";
    }
};

// CONFETTI CELEBRATION EFFECT
function triggerConfetti() {
    const container = document.getElementById('celebration-overlay');
    // Remove existing confetti
    const existing = container.querySelectorAll('.confetti-particle');
    existing.forEach(e => e.remove());

    const colors = ['#ff9500', '#ff3b30', '#007aff', '#34c759', '#af52de', '#ffba00'];
    
    for (let i = 0; i < 60; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-particle';
        p.style.position = 'absolute';
        p.style.width = Math.random() * 10 + 6 + 'px';
        p.style.height = Math.random() * 12 + 6 + 'px';
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        p.style.top = '-20px';
        p.style.left = Math.random() * 100 + '%';
        p.style.zIndex = '2100';
        p.style.opacity = Math.random() * 0.8 + 0.2;
        p.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        container.appendChild(p);

        // Simple animation using DOM animation APIs
        const duration = Math.random() * 2000 + 1500;
        const animation = p.animate([
            { transform: `translateY(0) rotate(0deg)`, opacity: p.style.opacity },
            { transform: `translateY(100vh) translateX(${Math.random() * 100 - 50}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
            iterations: 1
        });

        animation.onfinish = () => p.remove();
    }
}

// Celebration Overlay Manager
function openCelebration(winnerName, title, standingsHTML, onDismiss) {
    const overlay = document.getElementById('celebration-overlay');
    overlay.innerHTML = `
        <div class="celebration-trophy-container">
            <div class="circle-bg"></div>
            <div class="circle-dash"></div>
            <i data-lucide="crown"></i>
        </div>
        <h5>MATCH COMPLETATO</h5>
        <h2>${title}</h2>
        <h1>${winnerName}</h1>
        <div class="celebration-standings-card">
            <span class="standings-title">CLASSIFICA FINALE</span>
            <div class="standings-list">
                ${standingsHTML}
            </div>
        </div>
        <button id="btn-close-celebration" class="btn-primary color-red">Torna ai Giochi</button>
    `;
    
    overlay.classList.remove('hidden');
    lucide.createIcons();
    triggerHaptic('success');
    triggerConfetti();
    
    document.getElementById('btn-close-celebration').onclick = () => {
        overlay.classList.add('hidden');
        if (onDismiss) onDismiss();
    };
}

// Generic Modal Container Wrapper
function openOverlay(title, bodyHTML, onClose = null) {
    const container = document.getElementById('modal-container');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body-content').innerHTML = bodyHTML;
    container.classList.remove('hidden');
    lucide.createIcons();

    const closeBtn = document.getElementById('modal-close-btn');
    closeBtn.onclick = () => {
        closeOverlay();
        if (onClose) onClose();
    };
}

function closeOverlay() {
    const container = document.getElementById('modal-container');
    container.classList.add('hidden');
    document.getElementById('modal-body-content').innerHTML = '';
}

// Primiera Calculator Overlay Logic
const PrimieraCalc = {
    players: [], // [{ id, name }]
    settebelloWinnerId: null,
    onApply: null,
    
    activePlayerId: null,
    selections: {}, // { playerId: { suit: rankValue } }
    
    suits: [
        { id: 'denari', icon: '🪙', label: 'Denari', color: 'denari' },
        { id: 'coppe', icon: '🏆', label: 'Coppe', color: 'coppe' },
        { id: 'spade', icon: '⚔️', label: 'Spade', color: 'spade' },
        { id: 'bastoni', icon: '🪵', label: 'Bastoni', color: 'bastoni' }
    ],

    pointsMap: {
        '7': 21,
        '6': 18,
        'asso': 16,
        '5': 15,
        '4': 14,
        '3': 13,
        '2': 12,
        'fante': 10,
        'cavallo': 10,
        're': 10
    },

    displayNameMap: {
        'asso': 'Asso',
        '7': '7',
        '6': '6',
        '5': '5',
        '4': '4',
        '3': '3',
        '2': '2',
        'fante': 'Fante',
        'cavallo': 'Cavallo',
        're': 'Re'
    },

    init(players, currentSelections, settebelloWinnerId, onApply) {
        this.players = players;
        this.settebelloWinnerId = settebelloWinnerId;
        this.onApply = onApply;
        
        // Deep copy selections
        this.selections = {};
        players.forEach(p => {
            this.selections[p.id] = {};
        });
        
        if (currentSelections) {
            for (let pid in currentSelections) {
                if (this.selections[pid]) {
                    for (let suit in currentSelections[pid]) {
                        this.selections[pid][suit] = currentSelections[pid][suit].toString();
                    }
                }
            }
        } else if (settebelloWinnerId && this.selections[settebelloWinnerId]) {
            // Pre-fill Settebello for the settebello winner
            this.selections[settebelloWinnerId]['denari'] = '7';
        }
        
        this.activePlayerId = players[0].id;
        this.render();
    },

    getScore(playerId) {
        let total = 0;
        const playerSels = this.selections[playerId] || {};
        for (let suit in playerSels) {
            const rank = playerSels[suit];
            total += this.pointsMap[rank] || 0;
        }
        return total;
    },

    getWinner() {
        let maxScore = -1;
        let winnerId = null;
        let tie = false;
        
        this.players.forEach(p => {
            const score = this.getScore(p.id);
            if (score > maxScore) {
                maxScore = score;
                winnerId = p.id;
                tie = false;
            } else if (score === maxScore && score > 0) {
                tie = true;
            }
        });
        
        return (tie || maxScore <= 0) ? null : winnerId;
    },

    render() {
        const body = document.getElementById('modal-body-content');
        
        // 1. Info banner & Player selectors
        let playerTabs = '';
        this.players.forEach(p => {
            const isActive = this.activePlayerId === p.id;
            const score = this.getScore(p.id);
            
            // Generate mini icons representing selected suits
            let suitIcons = '';
            this.suits.forEach(s => {
                const hasSel = this.selections[p.id][s.id] !== undefined;
                suitIcons += `<span style="opacity: ${hasSel ? 1 : 0.2}; filter: grayscale(${hasSel ? 0 : 1}); margin: 0 1px;">${s.icon}</span>`;
            });

            playerTabs += `
                <div class="primiera-player-card ${isActive ? 'active' : ''}" data-player="${p.id}">
                    <span class="name">${p.name}</span>
                    <span class="score">${score} pt</span>
                    <div class="suits">${suitIcons}</div>
                </div>
            `;
        });

        // 2. Suits selector boxes
        let suitsHTML = '';
        this.suits.forEach(suit => {
            const selectedRank = this.selections[this.activePlayerId][suit.id];
            
            // Gather ranks selected by other players for this suit
            const takenRanks = new Set();
            this.players.forEach(p => {
                if (p.id !== this.activePlayerId) {
                    const r = this.selections[p.id][suit.id];
                    if (r) takenRanks.add(r);
                }
            });

            const hasSelClass = selectedRank ? 'has-selection' : '';
            const selText = selectedRank ? `${this.displayNameMap[selectedRank]} (${this.pointsMap[selectedRank]} pt)` : 'Nessuna';
            
            suitsHTML += `
                <div class="suit-box ${hasSelClass}">
                    <div class="suit-header">
                        <span class="suit-title ${suit.color}">${suit.icon} ${suit.label}</span>
                        <span class="suit-selection-badge" style="background-color: var(--accent-${suit.color}); color: #000; font-weight: bold">${selText}</span>
                    </div>
                    <div class="suit-grid">
                        <div class="suit-row">
                            ${this.renderRankBtn(suit.id, '7', true, takenRanks)}
                            ${this.renderRankBtn(suit.id, '6', true, takenRanks)}
                            ${this.renderRankBtn(suit.id, 'asso', true, takenRanks)}
                        </div>
                        <div class="suit-row">
                            ${this.renderRankBtn(suit.id, '5', false, takenRanks)}
                            ${this.renderRankBtn(suit.id, '4', false, takenRanks)}
                            ${this.renderRankBtn(suit.id, '3', false, takenRanks)}
                            ${this.renderRankBtn(suit.id, '2', false, takenRanks)}
                        </div>
                        <div class="suit-row">
                            ${this.renderRankBtn(suit.id, 'fante', false, takenRanks)}
                            ${this.renderRankBtn(suit.id, 'cavallo', false, takenRanks)}
                            ${this.renderRankBtn(suit.id, 're', false, takenRanks)}
                            <button class="rank-btn small btn-clear ${!selectedRank ? 'selected' : ''}" data-suit="${suit.id}" data-rank="clear">
                                <span class="rank-lbl">Cancella</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        // 3. Score display and apply button
        const winnerId = this.getWinner();
        let footerText = '';
        if (winnerId) {
            const wName = this.players.find(x => x.id === winnerId).name;
            footerText = `<span style="color: var(--trophy-gold); font-weight: bold; display: flex; align-items: center; gap: 4px;"><i data-lucide="crown" style="width: 16px; height: 16px;"></i> Vince ${wName}</span>`;
        } else {
            footerText = `<span style="color: var(--text-secondary); font-weight: bold;">Pareggio / Nessuno</span>`;
        }

        body.innerHTML = `
            <div class="primiera-banner">
                <i data-lucide="info"></i>
                <div>
                    <h5>Calcolatore Primiera</h5>
                    <p>Seleziona la carta più alta che ciascun giocatore possiede per seme.</p>
                </div>
            </div>
            
            <div class="primiera-players-row">
                ${playerTabs}
            </div>
            
            <div class="primiera-scroll-area" style="max-height: 380px; overflow-y: auto; padding-right: 4px;">
                ${suitsHTML}
            </div>

            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--card-stroke); display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 9px; font-weight: bold; color: var(--text-secondary); letter-spacing: 0.5px;">RISULTATO</span>
                    ${footerText}
                </div>
                <button id="btn-apply-primiera" class="btn-primary" style="width: auto; padding: 10px 20px;">Applica Vincitore</button>
            </div>
        `;
        
        lucide.createIcons();
        this.bindEvents();
    },

    renderRankBtn(suitId, rank, isLarge, takenRanks) {
        const activeSel = this.selections[this.activePlayerId][suitId];
        const isSelected = activeSel === rank;
        const isTaken = takenRanks.has(rank);
        const suitColor = this.suits.find(x => x.id === suitId).color;

        const disabledAttr = isTaken ? 'disabled' : '';
        const sizeClass = isLarge ? 'large' : 'small';
        const activeClass = isSelected ? `selected ${suitColor}` : '';
        
        return `
            <button class="rank-btn ${sizeClass} ${activeClass}" ${disabledAttr} data-suit="${suitId}" data-rank="${rank}">
                <span class="rank-lbl">${this.displayNameMap[rank]}</span>
                <span class="rank-pts">${this.pointsMap[rank]} pt</span>
            </button>
        `;
    },

    bindEvents() {
        // Player cards toggle
        const cards = document.querySelectorAll('.primiera-player-card');
        cards.forEach(card => {
            card.onclick = () => {
                const pid = card.dataset.player;
                this.activePlayerId = pid;
                triggerHaptic('light');
                this.render();
            };
        });

        // Rank click selection
        const rankBtns = document.querySelectorAll('.rank-btn');
        rankBtns.forEach(btn => {
            btn.onclick = () => {
                const suit = btn.dataset.suit;
                const rank = btn.dataset.rank;
                triggerHaptic('light');
                
                if (rank === 'clear') {
                    delete this.selections[this.activePlayerId][suit];
                } else {
                    this.selections[this.activePlayerId][suit] = rank;
                }
                this.render();
            };
        });

        // Apply
        document.getElementById('btn-apply-primiera').onclick = () => {
            triggerHaptic('success');
            const winnerId = this.getWinner();
            
            // Format details back to UUID -> SuitName -> RankValue(int/string)
            const details = {};
            this.players.forEach(p => {
                const pSels = this.selections[p.id] || {};
                const suitMap = {};
                let hasSelections = false;
                for (let suit in pSels) {
                    // map to rank indices or raw codes
                    // As in swift: card values are raw integer mappings:asso=1, sette=7, re=10
                    let rankInt = 0;
                    if (pSels[suit] === 'asso') rankInt = 1;
                    else if (pSels[suit] === 'fante') rankInt = 8;
                    else if (pSels[suit] === 'cavallo') rankInt = 9;
                    else if (pSels[suit] === 're') rankInt = 10;
                    else rankInt = parseInt(pSels[suit]);
                    
                    // Capitalize suit name for Swift compatibility (Denari, Coppe, Spade, Bastoni)
                    const suitCap = suit.charAt(0).toUpperCase() + suit.slice(1);
                    suitMap[suitCap] = rankInt;
                    hasSelections = true;
                }
                if (hasSelections) {
                    details[p.id] = suitMap;
                }
            });

            closeOverlay();
            if (this.onApply) {
                this.onApply(winnerId, Object.keys(details).length > 0 ? details : null);
            }
        };
    }
};

// UI Main Coordinator
const App = {
    init() {
        Store.load();
        this.bindEvents();
        this.renderDashboard();
    },

    bindEvents() {
        // Bottom Tab switching
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.onclick = () => {
                navItems.forEach(x => x.classList.remove('active'));
                item.classList.add('active');
                
                const tab = item.dataset.tab;
                triggerHaptic('light');
                
                if (tab === 'giochi') {
                    Store.state.currentScreen = 'dashboard';
                    document.getElementById('main-header').classList.remove('hidden');
                    document.getElementById('screen-giochi').classList.remove('hidden');
                    document.getElementById('screen-giocatori').classList.add('hidden');
                    document.getElementById('screen-game').classList.add('hidden');
                    this.renderDashboard();
                } else if (tab === 'giocatori') {
                    Store.state.currentScreen = 'giocatori';
                    document.getElementById('main-header').classList.remove('hidden');
                    document.getElementById('screen-giochi').classList.add('hidden');
                    document.getElementById('screen-giocatori').classList.remove('hidden');
                    document.getElementById('screen-game').classList.add('hidden');
                    this.renderPlayersList();
                }
            };
        });

        // Add Player submit
        const addPlayerForm = document.getElementById('add-player-form');
        addPlayerForm.onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById('new-player-name-input');
            const name = input.value;
            if (Store.addPlayer(name)) {
                input.value = '';
                showToast("Giocatore aggiunto con successo", "success");
                this.renderPlayersList();
            }
        };

        // Game card clicks on dashboard
        const cards = document.querySelectorAll('.game-card');
        cards.forEach(card => {
            card.onclick = () => {
                const gameId = card.dataset.game;
                triggerHaptic('light');
                this.openGame(gameId);
            };
        });
    },

    // View Routing
    openGame(gameId) {
        Store.state.currentScreen = 'game';
        Store.state.activeGameId = gameId;
        
        document.body.classList.add('game-active');
        document.getElementById('main-header').classList.add('hidden');
        document.getElementById('screen-giochi').classList.add('hidden');
        document.getElementById('screen-giocatori').classList.add('hidden');
        document.getElementById('screen-game').classList.remove('hidden');

        // Route render
        this.renderGamePanel(gameId);
    },

    goBack() {
        document.body.classList.remove('game-active');
        document.body.classList.remove('bisca-active-mode');
        Store.state.currentScreen = 'dashboard';
        Store.state.activeGameId = null;
        document.getElementById('main-header').classList.remove('hidden');
        document.getElementById('screen-giochi').classList.remove('hidden');
        document.getElementById('screen-game').classList.add('hidden');
        
        // Update tabs active state
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.dataset.tab === 'giochi') item.classList.add('active');
            else item.classList.remove('active');
        });

        this.renderDashboard();
    },

    // Rendering functions
    renderDashboard() {
        // Render horizontal scrolling player list
        const pList = document.getElementById('dashboard-players-list');
        let html = '';
        
        Store.state.players.forEach(p => {
            html += `
                <div class="player-pill">
                    <i data-lucide="user"></i>
                    <span>${p.name}</span>
                </div>
            `;
        });
        
        html += `
            <div class="player-pill add-btn" id="btn-quick-add-player">
                <i data-lucide="plus"></i>
                <span>Nuovo</span>
            </div>
        `;
        
        pList.innerHTML = html;
        lucide.createIcons();

        // Dashboard active game indicators
        const activeGames = {
            'scopa': Store.state.scopaGame && Store.state.scopaGame.isActive,
            'briscola': Store.state.briscolaGame && Store.state.briscolaGame.isActive,
            'bisca': Store.state.biscaGame && Store.state.biscaGame.isActive,
            'ciccopaolo': Store.state.ciccopaoloGame && Store.state.ciccopaoloGame.isActive,
            'scala-quaranta': Store.state.scalaQuarantaGame && Store.state.scalaQuarantaGame.isActive,
            'standard': Store.state.currentGame && !Store.state.currentGame.isCompleted
        };

        for (let gameId in activeGames) {
            const badge = document.getElementById(`badge-${gameId}`);
            if (activeGames[gameId]) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        // Quick add action
        document.getElementById('btn-quick-add-player').onclick = () => {
            triggerHaptic('light');
            openOverlay("Aggiungi Giocatore", `
                <form id="quick-add-player-form" class="inline-form" style="margin-top: 10px;">
                    <input type="text" id="quick-player-name" placeholder="Nome Giocatore" required autocomplete="off">
                    <button type="submit" class="btn-primary" style="width: auto; padding: 12px 20px;">Salva</button>
                </form>
            `);
            
            document.getElementById('quick-add-player-form').onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('quick-player-name').value;
                if (Store.addPlayer(name)) {
                    closeOverlay();
                    showToast("Giocatore aggiunto", "success");
                    this.renderDashboard();
                }
            };
        };
    },

    renderPlayersList() {
        const title = document.getElementById('players-list-title');
        title.textContent = `GIOCATORI SALVATI (${Store.state.players.length})`;
        
        const list = document.getElementById('full-players-list');
        if (Store.state.players.length === 0) {
            list.innerHTML = `
                <div class="empty-placeholder">
                    <i data-lucide="users"></i>
                    <h4>Nessun Giocatore</h4>
                    <p>Aggiungi giocatori sopra per iniziare a tracciare i punteggi delle partite.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        let html = '';
        Store.state.players.forEach(p => {
            html += `
                <div class="player-row">
                    <div class="player-row-info">
                        <i data-lucide="user"></i>
                        <span>${p.name}</span>
                    </div>
                    <button class="btn-delete" data-id="${p.id}"><i data-lucide="trash-2"></i></button>
                </div>
            `;
        });
        list.innerHTML = html;
        lucide.createIcons();

        // Bind deletes
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                if (confirm(`Sei sicuro di voler eliminare ${Store.getPlayerName(id)}?`)) {
                    if (Store.deletePlayer(id)) {
                        showToast("Giocatore eliminato", "success");
                        this.renderPlayersList();
                    }
                }
            };
        });
    },

    renderGamePanel(gameId) {
        const container = document.getElementById('game-container');
        container.innerHTML = ''; // Clear

        switch (gameId) {
            case 'standard':
                if (Store.state.currentGame) this.renderActiveStandard();
                else this.renderSetupStandard();
                break;
            case 'scopa':
                if (Store.state.scopaGame && Store.state.scopaGame.isActive) this.renderActiveScopa();
                else this.renderSetupScopa();
                break;
            case 'briscola':
                if (Store.state.briscolaGame && Store.state.briscolaGame.isActive) this.renderActiveBriscola();
                else this.renderSetupBriscola();
                break;
            case 'bisca':
                if (Store.state.biscaGame && Store.state.biscaGame.isActive) this.renderActiveBisca();
                else this.renderSetupBisca();
                break;
            case 'ciccopaolo':
                if (Store.state.ciccopaoloGame && Store.state.ciccopaoloGame.isActive) this.renderActiveCiccopaolo();
                else this.renderSetupCiccopaolo();
                break;
            case 'scala-quaranta':
                if (Store.state.scalaQuarantaGame && Store.state.scalaQuarantaGame.isActive) this.renderActiveScalaQuaranta();
                else this.renderSetupScalaQuaranta();
                break;
        }
    },

    // ==========================================================================
    // 1. STANDARD GAME LOGIC & RENDERING
    // ==========================================================================
    renderSetupStandard() {
        const container = document.getElementById('game-container');
        const selectedIds = new Set();

        const buildList = () => {
            let html = '';
            Store.state.players.forEach(p => {
                const isSel = selectedIds.has(p.id);
                html += `
                    <div class="setup-player-item ${isSel ? 'selected' : ''}" data-id="${p.id}">
                        <span>${p.name}</span>
                        <div class="checkbox-circle">
                            ${isSel ? '<i data-lucide="check"></i>' : ''}
                        </div>
                    </div>
                `;
            });
            return html;
        };

        container.innerHTML = `
            <div class="game-view-header">
                <button id="btn-setup-back" class="btn-back"><i data-lucide="arrow-left"></i> Giochi</button>
                <h2>Nuova Partita</h2>
            </div>
            
            <div class="setup-container">
                <div class="setup-column-settings">
                    <div class="settings-card">
                        <span class="card-section-title">AGGIUNGI RAPIDO</span>
                        <form id="setup-add-player-form" class="inline-form">
                            <input type="text" id="setup-player-name" placeholder="Nome Giocatore" required autocomplete="off">
                            <button type="submit" class="btn-icon-accent"><i data-lucide="plus-circle"></i></button>
                        </form>
                    </div>
                </div>

                <div class="setup-column-players">
                    <div class="settings-card">
                        <span class="card-section-title">SELEZIONA PARTECIPANTI (MIN. 2)</span>
                        <div id="setup-players-list-container" class="setup-players-list">
                            ${buildList()}
                        </div>
                        <button id="btn-start-game" class="btn-primary" disabled>Inizia Partita</button>
                    </div>
                </div>
            </div>
        `;
        
        lucide.createIcons();

        // Back action
        document.getElementById('btn-setup-back').onclick = () => this.goBack();

        // Toggle player selections
        const bindToggles = () => {
            const items = container.querySelectorAll('.setup-player-item');
            items.forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    triggerHaptic('light');
                    if (selectedIds.has(id)) {
                        selectedIds.delete(id);
                    } else {
                        selectedIds.add(id);
                    }
                    
                    // Render list and update button
                    document.getElementById('setup-players-list-container').innerHTML = buildList();
                    lucide.createIcons();
                    bindToggles();
                    
                    const startBtn = document.getElementById('btn-start-game');
                    if (selectedIds.size >= 2) {
                        startBtn.disabled = false;
                        startBtn.classList.remove('disabled');
                    } else {
                        startBtn.disabled = true;
                        startBtn.classList.add('disabled');
                    }
                };
            });
        };
        bindToggles();

        // Add player form
        document.getElementById('setup-add-player-form').onsubmit = (e) => {
            e.preventDefault();
            const input = document.getElementById('setup-player-name');
            const newP = Store.addPlayer(input.value);
            if (newP) {
                selectedIds.add(newP.id);
                input.value = '';
                document.getElementById('setup-players-list-container').innerHTML = buildList();
                lucide.createIcons();
                bindToggles();
                
                const startBtn = document.getElementById('btn-start-game');
                if (selectedIds.size >= 2) {
                    startBtn.disabled = false;
                    startBtn.classList.remove('disabled');
                } else {
                    startBtn.disabled = true;
                    startBtn.classList.add('disabled');
                }
            }
        };

        // Start button action
        document.getElementById('btn-start-game').onclick = () => {
            triggerHaptic('success');
            const arr = Array.from(selectedIds);
            
            // SetupcurrentGame
            const activeScores = {};
            arr.forEach(id => activeScores[id] = 0);

            Store.state.currentGame = {
                id: generateUUID(),
                date: new Date().toISOString(),
                participantIds: arr,
                rounds: [],
                isCompleted: false,
                activeScores: activeScores,
                activeRoundWinnerId: null
            };
            Store.save();
            this.renderActiveStandard();
        };
    },

    renderActiveStandard() {
        const game = Store.state.currentGame;
        const container = document.getElementById('game-container');

        // 1. Calculate stats (round wins, total scores)
        const roundWins = {};
        const totalScores = {};
        game.participantIds.forEach(id => {
            roundWins[id] = 0;
            totalScores[id] = 0;
        });

        game.rounds.forEach(r => {
            if (r.winnerId && roundWins[r.winnerId] !== undefined) {
                roundWins[r.winnerId]++;
            }
            game.participantIds.forEach(id => {
                totalScores[id] += (r.scores[id] || 0);
            });
        });

        // 2. Build header stats
        const activeCount = game.participantIds.length;
        const roundNum = game.rounds.length + 1;

        // 3. Round wins horizontal scroll list
        let winsCardsHTML = '';
        game.participantIds.forEach(id => {
            const name = Store.getPlayerName(id);
            const wins = roundWins[id];
            const hasWins = wins > 0;
            winsCardsHTML += `
                <div class="win-card ${hasWins ? 'gold-border' : ''}">
                    <i data-lucide="crown"></i>
                    <div class="win-card-info">
                        <span class="name">${name}</span>
                        <span class="wins-count">${wins}</span>
                    </div>
                </div>
            `;
        });

        // 4. Participant score adjusting list
        let participantsCardsHTML = '';
        game.participantIds.forEach(id => {
            const name = Store.getPlayerName(id);
            const total = totalScores[id];
            const roundScore = game.activeScores[id] || 0;
            const sign = roundScore >= 0 ? '+' : '';
            const signClass = roundScore > 0 ? 'positive' : (roundScore < 0 ? 'negative' : 'neutral');

            participantsCardsHTML += `
                <div class="participant-card">
                    <div class="participant-info">
                        <h4>${name}</h4>
                        <span class="sub">Totale: ${total}</span>
                    </div>
                    <div class="score-adjuster">
                        <button class="adjust-btn minus" data-id="${id}">-</button>
                        <span class="adjust-value ${signClass}">${sign}${roundScore}</span>
                        <button class="adjust-btn plus" data-id="${id}">+</button>
                    </div>
                </div>
            `;
        });

        // 5. Rounds history rows
        let historyHTML = '';
        if (game.rounds.length > 0) {
            let roundsReversed = [...game.rounds].reverse();
            roundsReversed.forEach((round, revIndex) => {
                const actualIndex = game.rounds.length - 1 - revIndex;
                let scoresHTML = '';
                game.participantIds.forEach(id => {
                    const name = Store.getPlayerName(id);
                    const pts = round.scores[id] || 0;
                    const sign = pts >= 0 ? '+' : '';
                    const ptClass = pts > 0 ? 'positive' : (pts < 0 ? 'negative' : 'neutral');
                    scoresHTML += `
                        <div class="round-score-pill">
                            <span class="name">${name}</span>
                            <span class="val ${ptClass}">${sign}${pts}</span>
                        </div>
                    `;
                });

                let crownHTML = '';
                if (round.winnerId) {
                    crownHTML = `
                        <span class="round-winner">
                            <i data-lucide="crown"></i>
                            ${Store.getPlayerName(round.winnerId)}
                        </span>
                    `;
                }

                historyHTML += `
                    <div class="round-history-row">
                        <div class="round-row-header">
                            <span class="round-number">Round ${round.roundNumber}</span>
                            ${crownHTML}
                        </div>
                        <div class="round-row-details">
                            ${scoresHTML}
                        </div>
                        <div class="round-row-footer">
                            <span class="round-note">${round.note || ''}</span>
                            <button class="btn-row-action btn-delete-round" data-idx="${actualIndex}">
                                <i data-lucide="trash-2" style="width:12px;height:12px;color:var(--accent-red)"></i>
                                <span>Elimina</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <div class="game-view-header">
                <button id="btn-active-back" class="btn-back"><i data-lucide="arrow-left"></i> Esci</button>
                <div class="game-toolbar">
                    <button id="btn-active-reset" class="btn-toolbar-circle"><i data-lucide="rotate-ccw"></i></button>
                    <button id="btn-active-end" class="btn-toolbar-pill"><i data-lucide="flag"></i> Termina</button>
                </div>
            </div>

            <div class="info-capsules">
                <span class="capsule">Giocatori: ${activeCount}</span>
                <span class="capsule right">Round: ${roundNum}</span>
            </div>

            <div class="round-wins-section">
                <span class="round-wins-title">ROUND VINTI</span>
                <div class="round-wins-scroll">
                    <div class="round-wins-list">
                        ${winsCardsHTML}
                    </div>
                </div>
            </div>

            <div class="participants-list">
                ${participantsCardsHTML}
            </div>

            <button id="btn-finish-round" class="btn-primary" style="margin-top: 10px;"><i data-lucide="check-circle"></i> Termina Round</button>

            <!-- Round History -->
            <div class="rounds-history-section">
                <span class="section-title">STORICO ROUND</span>
                <div class="rounds-list">
                    ${historyHTML || '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px">Nessun round registrato.</div>'}
                </div>
            </div>
        `;

        lucide.createIcons();

        // Actions: Back
        document.getElementById('btn-active-back').onclick = () => this.goBack();

        // Actions: Adjust Scores
        container.querySelectorAll('.adjust-btn.plus').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                game.activeScores[id]++;
                triggerHaptic('light');
                Store.save();
                this.renderActiveStandard();
            };
        });

        container.querySelectorAll('.adjust-btn.minus').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                game.activeScores[id]--;
                triggerHaptic('light');
                Store.save();
                this.renderActiveStandard();
            };
        });

        // Actions: Delete Round
        container.querySelectorAll('.btn-delete-round').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                if (confirm(`Eliminare il round ${game.rounds[idx].roundNumber}?`)) {
                    triggerHaptic('warning');
                    game.rounds.splice(idx, 1);
                    // Re-index round numbers
                    game.rounds.forEach((r, i) => r.roundNumber = i + 1);
                    Store.save();
                    this.renderActiveStandard();
                }
            };
        });

        // Actions: Reset scores
        document.getElementById('btn-active-reset').onclick = () => {
            if (confirm("Vuoi azzerare tutti i punteggi e i round di questa partita? I dati andranno persi.")) {
                triggerHaptic('warning');
                game.rounds = [];
                game.participantIds.forEach(id => game.activeScores[id] = 0);
                game.activeRoundWinnerId = null;
                Store.save();
                this.renderActiveStandard();
            }
        };

        // Actions: Termina Round Modal Popup
        document.getElementById('btn-finish-round').onclick = () => {
            triggerHaptic('medium');
            
            // Build player choices for winner
            let choicesHTML = '';
            // Default selected winner is whoever has max points in active round
            let maxPoints = -99999;
            let preselectedWinnerId = null;
            game.participantIds.forEach(id => {
                const pts = game.activeScores[id] || 0;
                if (pts > maxPoints) {
                    maxPoints = pts;
                    preselectedWinnerId = id;
                }
            });
            if (maxPoints <= 0) preselectedWinnerId = null;

            game.participantIds.forEach(id => {
                const name = Store.getPlayerName(id);
                const pts = game.activeScores[id] || 0;
                const sign = pts >= 0 ? '+' : '';
                const ptClass = pts > 0 ? 'positive' : (pts < 0 ? 'negative' : 'neutral');
                const isWinner = preselectedWinnerId === id;

                choicesHTML += `
                    <div class="selector-row select-winner-row ${isWinner ? 'winner-active' : ''}" data-id="${id}" style="cursor:pointer; transition: background 0.2s; padding:12px;">
                        <div>
                            <span style="font-weight:bold; font-size:15px;">${name}</span><br>
                            <span class="${ptClass}" style="font-size:12px;">Punti in questo round: ${sign}${pts}</span>
                        </div>
                        <div class="crown-slot" style="color: var(--trophy-gold)">
                            ${isWinner ? '<i data-lucide="crown"></i>' : ''}
                        </div>
                    </div>
                `;
            });

            const bodyHTML = `
                <span class="form-section-title">CHI HA VINTO IL ROUND?</span>
                <div class="winner-selector-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
                    ${choicesHTML}
                </div>
                
                <span class="form-section-title">NOTA ROUND (OPZIONALE)</span>
                <input type="text" id="round-note-input" placeholder="Es. 'Mano fortunata'" autocomplete="off" style="width:100%; margin-bottom:20px;">
                
                <div style="display:flex; gap:10px;">
                    <button id="btn-save-round" class="btn-primary" style="flex:1;">Nuovo Round</button>
                    <button id="btn-save-and-end" class="btn-primary color-red" style="flex:1;">Termina Partita</button>
                </div>
            `;

            openOverlay(`Fine Round ${roundNum}`, bodyHTML);
            
            let activeWinnerId = preselectedWinnerId;

            // Bind winner clicks
            const rows = document.querySelectorAll('.select-winner-row');
            rows.forEach(row => {
                row.onclick = () => {
                    const id = row.dataset.id;
                    triggerHaptic('light');
                    if (activeWinnerId === id) {
                        activeWinnerId = null; // Toggle off
                        rows.forEach(r => {
                            r.classList.remove('winner-active');
                            r.querySelector('.crown-slot').innerHTML = '';
                        });
                    } else {
                        activeWinnerId = id;
                        rows.forEach(r => {
                            const rId = r.dataset.id;
                            if (rId === activeWinnerId) {
                                r.classList.add('winner-active');
                                r.querySelector('.crown-slot').innerHTML = '<i data-lucide="crown"></i>';
                            } else {
                                r.classList.remove('winner-active');
                                r.querySelector('.crown-slot').innerHTML = '';
                            }
                        });
                        lucide.createIcons();
                    }
                };
            });

            // Action: Save Round
            const saveRound = (shouldEndGame = false) => {
                const note = document.getElementById('round-note-input').value.trim();
                const roundScores = { ...game.activeScores };
                
                // Add round to game state
                game.rounds.push({
                    id: generateUUID(),
                    roundNumber: game.rounds.length + 1,
                    scores: roundScores,
                    winnerId: activeWinnerId,
                    note: note || null
                });

                // Reset active scores
                game.participantIds.forEach(id => game.activeScores[id] = 0);
                game.activeRoundWinnerId = null;
                
                if (shouldEndGame) {
                    closeOverlay();
                    this.endStandardGameAction();
                } else {
                    Store.save();
                    closeOverlay();
                    showToast("Round salvato", "success");
                    this.renderActiveStandard();
                }
            };

            document.getElementById('btn-save-round').onclick = () => saveRound(false);
            document.getElementById('btn-save-and-end').onclick = () => saveRound(true);
        };

        // Actions: End Game Button
        document.getElementById('btn-active-end').onclick = () => {
            const hasScores = Object.values(game.activeScores).some(v => v !== 0);
            let msg = "Sei sicuro di voler terminare e salvare la partita?";
            if (hasScores) {
                msg = "Attenzione: hai dei punteggi non salvati nel round in corso. Se termini la partita adesso, questi punteggi andranno persi. Sei sicuro?";
            }
            
            if (confirm(msg)) {
                this.endStandardGameAction();
            }
        };
    },

    endStandardGameAction() {
        const game = Store.state.currentGame;
        
        // Compute final standings
        const totalScores = {};
        const roundWins = {};
        game.participantIds.forEach(id => {
            totalScores[id] = 0;
            roundWins[id] = 0;
        });

        game.rounds.forEach(r => {
            if (r.winnerId) roundWins[r.winnerId]++;
            game.participantIds.forEach(id => {
                totalScores[id] += (r.scores[id] || 0);
            });
        });

        // Sort: round wins descending, then total score descending
        const sortedIds = [...game.participantIds].sort((a, b) => {
            const winsA = roundWins[a] || 0;
            const winsB = roundWins[b] || 0;
            if (winsA === winsB) {
                return totalScores[b] - totalScores[a];
            }
            return winsB - winsA;
        });

        let standingsHTML = '';
        sortedIds.forEach((id, index) => {
            const name = Store.getPlayerName(id);
            const score = totalScores[id];
            const wins = roundWins[id];
            const isWinner = index === 0;

            standingsHTML += `
                <div class="standings-entry ${isWinner ? 'winner' : ''}">
                    <span class="standings-pos">${index + 1}</span>
                    <span class="standings-name">${name}</span>
                    <span class="standings-score">${wins}🏆 (${score >= 0 ? '+' : ''}${score})</span>
                </div>
            `;
        });

        const winnerName = Store.getPlayerName(sortedIds[0]);

        // End active standard game state
        Store.state.currentGame = null;
        Store.save();

        openCelebration(winnerName, "Vincitore Punti (Standard)", standingsHTML, () => {
            this.goBack();
        });
    },

    // ==========================================================================
    // 2. SCOPA GAME LOGIC & RENDERING
    // ==========================================================================
    renderSetupScopa() {
        const container = document.getElementById('game-container');
        let targetScore = 11;
        const selectedIds = new Set();

        const buildList = () => {
            let html = '';
            Store.state.players.forEach(p => {
                const isSel = selectedIds.has(p.id);
                html += `
                    <div class="setup-player-item ${isSel ? 'selected' : ''}" data-id="${p.id}">
                        <span>${p.name}</span>
                        <div class="checkbox-circle">
                            ${isSel ? '<i data-lucide="check"></i>' : ''}
                        </div>
                    </div>
                `;
            });
            return html;
        };

        const renderSetup = () => {
            container.innerHTML = `
                <div class="game-view-header">
                    <button id="btn-setup-back" class="btn-back"><i data-lucide="arrow-left"></i> Giochi</button>
                    <h2>Nuova Partita Scopa</h2>
                </div>
                
                <div class="setup-container">
                    <div class="setup-column-settings">
                        <div class="settings-card">
                            <span class="card-section-title">PUNTEGGIO DI ARRIVO</span>
                            <div class="options-grid">
                                <button class="option-btn scopa-target-opt ${targetScore === 11 ? 'selected color-orange' : ''}" data-val="11">11 pt</button>
                                <button class="option-btn scopa-target-opt ${targetScore === 21 ? 'selected color-orange' : ''}" data-val="21">21 pt</button>
                            </div>
                            
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
                                <span style="font-size:13px; color:var(--text-secondary);">Target personalizzato:</span>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <input type="number" id="scopa-custom-target" value="${targetScore}" min="5" max="99" style="width: 80px; padding: 6px 12px; text-align:center;">
                                </div>
                            </div>
                        </div>

                        <div class="settings-card">
                            <span class="card-section-title">AGGIUNGI RAPIDO</span>
                            <form id="setup-add-player-form" class="inline-form">
                                <input type="text" id="setup-player-name" placeholder="Nome Giocatore" required autocomplete="off">
                                <button type="submit" class="btn-icon-accent" style="background-color: var(--accent-orange)"><i data-lucide="plus-circle"></i></button>
                            </form>
                        </div>
                    </div>

                    <div class="setup-column-players">
                        <div class="settings-card">
                            <span class="card-section-title">SELEZIONA GIOCATORI (ESATTAMENTE 2)</span>
                            <div id="setup-players-list-container" class="setup-players-list">
                                ${buildList()}
                            </div>
                            <button id="btn-start-game" class="btn-primary color-orange" disabled>Inizia Scopa</button>
                        </div>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            bindSetupEvents();
        };

        const bindSetupEvents = () => {
            // Update start button state
            const startBtn = document.getElementById('btn-start-game');
            if (selectedIds.size === 2) {
                startBtn.disabled = false;
                startBtn.classList.remove('disabled');
            } else {
                startBtn.disabled = true;
                startBtn.classList.add('disabled');
            }

            // Target options
            container.querySelectorAll('.scopa-target-opt').forEach(btn => {
                btn.onclick = () => {
                    targetScore = parseInt(btn.dataset.val);
                    triggerHaptic('light');
                    document.getElementById('scopa-custom-target').value = targetScore;
                    container.querySelectorAll('.scopa-target-opt').forEach(x => x.classList.remove('selected', 'color-orange'));
                    btn.classList.add('selected', 'color-orange');
                };
            });

            // Target input
            const customInput = document.getElementById('scopa-custom-target');
            customInput.onchange = () => {
                let val = parseInt(customInput.value);
                if (isNaN(val) || val < 5) val = 5;
                if (val > 99) val = 99;
                targetScore = val;
                customInput.value = val;
                // De-select option buttons if not 11 or 21
                container.querySelectorAll('.scopa-target-opt').forEach(btn => {
                    const optVal = parseInt(btn.dataset.val);
                    if (optVal === targetScore) {
                        btn.classList.add('selected', 'color-orange');
                    } else {
                        btn.classList.remove('selected', 'color-orange');
                    }
                });
            };

            // Player toggles
            const items = container.querySelectorAll('.setup-player-item');
            items.forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    triggerHaptic('light');
                    if (selectedIds.has(id)) {
                        selectedIds.delete(id);
                    } else {
                        if (selectedIds.size < 2) {
                            selectedIds.add(id);
                        } else {
                            // Replace first selection to enforce max 2
                            const first = selectedIds.values().next().value;
                            selectedIds.delete(first);
                            selectedIds.add(id);
                        }
                    }

                    document.getElementById('setup-players-list-container').innerHTML = buildList();
                    lucide.createIcons();
                    bindSetupEvents();
                };
            });

            // Back back
            document.getElementById('btn-setup-back').onclick = () => this.goBack();

            // Add player
            document.getElementById('setup-add-player-form').onsubmit = (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('setup-player-name');
                const newP = Store.addPlayer(nameInput.value);
                if (newP) {
                    nameInput.value = '';
                    if (selectedIds.size < 2) selectedIds.add(newP.id);
                    renderSetup();
                }
            };

            // Start game
            document.getElementById('btn-start-game').onclick = () => {
                triggerHaptic('success');
                const ids = Array.from(selectedIds);
                const playersData = ids.map(id => ({
                    id: id,
                    name: Store.getPlayerName(id),
                    currentScore: 0
                }));

                Store.state.scopaGame = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    targetScore: targetScore,
                    players: playersData,
                    rounds: [],
                    isActive: true
                };
                Store.save();
                this.renderActiveScopa();
            };
        };

        renderSetup();
    },

    renderActiveScopa() {
        const game = Store.state.scopaGame;
        const container = document.getElementById('game-container');

        // 1. Render dual scoreboard
        const p1 = game.players[0];
        const p2 = game.players[1];

        // 2. Build history smazzate
        let historyHTML = '';
        if (game.rounds.length > 0) {
            let reversedRounds = [...game.rounds].reverse();
            reversedRounds.forEach((round, revIndex) => {
                const actualIndex = game.rounds.length - 1 - revIndex;
                const pts1 = this.calculateRoundPointsScopa(round, p1.id);
                const pts2 = this.calculateRoundPointsScopa(round, p2.id);

                const getBadgeClass = (winnerId, matchId) => {
                    return winnerId === matchId ? 'active' : '';
                };

                const scopeCount1 = round.scopeScores[p1.id] || 0;
                const scopeCount2 = round.scopeScores[p2.id] || 0;
                const napolaCount1 = round.napolaScores[p1.id] || 0;
                const napolaCount2 = round.napolaScores[p2.id] || 0;

                let scopeTexts = [];
                if (scopeCount1 > 0) scopeTexts.push(`${p1.name} (${scopeCount1})`);
                if (scopeCount2 > 0) scopeTexts.push(`${p2.name} (${scopeCount2})`);

                let napolaTexts = [];
                if (napolaCount1 > 0) napolaTexts.push(`${p1.name} (+${napolaCount1})`);
                if (napolaCount2 > 0) napolaTexts.push(`${p2.name} (+${napolaCount2})`);

                historyHTML += `
                    <div class="round-history-row" style="cursor:pointer;" data-idx="${actualIndex}">
                        <div class="round-row-header">
                            <span class="round-number">Smazzata ${round.roundNumber}</span>
                            <div style="display:flex; gap:6px;">
                                <span class="small-badge ${getBadgeClass(round.primieraWinnerId, p1.id)}">+${pts1} ${p1.name}</span>
                                <span class="small-badge ${getBadgeClass(round.primieraWinnerId, p2.id)}">+${pts2} ${p2.name}</span>
                            </div>
                        </div>
                        <div class="badge-row">
                            <span class="small-badge ${round.primieraWinnerId === p1.id ? 'active' : (round.primieraWinnerId === p2.id ? 'active green' : '')}">PRIM: ${round.primieraWinnerId ? Store.getPlayerName(round.primieraWinnerId) : '-'}</span>
                            <span class="small-badge ${round.settebelloWinnerId === p1.id ? 'active' : (round.settebelloWinnerId === p2.id ? 'active green' : '')}">SETT: ${round.settebelloWinnerId ? Store.getPlayerName(round.settebelloWinnerId) : '-'}</span>
                            <span class="small-badge ${round.carteWinnerId === p1.id ? 'active' : (round.carteWinnerId === p2.id ? 'active green' : '')}">CART: ${round.carteWinnerId ? Store.getPlayerName(round.carteWinnerId) : '-'}</span>
                            <span class="small-badge ${round.denariWinnerId === p1.id ? 'active' : (round.denariWinnerId === p2.id ? 'active green' : '')}">DENA: ${round.denariWinnerId ? Store.getPlayerName(round.denariWinnerId) : '-'}</span>
                        </div>
                        <div class="round-row-footer" style="margin-top:6px;">
                            <div style="display:flex; flex-direction:column; gap:2px; font-size:10px; color:var(--text-secondary);">
                                ${scopeTexts.length > 0 ? `<span>Scope: ${scopeTexts.join(' - ')}</span>` : ''}
                                ${napolaTexts.length > 0 ? `<span>Napola: ${napolaTexts.join(' - ')}</span>` : ''}
                            </div>
                            <button class="btn-row-action btn-delete-scopa-round" data-idx="${actualIndex}">
                                <i data-lucide="trash-2" style="width:11px; height:11px; color:var(--accent-red)"></i>
                                <span>Elimina</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <div class="game-view-header">
                <button id="btn-active-back" class="btn-back"><i data-lucide="arrow-left"></i> Esci</button>
                <div class="game-toolbar">
                    <button id="btn-active-reset" class="btn-toolbar-circle"><i data-lucide="rotate-ccw"></i></button>
                    <button id="btn-active-end" class="btn-toolbar-circle" style="color:var(--accent-red)"><i data-lucide="x-circle"></i></button>
                </div>
            </div>

            <div class="info-capsules">
                <span class="capsule">Partita a Scopa</span>
                <span class="capsule right">Obiettivo: ${game.targetScore} pt</span>
            </div>

            <div class="dual-scoreboard">
                <div class="score-column">
                    <span class="name">${p1.name}</span>
                    <span class="score-num">${p1.currentScore}</span>
                </div>
                <div class="score-divider"></div>
                <div class="score-column">
                    <span class="name">${p2.name}</span>
                    <span class="score-num">${p2.currentScore}</span>
                </div>
            </div>

            <button id="btn-add-scopa-round" class="btn-primary color-orange" style="margin-top:10px;"><i data-lucide="plus-circle"></i> Nuova Smazzata (Inserisci Punti)</button>

            <div class="rounds-history-section">
                <span class="section-title">STORICO SMAZZATE</span>
                <div class="rounds-list">
                    ${historyHTML || `
                        <div class="empty-placeholder" style="padding: 30px 10px;">
                            <i data-lucide="diamond"></i>
                            <h4>Nessuna smazzata</h4>
                            <p>Esegui la smazzata e inserisci i punti per iniziare.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        lucide.createIcons();

        // Bind events: Back, Reset, Cancel
        document.getElementById('btn-active-back').onclick = () => this.goBack();
        
        document.getElementById('btn-active-reset').onclick = () => {
            if (confirm("Sei sicuro di voler azzerare il punteggio e i round della partita corrente?")) {
                triggerHaptic('warning');
                game.rounds = [];
                game.players.forEach(p => p.currentScore = 0);
                Store.save();
                this.renderActiveScopa();
            }
        };

        document.getElementById('btn-active-end').onclick = () => {
            if (confirm("Sei sicuro di voler uscire e annullare questa partita? I dati andranno persi.")) {
                triggerHaptic('error');
                Store.state.scopaGame = null;
                Store.save();
                this.goBack();
            }
        };

        // Actions: Delete round
        container.querySelectorAll('.btn-delete-scopa-round').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation(); // Stop opening round detail
                const idx = parseInt(btn.dataset.idx);
                if (confirm(`Eliminare la smazzata ${game.rounds[idx].roundNumber}?`)) {
                    triggerHaptic('warning');
                    game.rounds.splice(idx, 1);
                    // Recompute scores and numbers
                    game.rounds.forEach((r, i) => r.roundNumber = i + 1);
                    game.players.forEach(p => {
                        p.currentScore = game.rounds.reduce((sum, r) => sum + this.calculateRoundPointsScopa(r, p.id), 0);
                    });
                    Store.save();
                    this.renderActiveScopa();
                }
            };
        });

        // Actions: Click round card to edit
        container.querySelectorAll('.round-history-row').forEach(row => {
            row.onclick = () => {
                const idx = parseInt(row.dataset.idx);
                this.openAddRoundScopaModal(game.rounds[idx]);
            };
        });

        // Add round button
        document.getElementById('btn-add-scopa-round').onclick = () => {
            triggerHaptic('medium');
            this.openAddRoundScopaModal(null);
        };
    },

    calculateRoundPointsScopa(round, playerId) {
        let total = 0;
        if (round.primieraWinnerId === playerId) total += 1;
        if (round.settebelloWinnerId === playerId) total += 1;
        if (round.carteWinnerId === playerId) total += 1;
        if (round.denariWinnerId === playerId) total += 1;
        total += (round.scopeScores[playerId] || 0);
        total += (round.napolaScores[playerId] || 0);
        return total;
    },

    openAddRoundScopaModal(roundToEdit = null) {
        const game = Store.state.scopaGame;
        const p1 = game.players[0];
        const p2 = game.players[1];

        // State variables inside modal
        let primieraWinnerId = roundToEdit ? roundToEdit.primieraWinnerId : null;
        let settebelloWinnerId = roundToEdit ? roundToEdit.settebelloWinnerId : null;
        let carteWinnerId = roundToEdit ? roundToEdit.carteWinnerId : null;
        let denariWinnerId = roundToEdit ? roundToEdit.denariWinnerId : null;
        
        const scopeScores = {};
        const napolaScores = {};
        scopeScores[p1.id] = roundToEdit ? (roundToEdit.scopeScores[p1.id] || 0) : 0;
        scopeScores[p2.id] = roundToEdit ? (roundToEdit.scopeScores[p2.id] || 0) : 0;
        napolaScores[p1.id] = roundToEdit ? (roundToEdit.napolaScores[p1.id] || 0) : 0;
        napolaScores[p2.id] = roundToEdit ? (roundToEdit.napolaScores[p2.id] || 0) : 0;

        let primieraDetails = roundToEdit ? roundToEdit.primieraDetails : null;

        const getActiveCls = (winnerId, matchId, color = 'orange') => {
            return winnerId === matchId ? `active ${color}` : '';
        };

        const renderBody = () => {
            const bodyHTML = `
                <span class="form-section-title">PUNTI CLASSICI SCOPA (1 PT CIASCUNO)</span>
                <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
                    <!-- Primiera -->
                    <div class="selector-row">
                        <span class="selector-row-title">Primiera</span>
                        <div style="display:flex; align-items:center;">
                            <div class="selector-btn-group">
                                <button class="selector-btn scopa-prim-sel ${getActiveCls(primieraWinnerId, p1.id)}" data-val="${p1.id}">${p1.name}</button>
                                <button class="selector-btn scopa-prim-sel ${getActiveCls(primieraWinnerId, p2.id)}" data-val="${p2.id}">${p2.name}</button>
                                <button class="selector-btn scopa-prim-sel ${!primieraWinnerId ? 'active' : ''}" data-val="none">Nessuno</button>
                            </div>
                            <button id="btn-calc-primiera" class="btn-calc">Calcola</button>
                        </div>
                    </div>

                    <!-- Settebello -->
                    <div class="selector-row">
                        <span class="selector-row-title">Settebello</span>
                        <div class="selector-btn-group">
                            <button class="selector-btn scopa-sett-sel ${getActiveCls(settebelloWinnerId, p1.id)}" data-val="${p1.id}">${p1.name}</button>
                            <button class="selector-btn scopa-sett-sel ${getActiveCls(settebelloWinnerId, p2.id)}" data-val="${p2.id}">${p2.name}</button>
                            <button class="selector-btn scopa-sett-sel ${!settebelloWinnerId ? 'active' : ''}" data-val="none">Nessuno</button>
                        </div>
                    </div>

                    <!-- Carte -->
                    <div class="selector-row">
                        <span class="selector-row-title">Carte</span>
                        <div class="selector-btn-group">
                            <button class="selector-btn scopa-cart-sel ${getActiveCls(carteWinnerId, p1.id)}" data-val="${p1.id}">${p1.name}</button>
                            <button class="selector-btn scopa-cart-sel ${getActiveCls(carteWinnerId, p2.id)}" data-val="${p2.id}">${p2.name}</button>
                            <button class="selector-btn scopa-cart-sel ${!carteWinnerId ? 'active' : ''}" data-val="none">Nessuno</button>
                        </div>
                    </div>

                    <!-- Denari -->
                    <div class="selector-row">
                        <span class="selector-row-title">Denari</span>
                        <div class="selector-btn-group">
                            <button class="selector-btn scopa-den-sel ${getActiveCls(denariWinnerId, p1.id)}" data-val="${p1.id}">${p1.name}</button>
                            <button class="selector-btn scopa-den-sel ${getActiveCls(denariWinnerId, p2.id)}" data-val="${p2.id}">${p2.name}</button>
                            <button class="selector-btn scopa-den-sel ${!denariWinnerId ? 'active' : ''}" data-val="none">Nessuno</button>
                        </div>
                    </div>
                </div>

                <span class="form-section-title">SCOPE FATTE</span>
                <div class="settings-card" style="padding: 8px 16px; margin-bottom:16px;">
                    ${renderCounterRow('scope', p1)}
                    ${renderCounterRow('scope', p2)}
                </div>

                <span class="form-section-title">PUNTI NAPOLA / NAPOLI (DA 3 A 10 PT)</span>
                <div class="settings-card" style="padding: 8px 16px; margin-bottom:16px;">
                    ${renderCounterRow('napola', p1)}
                    ${renderCounterRow('napola', p2)}
                </div>

                <!-- Live preview -->
                <span class="form-section-title">ANTEPRIMA PUNTI ROUND</span>
                <div class="dual-scoreboard" style="padding: 12px; margin-bottom: 20px;">
                    <div class="score-column">
                        <span class="name" style="font-size:12px;">${p1.name}</span>
                        <span class="score-num" style="font-size:24px; color:var(--score-positive);">+${calcLivePoints(p1.id)}</span>
                    </div>
                    <div class="score-divider" style="height:35px;"></div>
                    <div class="score-column">
                        <span class="name" style="font-size:12px;">${p2.name}</span>
                        <span class="score-num" style="font-size:24px; color:var(--score-positive);">+${calcLivePoints(p2.id)}</span>
                    </div>
                </div>

                <button id="btn-save-scopa-round-action" class="btn-primary color-orange">${roundToEdit ? 'Salva Modifiche' : 'Salva Smazzata'}</button>
            `;

            openOverlay(roundToEdit ? `Modifica Smazzata ${roundToEdit.roundNumber}` : `Fine Smazzata ${game.rounds.length + 1}`, bodyHTML);
            bindModalEvents();
        };

        const renderCounterRow = (type, player) => {
            const val = type === 'scope' ? scopeScores[player.id] : napolaScores[player.id];
            return `
                <div class="counter-row">
                    <span class="counter-row-title">${player.name}</span>
                    <div class="counter-controls">
                        <button class="counter-btn minus" data-type="${type}" data-pid="${player.id}">-</button>
                        <span class="counter-value" id="val-${type}-${player.id}">${val}</span>
                        <button class="counter-btn plus" data-type="${type}" data-pid="${player.id}">+</button>
                    </div>
                </div>
            `;
        };

        const calcLivePoints = (playerId) => {
            let pts = 0;
            if (primieraWinnerId === playerId) pts++;
            if (settebelloWinnerId === playerId) pts++;
            if (carteWinnerId === playerId) pts++;
            if (denariWinnerId === playerId) pts++;
            pts += scopeScores[playerId];
            pts += napolaScores[playerId];
            return pts;
        };

        const updateLivePreviews = () => {
            document.querySelector('.dual-scoreboard .score-column:first-child .score-num').textContent = `+${calcLivePoints(p1.id)}`;
            document.querySelector('.dual-scoreboard .score-column:last-child .score-num').textContent = `+${calcLivePoints(p2.id)}`;
        };

        const bindModalEvents = () => {
            // Button groups selectors
            const bindBtnGroup = (selectorClass, callback) => {
                const btns = document.querySelectorAll(selectorClass);
                btns.forEach(btn => {
                    btn.onclick = () => {
                        const val = btn.dataset.val;
                        triggerHaptic('light');
                        callback(val === 'none' ? null : val);
                        btns.forEach(x => x.classList.remove('active', 'orange'));
                        btn.classList.add('active', 'orange');
                        updateLivePreviews();
                    };
                });
            };

            bindBtnGroup('.scopa-prim-sel', val => primieraWinnerId = val);
            bindBtnGroup('.scopa-sett-sel', val => settebelloWinnerId = val);
            bindBtnGroup('.scopa-cart-sel', val => carteWinnerId = val);
            bindBtnGroup('.scopa-den-sel', val => denariWinnerId = val);

            // Counter rows actions
            document.querySelectorAll('.counter-btn.plus').forEach(btn => {
                btn.onclick = () => {
                    const type = btn.dataset.type;
                    const pid = btn.dataset.pid;
                    triggerHaptic('light');
                    if (type === 'scope') {
                        scopeScores[pid]++;
                    } else {
                        // napola max 10
                        if (napolaScores[pid] < 10) napolaScores[pid]++;
                    }
                    document.getElementById(`val-${type}-${pid}`).textContent = type === 'scope' ? scopeScores[pid] : napolaScores[pid];
                    updateLivePreviews();
                };
            });

            document.querySelectorAll('.counter-btn.minus').forEach(btn => {
                btn.onclick = () => {
                    const type = btn.dataset.type;
                    const pid = btn.dataset.pid;
                    triggerHaptic('light');
                    if (type === 'scope') {
                        if (scopeScores[pid] > 0) scopeScores[pid]--;
                    } else {
                        if (napolaScores[pid] > 0) napolaScores[pid]--;
                    }
                    document.getElementById(`val-${type}-${pid}`).textContent = type === 'scope' ? scopeScores[pid] : napolaScores[pid];
                    updateLivePreviews();
                };
            });

            // Action: Calc Primiera
            document.getElementById('btn-calc-primiera').onclick = () => {
                triggerHaptic('light');
                
                // Open Primiera sub-calculator overlay
                PrimieraCalc.init(
                    [{ id: p1.id, name: p1.name }, { id: p2.id, name: p2.name }],
                    primieraDetails,
                    settebelloWinnerId,
                    (winnerId, details) => {
                        primieraWinnerId = winnerId;
                        primieraDetails = details;
                        // Re-render scopa round modal with updated values
                        renderBody();
                    }
                );
            };

            // Save action
            document.getElementById('btn-save-scopa-round-action').onclick = () => {
                triggerHaptic('success');

                const roundData = {
                    id: roundToEdit ? roundToEdit.id : generateUUID(),
                    roundNumber: roundToEdit ? roundToEdit.roundNumber : game.rounds.length + 1,
                    primieraWinnerId,
                    settebelloWinnerId,
                    carteWinnerId,
                    denariWinnerId,
                    scopeScores: { ...scopeScores },
                    napolaScores: { ...napolaScores },
                    primieraDetails
                };

                if (roundToEdit) {
                    const idx = game.rounds.findIndex(r => r.id === roundToEdit.id);
                    if (idx !== -1) game.rounds[idx] = roundData;
                } else {
                    game.rounds.push(roundData);
                }

                // Recalculate players scores
                game.players.forEach(p => {
                    p.currentScore = game.rounds.reduce((sum, r) => sum + this.calculateRoundPointsScopa(r, p.id), 0);
                });

                Store.save();
                closeOverlay();

                // Check for game finished
                // Scopa ends if a player reached targetScore. In case of ties, game continues.
                const finished = game.players.some(p => p.currentScore >= game.targetScore);
                const hasUniqueWinner = finished && (game.players[0].currentScore !== game.players[1].currentScore);

                if (finished && hasUniqueWinner) {
                    const winner = game.players[0].currentScore > game.players[1].currentScore ? game.players[0] : game.players[1];
                    
                    let standingsHTML = '';
                    game.players.forEach((p, idx) => {
                        const isWinner = p.id === winner.id;
                        standingsHTML += `
                            <div class="standings-entry ${isWinner ? 'winner' : ''}">
                                <span class="standings-pos">${idx + 1}</span>
                                <span class="standings-name">${p.name}</span>
                                <span class="standings-score">${p.currentScore} pt</span>
                            </div>
                        `;
                    });

                    Store.state.scopaGame = null; // Clear active game
                    Store.save();

                    openCelebration(winner.name, "Vincitore della Scopa", standingsHTML, () => {
                        this.goBack();
                    });
                } else {
                    this.renderActiveScopa();
                }
            };
        };

        renderBody();
    },

    // ==========================================================================
    // 3. BRISCOLA GAME LOGIC & RENDERING
    // ==========================================================================
    renderSetupBriscola() {
        const container = document.getElementById('game-container');
        let targetWins = 2; // default best of 3
        const selectedIds = new Set();

        const buildList = () => {
            let html = '';
            Store.state.players.forEach(p => {
                const isSel = selectedIds.has(p.id);
                html += `
                    <div class="setup-player-item ${isSel ? 'selected' : ''}" data-id="${p.id}">
                        <span>${p.name}</span>
                        <div class="checkbox-circle">
                            ${isSel ? '<i data-lucide="check"></i>' : ''}
                        </div>
                    </div>
                `;
            });
            return html;
        };

        const renderSetup = () => {
            container.innerHTML = `
                <div class="game-view-header">
                    <button id="btn-setup-back" class="btn-back"><i data-lucide="arrow-left"></i> Giochi</button>
                    <h2>Nuovo Match Briscola</h2>
                </div>
                
                <div class="setup-container">
                    <div class="setup-column-settings">
                        <div class="settings-card">
                            <span class="card-section-title">FORMATO MATCH</span>
                            <div class="options-grid">
                                <button class="option-btn briscola-format-opt ${targetWins === 1 ? 'selected color-red' : ''}" data-val="1">Singolo</button>
                                <button class="option-btn briscola-format-opt ${targetWins === 2 ? 'selected color-red' : ''}" data-val="2">Meglio di 3 (2)</button>
                                <button class="option-btn briscola-format-opt ${targetWins === 3 ? 'selected color-red' : ''}" data-val="3">Meglio di 5 (3)</button>
                            </div>
                        </div>

                        <div class="settings-card">
                            <span class="card-section-title">AGGIUNGI RAPIDO</span>
                            <form id="setup-add-player-form" class="inline-form">
                                <input type="text" id="setup-player-name" placeholder="Nome Giocatore" required autocomplete="off">
                                <button type="submit" class="btn-icon-accent" style="background-color: var(--accent-red)"><i data-lucide="plus-circle"></i></button>
                            </form>
                        </div>
                    </div>

                    <div class="setup-column-players">
                        <div class="settings-card">
                            <span class="card-section-title">SELEZIONA PARTECIPANTI (ESATTAMENTE 2)</span>
                            <div id="setup-players-list-container" class="setup-players-list">
                                ${buildList()}
                            </div>
                            <button id="btn-start-game" class="btn-primary color-red" disabled>Inizia Briscola</button>
                        </div>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            bindSetupEvents();
        };

        const bindSetupEvents = () => {
            // Update start button state
            const startBtn = document.getElementById('btn-start-game');
            if (selectedIds.size === 2) {
                startBtn.disabled = false;
                startBtn.classList.remove('disabled');
            } else {
                startBtn.disabled = true;
                startBtn.classList.add('disabled');
            }

            // Format options
            container.querySelectorAll('.briscola-format-opt').forEach(btn => {
                btn.onclick = () => {
                    targetWins = parseInt(btn.dataset.val);
                    triggerHaptic('light');
                    container.querySelectorAll('.briscola-format-opt').forEach(x => x.classList.remove('selected', 'color-red'));
                    btn.classList.add('selected', 'color-red');
                };
            });

            // Player toggles
            const items = container.querySelectorAll('.setup-player-item');
            items.forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    triggerHaptic('light');
                    if (selectedIds.has(id)) {
                        selectedIds.delete(id);
                    } else {
                        if (selectedIds.size < 2) {
                            selectedIds.add(id);
                        } else {
                            const first = selectedIds.values().next().value;
                            selectedIds.delete(first);
                            selectedIds.add(id);
                        }
                    }

                    document.getElementById('setup-players-list-container').innerHTML = buildList();
                    lucide.createIcons();
                    bindSetupEvents();
                };
            });

            // Back back
            document.getElementById('btn-setup-back').onclick = () => this.goBack();

            // Add player
            document.getElementById('setup-add-player-form').onsubmit = (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('setup-player-name');
                const newP = Store.addPlayer(nameInput.value);
                if (newP) {
                    nameInput.value = '';
                    if (selectedIds.size < 2) selectedIds.add(newP.id);
                    renderSetup();
                }
            };

            // Start game
            document.getElementById('btn-start-game').onclick = () => {
                triggerHaptic('success');
                const ids = Array.from(selectedIds);
                const playersData = ids.map(id => ({
                    id: id,
                    name: Store.getPlayerName(id),
                    gameWins: 0
                }));

                Store.state.briscolaGame = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    targetWins: targetWins,
                    players: playersData,
                    rounds: [],
                    isActive: true
                };
                Store.save();
                this.renderActiveBriscola();
            };
        };

        renderSetup();
    },

    renderActiveBriscola() {
        const game = Store.state.briscolaGame;
        const container = document.getElementById('game-container');

        const p1 = game.players[0];
        const p2 = game.players[1];

        // Stars generator helper
        const renderStars = (wins) => {
            let stars = '';
            for (let i = 0; i < game.targetWins; i++) {
                const filled = i < wins ? 'filled' : '';
                stars += `<i data-lucide="star" class="${filled}"></i>`;
            }
            return stars;
        };

        // Build history rows
        let historyHTML = '';
        if (game.rounds.length > 0) {
            let reversed = [...game.rounds].reverse();
            reversed.forEach((round, revIndex) => {
                const actualIndex = game.rounds.length - 1 - revIndex;
                const score1 = round.cardScores[p1.id] || 0;
                const score2 = round.cardScores[p2.id] || 0;
                
                let outcomeText = '';
                if (round.winnerId) {
                    outcomeText = `Vinta da ${Store.getPlayerName(round.winnerId)}`;
                } else {
                    outcomeText = 'Pareggio (60 - 60)';
                }

                historyHTML += `
                    <div class="round-history-row">
                        <div class="round-row-header">
                            <span class="round-number">Mano ${round.roundNumber}</span>
                            <span style="font-size:11px; color:var(--text-secondary);">${outcomeText}</span>
                        </div>
                        <div class="round-row-footer" style="margin-top:6px;">
                            <div style="display:flex; gap:16px;">
                                <div style="display:flex; flex-direction:column;">
                                    <span style="font-size:10px; color:var(--text-secondary);">${p1.name}</span>
                                    <span style="font-size:14px; font-weight:bold; color:${score1 > 60 ? 'var(--accent-red)' : 'white'}">${score1} pt</span>
                                </div>
                                <div style="display:flex; flex-direction:column;">
                                    <span style="font-size:10px; color:var(--text-secondary);">${p2.name}</span>
                                    <span style="font-size:14px; font-weight:bold; color:${score2 > 60 ? 'var(--accent-red)' : 'white'}">${score2} pt</span>
                                </div>
                            </div>
                            <button class="btn-row-action btn-delete-briscola-round" data-idx="${actualIndex}">
                                <i data-lucide="trash-2" style="width:11px; height:11px; color:var(--accent-red)"></i>
                                <span>Elimina</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        const formatLabel = game.targetWins === 1 ? 'Singola' : (game.targetWins === 2 ? 'Al meglio di 3' : 'Al meglio di 5');

        container.innerHTML = `
            <div class="game-view-header">
                <button id="btn-active-back" class="btn-back"><i data-lucide="arrow-left"></i> Esci</button>
                <div class="game-toolbar">
                    <button id="btn-active-reset" class="btn-toolbar-circle"><i data-lucide="rotate-ccw"></i></button>
                    <button id="btn-active-end" class="btn-toolbar-circle" style="color:var(--accent-red)"><i data-lucide="x-circle"></i></button>
                </div>
            </div>

            <div class="info-capsules">
                <span class="capsule">${formatLabel}</span>
                <span class="capsule right">Vittorie necessarie: ${game.targetWins}</span>
            </div>

            <div class="dual-scoreboard" style="padding: 16px;">
                <div class="score-column color-red">
                    <span class="name">${p1.name}</span>
                    <span class="score-num">${p1.gameWins}</span>
                    <div class="sub-stars">${renderStars(p1.gameWins)}</div>
                </div>
                <div class="score-divider" style="height:90px;"></div>
                <div class="score-column color-red">
                    <span class="name">${p2.name}</span>
                    <span class="score-num">${p2.gameWins}</span>
                    <div class="sub-stars">${renderStars(p2.gameWins)}</div>
                </div>
            </div>

            <button id="btn-add-briscola-round" class="btn-primary color-red" style="margin-top:10px;"><i data-lucide="plus-circle"></i> Nuova Mano (Inserisci Punti Carte)</button>

            <div class="rounds-history-section">
                <span class="section-title">STORICO MANI (MAX 120 PT)</span>
                <div class="rounds-list">
                    ${historyHTML || `
                        <div class="empty-placeholder" style="padding: 30px 10px;">
                            <i data-lucide="heart"></i>
                            <h4>Nessuna mano</h4>
                            <p>Gioca la mano, conta i punti e registrali qui sopra.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        lucide.createIcons();

        // Actions: Back, Reset, Cancel
        document.getElementById('btn-active-back').onclick = () => this.goBack();
        
        document.getElementById('btn-active-reset').onclick = () => {
            if (confirm("Sei sicuro di voler azzerare i segni vinti e le mani giocate?")) {
                triggerHaptic('warning');
                game.rounds = [];
                game.players.forEach(p => p.gameWins = 0);
                Store.save();
                this.renderActiveBriscola();
            }
        };

        document.getElementById('btn-active-end').onclick = () => {
            if (confirm("Sei sicuro di voler uscire e annullare questo match? I dati andranno persi.")) {
                triggerHaptic('error');
                Store.state.briscolaGame = null;
                Store.save();
                this.goBack();
            }
        };

        // Action: Delete round
        container.querySelectorAll('.btn-delete-briscola-round').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                if (confirm(`Eliminare la mano ${game.rounds[idx].roundNumber}?`)) {
                    triggerHaptic('warning');
                    game.rounds.splice(idx, 1);
                    // Re-calculate gameWins and re-index roundNumber
                    game.rounds.forEach((r, i) => r.roundNumber = i + 1);
                    game.players.forEach(p => p.gameWins = 0);
                    
                    game.rounds.forEach(r => {
                        if (r.winnerId) {
                            const wPlayer = game.players.find(x => x.id === r.winnerId);
                            if (wPlayer) wPlayer.gameWins++;
                        }
                    });
                    
                    Store.save();
                    this.renderActiveBriscola();
                }
            };
        });

        // Add round modal trigger
        document.getElementById('btn-add-briscola-round').onclick = () => {
            triggerHaptic('medium');
            this.openAddRoundBriscolaModal();
        };
    },

    openAddRoundBriscolaModal() {
        const game = Store.state.briscolaGame;
        const p1 = game.players[0];
        const p2 = game.players[1];
        
        let score1 = 60;

        const renderBody = () => {
            const score2 = 120 - score1;
            
            let resultHTML = '';
            if (score1 === 60) {
                resultHTML = `<span style="color:var(--text-secondary); font-weight:bold;">Pareggio (60 - 60)</span>`;
            } else if (score1 > 60) {
                resultHTML = `<span style="color:var(--accent-red); font-weight:bold;">Mano a ${p1.name} (+1 Segno)</span>`;
            } else {
                resultHTML = `<span style="color:var(--accent-red); font-weight:bold;">Mano a ${p2.name} (+1 Segno)</span>`;
            }

            const bodyHTML = `
                <p style="font-size:12px; color:var(--text-secondary); text-align:center; margin-bottom:20px;">
                    Trascina il cursore per distribuire i 120 punti totali della mano.
                </p>

                <!-- Visual distribution bar -->
                <div style="display:flex; width:100%; height:16px; border-radius:8px; overflow:hidden; border:1px solid var(--card-stroke); margin-bottom:24px;">
                    <div style="width:${(score1 / 120) * 100}%; background-color:${score1 >= 61 ? 'var(--accent-red)' : 'rgba(255,255,255,0.06)'}; transition: width 0.1s;"></div>
                    <div style="width:${((120 - score1) / 120) * 100}%; background-color:${(120 - score1) >= 61 ? 'var(--accent-red)' : 'rgba(255,255,255,0.06)'}; transition: width 0.1s;"></div>
                </div>

                <!-- Score Displays -->
                <div style="display:flex; align-items:center; justify-content:space-around; margin-bottom:24px;">
                    <div style="text-align:center;">
                        <span style="font-weight:700; color:var(--text-secondary);">${p1.name}</span>
                        <h2 style="font-size:48px; font-family:var(--font-heading); font-weight:900; color:${score1 >= 61 ? 'var(--accent-red)' : 'white'};">${score1}</h2>
                        <span style="font-size:10px; color:var(--text-secondary);">Punti carte</span>
                    </div>
                    <span style="font-style:italic; opacity:0.3; font-size:18px;">vs</span>
                    <div style="text-align:center;">
                        <span style="font-weight:700; color:var(--text-secondary);">${p2.name}</span>
                        <h2 style="font-size:48px; font-family:var(--font-heading); font-weight:900; color:${score2 >= 61 ? 'var(--accent-red)' : 'white'};">${score2}</h2>
                        <span style="font-size:10px; color:var(--text-secondary);">Punti carte</span>
                    </div>
                </div>

                <!-- Winner card -->
                <div style="display:flex; justify-content:center; margin-bottom:24px;">
                    <div style="background-color:rgba(255,255,255,0.04); padding: 8px 16px; border-radius:10px;">
                        ${resultHTML}
                    </div>
                </div>

                <!-- Slider -->
                <div class="slider-container" style="margin-bottom:20px;">
                    <div class="slider-labels">
                        <span>0</span>
                        <span class="center">SELEZIONA PUNTI PER ${p1.name.toUpperCase()}</span>
                        <span>120</span>
                    </div>
                    <input type="range" id="briscola-score-range" class="range-slider" min="0" max="120" step="1" value="${score1}">
                </div>

                <!-- Presets -->
                <div class="slider-presets" style="margin-bottom:24px;">
                    <button class="preset-btn" id="preset-60-60">Pareggio (60-60)</button>
                    <button class="preset-btn" id="preset-120-0">Tutto a ${p1.name}</button>
                    <button class="preset-btn" id="preset-0-120">Tutto a ${p2.name}</button>
                </div>

                <button id="btn-save-briscola-round-action" class="btn-primary color-red">Salva Smazzata</button>
            `;

            openOverlay(`Registra Punti Briscola`, bodyHTML);
            bindModalEvents();
        };

        const bindModalEvents = () => {
            const range = document.getElementById('briscola-score-range');
            range.oninput = () => {
                score1 = parseInt(range.value);
                // Fast visual update without full redrawing, to avoid losing control
                const score2 = 120 - score1;
                document.querySelector('.modal-body h2:first-of-type').textContent = score1;
                document.querySelector('.modal-body h2:first-of-type').style.color = score1 >= 61 ? 'var(--accent-red)' : 'white';
                document.querySelector('.modal-body div div h2').textContent = score2; // Wait, actually it's easier to just re-render to make sure colors, bar and result badge match perfectly!
                renderBody();
            };

            // Preset clicks
            document.getElementById('preset-60-60').onclick = () => { triggerHaptic('light'); score1 = 60; renderBody(); };
            document.getElementById('preset-120-0').onclick = () => { triggerHaptic('light'); score1 = 120; renderBody(); };
            document.getElementById('preset-0-120').onclick = () => { triggerHaptic('light'); score1 = 0; renderBody(); };

            // Save Action
            document.getElementById('btn-save-briscola-round-action').onclick = () => {
                triggerHaptic('success');

                const roundData = {
                    id: generateUUID(),
                    roundNumber: game.rounds.length + 1,
                    cardScores: {}
                };
                
                const score2 = 120 - score1;
                roundData.cardScores[p1.id] = score1;
                roundData.cardScores[p2.id] = score2;

                let winnerId = null;
                if (score1 > 60) winnerId = p1.id;
                else if (score2 > 60) winnerId = p2.id;
                
                roundData.winnerId = winnerId;
                game.rounds.push(roundData);

                // Update game wins
                game.players.forEach(p => p.gameWins = 0);
                game.rounds.forEach(r => {
                    if (r.winnerId) {
                        const w = game.players.find(x => x.id === r.winnerId);
                        if (w) w.gameWins++;
                    }
                });

                Store.save();
                closeOverlay();

                // Check if match won
                const finished = game.players.some(p => p.gameWins >= game.targetWins);
                if (finished) {
                    const winner = game.players.find(p => p.gameWins >= game.targetWins);
                    
                    let standingsHTML = '';
                    game.players.forEach((p, idx) => {
                        const isWinner = p.id === winner.id;
                        standingsHTML += `
                            <div class="standings-entry ${isWinner ? 'winner' : ''}">
                                <span class="standings-pos">${idx + 1}</span>
                                <span class="standings-name">${p.name}</span>
                                <span class="standings-score">${p.gameWins} Segni🏆</span>
                            </div>
                        `;
                    });

                    Store.state.briscolaGame = null; // Clear active game
                    Store.save();

                    openCelebration(winner.name, "Vincitore della Briscola", standingsHTML, () => {
                        this.goBack();
                    });
                } else {
                    this.renderActiveBriscola();
                }
            };
        };

        renderBody();
    },

    // ==========================================================================
    // 4. BISCA GAME LOGIC & RENDERING
    // ==========================================================================
    renderSetupBisca() {
        document.body.classList.remove('bisca-active-mode');
        const container = document.getElementById('game-container');
        let maxLives = 5;
        const selectedIds = new Set();

        const buildList = () => {
            let html = '';
            Store.state.players.forEach(p => {
                const isSel = selectedIds.has(p.id);
                html += `
                    <div class="setup-player-item ${isSel ? 'selected' : ''}" data-id="${p.id}">
                        <span>${p.name}</span>
                        <div class="checkbox-circle">
                            ${isSel ? '<i data-lucide="check"></i>' : ''}
                        </div>
                    </div>
                `;
            });
            return html;
        };

        const renderSetup = () => {
            container.innerHTML = `
                <div class="game-view-header">
                    <button id="btn-setup-back" class="btn-back"><i data-lucide="arrow-left"></i> Giochi</button>
                    <h2>Nuova Partita Bisca</h2>
                </div>
                
                <div class="setup-container">
                    <div class="setup-column-settings">
                        <div class="settings-card">
                            <span class="card-section-title">VITE DI PARTENZA</span>
                            <div class="options-grid">
                                <button class="option-btn bisca-lives-opt ${maxLives === 3 ? 'selected' : ''}" data-val="3">3</button>
                                <button class="option-btn bisca-lives-opt ${maxLives === 5 ? 'selected' : ''}" data-val="5">5</button>
                                <button class="option-btn bisca-lives-opt ${maxLives === 7 ? 'selected' : ''}" data-val="7">7</button>
                                <button class="option-btn bisca-lives-opt ${maxLives === 10 ? 'selected' : ''}" data-val="10">10</button>
                            </div>
                            
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
                                <span style="font-size:13px; color:var(--text-secondary);">Vite personalizzate:</span>
                                <input type="number" id="bisca-custom-lives" value="${maxLives}" min="1" max="99" style="width: 80px; padding: 6px 12px; text-align:center;">
                            </div>
                        </div>

                        <div class="settings-card">
                            <span class="card-section-title">AGGIUNGI RAPIDO</span>
                            <form id="setup-add-player-form" class="inline-form">
                                <input type="text" id="setup-player-name" placeholder="Nome Giocatore" required autocomplete="off">
                                <button type="submit" class="btn-icon-accent"><i data-lucide="plus-circle"></i></button>
                            </form>
                        </div>
                    </div>

                    <div class="setup-column-players">
                        <div class="settings-card">
                            <span class="card-section-title">SELEZIONA PARTECIPANTI (MIN. 2)</span>
                            <div id="setup-players-list-container" class="setup-players-list">
                                ${buildList()}
                            </div>
                            <button id="btn-start-game" class="btn-primary" disabled>Inizia Bisca</button>
                        </div>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            bindSetupEvents();
        };

        const bindSetupEvents = () => {
            // Update start button state
            const startBtn = document.getElementById('btn-start-game');
            if (selectedIds.size >= 2) {
                startBtn.disabled = false;
                startBtn.classList.remove('disabled');
            } else {
                startBtn.disabled = true;
                startBtn.classList.add('disabled');
            }

            // Live options
            container.querySelectorAll('.bisca-lives-opt').forEach(btn => {
                btn.onclick = () => {
                    maxLives = parseInt(btn.dataset.val);
                    triggerHaptic('light');
                    document.getElementById('bisca-custom-lives').value = maxLives;
                    container.querySelectorAll('.bisca-lives-opt').forEach(x => x.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Live input
            const customInput = document.getElementById('bisca-custom-lives');
            customInput.onchange = () => {
                let val = parseInt(customInput.value);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 99) val = 99;
                maxLives = val;
                customInput.value = val;
                container.querySelectorAll('.bisca-lives-opt').forEach(btn => {
                    const optVal = parseInt(btn.dataset.val);
                    if (optVal === maxLives) btn.classList.add('selected');
                    else btn.classList.remove('selected');
                });
            };

            // Player toggles
            const items = container.querySelectorAll('.setup-player-item');
            items.forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    triggerHaptic('light');
                    if (selectedIds.has(id)) {
                        selectedIds.delete(id);
                    } else {
                        selectedIds.add(id);
                    }

                    document.getElementById('setup-players-list-container').innerHTML = buildList();
                    lucide.createIcons();
                    bindSetupEvents();
                };
            });

            // Back back
            document.getElementById('btn-setup-back').onclick = () => this.goBack();

            // Add player
            document.getElementById('setup-add-player-form').onsubmit = (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('setup-player-name');
                const newP = Store.addPlayer(nameInput.value);
                if (newP) {
                    nameInput.value = '';
                    selectedIds.add(newP.id);
                    renderSetup();
                }
            };

            // Start game
            document.getElementById('btn-start-game').onclick = () => {
                triggerHaptic('success');
                const ids = Array.from(selectedIds);
                const playersData = ids.map(id => ({
                    id: id,
                    name: Store.getPlayerName(id),
                    lives: maxLives
                }));

                Store.state.biscaGame = {
                    id: generateUUID(),
                    maxLives: maxLives,
                    players: playersData,
                    isActive: true
                };
                Store.save();
                this.renderActiveBisca();
            };
        };

        renderSetup();
    },

    renderActiveBisca() {
        document.body.classList.add('bisca-active-mode');
        const game = Store.state.biscaGame;
        const container = document.getElementById('game-container');

        const activeCount = game.players.filter(p => p.lives > 0).length;
        const totalCount = game.players.length;

        // Group active vs eliminated (keeping original indexes but sorted)
        const sortedPlayers = [...game.players].sort((a, b) => {
            const isElimA = a.lives <= 0;
            const isElimB = b.lives <= 0;
            if (isElimA === isElimB) return 0;
            return isElimA ? 1 : -1;
        });

        let listHTML = '';
        sortedPlayers.forEach(p => {
            const isElim = p.lives <= 0;
            
            // Hearts renderer
            let heartsHTML = '';
            if (isElim) {
                const letters = "ELIMINATO".split("");
                const lettersHTML = letters.map((l, i) => 
                    `<span style="animation: matrix-glow 1.8s infinite; animation-delay: ${i * 0.15}s; font-family: monospace, sans-serif; font-weight: 900;">${l}</span>`
                ).join("");
                heartsHTML = `
                    <div class="bisca-eliminated-horizontal">
                        <i data-lucide="heart-off" style="width:14px; height:14px; color: var(--score-negative);"></i>
                        <div class="matrix-letters-horizontal">
                            ${lettersHTML}
                        </div>
                    </div>
                `;
            } else {
                if (game.maxLives <= 15) {
                    // Show small heart icons
                    let heartIcons = '';
                    for (let i = 0; i < Math.max(game.maxLives, p.lives); i++) {
                        const filled = i < p.lives;
                        heartIcons += `<i data-lucide="heart" class="heart-icon" style="width:18px; height:18px; fill:${filled ? 'var(--score-negative)' : 'none'}; color:${filled ? 'var(--score-negative)' : 'rgba(255,255,255,0.15)'};"></i>`;
                    }
                    heartsHTML = `<div class="bisca-hearts-wrap">${heartIcons}</div>`;
                } else {
                    // Show numeric indicator
                    heartsHTML = `
                        <div class="bisca-numeric-lives">
                            <i data-lucide="heart" style="width:20px; height:20px; fill:var(--score-negative); color:var(--score-negative)"></i>
                            <span>Vite: ${p.lives} / ${game.maxLives}</span>
                        </div>
                    `;
                }
            }

            let controllerHTML = '';
            if (isElim) {
                // Revive button
                controllerHTML = `
                    <button class="btn-secondary btn-bisca-revive" data-id="${p.id}" style="width:100%; max-width:180px; padding:10px 16px; border-color:rgba(46,204,113,0.3); color:var(--score-positive); display:flex; align-items:center; justify-content:center; gap:8px;">
                        <i data-lucide="heart" style="width:14px;height:14px;fill:var(--score-positive)"></i> Resuscita
                    </button>
                `;
            } else {
                controllerHTML = `
                    <div class="bisca-adjuster">
                        <button class="adjust-btn minus btn-bisca-minus" data-id="${p.id}">-</button>
                        <span class="bisca-value">${p.lives}</span>
                        <button class="adjust-btn plus btn-bisca-plus" data-id="${p.id}">+</button>
                    </div>
                `;
            }

            listHTML += `
                <div class="bisca-card ${isElim ? 'eliminated' : ''}">
                    <div class="bisca-card-header">
                        <h4>${p.name}</h4>
                    </div>
                    <div class="bisca-card-body">
                        ${heartsHTML}
                    </div>
                    <div class="bisca-card-controls">
                        ${controllerHTML}
                    </div>
                </div>
            `;
        });

        // Determine grid layout class based on number of players
        let gridClass = 'bisca-grid-many';
        if (totalCount <= 8) {
            gridClass = `bisca-grid-${totalCount}`;
        }

        container.innerHTML = `
            <div class="bisca-active-layout">
                <div class="game-view-header">
                    <button id="btn-active-back" class="btn-back"><i data-lucide="arrow-left"></i> Esci</button>
                    <div class="game-toolbar">
                        <button id="btn-active-reset" class="btn-toolbar-circle"><i data-lucide="rotate-ccw"></i></button>
                        <button id="btn-active-end" class="btn-toolbar-circle" style="color:var(--accent-red)"><i data-lucide="x-circle"></i></button>
                    </div>
                </div>

                <div class="info-capsules">
                    <span class="capsule">Giocatori in vita: ${activeCount} / ${totalCount}</span>
                    <span class="capsule right">Vite Max: ${game.maxLives}</span>
                </div>

                <div class="bisca-participants-container ${gridClass}">
                    ${listHTML}
                </div>
            </div>
        `;

        lucide.createIcons();

        // Bind Actions
        document.getElementById('btn-active-back').onclick = () => this.goBack();
        
        document.getElementById('btn-active-reset').onclick = () => {
            if (confirm("Sei sicuro di voler ripristinare le vite di tutti i giocatori al massimo?")) {
                triggerHaptic('warning');
                game.players.forEach(p => p.lives = game.maxLives);
                Store.save();
                this.renderActiveBisca();
            }
        };

        document.getElementById('btn-active-end').onclick = () => {
            if (confirm("Sei sicuro di voler uscire e annullare questa partita? I dati andranno persi.")) {
                triggerHaptic('error');
                Store.state.biscaGame = null;
                Store.save();
                this.goBack();
            }
        };

        // Minus lives
        container.querySelectorAll('.btn-bisca-minus').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const p = game.players.find(x => x.id === id);
                if (p && p.lives > 0) {
                    p.lives--;
                    if (p.lives === 0) triggerHaptic('error');
                    else triggerHaptic('light');
                    
                    Store.save();
                    this.checkBiscaWinner();
                }
            };
        });

        // Plus lives
        container.querySelectorAll('.btn-bisca-plus').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const p = game.players.find(x => x.id === id);
                if (p) {
                    p.lives++;
                    triggerHaptic('light');
                    Store.save();
                    this.renderActiveBisca();
                }
            };
        });

        // Revive/Riattiva player
        container.querySelectorAll('.btn-bisca-revive').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const p = game.players.find(x => x.id === id);
                if (!p) return;

                // Trova gli altri giocatori in vita con almeno 2 vite (altrimenti donando morirebbero anche loro)
                const donors = game.players.filter(x => x.id !== p.id && x.lives > 1);

                if (donors.length === 0) {
                    triggerHaptic('error');
                    openOverlay("Dona una Vita", `
                        <div style="text-align:center; padding:10px 0;">
                            <i data-lucide="heart-off" style="width:48px; height:48px; color:var(--accent-red); margin-bottom:12px;"></i>
                            <p style="margin-bottom:20px; font-size:1.05em; color:var(--text-secondary);">
                                Nessun giocatore ha abbastanza vite da donare (è necessario avere almeno 2 vite per poterne donare una).
                            </p>
                            <button id="btn-cancel-revive" class="btn-secondary" style="width:100%; padding:14px; border-radius:12px;">Chiudi</button>
                        </div>
                    `);
                    document.getElementById('btn-cancel-revive').onclick = () => {
                        closeOverlay();
                    };
                    return;
                }

                // Render donor selection modal
                let optionsHTML = `
                    <p style="margin-bottom: 20px; font-size: 1em; color: var(--text-secondary); text-align: center; line-height: 1.4;">
                        Scegli quale giocatore donerà una vita a <strong>${p.name}</strong> per farlo rientrare in gioco:
                    </p>
                    <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
                `;

                donors.forEach(d => {
                    optionsHTML += `
                        <button class="btn-donor-select-item" data-donor-id="${d.id}" style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            width: 100%;
                            padding: 16px 20px;
                            background: rgba(255, 255, 255, 0.04);
                            border: 1px solid rgba(255, 255, 255, 0.08);
                            border-radius: 14px;
                            color: var(--text-primary);
                            font-size: 1.05em;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                        ">
                            <span style="display:flex; align-items:center; gap:10px;">
                                <i data-lucide="user" style="width:18px; height:18px; color: var(--accent-blue);"></i>
                                ${d.name}
                            </span>
                            <span style="color: var(--score-positive); display:flex; align-items:center; gap:6px; font-size: 0.95em;">
                                ${d.lives} <i data-lucide="arrow-right" style="width:14px; height:14px; color: var(--text-secondary);"></i> ${d.lives - 1} <i data-lucide="heart" style="width:16px; height:16px; fill:var(--score-negative); color:var(--score-negative)"></i>
                            </span>
                        </button>
                    `;
                });

                optionsHTML += `
                    </div>
                    <button id="btn-cancel-revive" class="btn-secondary" style="width:100%; padding:14px; border-radius:12px; font-size: 15px;">Annulla</button>
                `;

                openOverlay("Dona una Vita", optionsHTML);

                // Aggiunge lo stile hover per i bottoni dinamicamente se non già presente
                const styleId = 'donor-select-item-styles';
                if (!document.getElementById(styleId)) {
                    const styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    styleEl.textContent = `
                        .btn-donor-select-item:hover {
                            background: rgba(255, 255, 255, 0.08) !important;
                            border-color: var(--accent-blue) !important;
                            transform: translateY(-2px);
                            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
                        }
                        .btn-donor-select-item:active {
                            transform: translateY(0) scale(0.98);
                        }
                    `;
                    document.head.appendChild(styleEl);
                }

                // Bind dei click
                const modalContainer = document.getElementById('modal-container');
                modalContainer.querySelectorAll('.btn-donor-select-item').forEach(itemBtn => {
                    itemBtn.onclick = () => {
                        const donorId = itemBtn.dataset.donorId;
                        const donor = game.players.find(x => x.id === donorId);
                        if (donor && donor.lives > 1) {
                            donor.lives--;
                            p.lives = 1;
                            
                            triggerHaptic('success');
                            Store.save();
                            closeOverlay();
                            this.renderActiveBisca();
                            showToast(`${donor.name} ha donato una vita a ${p.name}!`, "success");
                        }
                    };
                });

                document.getElementById('btn-cancel-revive').onclick = () => {
                    closeOverlay();
                };
            };
        });
    },

    checkBiscaWinner() {
        const game = Store.state.biscaGame;
        const survivors = game.players.filter(p => p.lives > 0);
        
        if (survivors.length === 1 && game.players.length > 1) {
            // Unique winner!
            const winner = survivors[0];
            
            // Build standings HTML (survivors 1st, then eliminated sorted by their final state or alphabetical)
            let standingsHTML = '';
            const sorted = [...game.players].sort((a, b) => b.lives - a.lives);
            sorted.forEach((p, index) => {
                const isWinner = p.id === winner.id;
                standingsHTML += `
                    <div class="standings-entry ${isWinner ? 'winner' : ''}">
                        <span class="standings-pos">${index + 1}</span>
                        <span class="standings-name">${p.name}</span>
                        <span class="standings-score">${p.lives > 0 ? `${p.lives} Vite ❤️` : 'Sballato 💀'}</span>
                    </div>
                `;
            });

            Store.state.biscaGame = null; // Clear active game
            Store.save();

            openCelebration(winner.name, "Vincitore della Bisca", standingsHTML, () => {
                this.goBack();
            });
        } else {
            this.renderActiveBisca();
        }
    },

    // ==========================================================================
    // 5. CICCOPAOLO GAME LOGIC & RENDERING
    // ==========================================================================
    renderSetupCiccopaolo() {
        const container = document.getElementById('game-container');
        let targetScore = 21;
        let matchFormat = 'Botta secca'; // 'Alla meglio di 3'
        const selectedIds = new Set();

        const buildList = () => {
            let html = '';
            Store.state.players.forEach(p => {
                const isSel = selectedIds.has(p.id);
                html += `
                    <div class="setup-player-item ${isSel ? 'selected' : ''}" data-id="${p.id}">
                        <span>${p.name}</span>
                        <div class="checkbox-circle">
                            ${isSel ? '<i data-lucide="check"></i>' : ''}
                        </div>
                    </div>
                `;
            });
            return html;
        };

        const renderSetup = () => {
            container.innerHTML = `
                <div class="game-view-header">
                    <button id="btn-setup-back" class="btn-back"><i data-lucide="arrow-left"></i> Giochi</button>
                    <h2>Nuova Partita Ciccopaolo</h2>
                </div>
                
                <div class="setup-container">
                    <div class="setup-column-settings">
                        <div class="settings-card">
                            <span class="card-section-title">PUNTEGGIO DI ARRIVO</span>
                            <div class="options-grid">
                                <button class="option-btn cp-target-opt ${targetScore === 21 ? 'selected' : ''}" data-val="21">21 pt</button>
                                <button class="option-btn cp-target-opt ${targetScore === 31 ? 'selected' : ''}" data-val="31">31 pt</button>
                            </div>
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
                                <span style="font-size:13px; color:var(--text-secondary);">Target personalizzato:</span>
                                <input type="number" id="cp-custom-target" value="${targetScore}" min="5" max="99" style="width: 80px; padding: 6px 12px; text-align:center;">
                            </div>
                        </div>

                        <div class="settings-card">
                            <span class="card-section-title">FORMATO MATCH</span>
                            <div class="options-grid">
                                <button class="option-btn cp-format-opt ${matchFormat === 'Botta secca' ? 'selected' : ''}" data-val="Botta secca">Botta secca</button>
                                <button class="option-btn cp-format-opt ${matchFormat === 'Alla meglio di 3' ? 'selected' : ''}" data-val="Alla meglio di 3">Alla meglio di 3</button>
                            </div>
                        </div>

                        <div class="settings-card">
                            <span class="card-section-title">AGGIUNGI RAPIDO</span>
                            <form id="setup-add-player-form" class="inline-form">
                                <input type="text" id="setup-player-name" placeholder="Nome Giocatore" required autocomplete="off">
                                <button type="submit" class="btn-icon-accent"><i data-lucide="plus-circle"></i></button>
                            </form>
                        </div>
                    </div>

                    <div class="setup-column-players">
                        <div class="settings-card">
                            <span class="card-section-title">SELEZIONA PARTECIPANTI (2 o 3)</span>
                            <div id="setup-players-list-container" class="setup-players-list">
                                ${buildList()}
                            </div>
                            <button id="btn-start-game" class="btn-primary" disabled>Inizia Ciccopaolo</button>
                        </div>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            bindSetupEvents();
        };

        const bindSetupEvents = () => {
            // Update start button state
            const startBtn = document.getElementById('btn-start-game');
            if (selectedIds.size >= 2 && selectedIds.size <= 3) {
                startBtn.disabled = false;
                startBtn.classList.remove('disabled');
            } else {
                startBtn.disabled = true;
                startBtn.classList.add('disabled');
            }

            // Target options
            container.querySelectorAll('.cp-target-opt').forEach(btn => {
                btn.onclick = () => {
                    targetScore = parseInt(btn.dataset.val);
                    triggerHaptic('light');
                    document.getElementById('cp-custom-target').value = targetScore;
                    container.querySelectorAll('.cp-target-opt').forEach(x => x.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Custom target
            const customInput = document.getElementById('cp-custom-target');
            customInput.onchange = () => {
                let val = parseInt(customInput.value);
                if (isNaN(val) || val < 5) val = 5;
                if (val > 99) val = 99;
                targetScore = val;
                customInput.value = val;
                container.querySelectorAll('.cp-target-opt').forEach(btn => {
                    const optVal = parseInt(btn.dataset.val);
                    if (optVal === targetScore) btn.classList.add('selected');
                    else btn.classList.remove('selected');
                });
            };

            // Format options
            container.querySelectorAll('.cp-format-opt').forEach(btn => {
                btn.onclick = () => {
                    matchFormat = btn.dataset.val;
                    triggerHaptic('light');
                    container.querySelectorAll('.cp-format-opt').forEach(x => x.classList.remove('selected'));
                    btn.classList.add('selected');
                };
            });

            // Player toggles
            const items = container.querySelectorAll('.setup-player-item');
            items.forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    triggerHaptic('light');
                    if (selectedIds.has(id)) {
                        selectedIds.delete(id);
                    } else {
                        if (selectedIds.size < 3) {
                            selectedIds.add(id);
                        } else {
                            const first = selectedIds.values().next().value;
                            selectedIds.delete(first);
                            selectedIds.add(id);
                        }
                    }

                    document.getElementById('setup-players-list-container').innerHTML = buildList();
                    lucide.createIcons();
                    bindSetupEvents();
                };
            });

            // Back back
            document.getElementById('btn-setup-back').onclick = () => this.goBack();

            // Add player
            document.getElementById('setup-add-player-form').onsubmit = (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('setup-player-name');
                const newP = Store.addPlayer(nameInput.value);
                if (newP) {
                    nameInput.value = '';
                    if (selectedIds.size < 3) selectedIds.add(newP.id);
                    renderSetup();
                }
            };

            // Start game
            document.getElementById('btn-start-game').onclick = () => {
                triggerHaptic('success');
                const ids = Array.from(selectedIds);
                const playersData = ids.map(id => ({
                    id: id,
                    name: Store.getPlayerName(id),
                    gameWins: 0,
                    currentPartitionScore: 0
                }));

                Store.state.ciccopaoloGame = {
                    id: generateUUID(),
                    targetScore: targetScore,
                    matchFormat: matchFormat, // "Botta secca" or "Alla meglio di 3"
                    players: playersData,
                    rounds: [],
                    completedGamesRounds: [],
                    isActive: true
                };
                Store.save();
                this.renderActiveCiccopaolo();
            };
        };

        renderSetup();
    },

    renderActiveCiccopaolo() {
        const game = Store.state.ciccopaoloGame;
        const container = document.getElementById('game-container');

        // Scoreboard columns
        let colsHTML = '';
        game.players.forEach((p, idx) => {
            colsHTML += `
                <div class="score-column">
                    <span class="name">${p.name}</span>
                    <span class="score-num" style="font-size: ${game.players.length > 2 ? '34px' : '48px'}">${p.currentPartitionScore}</span>
                    <span class="sub-wins">Vinte: <span>${p.gameWins} 🏆</span></span>
                </div>
            `;
            if (idx < game.players.length - 1) {
                colsHTML += `<div class="score-divider"></div>`;
            }
        });

        // Rounds History
        let historyHTML = '';
        if (game.rounds.length > 0) {
            let reversed = [...game.rounds].reverse();
            reversed.forEach((round, revIndex) => {
                const actualIndex = game.rounds.length - 1 - revIndex;
                
                // score details per player
                let pillsHTML = '';
                game.players.forEach(p => {
                    const pts = this.calculateRoundPointsCiccopaolo(round, p.id);
                    pillsHTML += `
                        <div class="round-score-pill">
                            <span class="name">${p.name}</span>
                            <span class="val positive">+${pts}</span>
                        </div>
                    `;
                });

                historyHTML += `
                    <div class="round-history-row" style="cursor:pointer;" data-idx="${actualIndex}">
                        <div class="round-row-header">
                            <span class="round-number">Smazzata ${round.roundNumber}</span>
                            <div style="display:flex; gap:6px;">
                                ${pillsHTML}
                            </div>
                        </div>
                        <div class="badge-row">
                            <span class="small-badge active">${round.primieraWinnerId ? 'PRIM: ' + Store.getPlayerName(round.primieraWinnerId) : 'PRIM: -'}</span>
                            <span class="small-badge active">${round.settebelloWinnerId ? 'SETT: ' + Store.getPlayerName(round.settebelloWinnerId) : 'SETT: -'}</span>
                            <span class="small-badge active">${round.carteWinnerId ? 'CART: ' + Store.getPlayerName(round.carteWinnerId) : 'CART: -'}</span>
                            <span class="small-badge active">${round.denariWinnerId ? 'DENA: ' + Store.getPlayerName(round.denariWinnerId) : 'DENA: -'}</span>
                        </div>
                        <div class="round-row-footer" style="margin-top:6px;">
                            <div style="font-size:10px; color:var(--text-secondary); display:flex; flex-direction:column; gap:2px;">
                                ${this.getScopeAndExtraCiccopaoloText(round)}
                            </div>
                            <button class="btn-row-action btn-delete-ciccopaolo-round" data-idx="${actualIndex}">
                                <i data-lucide="trash-2" style="width:11px; height:11px; color:var(--accent-red)"></i>
                                <span>Elimina</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <div class="game-view-header">
                <button id="btn-active-back" class="btn-back"><i data-lucide="arrow-left"></i> Esci</button>
                <div class="game-toolbar">
                    <button id="btn-active-reset" class="btn-toolbar-circle"><i data-lucide="rotate-ccw"></i></button>
                    <button id="btn-active-end" class="btn-toolbar-circle" style="color:var(--accent-red)"><i data-lucide="x-circle"></i></button>
                </div>
            </div>

            <div class="info-capsules">
                <span class="capsule">${game.matchFormat}</span>
                <span class="capsule right">Target Partita: ${game.targetScore} pt</span>
            </div>

            <div class="dual-scoreboard" style="padding:16px;">
                ${colsHTML}
            </div>

            <button id="btn-add-ciccopaolo-round" class="btn-primary" style="margin-top:10px;"><i data-lucide="plus-circle"></i> Nuova Smazzata (Inserisci Punti)</button>

            <div class="rounds-history-section">
                <span class="section-title">STORICO SMAZZATE</span>
                <div class="rounds-list">
                    ${historyHTML || `
                        <div class="empty-placeholder" style="padding: 30px 10px;">
                            <i data-lucide="club"></i>
                            <h4>Nessun round</h4>
                            <p>Esegui la smazzata e inserisci i punti per iniziare.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        lucide.createIcons();

        // Actions: Back, Reset, Cancel
        document.getElementById('btn-active-back').onclick = () => this.goBack();
        
        document.getElementById('btn-active-reset').onclick = () => {
            if (confirm("Sei sicuro di voler azzerare il punteggio, le vittorie e i round della partita corrente?")) {
                triggerHaptic('warning');
                game.rounds = [];
                game.completedGamesRounds = [];
                game.players.forEach(p => {
                    p.gameWins = 0;
                    p.currentPartitionScore = 0;
                });
                Store.save();
                this.renderActiveCiccopaolo();
            }
        };

        document.getElementById('btn-active-end').onclick = () => {
            if (confirm("Sei sicuro di voler uscire e annullare questa partita? I dati andranno persi.")) {
                triggerHaptic('error');
                Store.state.ciccopaoloGame = null;
                Store.save();
                this.goBack();
            }
        };

        // Actions: Delete round
        container.querySelectorAll('.btn-delete-ciccopaolo-round').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                if (confirm(`Eliminare la smazzata ${game.rounds[idx].roundNumber}?`)) {
                    triggerHaptic('warning');
                    game.rounds.splice(idx, 1);
                    // Re-index
                    game.rounds.forEach((r, i) => r.roundNumber = i + 1);
                    // Recalculate partition scores
                    game.players.forEach(p => {
                        p.currentPartitionScore = game.rounds.reduce((sum, r) => sum + this.calculateRoundPointsCiccopaolo(r, p.id), 0);
                    });
                    Store.save();
                    this.renderActiveCiccopaolo();
                }
            };
        });

        // Actions: Edit round details on click
        container.querySelectorAll('.round-history-row').forEach(row => {
            row.onclick = () => {
                const idx = parseInt(row.dataset.idx);
                this.openAddRoundCiccopaoloModal(game.rounds[idx]);
            };
        });

        // Add round modal trigger
        document.getElementById('btn-add-ciccopaolo-round').onclick = () => {
            triggerHaptic('medium');
            this.openAddRoundCiccopaoloModal(null);
        };
    },

    calculateRoundPointsCiccopaolo(round, playerId) {
        let total = 0;
        if (round.primieraWinnerId === playerId) total += 1;
        if (round.settebelloWinnerId === playerId) total += 1;
        if (round.carteWinnerId === playerId) total += 1;
        if (round.denariWinnerId === playerId) total += 1;
        total += (round.scopeScores[playerId] || 0);
        total += (round.extraScores[playerId] || 0);
        return total;
    },

    getScopeAndExtraCiccopaoloText(round) {
        const game = Store.state.ciccopaoloGame;
        const scopeTexts = [];
        const extraTexts = [];
        
        game.players.forEach(p => {
            const sc = round.scopeScores[p.id] || 0;
            const ex = round.extraScores[p.id] || 0;
            if (sc > 0) scopeTexts.push(`${p.name} (${sc})`);
            if (ex > 0) extraTexts.push(`${p.name} (+${ex})`);
        });

        let out = '';
        if (scopeTexts.length > 0) out += `<span>Scope: ${scopeTexts.join(' - ')}</span>`;
        if (extraTexts.length > 0) out += `<span>Extra: ${extraTexts.join(' - ')}</span>`;
        return out;
    },

    openAddRoundCiccopaoloModal(roundToEdit = null) {
        const game = Store.state.ciccopaoloGame;

        let primieraWinnerId = roundToEdit ? roundToEdit.primieraWinnerId : null;
        let settebelloWinnerId = roundToEdit ? roundToEdit.settebelloWinnerId : null;
        let carteWinnerId = roundToEdit ? roundToEdit.carteWinnerId : null;
        let denariWinnerId = roundToEdit ? roundToEdit.denariWinnerId : null;
        
        const scopeScores = {};
        const extraScores = {};
        game.players.forEach(p => {
            scopeScores[p.id] = roundToEdit ? (roundToEdit.scopeScores[p.id] || 0) : 0;
            extraScores[p.id] = roundToEdit ? (roundToEdit.extraScores[p.id] || 0) : 0;
        });

        let primieraDetails = roundToEdit ? roundToEdit.primieraDetails : null;

        const getActiveCls = (winnerId, matchId) => {
            return winnerId === matchId ? 'active green' : '';
        };

        const renderBody = () => {
            // Build players selectors buttons dynamically for 2 or 3 players
            const renderSelectors = (title, field, activeVal, buttonClass) => {
                let btnsHTML = '';
                game.players.forEach(p => {
                    btnsHTML += `<button class="selector-btn ${buttonClass} ${getActiveCls(activeVal, p.id)}" data-val="${p.id}">${p.name}</button>`;
                });
                btnsHTML += `<button class="selector-btn ${buttonClass} ${!activeVal ? 'active' : ''}" data-val="none">Nessuno</button>`;
                
                // Add calculation button only for Primiera selector
                const calcBtn = field === 'primiera' ? `<button id="btn-calc-primiera" class="btn-calc green">Calcola</button>` : '';

                return `
                    <div class="selector-row">
                        <span class="selector-row-title">${title}</span>
                        <div style="display:flex; align-items:center;">
                            <div class="selector-btn-group">
                                ${btnsHTML}
                            </div>
                            ${calcBtn}
                        </div>
                    </div>
                `;
            };

            // Build Scope and Extra counter list
            let countersScopeHTML = '';
            let countersExtraHTML = '';
            game.players.forEach(p => {
                countersScopeHTML += renderCounterRow('scope', p);
                countersExtraHTML += renderCounterRow('extra', p);
            });

            // Build live preview
            let previewColsHTML = '';
            game.players.forEach((p, idx) => {
                const pts = calcLivePoints(p.id);
                previewColsHTML += `
                    <div class="score-column">
                        <span class="name" style="font-size:12px;">${p.name}</span>
                        <span class="score-num" style="font-size:24px; color:var(--score-positive);">+${pts}</span>
                    </div>
                `;
                if (idx < game.players.length - 1) {
                    previewColsHTML += `<div class="score-divider" style="height:35px;"></div>`;
                }
            });

            const bodyHTML = `
                <span class="form-section-title">PUNTI CLASSICI SCOPA (1 PT CIASCUNO)</span>
                <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
                    ${renderSelectors("Primiera", "primiera", primieraWinnerId, "cp-prim-sel")}
                    ${renderSelectors("Settebello", "settebello", settebelloWinnerId, "cp-sett-sel")}
                    ${renderSelectors("Carte", "carte", carteWinnerId, "cp-cart-sel")}
                    ${renderSelectors("Denari", "denari", denariWinnerId, "cp-den-sel")}
                </div>

                <span class="form-section-title">SCOPE FATTE</span>
                <div class="settings-card" style="padding: 8px 16px; margin-bottom:16px;">
                    ${countersScopeHTML}
                </div>

                <span class="form-section-title">PUNTI EXTRA</span>
                <div class="settings-card" style="padding: 8px 16px; margin-bottom:16px;">
                    ${countersExtraHTML}
                </div>

                <!-- Live preview -->
                <span class="form-section-title">ANTEPRIMA PUNTI ROUND</span>
                <div class="dual-scoreboard" style="padding: 12px; margin-bottom: 20px;">
                    ${previewColsHTML}
                </div>

                <button id="btn-save-ciccopaolo-round-action" class="btn-primary" style="background-color: var(--accent-green); box-shadow: 0 4px 12px rgba(52,199,89,0.2);">${roundToEdit ? 'Salva Modifiche' : 'Salva Smazzata'}</button>
            `;

            openOverlay(roundToEdit ? `Modifica Smazzata ${roundToEdit.roundNumber}` : `Fine Smazzata ${game.rounds.length + 1}`, bodyHTML);
            bindModalEvents();
        };

        const renderCounterRow = (type, player) => {
            const val = type === 'scope' ? scopeScores[player.id] : extraScores[player.id];
            return `
                <div class="counter-row">
                    <span class="counter-row-title">${player.name}</span>
                    <div class="counter-controls">
                        <button class="counter-btn minus" data-type="${type}" data-pid="${player.id}">-</button>
                        <span class="counter-value" id="val-${type}-${player.id}">${val}</span>
                        <button class="counter-btn plus" data-type="${type}" data-pid="${player.id}">+</button>
                    </div>
                </div>
            `;
        };

        const calcLivePoints = (playerId) => {
            let pts = 0;
            if (primieraWinnerId === playerId) pts++;
            if (settebelloWinnerId === playerId) pts++;
            if (carteWinnerId === playerId) pts++;
            if (denariWinnerId === playerId) pts++;
            pts += scopeScores[playerId];
            pts += extraScores[playerId];
            return pts;
        };

        const updateLivePreviews = () => {
            game.players.forEach((p, idx) => {
                const cols = document.querySelectorAll('.dual-scoreboard .score-column');
                if (cols[idx]) {
                    cols[idx].querySelector('.score-num').textContent = `+${calcLivePoints(p.id)}`;
                }
            });
        };

        const bindModalEvents = () => {
            // Selectors bind
            const bindGroup = (className, callback) => {
                const btnList = document.querySelectorAll(className);
                btnList.forEach(btn => {
                    btn.onclick = () => {
                        const val = btn.dataset.val;
                        triggerHaptic('light');
                        callback(val === 'none' ? null : val);
                        btnList.forEach(x => x.classList.remove('active', 'green'));
                        btn.classList.add('active', 'green');
                        updateLivePreviews();
                    };
                });
            };

            bindGroup('.cp-prim-sel', val => primieraWinnerId = val);
            bindGroup('.cp-sett-sel', val => settebelloWinnerId = val);
            bindGroup('.cp-cart-sel', val => carteWinnerId = val);
            bindGroup('.cp-den-sel', val => denariWinnerId = val);

            // Counter plus/minus
            document.querySelectorAll('.counter-btn.plus').forEach(btn => {
                btn.onclick = () => {
                    const type = btn.dataset.type;
                    const pid = btn.dataset.pid;
                    triggerHaptic('light');
                    if (type === 'scope') scopeScores[pid]++;
                    else extraScores[pid]++;
                    document.getElementById(`val-${type}-${pid}`).textContent = type === 'scope' ? scopeScores[pid] : extraScores[pid];
                    updateLivePreviews();
                };
            });

            document.querySelectorAll('.counter-btn.minus').forEach(btn => {
                btn.onclick = () => {
                    const type = btn.dataset.type;
                    const pid = btn.dataset.pid;
                    triggerHaptic('light');
                    if (type === 'scope') {
                        if (scopeScores[pid] > 0) scopeScores[pid]--;
                    } else {
                        if (extraScores[pid] > 0) extraScores[pid]--;
                    }
                    document.getElementById(`val-${type}-${pid}`).textContent = type === 'scope' ? scopeScores[pid] : extraScores[pid];
                    updateLivePreviews();
                };
            });

            // Action: Calc Primiera
            document.getElementById('btn-calc-primiera').onclick = () => {
                triggerHaptic('light');
                
                // Primiera calculator mapping players array
                const mappedPlayers = game.players.map(p => ({ id: p.id, name: p.name }));
                
                PrimieraCalc.init(
                    mappedPlayers,
                    primieraDetails,
                    settebelloWinnerId,
                    (winnerId, details) => {
                        primieraWinnerId = winnerId;
                        primieraDetails = details;
                        renderBody();
                    }
                );
            };

            // Save action
            document.getElementById('btn-save-ciccopaolo-round-action').onclick = () => {
                triggerHaptic('success');

                const roundData = {
                    id: roundToEdit ? roundToEdit.id : generateUUID(),
                    roundNumber: roundToEdit ? roundToEdit.roundNumber : game.rounds.length + 1,
                    primieraWinnerId,
                    settebelloWinnerId,
                    carteWinnerId,
                    denariWinnerId,
                    scopeScores: { ...scopeScores },
                    extraScores: { ...extraScores },
                    primieraDetails
                };

                if (roundToEdit) {
                    const idx = game.rounds.findIndex(r => r.id === roundToEdit.id);
                    if (idx !== -1) game.rounds[idx] = roundData;
                } else {
                    game.rounds.push(roundData);
                }

                // Recalculate player partition scores
                game.players.forEach(p => {
                    p.currentPartitionScore = game.rounds.reduce((sum, r) => sum + this.calculateRoundPointsCiccopaolo(r, p.id), 0);
                });

                // Check if partition game ended
                const finishedGame = game.players.some(p => p.currentPartitionScore >= game.targetScore);
                
                // Unique leader verification
                let maxPartScore = -1;
                let leadingPlayerId = null;
                let partitionTie = false;
                game.players.forEach(p => {
                    if (p.currentPartitionScore > maxPartScore) {
                        maxPartScore = p.currentPartitionScore;
                        leadingPlayerId = p.id;
                        partitionTie = false;
                    } else if (p.currentPartitionScore === maxPartScore) {
                        partitionTie = true;
                    }
                });

                const uniqueGameWinner = finishedGame && !partitionTie && maxPartScore >= game.targetScore;

                if (uniqueGameWinner) {
                    // Game won! Save game partition
                    const winner = game.players.find(x => x.id === leadingPlayerId);
                    winner.gameWins++;
                    
                    // Archive active rounds
                    game.completedGamesRounds.push([...game.rounds]);
                    game.rounds = [];
                    
                    // Reset partitions
                    game.players.forEach(p => p.currentPartitionScore = 0);

                    // Check if match won
                    const requiredWins = game.matchFormat === 'Botta secca' ? 1 : 2;
                    const matchWinner = game.players.find(p => p.gameWins >= requiredWins);

                    Store.save();
                    closeOverlay();

                    if (matchWinner) {
                        // Match completed celebration
                        let standingsHTML = '';
                        // Sort players by total match wins, then index
                        const sorted = [...game.players].sort((a, b) => b.gameWins - a.gameWins);
                        sorted.forEach((p, idx) => {
                            const isWinner = p.id === matchWinner.id;
                            standingsHTML += `
                                <div class="standings-entry ${isWinner ? 'winner' : ''}">
                                    <span class="standings-pos">${idx + 1}</span>
                                    <span class="standings-name">${p.name}</span>
                                    <span class="standings-score">${p.gameWins} Partite Vinte🏆</span>
                                </div>
                            `;
                        });

                        Store.state.ciccopaoloGame = null; // Clear active game
                        Store.save();

                        openCelebration(matchWinner.name, "Vincitore Ciccopaolo", standingsHTML, () => {
                            this.goBack();
                        });
                    } else {
                        // Just one game won, match not finished. Show dialog.
                        alert(`Partita vinta da ${winner.name}! Il match continua.`);
                        this.renderActiveCiccopaolo();
                    }
                } else {
                    // Regular round saved
                    Store.save();
                    closeOverlay();
                    this.renderActiveCiccopaolo();
                }
            };
        };

        renderBody();
    },

    // ==========================================================================
    // 6. SCALA 40 GAME LOGIC & RENDERING
    // ==========================================================================
    renderSetupScalaQuaranta() {
        const container = document.getElementById('game-container');
        let targetScore = 101;
        const selectedIds = new Set();

        const buildList = () => {
            let html = '';
            Store.state.players.forEach(p => {
                const isSel = selectedIds.has(p.id);
                html += `
                    <div class="setup-player-item ${isSel ? 'selected' : ''}" data-id="${p.id}">
                        <span>${p.name}</span>
                        <div class="checkbox-circle">
                            ${isSel ? '<i data-lucide="check"></i>' : ''}
                        </div>
                    </div>
                `;
            });
            return html;
        };

        const renderSetup = () => {
            container.innerHTML = `
                <div class="game-view-header">
                    <button id="btn-setup-back" class="btn-back"><i data-lucide="arrow-left"></i> Giochi</button>
                    <h2>Nuova Partita Scala 40</h2>
                </div>
                
                <div class="setup-container">
                    <div class="setup-column-settings">
                        <div class="settings-card">
                            <span class="card-section-title">PUNTEGGIO DI ELIMINAZIONE</span>
                            <div class="options-grid">
                                <button class="option-btn sq-target-opt ${targetScore === 101 ? 'selected color-red' : ''}" data-val="101">101 pt</button>
                                <button class="option-btn sq-target-opt ${targetScore === 151 ? 'selected color-red' : ''}" data-val="151">151 pt</button>
                                <button class="option-btn sq-target-opt ${targetScore === 201 ? 'selected color-red' : ''}" data-val="201">201 pt</button>
                                <button class="option-btn sq-target-opt ${targetScore === 301 ? 'selected color-red' : ''}" data-val="301">301 pt</button>
                            </div>
                            
                            <div style="display:flex; align-items:center; justify-content:space-between; margin-top:10px;">
                                <span style="font-size:13px; color:var(--text-secondary);">Target personalizzato:</span>
                                <input type="number" id="sq-custom-target" value="${targetScore}" min="50" max="999" step="10" style="width: 80px; padding: 6px 12px; text-align:center;">
                            </div>
                        </div>

                        <div class="settings-card">
                            <span class="card-section-title">AGGIUNGI RAPIDO</span>
                            <form id="setup-add-player-form" class="inline-form">
                                <input type="text" id="setup-player-name" placeholder="Nome Giocatore" required autocomplete="off">
                                <button type="submit" class="btn-icon-accent"><i data-lucide="plus-circle"></i></button>
                            </form>
                        </div>
                    </div>

                    <div class="setup-column-players">
                        <div class="settings-card">
                            <span class="card-section-title">SELEZIONA PARTECIPANTI (MIN. 2)</span>
                            <div id="setup-players-list-container" class="setup-players-list">
                                ${buildList()}
                            </div>
                            <button id="btn-start-game" class="btn-primary" disabled>Inizia Partita</button>
                        </div>
                    </div>
                </div>
            `;
            
            lucide.createIcons();
            bindSetupEvents();
        };

        const bindSetupEvents = () => {
            // Update start button state
            const startBtn = document.getElementById('btn-start-game');
            if (selectedIds.size >= 2) {
                startBtn.disabled = false;
                startBtn.classList.remove('disabled');
            } else {
                startBtn.disabled = true;
                startBtn.classList.add('disabled');
            }

            // Target options
            container.querySelectorAll('.sq-target-opt').forEach(btn => {
                btn.onclick = () => {
                    targetScore = parseInt(btn.dataset.val);
                    triggerHaptic('light');
                    document.getElementById('sq-custom-target').value = targetScore;
                    container.querySelectorAll('.sq-target-opt').forEach(x => x.classList.remove('selected', 'color-red'));
                    btn.classList.add('selected', 'color-red');
                };
            });

            // Target input
            const customInput = document.getElementById('sq-custom-target');
            customInput.onchange = () => {
                let val = parseInt(customInput.value);
                if (isNaN(val) || val < 50) val = 50;
                if (val > 999) val = 999;
                targetScore = val;
                customInput.value = val;
                container.querySelectorAll('.sq-target-opt').forEach(btn => {
                    const optVal = parseInt(btn.dataset.val);
                    if (optVal === targetScore) btn.classList.add('selected', 'color-red');
                    else btn.classList.remove('selected', 'color-red');
                });
            };

            // Player toggles
            const items = container.querySelectorAll('.setup-player-item');
            items.forEach(item => {
                item.onclick = () => {
                    const id = item.dataset.id;
                    triggerHaptic('light');
                    if (selectedIds.has(id)) {
                        selectedIds.delete(id);
                    } else {
                        selectedIds.add(id);
                    }

                    document.getElementById('setup-players-list-container').innerHTML = buildList();
                    lucide.createIcons();
                    bindSetupEvents();
                };
            });

            // Back back
            document.getElementById('btn-setup-back').onclick = () => this.goBack();

            // Add player
            document.getElementById('setup-add-player-form').onsubmit = (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('setup-player-name');
                const newP = Store.addPlayer(nameInput.value);
                if (newP) {
                    nameInput.value = '';
                    selectedIds.add(newP.id);
                    renderSetup();
                }
            };

            // Start game
            document.getElementById('btn-start-game').onclick = () => {
                triggerHaptic('success');
                const ids = Array.from(selectedIds);
                const playersData = ids.map(id => ({
                    id: id,
                    name: Store.getPlayerName(id),
                    currentScore: 0,
                    isEliminated: false,
                    reentriesCount: 0
                }));

                Store.state.scalaQuarantaGame = {
                    id: generateUUID(),
                    date: new Date().toISOString(),
                    targetScore: targetScore,
                    players: playersData,
                    rounds: [],
                    isActive: true
                };
                Store.save();
                this.renderActiveScalaQuaranta();
            };
        };

        renderSetup();
    },

    renderActiveScalaQuaranta() {
        const game = Store.state.scalaQuarantaGame;
        const container = document.getElementById('game-container');

        const activeCount = game.players.filter(p => !p.isEliminated).length;
        const isFinished = activeCount <= 1;

        // 1. Players horizontal overview cards
        let playersCardsHTML = '';
        game.players.forEach(p => {
            const isElim = p.isEliminated;
            
            // Re-entry button
            let reenterBtn = '';
            if (isElim && !isFinished) {
                reenterBtn = `
                    <button class="btn-reenter btn-scala-reenter" data-id="${p.id}">
                        <i data-lucide="heart"></i> Resuscita
                    </button>
                `;
            }

            playersCardsHTML += `
                <div class="player-pill" style="flex-direction:column; align-items:flex-start; min-width:140px; padding:12px; gap:4px; height:auto; background-color:${isElim ? 'rgba(255,59,48,0.04)' : 'var(--card-bg)'}; border-color:${isElim ? 'rgba(255,59,48,0.2)' : 'var(--card-stroke)'}">
                    <div style="display:flex; width:100%; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; ${isElim ? 'text-decoration:line-through; color:var(--score-negative);' : ''}">${p.name}</span>
                        <span style="font-size:8px; font-weight:bold; color:white; padding:2px 4px; border-radius:4px; background-color:${isElim ? 'var(--score-negative)' : 'var(--score-positive)'}">${isElim ? 'SBALLATO' : 'ATTIVO'}</span>
                    </div>
                    <div style="font-family:var(--font-heading); font-size:24px; font-weight:800; color:${isElim ? 'var(--text-secondary)' : (p.currentScore > game.targetScore - 20 ? 'var(--accent-orange)' : 'white')}">
                        ${p.currentScore} <span style="font-size:10px; font-weight:normal; color:var(--text-secondary);">/ ${game.targetScore} pt</span>
                    </div>
                    ${p.reentriesCount > 0 ? `<span style="font-size:9px; color:var(--trophy-gold); font-weight:bold;">Resurrezioni: ${p.reentriesCount}</span>` : ''}
                    ${reenterBtn}
                </div>
            `;
        });

        // 2. Rounds List
        let historyHTML = '';
        if (game.rounds.length > 0) {
            let reversed = [...game.rounds].reverse();
            reversed.forEach((round, revIndex) => {
                const actualIndex = game.rounds.length - 1 - revIndex;
                
                let scoresHTML = '';
                game.players.forEach(p => {
                    const score = round.scores[p.id] || 0;
                    const isCloser = round.closingPlayerId === p.id;
                    scoresHTML += `
                        <div style="flex:1; display:flex; flex-direction:column; font-size:12px;">
                            <span style="color:var(--text-secondary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${p.name}</span>
                            <span style="font-weight:bold; color:${isCloser ? 'var(--score-positive)' : (score >= 25 ? 'var(--score-negative)' : 'white')}">${isCloser ? '0 pt (Chiuso)' : `+${score} pt`}</span>
                        </div>
                    `;
                });

                historyHTML += `
                    <div class="round-history-row" style="padding: 12px 14px;">
                        <div class="round-row-header" style="border-bottom: 1px solid var(--card-stroke); padding-bottom:6px; margin-bottom:6px;">
                            <span class="round-number" style="color:var(--accent-teal)">ROUND ${round.roundNumber}</span>
                            ${round.closingPlayerId ? `<span style="font-size:10px; font-weight:bold; color:var(--score-positive); display:flex; align-items:center; gap:2px;"><i data-lucide="check-square" style="width:10px; height:10px;"></i> ${Store.getPlayerName(round.closingPlayerId)} chiude</span>` : ''}
                        </div>
                        <div style="display:flex; gap:12px; margin-bottom: 4px;">
                            ${scoresHTML}
                        </div>
                        <div style="display:flex; justify-content:flex-end;">
                            <button class="btn-row-action btn-delete-sq-round" data-idx="${actualIndex}">
                                <i data-lucide="trash-2" style="width:11px; height:11px; color:var(--accent-red)"></i>
                                <span>Elimina</span>
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <div class="game-view-header">
                <button id="btn-active-back" class="btn-back"><i data-lucide="arrow-left"></i> Esci</button>
                <div class="game-toolbar">
                    <button id="btn-active-reset" class="btn-toolbar-circle"><i data-lucide="rotate-ccw"></i></button>
                    <button id="btn-active-end" class="btn-toolbar-pill"><i data-lucide="flag"></i> Termina</button>
                </div>
            </div>

            <!-- Horizontal Players Scroll -->
            <div class="players-scroll-container" style="margin-bottom:12px;">
                <div class="players-list-scroll">
                    ${playersCardsHTML}
                </div>
            </div>

            <button id="btn-add-sq-round" class="btn-primary color-teal" style="margin-top:10px;"><i data-lucide="plus-circle"></i> Aggiungi Round</button>

            <div class="rounds-history-section">
                <span class="section-title">STORICO ROUND</span>
                <div class="rounds-list">
                    ${historyHTML || `
                        <div class="empty-placeholder" style="padding: 30px 10px;">
                            <i data-lucide="layers"></i>
                            <h4>Nessun round</h4>
                            <p>Tocca 'Aggiungi Round' per registrare i punteggi delle smazzate.</p>
                        </div>
                    `}
                </div>
            </div>
        `;

        lucide.createIcons();

        // Bind events: Back, Reset, Cancel, Reenter
        document.getElementById('btn-active-back').onclick = () => this.goBack();
        
        document.getElementById('btn-active-reset').onclick = () => {
            if (confirm("Sei sicuro di voler azzerare il punteggio e i round della partita corrente?")) {
                triggerHaptic('warning');
                game.rounds = [];
                game.players.forEach(p => {
                    p.currentScore = 0;
                    p.isEliminated = false;
                    p.reentriesCount = 0;
                });
                Store.save();
                this.renderActiveScalaQuaranta();
            }
        };

        // Actions: Terminate match early
        document.getElementById('btn-active-end').onclick = () => {
            if (confirm("Terminare e salvare la partita? Il vincitore sarà chi ha meno punti.")) {
                this.endScalaQuarantaGameAction();
            }
        };

        // Actions: Re-enter player
        container.querySelectorAll('.btn-scala-reenter').forEach(btn => {
            btn.onclick = () => {
                const pid = btn.dataset.id;
                // Find highest score among currently active players
                const activeScores = game.players.filter(p => !p.isEliminated).map(p => p.currentScore);
                if (activeScores.length > 0) {
                    const maxScore = Math.max(...activeScores);
                    const p = game.players.find(x => x.id === pid);
                    if (p) {
                        p.currentScore = maxScore;
                        p.isEliminated = false;
                        p.reentriesCount++;
                        triggerHaptic('success');
                        Store.save();
                        this.renderActiveScalaQuaranta();
                    }
                }
            };
        });

        // Actions: Delete round
        container.querySelectorAll('.btn-delete-sq-round').forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                if (confirm(`Eliminare il round ${game.rounds[idx].roundNumber}?`)) {
                    triggerHaptic('warning');
                    game.rounds.splice(idx, 1);
                    // Recompute scores and numbers
                    game.rounds.forEach((r, i) => r.roundNumber = i + 1);
                    game.players.forEach(p => {
                        let total = 0;
                        game.rounds.forEach(r => total += (r.scores[p.id] || 0));
                        p.currentScore = total;
                        p.isEliminated = total >= game.targetScore;
                    });
                    Store.save();
                    this.renderActiveScalaQuaranta();
                }
            };
        });

        // Add round trigger
        document.getElementById('btn-add-sq-round').onclick = () => {
            triggerHaptic('medium');
            this.openAddRoundScalaQuarantaModal();
        };

        // Automated game completion verification
        if (isFinished && game.players.length > 1) {
            this.endScalaQuarantaGameAction();
        }
    },

    openAddRoundScalaQuarantaModal() {
        const game = Store.state.scalaQuarantaGame;
        
        // Modal state variables
        const inputScores = {};
        let closingPlayerId = null;
        const notOpenedIds = new Set();
        let expandedPlayerId = null;

        // Calculator states per player: jokers, aces, figures, others
        const jokersCount = {};
        const acesCount = {};
        const figuresCount = {};
        const otherCardsSum = {};

        game.players.forEach(p => {
            if (!p.isEliminated) {
                inputScores[p.id] = 0;
                jokersCount[p.id] = 0;
                acesCount[p.id] = 0;
                figuresCount[p.id] = 0;
                otherCardsSum[p.id] = 0;
            }
        });

        const updateScoreFromCalculator = (playerId) => {
            if (closingPlayerId === playerId) {
                inputScores[playerId] = 0;
                return;
            }
            if (notOpenedIds.has(playerId)) {
                inputScores[playerId] = 100;
                return;
            }
            const jokers = jokersCount[playerId] || 0;
            const aces = acesCount[playerId] || 0;
            const figs = figuresCount[playerId] || 0;
            const others = otherCardsSum[playerId] || 0;
            
            inputScores[playerId] = (jokers * 25) + (aces * 11) + (figs * 10) + others;
        };

        const renderBody = () => {
            let listHTML = '';
            game.players.forEach(p => {
                if (p.isEliminated) return; // Skip eliminated

                const isExpanded = expandedPlayerId === p.id;
                const score = inputScores[p.id];
                const isCloser = closingPlayerId === p.id;
                const isNotOpened = notOpenedIds.has(p.id);

                let badgeText = `${score} pt`;
                let badgeClass = '';
                if (isCloser) {
                    badgeText = '0 pt (Chiuso)';
                    badgeClass = 'closed';
                } else if (isNotOpened) {
                    badgeText = '100 pt';
                }

                // Calculator subform
                let calculatorHTML = '';
                if (isExpanded) {
                    calculatorHTML = `
                        <div class="scala40-calc-body">
                            <!-- Closer / Not opened selectors -->
                            <div class="scala40-toggle-buttons">
                                <button class="toggle-btn closer ${isCloser ? 'active' : ''}" data-pid="${p.id}" data-type="closer">
                                    <i data-lucide="check"></i> Ha Chiuso
                                </button>
                                <button class="toggle-btn not-opened ${isNotOpened ? 'active' : ''}" data-pid="${p.id}" data-type="not-opened">
                                    <i data-lucide="alert-circle"></i> Non Aperto (100)
                                </button>
                            </div>

                            <!-- Interactive cards list -->
                            ${(!isCloser && !isNotOpened) ? `
                                <div style="display:flex; flex-direction:column; gap:8px;">
                                    ${renderCounterItem(p.id, 'Jolly (25 pt)', 'jokers')}
                                    ${renderCounterItem(p.id, 'Assi (11 pt)', 'aces')}
                                    ${renderCounterItem(p.id, 'Figure (10 pt)', 'figures')}
                                    
                                    <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                                        <span style="font-size:13px; font-weight:600; color:var(--text-secondary);">Altre carte (Somma valori):</span>
                                        <input type="number" class="sq-others-input" data-pid="${p.id}" value="${otherCardsSum[p.id]}" min="0" max="99" style="width:70px; padding:6px; text-align:center;">
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `;
                }

                listHTML += `
                    <div class="scala40-player-card ${isExpanded ? 'expanded' : ''}">
                        <div class="scala40-row-header">
                            <div>
                                <span style="font-weight:700; font-size:16px;">${p.name}</span>
                                <span style="font-size:11px; color:var(--text-secondary); display:block;">Score attuale: ${p.currentScore}</span>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span class="scala40-score-badge ${badgeClass}">${badgeText}</span>
                                <button class="btn-toggle-expand" data-pid="${p.id}"><i data-lucide="chevron-down"></i></button>
                            </div>
                        </div>
                        ${calculatorHTML}
                    </div>
                `;
            });

            const bodyHTML = `
                <div style="max-height: 400px; overflow-y:auto; padding-right:4px;">
                    ${listHTML}
                </div>
                <button id="btn-save-sq-round-action" class="btn-primary color-teal" style="margin-top:16px;">Salva Round</button>
            `;

            openOverlay(`Aggiungi Round ${game.rounds.length + 1}`, bodyHTML);
            bindModalEvents();
        };

        const renderCounterItem = (pid, label, field) => {
            let val = 0;
            if (field === 'jokers') val = jokersCount[pid];
            if (field === 'aces') val = acesCount[pid];
            if (field === 'figures') val = figuresCount[pid];
            
            return `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:4px 0;">
                    <span style="font-size:13px; font-weight:600; color:var(--text-secondary);">${label}:</span>
                    <div class="counter-controls">
                        <button class="counter-btn minus btn-sq-calc-minus" data-pid="${pid}" data-field="${field}">-</button>
                        <span class="counter-value" style="font-size:15px; width:20px;">${val}</span>
                        <button class="counter-btn plus btn-sq-calc-plus" data-pid="${pid}" data-field="${field}">+</button>
                    </div>
                </div>
            `;
        };

        const bindModalEvents = () => {
            // Expands player card
            document.querySelectorAll('.btn-toggle-expand').forEach(btn => {
                btn.onclick = () => {
                    const pid = btn.dataset.pid;
                    triggerHaptic('light');
                    expandedPlayerId = expandedPlayerId === pid ? null : pid;
                    renderBody();
                };
            });

            // Toggles Closer / Not Opened
            document.querySelectorAll('.toggle-btn').forEach(btn => {
                btn.onclick = () => {
                    const pid = btn.dataset.pid;
                    const type = btn.dataset.type;
                    triggerHaptic('light');

                    if (type === 'closer') {
                        if (closingPlayerId === pid) {
                            closingPlayerId = null;
                        } else {
                            closingPlayerId = pid;
                            notOpenedIds.delete(pid);
                        }
                    } else if (type === 'not-opened') {
                        if (notOpenedIds.has(pid)) {
                            notOpenedIds.delete(pid);
                        } else {
                            notOpenedIds.add(pid);
                            if (closingPlayerId === pid) closingPlayerId = null;
                        }
                    }

                    updateScoreFromCalculator(pid);
                    renderBody();
                };
            });

            // Plus calculators
            document.querySelectorAll('.btn-sq-calc-plus').forEach(btn => {
                btn.onclick = () => {
                    const pid = btn.dataset.pid;
                    const field = btn.dataset.field;
                    triggerHaptic('light');

                    if (field === 'jokers') jokersCount[pid]++;
                    if (field === 'aces') acesCount[pid]++;
                    if (field === 'figures') figuresCount[pid]++;

                    updateScoreFromCalculator(pid);
                    renderBody();
                };
            });

            // Minus calculators
            document.querySelectorAll('.btn-sq-calc-minus').forEach(btn => {
                btn.onclick = () => {
                    const pid = btn.dataset.pid;
                    const field = btn.dataset.field;
                    triggerHaptic('light');

                    if (field === 'jokers' && jokersCount[pid] > 0) jokersCount[pid]--;
                    if (field === 'aces' && acesCount[pid] > 0) acesCount[pid]--;
                    if (field === 'figures' && figuresCount[pid] > 0) figuresCount[pid]--;

                    updateScoreFromCalculator(pid);
                    renderBody();
                };
            });

            // Input card sums
            document.querySelectorAll('.sq-others-input').forEach(input => {
                input.onchange = () => {
                    const pid = input.dataset.pid;
                    let val = parseInt(input.value);
                    if (isNaN(val) || val < 0) val = 0;
                    if (val > 99) val = 99;
                    otherCardsSum[pid] = val;
                    updateScoreFromCalculator(pid);
                    renderBody();
                };
            });

            // Save Action
            document.getElementById('btn-save-sq-round-action').onclick = () => {
                triggerHaptic('success');
                
                // Construct round score mapping
                const roundScores = {};
                game.players.forEach(p => {
                    if (!p.isEliminated) {
                        roundScores[p.id] = inputScores[p.id] || 0;
                    } else {
                        roundScores[p.id] = 0;
                    }
                });

                const roundData = {
                    id: generateUUID(),
                    roundNumber: game.rounds.length + 1,
                    scores: roundScores,
                    closingPlayerId: closingPlayerId
                };
                
                game.rounds.push(roundData);

                // Update players current scores & eliminations
                game.players.forEach(p => {
                    if (!p.isEliminated) {
                        p.currentScore += roundScores[p.id];
                        if (p.currentScore >= game.targetScore) {
                            p.isEliminated = true;
                        }
                    }
                });

                Store.save();
                closeOverlay();
                this.renderActiveScalaQuaranta();
            };
        };

        renderBody();
    },

    endScalaQuarantaGameAction() {
        const game = Store.state.scalaQuarantaGame;

        // Leaderboard sorted by score ascending (lowest score wins!)
        const sorted = [...game.players].sort((a, b) => {
            // If both are eliminated, sort by score ascending
            // If one active and one eliminated, active goes first
            if (a.isEliminated && !b.isEliminated) return 1;
            if (!a.isEliminated && b.isEliminated) return -1;
            return a.currentScore - b.currentScore;
        });

        const winner = sorted[0];

        let standingsHTML = '';
        sorted.forEach((p, idx) => {
            const isWinner = p.id === winner.id;
            standingsHTML += `
                <div class="standings-entry ${isWinner ? 'winner' : ''}">
                    <span class="standings-pos">${idx + 1}</span>
                    <span class="standings-name">${p.name}</span>
                    <span class="standings-score">${p.currentScore} pt ${p.isEliminated ? '💀' : ''}</span>
                </div>
            `;
        });

        Store.state.scalaQuarantaGame = null;
        Store.save();

        openCelebration(winner.name, "Vincitore Scala 40", standingsHTML, () => {
            this.goBack();
        });
    }
};

// Start APP
window.onload = () => {
    App.init();
};
