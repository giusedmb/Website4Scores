// ==========================================================================
// SCOREKEEPER CORE GAME ENGINE & VIEW ROUTER (VANILLA JS)
// ==========================================================================

const app = {
    // 1. APPLICATION STATE
    state: {
        players: [], // Roster of registered players: { id, name, createdAt }
        activeGame: null, // Current active game session
        
        // Setup Screen state
        selectedGameType: null, // scopa | briscola | bisca | ciccopaolo | scala40 | standard
        selectedSetupPlayerIds: new Set(), // IDs of players selected in setup checklist
        
        // Primiera Calculator State
        primieraCalc: {
            activePlayerId: null, // Tab selected
            selections: {} // { playerUuid: { suitName: cardRankInt } }
        }
    },

    // Card Game Rules & Configurations
    rules: {
        scopa: { minPlayers: 2, maxPlayers: 2, defaultTarget: 11 },
        briscola: { minPlayers: 2, maxPlayers: 2, defaultTarget: 2 }, // 2 target wins (best of 3)
        bisca: { minPlayers: 2, maxPlayers: 99, defaultTarget: 5 }, // 5 starting lives
        ciccopaolo: { minPlayers: 2, maxPlayers: 2, defaultTarget: 21 },
        scala40: { minPlayers: 2, maxPlayers: 8, defaultTarget: 101 },
        standard: { minPlayers: 2, maxPlayers: 99, defaultTarget: null }
    },

    // Primiera Card Values
    primieraPoints: {
        7: 21,
        6: 18,
        1: 16, // Asso
        5: 15,
        4: 14,
        3: 13,
        2: 12,
        8: 10, // Fante
        9: 10, // Cavallo
        10: 10 // Re
    },

    // 2. INITIALIZATION
    init() {
        this.loadPlayers();
        this.loadActiveGame();
        
        // Render initial dashboard layout
        this.renderPlayersList();
        this.updateActiveGameBadges();

        // If a game was active from a previous session, restore it
        if (this.state.activeGame && this.state.activeGame.isActive) {
            this.showView('view-gameplay');
            this.renderGameplay();
        } else {
            this.showDashboard();
        }
    },

    // 3. PERSISTENCE METHODS (LOCAL STORAGE)
    loadPlayers() {
        const stored = localStorage.getItem('sk_players');
        if (stored) {
            const parsed = JSON.parse(stored);
            const defaults = ['Giuseppe', 'Giada', 'Luca', 'Marco'];
            const isDefaultsOnly = parsed.length === 4 && parsed.every(p => defaults.includes(p.name));
            if (isDefaultsOnly) {
                this.state.players = [];
                this.savePlayers();
            } else {
                this.state.players = parsed;
            }
        } else {
            this.state.players = [];
            this.savePlayers();
        }
    },

    savePlayers() {
        localStorage.setItem('sk_players', JSON.stringify(this.state.players));
    },

    loadActiveGame() {
        const stored = localStorage.getItem('sk_active_game');
        if (stored) {
            this.state.activeGame = JSON.parse(stored);
        }
    },

    saveActiveGame() {
        if (this.state.activeGame) {
            localStorage.setItem('sk_active_game', JSON.stringify(this.state.activeGame));
        } else {
            localStorage.removeItem('sk_active_game');
        }
        this.updateActiveGameBadges();
    },

    // 4. VIEW ROUTER
    showView(viewId) {
        document.querySelectorAll('.app-view').forEach(view => {
            view.classList.remove('active');
        });
        
        const activeView = document.getElementById(viewId);
        if (activeView) {
            activeView.classList.add('active');
        }

        // Show/hide back button
        const backBtn = document.getElementById('btn-back');
        if (viewId === 'view-dashboard') {
            backBtn.classList.add('hidden');
        } else {
            backBtn.classList.remove('hidden');
        }
    },

    showDashboard() {
        this.state.selectedGameType = null;
        this.state.selectedSetupPlayerIds.clear();
        this.showView('view-dashboard');
        this.renderPlayersList();
    },

    goBack() {
        const currentView = document.querySelector('.app-view.active').id;
        if (currentView === 'view-setup') {
            this.showDashboard();
        } else if (currentView === 'view-gameplay') {
            // Simply go back to dashboard but keep game active in background
            this.showDashboard();
        }
    },

    // 5. PLAYER DIRECTORY MANAGEMENT
    registerPlayer(name) {
        if (!name || name.trim() === '') return null;
        
        // Check duplicate name
        const exists = this.state.players.some(p => p.name.toLowerCase() === name.trim().toLowerCase());
        if (exists) {
            alert('Questo giocatore esiste già!');
            return null;
        }

        const newPlayer = {
            id: this.generateUUID(),
            name: name.trim(),
            createdAt: new Date().toISOString()
        };
        
        this.state.players.push(newPlayer);
        this.savePlayers();
        return newPlayer;
    },

    deletePlayer(id) {
        this.showConfirm(
            'Elimina Giocatore',
            'Sei sicuro di voler eliminare questo giocatore?',
            () => {
                this.state.players = this.state.players.filter(p => p.id !== id);
                this.savePlayers();
                
                // Also remove from active setup selections if selected
                this.state.selectedSetupPlayerIds.delete(id);
                
                this.renderPlayersList();
                this.renderSetupPlayersChecklist();
                this.validateSetupStartButton();
            }
        );
    },

    renamePlayer(id) {
        const player = this.state.players.find(p => p.id === id);
        if (!player) return;
        
        const newName = prompt('Rinomina giocatore:', player.name);
        if (newName === null) return;
        
        const trimmed = newName.trim();
        if (trimmed === '') {
            alert('Il nome non può essere vuoto.');
            return;
        }
        
        const exists = this.state.players.some(p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase());
        if (exists) {
            alert('Questo giocatore esiste già!');
            return;
        }
        
        player.name = trimmed;
        this.savePlayers();
        
        if (this.state.activeGame) {
            const gp = this.state.activeGame.players.find(p => p.id === id);
            if (gp) {
                gp.name = trimmed;
                this.saveActiveGame();
            }
        }
        
        this.renderPlayersList();
        this.renderSetupPlayersChecklist();
        if (this.state.activeGame && this.state.activeGame.isActive) {
            this.renderGameplay();
        }
    },

    registerPlayerFromDashboard() {
        const input = document.getElementById('input-new-player-name');
        const name = input.value;
        if (this.registerPlayer(name)) {
            input.value = '';
            this.renderPlayersList();
        }
    },

    renderPlayersList() {
        const container = document.getElementById('players-list-container');
        container.innerHTML = '';
        
        if (this.state.players.length === 0) {
            container.innerHTML = `<div class="empty-info">Nessun giocatore registrato. Aggiungine uno sotto.</div>`;
            return;
        }

        this.state.players.forEach(player => {
            const el = document.createElement('div');
            el.className = 'player-bubble';
            el.setAttribute('title', 'Clicca per rinominare');
            el.onclick = () => app.renamePlayer(player.id);
            el.innerHTML = `
                <span class="player-avatar">👤</span>
                <span class="player-name-bubble">${this.escapeHTML(player.name)}</span>
                <button class="btn-remove-player" onclick="event.stopPropagation(); app.deletePlayer('${player.id}')">&times;</button>
            `;
            container.appendChild(el);
        });
    },

    // 6. GAME SELECTION & SETUP
    selectGame(gameType) {
        this.state.selectedGameType = gameType;
        
        // If there is an active game of this type, resume it immediately
        if (this.state.activeGame && this.state.activeGame.isActive && this.state.activeGame.type === gameType) {
            this.showView('view-gameplay');
            this.renderGameplay();
            return;
        }

        // Otherwise go to Setup view
        this.showView('view-setup');
        
        // Configure setup headers
        const titleEl = document.getElementById('setup-title');
        const reqEl = document.getElementById('setup-players-requirement');
        const capitalizedType = gameType.charAt(0).toUpperCase() + gameType.slice(1);
        titleEl.textContent = `Configura ${capitalizedType === 'Scala40' ? 'Scala 40' : capitalizedType}`;
        
        const reqRule = this.rules[gameType];
        if (reqRule.minPlayers === reqRule.maxPlayers) {
            reqEl.textContent = `Richiesti esattamente ${reqRule.minPlayers} giocatori`;
        } else {
            reqEl.textContent = `Minimo ${reqRule.minPlayers} giocatori`;
        }

        // Render game-specific options
        this.renderSetupOptions(gameType);
        
        // Render players selection checklist
        this.state.selectedSetupPlayerIds.clear();
        this.renderSetupPlayersChecklist();
        this.validateSetupStartButton();
    },

    renderSetupOptions(gameType) {
        const container = document.getElementById('setup-options-container');
        container.innerHTML = '';

        if (gameType === 'scopa') {
            container.innerHTML = `
                <h5>PUNTEGGIO OBIETTIVO</h5>
                <div class="segmented-control" style="--btn-accent-color: var(--accent-orange)">
                    <button class="segment-btn active" onclick="app.setSetupTarget(11, this)">11</button>
                    <button class="segment-btn" onclick="app.setSetupTarget(21, this)">21</button>
                    <button class="segment-btn" onclick="app.setSetupTarget('custom', this)">Altro</button>
                </div>
                <div id="custom-target-row" class="custom-input-row hidden" style="margin-top: 10px;">
                    <span>Valore personalizzato (5-99):</span>
                    <input type="number" id="setup-custom-target" min="5" max="99" value="11" oninput="app.validateSetupStartButton()">
                </div>
            `;
            this.setupTargetValue = 11;
        } 
        else if (gameType === 'briscola') {
            container.innerHTML = `
                <h5>MANI DA VINCERE (MATCH)</h5>
                <div class="segmented-control" style="--btn-accent-color: var(--accent-red)">
                    <button class="segment-btn active" onclick="app.setSetupTarget(1, this)">Singola</button>
                    <button class="segment-btn" onclick="app.setSetupTarget(2, this)">Meglio di 3</button>
                    <button class="segment-btn" onclick="app.setSetupTarget(3, this)">Meglio di 5</button>
                </div>
            `;
            this.setupTargetValue = 1; // 1 win needed
        }
        else if (gameType === 'bisca') {
            container.innerHTML = `
                <h5>VITE DI PARTENZA</h5>
                <div class="segmented-control" style="--btn-accent-color: var(--accent-purple)">
                    <button class="segment-btn" onclick="app.setSetupTarget(3, this)">3</button>
                    <button class="segment-btn active" onclick="app.setSetupTarget(5, this)">5</button>
                    <button class="segment-btn" onclick="app.setSetupTarget(7, this)">7</button>
                    <button class="segment-btn" onclick="app.setSetupTarget('custom', this)">Altro</button>
                </div>
                <div id="custom-target-row" class="custom-input-row hidden" style="margin-top: 10px;">
                    <span>Vite personalizzate (1-99):</span>
                    <input type="number" id="setup-custom-target" min="1" max="99" value="5" oninput="app.validateSetupStartButton()">
                </div>
            `;
            this.setupTargetValue = 5;
        }
        else if (gameType === 'ciccopaolo') {
            container.innerHTML = `
                <h5>FORMAT MATCH</h5>
                <div class="segmented-control" style="--btn-accent-color: var(--accent-green)" id="ciccopaolo-match-format">
                    <button class="segment-btn active" onclick="app.setCiccopaoloFormat('bottaSecca', this)">Botta Secca</button>
                    <button class="segment-btn" onclick="app.setCiccopaoloFormat('meglioDiTre', this)">Alla Meglio di 3</button>
                </div>
                <h5 style="margin-top: 15px;">PUNTEGGIO OBIETTIVO (SINGOLO GIOCO)</h5>
                <div class="segmented-control" style="--btn-accent-color: var(--accent-green)">
                    <button class="segment-btn" onclick="app.setSetupTarget(11, this)">11</button>
                    <button class="segment-btn active" onclick="app.setSetupTarget(21, this)">21</button>
                    <button class="segment-btn" onclick="app.setSetupTarget(31, this)">31</button>
                </div>
            `;
            this.setupTargetValue = 21;
            this.ciccopaoloFormat = 'bottaSecca'; // bottaSecca | meglioDiTre
        }
        else if (gameType === 'scala40') {
            container.innerHTML = `
                <h5>LIMITE ELIMINAZIONE</h5>
                <div class="segmented-control" style="--btn-accent-color: var(--accent-teal)">
                    <button class="segment-btn active" onclick="app.setSetupTarget(101, this)">101</button>
                    <button class="segment-btn" onclick="app.setSetupTarget(201, this)">201</button>
                    <button class="segment-btn" onclick="app.setSetupTarget(301, this)">301</button>
                    <button class="segment-btn" onclick="app.setSetupTarget('custom', this)">Altro</button>
                </div>
                <div id="custom-target-row" class="custom-input-row hidden" style="margin-top: 10px;">
                    <span>Limite personalizzato (50-999):</span>
                    <input type="number" id="setup-custom-target" min="50" max="999" value="101" oninput="app.validateSetupStartButton()">
                </div>
            `;
            this.setupTargetValue = 101;
        }
        else if (gameType === 'standard') {
            container.innerHTML = `
                <div class="info-banner">
                    <span class="info-icon">📊</span>
                    <p>Un tabellone generico per segnare i punteggi round per round di qualsiasi gioco da tavolo o di carte. Vince chi accumula più punti o chi vince più round.</p>
                </div>
            `;
            this.setupTargetValue = null;
        }
    },

    setSetupTarget(value, buttonEl) {
        // Handle segmented buttons visual switch
        buttonEl.parentElement.querySelectorAll('.segment-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonEl.classList.add('active');

        // Toggle custom target visibility
        const customRow = document.getElementById('custom-target-row');
        if (value === 'custom') {
            if (customRow) customRow.classList.remove('hidden');
            this.setupTargetValue = 'custom';
        } else {
            if (customRow) customRow.classList.add('hidden');
            this.setupTargetValue = value;
        }
        this.validateSetupStartButton();
    },

    setCiccopaoloFormat(format, buttonEl) {
        buttonEl.parentElement.querySelectorAll('.segment-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonEl.classList.add('active');
        this.ciccopaoloFormat = format;
    },

    addPlayerFromSetup() {
        const input = document.getElementById('setup-quick-add-name');
        const name = input.value;
        const player = this.registerPlayer(name);
        if (player) {
            input.value = '';
            // Auto-select the newly added player if requirements permit
            const req = this.rules[this.state.selectedGameType];
            if (req.maxPlayers === 2 && this.state.selectedSetupPlayerIds.size >= 2) {
                // don't auto-select
            } else {
                this.state.selectedSetupPlayerIds.add(player.id);
            }
            this.renderSetupPlayersChecklist();
            this.validateSetupStartButton();
        }
    },

    renderSetupPlayersChecklist() {
        const container = document.getElementById('setup-players-selection');
        container.innerHTML = '';
        
        if (this.state.players.length === 0) {
            container.innerHTML = `<div class="empty-info" style="border:none;">Nessun giocatore registrato. Aggiungilo sopra.</div>`;
            return;
        }

        this.state.players.forEach(player => {
            const isSelected = this.state.selectedSetupPlayerIds.has(player.id);
            const row = document.createElement('div');
            row.className = `setup-player-row ${isSelected ? 'selected' : ''}`;
            row.onclick = () => app.toggleSetupPlayer(player.id);
            row.innerHTML = `
                <div class="setup-player-row-left">
                    <span class="setup-player-avatar">👤</span>
                    <span class="setup-player-name">${this.escapeHTML(player.name)}</span>
                </div>
                <div class="setup-player-checkbox">
                    <span class="setup-player-checkbox-tick">✓</span>
                </div>
            `;
            container.appendChild(row);
        });
    },

    toggleSetupPlayer(id) {
        const req = this.rules[this.state.selectedGameType];
        
        if (this.state.selectedSetupPlayerIds.has(id)) {
            this.state.selectedSetupPlayerIds.delete(id);
        } else {
            // Enforce max players
            if (req.maxPlayers === 2 && this.state.selectedSetupPlayerIds.size >= 2) {
                // For 2-player games, replace one selection or alert
                alert('Questo gioco supporta esattamente 2 giocatori. Deseleziona un giocatore per aggiungerne un altro.');
                return;
            }
            this.state.selectedSetupPlayerIds.add(id);
        }
        
        this.renderSetupPlayersChecklist();
        this.validateSetupStartButton();
    },

    validateSetupStartButton() {
        const btn = document.getElementById('btn-start-game');
        const req = this.rules[this.state.selectedGameType];
        const selectedCount = this.state.selectedSetupPlayerIds.size;
        
        let isValid = false;
        
        // Check player count
        if (req.maxPlayers === 2) {
            isValid = (selectedCount === 2);
        } else {
            isValid = (selectedCount >= req.minPlayers && selectedCount <= req.maxPlayers);
        }

        // Check custom target validity if active
        if (isValid && this.setupTargetValue === 'custom') {
            const customInput = document.getElementById('setup-custom-target');
            if (customInput) {
                const val = parseInt(customInput.value);
                if (isNaN(val) || val < customInput.min || val > customInput.max) {
                    isValid = false;
                }
            }
        }

        btn.disabled = !isValid;
    },

    // 7. GAMEPLAY ACTIONS
    startGame() {
        const gameType = this.state.selectedGameType;
        const reqRule = this.rules[gameType];
        const selectedPlayerIdsArray = Array.from(this.state.selectedSetupPlayerIds);
        
        // Retrieve selected players names
        const gamePlayers = selectedPlayerIdsArray.map(id => {
            const p = this.state.players.find(pl => pl.id === id);
            return {
                id: id,
                name: p ? p.name : 'Giocatore'
            };
        });

        // Resolve Target value (custom vs preset)
        let finalTarget = this.setupTargetValue;
        if (finalTarget === 'custom') {
            const customInput = document.getElementById('setup-custom-target');
            finalTarget = parseInt(customInput.value);
        }

        // Initialize activeGame details
        this.state.activeGame = {
            id: this.generateUUID(),
            type: gameType,
            isActive: true,
            date: new Date().toISOString(),
            rounds: [],
            players: []
        };

        // Populate game-specific player models
        if (gameType === 'scopa') {
            this.state.activeGame.targetScore = finalTarget;
            this.state.activeGame.players = gamePlayers.map(p => ({
                id: p.id,
                name: p.name,
                currentScore: 0
            }));
        } 
        else if (gameType === 'briscola') {
            this.state.activeGame.targetWins = finalTarget; // wins target (e.g. 2 for best of 3)
            this.state.activeGame.players = gamePlayers.map(p => ({
                id: p.id,
                name: p.name,
                gameWins: 0 // number of Segni won
            }));
        }
        else if (gameType === 'bisca') {
            this.state.activeGame.maxLives = finalTarget;
            this.state.activeGame.players = gamePlayers.map(p => ({
                id: p.id,
                name: p.name,
                lives: finalTarget
            }));
        }
        else if (gameType === 'ciccopaolo') {
            this.state.activeGame.targetScore = finalTarget;
            this.state.activeGame.matchFormat = this.ciccopaoloFormat; // bottaSecca | meglioDiTre
            this.state.activeGame.completedGamesRounds = []; // archive completed sets
            this.state.activeGame.players = gamePlayers.map(p => ({
                id: p.id,
                name: p.name,
                gameWins: 0, // sets won in match
                currentPartitionScore: 0 // score in active set
            }));
        }
        else if (gameType === 'scala40') {
            this.state.activeGame.targetScore = finalTarget;
            this.state.activeGame.players = gamePlayers.map(p => ({
                id: p.id,
                name: p.name,
                currentScore: 0,
                isEliminated: false,
                reentriesCount: 0
            }));
        }
        else if (gameType === 'standard') {
            this.state.activeGame.players = gamePlayers.map(p => ({
                id: p.id,
                name: p.name,
                currentScore: 0,
                roundWins: 0
            }));
            this.state.activeGame.activeRoundScores = {};
            this.state.activeGame.players.forEach(p => {
                this.state.activeGame.activeRoundScores[p.id] = 0;
            });
        }

        this.saveActiveGame();
        this.showView('view-gameplay');
        this.renderGameplay();
    },

    confirmResetGame() {
        this.showConfirm(
            'Azzera Partita',
            'Sei sicuro di voler azzerare il punteggio e ricominciare la partita corrente? Tutti i round correnti andranno persi.',
            () => {
                const game = this.state.activeGame;
                game.rounds = [];
                
                if (game.type === 'scopa') {
                    game.players.forEach(p => p.currentScore = 0);
                } 
                else if (game.type === 'briscola') {
                    game.players.forEach(p => p.gameWins = 0);
                }
                else if (game.type === 'bisca') {
                    game.players.forEach(p => p.lives = game.maxLives);
                }
                else if (game.type === 'ciccopaolo') {
                    game.players.forEach(p => {
                        p.gameWins = 0;
                        p.currentPartitionScore = 0;
                    });
                    game.completedGamesRounds = [];
                }
                else if (game.type === 'scala40') {
                    game.players.forEach(p => {
                        p.currentScore = 0;
                        p.isEliminated = false;
                        p.reentriesCount = 0;
                    });
                }
                else if (game.type === 'standard') {
                    game.players.forEach(p => {
                        p.currentScore = 0;
                        p.roundWins = 0;
                        game.activeRoundScores[p.id] = 0;
                    });
                }
                
                this.saveActiveGame();
                this.renderGameplay();
            }
        );
    },

    confirmExitGame() {
        this.showConfirm(
            'Termina Partita',
            'Vuoi davvero abbandonare la partita corrente? I dati di questa sessione andranno persi.',
            () => {
                this.state.activeGame = null;
                this.saveActiveGame();
                this.showDashboard();
            }
        );
    },

    // 8. GAMEPLAY VIEW RENDERING DICTIONARY
    renderGameplay() {
        const game = this.state.activeGame;
        if (!game || !game.isActive) return;

        // Header Title
        const titleEl = document.getElementById('gameplay-title');
        const capitalizedType = game.type.charAt(0).toUpperCase() + game.type.slice(1);
        titleEl.textContent = capitalizedType === 'Scala40' ? 'Scala 40' : capitalizedType;
        
        // Status tags (Round count)
        const statusEl = document.getElementById('gameplay-status');
        if (game.type === 'bisca') {
            statusEl.textContent = `Vite Max: ${game.maxLives}`;
        } else if (game.type === 'briscola') {
            statusEl.textContent = `Match al meglio di ${game.targetWins * 2 - 1}`;
        } else if (game.type === 'ciccopaolo') {
            const roundNum = game.rounds.length + 1;
            statusEl.textContent = `Game ${game.completedGamesRounds.length + 1} - Rd ${roundNum}`;
        } else {
            statusEl.textContent = `Round ${game.rounds.length + 1}`;
        }

        // Render sections
        this.renderScoreboard(game);
        this.renderExtraInfo(game);
        this.renderRoundsHistory(game);
        this.renderBottomActionBar(game);
    },

    renderScoreboard(game) {
        const container = document.getElementById('gameplay-scoreboard');
        container.className = 'scoreboard-container'; // Default grid
        container.innerHTML = '';

        if (game.type === 'scopa' || game.type === 'briscola') {
            const p1 = game.players[0];
            const p2 = game.players[1];
            
            // Determine leaders
            let lead1 = false, lead2 = false;
            if (game.type === 'scopa') {
                lead1 = p1.currentScore > p2.currentScore;
                lead2 = p2.currentScore > p1.currentScore;
            } else {
                lead1 = p1.gameWins > p2.gameWins;
                lead2 = p2.gameWins > p1.gameWins;
            }

            container.innerHTML = `
                <div class="score-panel ${lead1 ? 'lead' : ''}">
                    ${lead1 ? '<span class="score-panel-crown">👑</span>' : ''}
                    <span class="score-panel-name">${this.escapeHTML(p1.name)}</span>
                    <span class="score-panel-score">${game.type === 'scopa' ? p1.currentScore : p1.gameWins}</span>
                    <span class="score-panel-sub">${game.type === 'scopa' ? 'Punti Totali' : 'Segni Vinti'}</span>
                    ${lead1 ? '<span class="score-panel-lead-tag">IN TESTA</span>' : ''}
                </div>
                <div class="score-panel ${lead2 ? 'lead' : ''}">
                    ${lead2 ? '<span class="score-panel-crown">👑</span>' : ''}
                    <span class="score-panel-name">${this.escapeHTML(p2.name)}</span>
                    <span class="score-panel-score">${game.type === 'scopa' ? p2.currentScore : p2.gameWins}</span>
                    <span class="score-panel-sub">${game.type === 'scopa' ? 'Punti Totali' : 'Segni Vinti'}</span>
                    ${lead2 ? '<span class="score-panel-lead-tag">IN TESTA</span>' : ''}
                </div>
            `;
        }
        else if (game.type === 'ciccopaolo') {
            const p1 = game.players[0];
            const p2 = game.players[1];
            
            // Leaders on current active game partition
            const lead1 = p1.currentPartitionScore > p2.currentPartitionScore;
            const lead2 = p2.currentPartitionScore > p1.currentPartitionScore;

            container.innerHTML = `
                <div class="score-panel ${lead1 ? 'lead' : ''}">
                    ${lead1 ? '<span class="score-panel-crown">👑</span>' : ''}
                    <span class="score-panel-name">${this.escapeHTML(p1.name)}</span>
                    <span class="score-panel-score">${p1.currentPartitionScore}</span>
                    <span class="score-panel-sub">Punti Gioco</span>
                    <span class="score-panel-lead-tag" style="background:rgba(52, 199, 89, 0.15); color:var(--accent-green); border:none;">Vinte: ${p1.gameWins}</span>
                </div>
                <div class="score-panel ${lead2 ? 'lead' : ''}">
                    ${lead2 ? '<span class="score-panel-crown">👑</span>' : ''}
                    <span class="score-panel-name">${this.escapeHTML(p2.name)}</span>
                    <span class="score-panel-score">${p2.currentPartitionScore}</span>
                    <span class="score-panel-sub">Punti Gioco</span>
                    <span class="score-panel-lead-tag" style="background:rgba(52, 199, 89, 0.15); color:var(--accent-green); border:none;">Vinte: ${p2.gameWins}</span>
                </div>
            `;
        }
        else if (game.type === 'bisca') {
            // Grid for multiple players inputs (no separate scoreboard/inputs layout, it's combined!)
            container.className = 'scoreboard-container-combined'; // Clear grid
            
            // Sort players: active first, then eliminated
            const sorted = [...game.players].sort((a,b) => {
                if (a.lives <= 0 && b.lives > 0) return 1;
                if (b.lives <= 0 && a.lives > 0) return -1;
                return 0;
            });

            sorted.forEach(p => {
                const isEliminated = p.lives <= 0;
                const card = document.createElement('div');
                card.className = `active-player-score-card ${isEliminated ? 'eliminated' : ''}`;
                
                // Draw hearts
                let heartsHtml = '';
                if (isEliminated) {
                    heartsHtml = `<span class="eliminated-tag">ELIMINATO</span>`;
                } else {
                    heartsHtml = '<div class="hearts-row">';
                    if (game.maxLives <= 15) {
                        for (let i = 0; i < game.maxLives; i++) {
                            heartsHtml += `<span class="heart-icon ${i < p.lives ? '' : 'lost'}">♥</span>`;
                        }
                    } else {
                        heartsHtml += `<span class="heart-icon">♥</span> <span class="score-panel-sub" style="margin-left:4px; font-weight:700;">Vite: ${p.lives} / ${game.maxLives}</span>`;
                    }
                    heartsHtml += '</div>';
                }

                card.innerHTML = `
                    <div class="active-player-left">
                        <span class="active-player-name">${this.escapeHTML(p.name)}</span>
                        ${heartsHtml}
                    </div>
                    <div class="active-player-controls">
                        ${isEliminated ? `
                            <button class="btn btn-secondary btn-tiny" onclick="app.adjustBiscaLives('${p.id}', 1)" style="color:var(--accent-green)">Riattiva</button>
                        ` : `
                            <button class="btn-stepper btn-minus" onclick="app.adjustBiscaLives('${p.id}', -1)">&minus;</button>
                            <span class="active-player-points">${p.lives}</span>
                            <button class="btn-stepper btn-plus" onclick="app.adjustBiscaLives('${p.id}', 1)">&plus;</button>
                        `}
                    </div>
                `;
                container.appendChild(card);
            });
        }
        else if (game.type === 'scala40') {
            container.className = 'scala40-scoreboard-scroll';
            
            game.players.forEach(p => {
                const isEliminated = p.currentScore >= game.targetScore;
                
                // Highlight danger zones
                let dangerClass = '';
                if (!isEliminated && p.currentScore > game.targetScore - 20) {
                    dangerClass = 'color: var(--accent-orange);';
                } else if (isEliminated) {
                    dangerClass = 'color: var(--accent-red);';
                }

                const card = document.createElement('div');
                card.className = `scala40-player-card ${isEliminated ? 'eliminated' : ''}`;
                card.innerHTML = `
                    <div class="scala40-card-header">
                        <h5>${this.escapeHTML(p.name)}</h5>
                        <span class="scala40-badge ${isEliminated ? 'eliminated' : 'active'}">
                            ${isEliminated ? 'SBALLATO' : 'ATTIVO'}
                        </span>
                    </div>
                    <div class="scala40-card-points" style="${dangerClass}">
                        <span class="pts-current">${p.currentScore}</span>
                        <span class="pts-target">/ ${game.targetScore} pt</span>
                    </div>
                    <div>
                        ${p.reentriesCount > 0 ? `<div class="scala40-reentries">Rientri: ${p.reentriesCount}</div>` : ''}
                        ${isEliminated ? `
                            <button class="btn btn-accent btn-tiny btn-full" onclick="app.reenterScala40Player('${p.id}')" style="margin-top:6px; background-color:var(--accent-gold); box-shadow:none; color:var(--bg-black)">Rientra</button>
                        ` : ''}
                    </div>
                `;
                container.appendChild(card);
            });
        }
        else if (game.type === 'standard') {
            container.className = 'scoreboard-container-combined';
            
            // Standard lists players, shows their total score, and provides steppers to modify points of active round
            game.players.forEach(p => {
                const totalScore = p.currentScore;
                const roundScore = game.activeRoundScores[p.id] || 0;
                
                const card = document.createElement('div');
                card.className = 'active-player-score-card';
                card.innerHTML = `
                    <div class="active-player-left">
                        <span class="active-player-name">${this.escapeHTML(p.name)}</span>
                        <span class="active-player-total-score">Totale: <strong>${totalScore} pt</strong></span>
                    </div>
                    <div class="active-player-controls">
                        <button class="btn-stepper btn-minus" onclick="app.adjustStandardActiveScore('${p.id}', -1)">&minus;</button>
                        <span class="active-player-points">${roundScore >= 0 ? '+' + roundScore : roundScore}</span>
                        <button class="btn-stepper btn-plus" onclick="app.adjustStandardActiveScore('${p.id}', 1)">&plus;</button>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    },

    renderExtraInfo(game) {
        const container = document.getElementById('gameplay-extra-info');
        container.innerHTML = '';
        
        if (game.type === 'briscola') {
            // Visual target information
            const targetWins = game.targetWins;
            const targetScoreText = targetWins === 1 ? 'Partita Secca' : `Primo a ${targetWins} smazzate`;
            container.innerHTML = `
                <div class="bisca-survivors-tag" style="border-color: rgba(255, 59, 48, 0.15)">
                    Obiettivo: <strong>${targetScoreText}</strong>
                </div>
            `;
        }
        else if (game.type === 'scopa') {
            container.innerHTML = `
                <div class="bisca-survivors-tag" style="border-color: rgba(255, 149, 0, 0.15)">
                    Limite di arrivo: <strong>${game.targetScore} punti</strong>
                </div>
            `;
        }
        else if (game.type === 'ciccopaolo') {
            const fmtText = game.matchFormat === 'bottaSecca' ? 'Botta Secca' : 'Alla meglio di 3 (vince chi arriva a 2)';
            container.innerHTML = `
                <div class="bisca-survivors-tag" style="border-color: rgba(52, 199, 89, 0.15)">
                    Format: <strong>${fmtText}</strong> | Limite Gioco: <strong>${game.targetScore} pt</strong>
                </div>
            `;
        }
        else if (game.type === 'standard') {
            // Shows Leaderboard for round victories (wins)
            let rowHtml = '';
            game.players.forEach(p => {
                const wins = p.roundWins || 0;
                rowHtml += `
                    <div class="round-wins-card ${wins > 0 ? 'active-wins' : ''}">
                        <span class="round-wins-crown-ico ${wins > 0 ? '' : 'gray'}">👑</span>
                        <div class="round-wins-info">
                            <span class="round-wins-pname">${this.escapeHTML(p.name)}</span>
                            <span class="round-wins-count">${wins}</span>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = `
                <div class="round-wins-board">
                    <h6>ROUND VINTI (Leaderboard)</h6>
                    <div class="round-wins-row">
                        ${rowHtml}
                    </div>
                </div>
            `;
        }
    },

    renderRoundsHistory(game) {
        const container = document.getElementById('rounds-history-list');
        container.innerHTML = '';

        if (game.rounds.length === 0) {
            container.innerHTML = `<div class="empty-info">Nessun round registrato. Inizia inserendo i punti.</div>`;
            return;
        }

        // Render rounds in reverse order (newest at the top)
        const reversedRounds = [...game.rounds].reverse();

        reversedRounds.forEach(round => {
            const row = document.createElement('div');
            row.className = 'round-row';
            
            let headerText = `<span class="round-number-lbl">ROUND ${round.roundNumber}</span>`;
            let winnerText = '';
            let scoresText = '';
            let notesText = '';

            if (game.type === 'scopa' || game.type === 'ciccopaolo') {
                // Find winner of the round (the player with more points)
                const pts = game.players.map(p => ({
                    name: p.name,
                    score: this.calculateScopaRoundScoreForPlayer(round, p.id)
                }));
                
                let winName = 'Pareggio';
                if (pts[0].score > pts[1].score) winName = pts[0].name;
                if (pts[1].score > pts[0].score) winName = pts[1].name;

                winnerText = `<span class="round-winner-lbl">Vincitore: <strong>${this.escapeHTML(winName)}</strong></span>`;
                scoresText = `
                    <div class="round-details-scores">
                        <span>${this.escapeHTML(pts[0].name)}: +${pts[0].score} pt</span>
                        <span>${this.escapeHTML(pts[1].name)}: +${pts[1].score} pt</span>
                    </div>
                `;

                // Sub details (napola, scope)
                let noteParts = [];
                game.players.forEach(p => {
                    const scopes = round.scopeScores[p.id] || 0;
                    const extras = round.napolaScores ? (round.napolaScores[p.id] || 0) : (round.extraScores ? (round.extraScores[p.id] || 0) : 0);
                    const label = round.napolaScores ? 'Napoli' : 'Extra';
                    
                    if (scopes > 0 || extras > 0) {
                        let innerNote = `${p.name} (`;
                        if (scopes > 0) innerNote += `${scopes} Scope`;
                        if (scopes > 0 && extras > 0) innerNote += ', ';
                        if (extras > 0) innerNote += `+${extras} ${label}`;
                        innerNote += ')';
                        noteParts.push(innerNote);
                    }
                });

                // Standard triggers (Settebello, Carte, Denari, Primiera)
                let mainPts = [];
                if (round.settebelloWinnerId) mainPts.push(`Settebello: ${this.getPlayerNameById(round.settebelloWinnerId)}`);
                if (round.carteWinnerId) mainPts.push(`Carte: ${this.getPlayerNameById(round.carteWinnerId)}`);
                if (round.denariWinnerId) mainPts.push(`Denari: ${this.getPlayerNameById(round.denariWinnerId)}`);
                if (round.primieraWinnerId) mainPts.push(`Primiera: ${this.getPlayerNameById(round.primieraWinnerId)}`);
                
                notesText = `
                    <div class="round-note">
                        ${mainPts.join(' | ')}<br>
                        ${noteParts.length > 0 ? noteParts.join(' • ') : ''}
                    </div>
                `;
            }
            else if (game.type === 'briscola') {
                const p1 = game.players[0];
                const p2 = game.players[1];
                const pts1 = round.cardScores[p1.id] || 0;
                const pts2 = round.cardScores[p2.id] || 0;
                
                let winName = 'Pareggio';
                if (pts1 > 60) winName = p1.name;
                if (pts2 > 60) winName = p2.name;

                winnerText = `<span class="round-winner-lbl">Vincitore: <strong>${this.escapeHTML(winName)}</strong></span>`;
                scoresText = `
                    <div class="round-details-scores">
                        <span>${this.escapeHTML(p1.name)}: ${pts1} pt</span>
                        <span>${this.escapeHTML(p2.name)}: ${pts2} pt</span>
                    </div>
                `;
            }
            else if (game.type === 'scala40') {
                // Closer
                let closerText = '';
                if (round.closingPlayerId) {
                    const closerName = this.getPlayerNameById(round.closingPlayerId);
                    closerText = `<span class="round-winner-lbl">Chiude: <strong>${this.escapeHTML(closerName)}</strong></span>`;
                }

                winnerText = closerText;
                
                let scoresHtml = '<div class="round-details-scores" style="flex-wrap: wrap; gap: 8px;">';
                game.players.forEach(p => {
                    const roundScore = round.scores[p.id] !== undefined ? round.scores[p.id] : 0;
                    scoresHtml += `<span style="flex-basis: 45%;">${this.escapeHTML(p.name)}: +${roundScore}</span>`;
                });
                scoresHtml += '</div>';
                scoresText = scoresHtml;
            }
            else if (game.type === 'standard') {
                // Round summary
                let winName = 'Pareggio';
                if (round.winnerId) {
                    winName = this.getPlayerNameById(round.winnerId);
                }

                winnerText = `<span class="round-winner-lbl">Vincitore: <strong>${this.escapeHTML(winName)}</strong></span>`;
                
                let scoresHtml = '<div class="round-details-scores" style="flex-wrap: wrap; gap: 8px;">';
                game.players.forEach(p => {
                    const roundScore = round.scores[p.id] || 0;
                    scoresHtml += `<span style="flex-basis: 45%;">${this.escapeHTML(p.name)}: +${roundScore}</span>`;
                });
                scoresHtml += '</div>';
                scoresText = scoresHtml;
            }

            row.innerHTML = `
                <div class="round-row-header">
                    ${headerText}
                    ${winnerText}
                </div>
                ${scoresText}
                ${notesText}
            `;
            container.appendChild(row);
        });
    },

    renderBottomActionBar(game) {
        const bar = document.getElementById('gameplay-action-bar');
        bar.innerHTML = '';

        if (game.type === 'scopa' || game.type === 'ciccopaolo') {
            bar.innerHTML = `
                <button class="btn btn-accent btn-large btn-full" onclick="app.openScopaRoundModal()">Aggiungi Round</button>
            `;
        }
        else if (game.type === 'briscola') {
            bar.innerHTML = `
                <button class="btn btn-accent btn-large btn-full" onclick="app.openBriscolaRoundModal()">Aggiungi Mano</button>
            `;
        }
        else if (game.type === 'scala40') {
            // Disable if game finished or only 1 player remains active
            const isFinished = game.players.filter(p => !p.isEliminated).length <= 1;
            bar.innerHTML = `
                <button class="btn btn-accent btn-large btn-full" onclick="app.openScala40RoundModal()" ${isFinished ? 'disabled' : ''}>Aggiungi Round</button>
            `;
        }
        else if (game.type === 'standard') {
            bar.innerHTML = `
                <button class="btn btn-accent btn-large btn-full" onclick="app.openStandardRoundModal()">Termina Round</button>
            `;
        }
        // Bisca does not have rounds, adjustments are made directly on the screen!
        else if (game.type === 'bisca') {
            bar.innerHTML = '';
            const survivors = game.players.filter(p => p.lives > 0);
            if (survivors.length <= 1) {
                // If game is finished, display a "Play Again" button in bottom bar
                bar.innerHTML = `
                    <button class="btn btn-accent btn-large btn-full" onclick="app.resetBiscaGameDirectly()">Nuova Partita</button>
                `;
            }
        }
    },

    // 9. GAME ROUND SAVE LOGIC & VALIDATIONS
    // 9.1 SCOPA & CICCOPAOLO ROUND LOGIC
    openScopaRoundModal() {
        const game = this.state.activeGame;
        this.openModal('modal-add-round-scopa');

        // Configure Modal Header Title depending on game type
        const label = game.type === 'scopa' ? 'PUNTI NAPOLA / NAPOLI (da 3 a 10 pt)' : 'PUNTI EXTRA';
        document.getElementById('scopa-extra-title').textContent = label;

        // Reset variables
        this.roundWinners = {
            settebello: null,
            carte: null,
            denari: null,
            primiera: null
        };

        this.roundScopeScores = {};
        this.roundExtraScores = {};
        game.players.forEach(p => {
            this.roundScopeScores[p.id] = 0;
            this.roundExtraScores[p.id] = 0;
        });

        // Initialize selectors
        this.renderPointsPickerRow('settebello');
        this.renderPointsPickerRow('carte');
        this.renderPointsPickerRow('denari');
        this.renderPointsPickerRow('primiera');

        // Render Scope and Napola/Extra Steppers
        this.renderScopaSteppers('scope', 'scopa-scope-steppers', this.roundScopeScores);
        this.renderScopaSteppers('extra', 'scopa-extra-steppers', this.roundExtraScores, game.type === 'scopa' ? 10 : 99);
    },

    renderPointsPickerRow(suit) {
        const container = document.getElementById(`picker-${suit}`);
        container.innerHTML = '';
        const game = this.state.activeGame;

        const noneBtn = document.createElement('button');
        noneBtn.className = `picker-btn ${this.roundWinners[suit] === null ? 'active' : ''}`;
        noneBtn.textContent = 'Nessuno';
        noneBtn.onclick = () => app.setScopaClassicWinner(suit, null);
        container.appendChild(noneBtn);

        game.players.forEach(player => {
            const btn = document.createElement('button');
            btn.className = `picker-btn ${this.roundWinners[suit] === player.id ? 'active' : ''}`;
            btn.textContent = this.escapeHTML(player.name);
            btn.onclick = () => app.setScopaClassicWinner(suit, player.id);
            container.appendChild(btn);
        });
    },

    setScopaClassicWinner(suit, playerUuid) {
        this.roundWinners[suit] = playerUuid;
        this.renderPointsPickerRow(suit);
    },

    renderScopaSteppers(type, containerId, scoresObject, maxLimit = 99) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        const game = this.state.activeGame;

        game.players.forEach(player => {
            const row = document.createElement('div');
            row.className = 'stepper-row';
            row.innerHTML = `
                <span class="stepper-label">${this.escapeHTML(player.name)}</span>
                <div class="stepper">
                    <button class="btn-stepper btn-minus" onclick="app.adjustScopaStepper('${type}', '${player.id}', -1, ${maxLimit})">&minus;</button>
                    <span class="stepper-val" id="stepper-val-${type}-${player.id}">${scoresObject[player.id]}</span>
                    <button class="btn-stepper btn-plus" onclick="app.adjustScopaStepper('${type}', '${player.id}', 1, ${maxLimit})">&plus;</button>
                </div>
            `;
            container.appendChild(row);
        });
    },

    adjustScopaStepper(type, playerUuid, delta, maxLimit) {
        const targetObj = type === 'scope' ? this.roundScopeScores : this.roundExtraScores;
        const current = targetObj[playerUuid] || 0;
        const nextVal = Math.min(maxLimit, Math.max(0, current + delta));
        targetObj[playerUuid] = nextVal;
        
        const labelEl = document.getElementById(`stepper-val-${type}-${playerUuid}`);
        if (labelEl) labelEl.textContent = nextVal;
    },

    calculateScopaRoundScoreForPlayer(round, playerUuid) {
        let total = 0;
        if (round.carteWinnerId === playerUuid) total += 1;
        if (round.settebelloWinnerId === playerUuid) total += 1;
        if (round.denariWinnerId === playerUuid) total += 1;
        if (round.primieraWinnerId === playerUuid) total += 1;
        
        total += round.scopeScores[playerUuid] || 0;
        if (round.napolaScores) {
            total += round.napolaScores[playerUuid] || 0;
        } else if (round.extraScores) {
            total += round.extraScores[playerUuid] || 0;
        }
        return total;
    },

    saveScopaRound() {
        const game = this.state.activeGame;
        const roundNumber = game.rounds.length + 1;
        
        const newRound = {
            id: this.generateUUID(),
            roundNumber: roundNumber,
            carteWinnerId: this.roundWinners.carte,
            settebelloWinnerId: this.roundWinners.settebello,
            denariWinnerId: this.roundWinners.denari,
            primieraWinnerId: this.roundWinners.primiera,
            scopeScores: { ...this.roundScopeScores }
        };

        if (game.type === 'scopa') {
            newRound.napolaScores = { ...this.roundExtraScores };
            game.rounds.push(newRound);
            
            // Add points to players total score
            game.players.forEach(p => {
                p.currentScore += this.calculateScopaRoundScoreForPlayer(newRound, p.id);
            });

            this.saveActiveGame();
            this.closeModal('modal-add-round-scopa');
            
            // Check win
            const finished = game.players.some(p => p.currentScore >= game.targetScore);
            if (finished) {
                // Find winner (if tied, game continues)
                const s0 = game.players[0].currentScore;
                const s1 = game.players[1].currentScore;
                if (s0 !== s1) {
                    const winner = s0 > s1 ? game.players[0] : game.players[1];
                    this.showCelebration(winner.name, game.players.map(p => ({ name: p.name, score: p.currentScore })));
                } else {
                    this.renderGameplay();
                }
            } else {
                this.renderGameplay();
            }
        }
        else if (game.type === 'ciccopaolo') {
            newRound.extraScores = { ...this.roundExtraScores };
            game.rounds.push(newRound);
            
            // Add points to players partition score
            game.players.forEach(p => {
                p.currentPartitionScore += this.calculateScopaRoundScoreForPlayer(newRound, p.id);
            });

            this.saveActiveGame();
            this.closeModal('modal-add-round-scopa');

            // Check game set win
            const finished = game.players.some(p => p.currentPartitionScore >= game.targetScore);
            if (finished) {
                const s0 = game.players[0].currentPartitionScore;
                const s1 = game.players[1].currentPartitionScore;
                
                if (s0 !== s1) {
                    // We have a game winner!
                    const gameWinner = s0 > s1 ? game.players[0] : game.players[1];
                    gameWinner.gameWins += 1;

                    // Archive completed game rounds
                    game.completedGamesRounds.push([...game.rounds]);
                    game.rounds = [];
                    
                    const savedPartitionScores = game.players.map(p => ({ name: p.name, score: p.currentPartitionScore }));
                    
                    // Reset partition scores
                    game.players.forEach(p => p.currentPartitionScore = 0);

                    // Check if entire match is finished
                    const requiredWins = game.matchFormat === 'bottaSecca' ? 1 : 2;
                    const matchFinished = game.players.some(p => p.gameWins >= requiredWins);
                    
                    this.saveActiveGame();

                    if (matchFinished) {
                        const matchWinner = game.players.find(p => p.gameWins >= requiredWins);
                        this.showCelebration(matchWinner.name, game.players.map(p => ({ name: p.name, score: p.gameWins, labelSuffix: ' smazzate' })), true);
                    } else {
                        // Game won but match continues (Alla meglio di 3)
                        this.showCelebration(gameWinner.name, savedPartitionScores, false, 'Ha vinto questo game!');
                    }
                } else {
                    // Tied above target, continue playing rounds
                    this.renderGameplay();
                }
            } else {
                this.renderGameplay();
            }
        }
    },

    // 9.2 BRISCOLA SLIDER LOGIC
    openBriscolaRoundModal() {
        this.openModal('modal-add-round-briscola');
        this.updateBriscolaSlider(60);
        
        // Update label names
        const game = this.state.activeGame;
        document.getElementById('briscola-lbl-p1').textContent = game.players[0].name;
        document.getElementById('briscola-lbl-p2').textContent = game.players[1].name;
    },

    updateBriscolaSlider(val) {
        const score0 = parseInt(val);
        const score1 = 120 - score0;
        
        const display0 = document.querySelector('#briscola-pts-p1 .pts');
        const display1 = document.querySelector('#briscola-pts-p2 .pts');
        display0.textContent = score0;
        display1.textContent = score1;

        // Custom color states for score distribution
        const game = this.state.activeGame;
        const banner = document.getElementById('briscola-winner-banner');
        
        if (score0 > 60) {
            display0.style.color = 'var(--accent-red)';
            display1.style.color = 'var(--text-primary)';
            banner.textContent = `Mano a ${game.players[0].name} (+1 Segno)`;
            banner.style.color = 'var(--accent-red)';
        } else if (score1 > 60) {
            display0.style.color = 'var(--text-primary)';
            display1.style.color = 'var(--accent-red)';
            banner.textContent = `Mano a ${game.players[1].name} (+1 Segno)`;
            banner.style.color = 'var(--accent-red)';
        } else {
            display0.style.color = 'var(--text-primary)';
            display1.style.color = 'var(--text-primary)';
            banner.textContent = 'Pareggio (60 - 60)';
            banner.style.color = 'var(--text-secondary)';
        }

        // Adjust ratio bars width
        const sliderWidth = 120;
        const pct0 = (score0 / sliderWidth) * 100;
        const pct1 = (score1 / sliderWidth) * 100;
        
        document.getElementById('ratio-bar-p1').style.width = `${pct0}%`;
        document.getElementById('ratio-bar-p2').style.width = `${pct1}%`;
        
        // Highlight active distribution bar
        if (score0 > 60) {
            document.getElementById('ratio-bar-p1').style.backgroundColor = 'var(--accent-red)';
            document.getElementById('ratio-bar-p2').style.backgroundColor = 'rgba(255,255,255,0.08)';
        } else if (score1 > 60) {
            document.getElementById('ratio-bar-p1').style.backgroundColor = 'rgba(255,255,255,0.08)';
            document.getElementById('ratio-bar-p2').style.backgroundColor = 'var(--accent-red)';
        } else {
            document.getElementById('ratio-bar-p1').style.backgroundColor = 'var(--text-secondary)';
            document.getElementById('ratio-bar-p2').style.backgroundColor = 'var(--text-secondary)';
        }

        this.tempBriscolaVal = score0;
    },

    saveBriscolaRound() {
        const game = this.state.activeGame;
        const roundNumber = game.rounds.length + 1;
        const score0 = this.tempBriscolaVal;
        const score1 = 120 - score0;

        const newRound = {
            id: this.generateUUID(),
            roundNumber: roundNumber,
            cardScores: {
                [game.players[0].id]: score0,
                [game.players[1].id]: score1
            }
        };

        game.rounds.push(newRound);

        // Calculate game win (Segno)
        if (score0 > 60) {
            game.players[0].gameWins += 1;
        } else if (score1 > 60) {
            game.players[1].gameWins += 1;
        }

        this.saveActiveGame();
        this.closeModal('modal-add-round-briscola');

        // Check if match won
        const finished = game.players.some(p => p.gameWins >= game.targetWins);
        if (finished) {
            const winner = game.players.find(p => p.gameWins >= game.targetWins);
            this.showCelebration(winner.name, game.players.map(p => ({ name: p.name, score: p.gameWins, labelSuffix: ' smazzate' })));
        } else {
            this.renderGameplay();
        }
    },

    // 9.3 BISCA ADJUST LIFE DIRECTLY
    adjustBiscaLives(playerUuid, delta) {
        const game = this.state.activeGame;
        const p = game.players.find(pl => pl.id === playerUuid);
        if (!p) return;

        // If player is eliminated and we revive them, set to 1.
        if (p.lives <= 0 && delta > 0) {
            p.lives = 1;
        } else {
            p.lives = Math.min(game.maxLives, Math.max(0, p.lives + delta));
        }

        this.saveActiveGame();
        this.renderGameplay();

        // Check for winner
        const survivors = game.players.filter(pl => pl.lives > 0);
        if (survivors.length === 1 && game.players.length > 1) {
            const winner = survivors[0];
            // Display standard celebration screen
            this.showCelebration(winner.name, game.players.map(pl => ({ name: pl.name, score: pl.lives, labelSuffix: ' vite rimaste' })));
        }
    },

    resetBiscaGameDirectly() {
        const game = this.state.activeGame;
        game.rounds = [];
        game.players.forEach(p => p.lives = game.maxLives);
        this.saveActiveGame();
        this.renderGameplay();
    },

    // 9.4 SCALA 40 ROUND LOGIC
    openScala40RoundModal() {
        const game = this.state.activeGame;
        this.openModal('modal-add-round-scala40');

        this.scala40CloserId = null;

        // Render closer buttons
        const closerGrid = document.getElementById('scala40-closer-selector');
        closerGrid.innerHTML = '';

        // Render inputs container
        const inputsContainer = document.getElementById('scala40-players-inputs');
        inputsContainer.innerHTML = '';

        game.players.forEach(player => {
            const isEliminated = player.currentScore >= game.targetScore;
            
            // Closer Button (only for active players)
            if (!isEliminated) {
                const btn = document.createElement('button');
                btn.className = 'closer-btn';
                btn.id = `closer-btn-${player.id}`;
                btn.textContent = player.name;
                btn.onclick = () => app.setScala40Closer(player.id);
                closerGrid.appendChild(btn);
            }

            // Input Row
            const row = document.createElement('div');
            row.className = `player-input-row ${isEliminated ? 'eliminated' : ''}`;
            row.id = `scala40-row-${player.id}`;
            row.innerHTML = `
                <div class="input-details">
                    <span class="input-lbl">${this.escapeHTML(player.name)}</span>
                    <span class="input-lbl-sub">Totale: ${player.currentScore} pt</span>
                </div>
                <div>
                    ${isEliminated ? `
                        <span style="font-size:12px; font-weight:700; color:var(--accent-red)">SBALLATO</span>
                    ` : `
                        <input type="number" class="input-score-field" id="scala40-input-${player.id}" min="0" max="999" placeholder="Punti" oninput="app.validateScala40SaveButton()" onkeydown="if(event.key === 'Enter') app.saveScala40Round()">
                    `}
                </div>
            `;
            inputsContainer.appendChild(row);
        });

        this.validateScala40SaveButton();
    },

    setScala40Closer(playerUuid) {
        const game = this.state.activeGame;
        
        // Remove active class from previous
        if (this.scala40CloserId) {
            const oldBtn = document.getElementById(`closer-btn-${this.scala40CloserId}`);
            if (oldBtn) oldBtn.classList.remove('active');
            
            const oldRow = document.getElementById(`scala40-row-${this.scala40CloserId}`);
            if (oldRow) oldRow.classList.remove('closer');
            
            const oldInput = document.getElementById(`scala40-input-${this.scala40CloserId}`);
            if (oldInput) {
                oldInput.disabled = false;
                oldInput.value = '';
            }
        }

        this.scala40CloserId = playerUuid;
        
        // Add active classes
        const btn = document.getElementById(`closer-btn-${playerUuid}`);
        if (btn) btn.classList.add('active');
        
        const row = document.getElementById(`scala40-row-${playerUuid}`);
        if (row) row.classList.add('closer');
        
        const input = document.getElementById(`scala40-input-${playerUuid}`);
        if (input) {
            input.value = 0;
            input.disabled = true;
        }

        this.validateScala40SaveButton();
    },

    validateScala40SaveButton() {
        // Ensure at least one closer is selected and all other active players have points entered
        const game = this.state.activeGame;
        let isValid = this.scala40CloserId !== null;

        if (isValid) {
            game.players.forEach(player => {
                const isEliminated = player.currentScore >= game.targetScore;
                if (!isEliminated) {
                    const input = document.getElementById(`scala40-input-${player.id}`);
                    if (input && input.value === '') {
                        isValid = false;
                    }
                }
            });
        }
        
        // Enable/Disable submit is handled by validation in save action, but let's visually enable
    },

    saveScala40Round() {
        const game = this.state.activeGame;
        if (!this.scala40CloserId) {
            alert('Seleziona chi ha chiuso il round.');
            return;
        }

        const roundScores = {};
        let allInputsOk = true;

        game.players.forEach(player => {
            const isEliminated = player.currentScore >= game.targetScore;
            if (isEliminated) {
                roundScores[player.id] = 0;
            } else {
                const input = document.getElementById(`scala40-input-${player.id}`);
                const score = parseInt(input.value);
                if (isNaN(score) || score < 0) {
                    allInputsOk = false;
                } else {
                    roundScores[player.id] = score;
                }
            }
        });

        if (!allInputsOk) {
            alert('Inserisci un punteggio valido (0 o superiore) per tutti i partecipanti.');
            return;
        }

        const roundNumber = game.rounds.length + 1;
        const newRound = {
            id: this.generateUUID(),
            roundNumber: roundNumber,
            closingPlayerId: this.scala40CloserId,
            scores: roundScores
        };

        game.rounds.push(newRound);

        // Update scores
        game.players.forEach(p => {
            p.currentScore += roundScores[p.id] || 0;
        });

        this.saveActiveGame();
        this.closeModal('modal-add-round-scala40');

        // Check if game finished
        const activeSurvivors = game.players.filter(p => p.currentScore < game.targetScore);
        
        if (activeSurvivors.length <= 1) {
            // Game is finished!
            let winner = null;
            if (activeSurvivors.length === 1) {
                winner = activeSurvivors[0];
            } else {
                // If all bust, the one with the lowest score wins
                winner = [...game.players].sort((a,b) => a.currentScore - b.currentScore)[0];
            }
            this.showCelebration(winner.name, game.players.map(p => ({ name: p.name, score: p.currentScore, orderLowestWins: true })));
        } else {
            this.renderGameplay();
        }
    },

    reenterScala40Player(playerUuid) {
        const game = this.state.activeGame;
        const p = game.players.find(pl => pl.id === playerUuid);
        if (!p) return;

        // Find highest score among currently active players
        const activeScores = game.players.filter(pl => pl.currentScore < game.targetScore).map(pl => pl.currentScore);
        if (activeScores.length > 0) {
            const maxActiveScore = Math.max(...activeScores);
            p.currentScore = maxActiveScore;
            p.reentriesCount += 1;
            this.saveActiveGame();
            this.renderGameplay();
        } else {
            alert('Impossibile rientrare. Nessun giocatore è attivo.');
        }
    },

    // 9.5 STANDARD POINTS ROUND LOGIC
    adjustStandardActiveScore(playerUuid, delta) {
        const game = this.state.activeGame;
        const current = game.activeRoundScores[playerUuid] || 0;
        game.activeRoundScores[playerUuid] = current + delta;
        this.saveActiveGame();
        this.renderGameplay();
    },

    openStandardRoundModal() {
        // Just verify and prompt confirmation to end the round
        const game = this.state.activeGame;
        this.openModal('modal-add-round-standard');

        const container = document.getElementById('standard-players-inputs');
        container.innerHTML = '';

        game.players.forEach(player => {
            const currentRoundScore = game.activeRoundScores[player.id] || 0;
            const row = document.createElement('div');
            row.className = 'player-input-row';
            row.innerHTML = `
                <div class="input-details">
                    <span class="input-lbl">${this.escapeHTML(player.name)}</span>
                    <span class="input-lbl-sub">Punteggio round da salvare</span>
                </div>
                <div>
                    <input type="number" class="input-score-field" id="standard-input-${player.id}" value="${currentRoundScore}" onkeydown="if(event.key === 'Enter') app.saveStandardRound()">
                </div>
            `;
            container.appendChild(row);
        });
    },

    saveStandardRound() {
        const game = this.state.activeGame;
        let allInputsOk = true;
        const roundScores = {};

        game.players.forEach(player => {
            const input = document.getElementById(`standard-input-${player.id}`);
            const val = parseInt(input.value);
            if (isNaN(val)) {
                allInputsOk = false;
            } else {
                roundScores[player.id] = val;
            }
        });

        if (!allInputsOk) {
            alert('Inserisci punteggi validi.');
            return;
        }

        const roundNumber = game.rounds.length + 1;
        
        // Find round winner (highest score in this round)
        let maxVal = -Infinity;
        let roundWinnerId = null;
        let isTie = false;
        
        game.players.forEach(p => {
            const sc = roundScores[p.id];
            if (sc > maxVal) {
                maxVal = sc;
                roundWinnerId = p.id;
                isTie = false;
            } else if (sc === maxVal) {
                isTie = true;
            }
        });

        const newRound = {
            id: this.generateUUID(),
            roundNumber: roundNumber,
            scores: roundScores,
            winnerId: isTie ? null : roundWinnerId
        };

        game.rounds.push(newRound);

        // Update total scores and round wins
        game.players.forEach(p => {
            p.currentScore += roundScores[p.id];
            if (!isTie && p.id === roundWinnerId) {
                p.roundWins = (p.roundWins || 0) + 1;
            }
            // Clear activeRoundScores
            game.activeRoundScores[p.id] = 0;
        });

        this.saveActiveGame();
        this.closeModal('modal-add-round-standard');
        
        // Show round winner celebration overlay
        const winnerName = isTie ? 'Pareggio' : this.getPlayerNameById(roundWinnerId);
        this.showCelebration(winnerName, game.players.map(p => ({ name: p.name, score: p.currentScore })), false, `Vince il Round ${roundNumber}!`);
    },

    // 10. CELEBRATION VIEW LOGIC
    showCelebration(winnerName, leaderboardData, isMatchFinished = true, optionalTitleSubText = '') {
        const overlay = document.getElementById('modal-celebration');
        overlay.classList.add('active');

        // Play subtle sound or trigger visual confetti
        this.triggerConfetti();

        const titleEl = document.getElementById('celebration-title');
        const subtitleEl = document.getElementById('celebration-subtitle');
        const winnerEl = document.getElementById('celebration-winner-name');

        if (isMatchFinished) {
            titleEl.textContent = 'VITTORIA PARTITA!';
            subtitleEl.textContent = 'Ha vinto la partita!';
            winnerEl.textContent = winnerName;
        } else {
            titleEl.textContent = 'VINCITORE ROUND!';
            subtitleEl.textContent = optionalTitleSubText || 'Ha vinto la mano!';
            winnerEl.textContent = winnerName;
        }

        // Leaderboard rendering
        const boardContainer = document.getElementById('celebration-leaderboard');
        boardContainer.innerHTML = '';

        // Sort leaderboard data
        const sortedData = [...leaderboardData];
        if (sortedData[0] && sortedData[0].orderLowestWins) {
            // Scala 40: lowest score wins
            sortedData.sort((a,b) => a.score - b.score);
        } else {
            sortedData.sort((a,b) => b.score - a.score);
        }

        sortedData.forEach((entry, idx) => {
            const row = document.createElement('div');
            const isWinner = idx === 0 && winnerName !== 'Pareggio';
            row.className = `leaderboard-row ${isWinner ? 'winner-row' : ''}`;
            
            const suffix = entry.labelSuffix || ' pt';
            
            row.innerHTML = `
                <div class="leaderboard-row-left">
                    <span class="leaderboard-rank">${idx + 1}</span>
                    <span class="leaderboard-name">${this.escapeHTML(entry.name)}</span>
                </div>
                <span class="leaderboard-score">${entry.score}${suffix}</span>
            `;
            boardContainer.appendChild(row);
        });

        // Setup bottom button
        const btn = document.getElementById('btn-celebration-action');
        if (isMatchFinished) {
            btn.textContent = 'Chiudi e Torna al Menu';
            btn.onclick = () => {
                app.closeModal('modal-celebration');
                app.state.activeGame = null;
                app.saveActiveGame();
                app.showDashboard();
            };
        } else {
            btn.textContent = 'Continua Partita';
            btn.onclick = () => {
                app.closeModal('modal-celebration');
                app.renderGameplay();
            };
        }
    },

    triggerConfetti() {
        const container = document.querySelector('.confetti-container');
        container.innerHTML = '';
        const colors = ['#007aff', '#ff9500', '#ff3b30', '#34c759', '#af52de', '#ffb300'];
        
        for (let i = 0; i < 60; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.width = `${Math.random() * 8 + 4}px`;
            confetti.style.height = `${Math.random() * 15 + 5}px`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.top = `-20px`;
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.borderRadius = '2px';
            confetti.style.opacity = Math.random();
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            // Custom CSS animations for falling particles
            confetti.animate([
                { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
                { transform: `translateY(400px) translateX(${Math.random() * 80 - 40}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: Math.random() * 2000 + 1500,
                easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
                fill: 'forwards'
            });
            
            container.appendChild(confetti);
        }
    },

    // 11. INTERACTIVE PRIMIERA CALCULATOR LOGIC
    openPrimieraCalculator() {
        const game = this.state.activeGame;
        this.openModal('modal-primiera-calc');

        const p1 = game.players[0];
        const p2 = game.players[1];

        // Reset and prepare calc state
        this.state.primieraCalc.activePlayerId = p1.id;
        
        // Smart Pre-fill: Preselect Settebello (7 of Denari) if a player won it
        this.state.primieraCalc.selections = {
            [p1.id]: {},
            [p2.id]: {}
        };

        if (this.roundWinners.settebello) {
            this.state.primieraCalc.selections[this.roundWinners.settebello]['denari'] = 7;
        }

        this.primieraCalcActiveSuit = 'denari'; // Default suit tab active

        this.renderPrimieraTabs();
        this.renderPrimieraSuitSelector();
        this.renderPrimieraCardsGrid();
        this.updatePrimieraScores();
    },

    renderPrimieraTabs() {
        const container = document.getElementById('primiera-player-tabs');
        container.innerHTML = '';
        const game = this.state.activeGame;

        game.players.forEach(p => {
            const isSelected = this.state.primieraCalc.activePlayerId === p.id;
            const btn = document.createElement('button');
            btn.className = `calc-tab-btn ${isSelected ? 'active' : ''}`;
            btn.onclick = () => app.switchPrimieraPlayerTab(p.id);
            btn.innerHTML = `
                <span class="calc-tab-name">${this.escapeHTML(p.name)}</span>
                <span class="calc-tab-score" id="calc-tab-val-${p.id}">0 pt</span>
            `;
            container.appendChild(btn);
        });
    },

    switchPrimieraPlayerTab(playerId) {
        this.state.primieraCalc.activePlayerId = playerId;
        this.renderPrimieraTabs();
        this.renderPrimieraSuitSelector();
        this.renderPrimieraCardsGrid();
        this.updatePrimieraScores();
    },

    renderPrimieraSuitSelector() {
        const container = document.getElementById('primiera-suit-tabs');
        container.innerHTML = '';
        
        const suits = [
            { name: 'denari', icon: '🪙', label: 'Denari' },
            { name: 'coppe', icon: '🏆', label: 'Coppe' },
            { name: 'spade', icon: '⚔️', label: 'Spade' },
            { name: 'bastoni', icon: '🪵', label: 'Bastoni' }
        ];

        suits.forEach(suit => {
            const isSelected = this.primieraCalcActiveSuit === suit.name;
            const btn = document.createElement('button');
            btn.className = `suit-tab-btn suit-${suit.name} ${isSelected ? 'active' : ''}`;
            btn.onclick = () => app.switchPrimieraSuitTab(suit.name);
            
            // Check if card is selected in this suit for active player
            const activePId = this.state.primieraCalc.activePlayerId;
            const hasSelected = this.state.primieraCalc.selections[activePId][suit.name] !== undefined;
            const dotIndicator = hasSelected ? ' •' : '';

            btn.innerHTML = `${suit.icon} <span>${suit.label}${dotIndicator}</span>`;
            container.appendChild(btn);
        });
    },

    switchPrimieraSuitTab(suitName) {
        this.primieraCalcActiveSuit = suitName;
        this.renderPrimieraSuitSelector();
        this.renderPrimieraCardsGrid();
    },

    renderPrimieraCardsGrid() {
        const container = document.getElementById('primiera-cards-grid');
        container.innerHTML = '';

        // Inject active suit variables for color highlights
        const suitColors = {
            denari: { border: '#ffb300', bg: 'rgba(255, 179, 0, 0.2)' },
            coppe: { border: '#ff3b30', bg: 'rgba(255, 59, 48, 0.2)' },
            spade: { border: '#007aff', bg: 'rgba(0, 122, 255, 0.2)' },
            bastoni: { border: '#34c759', bg: 'rgba(52, 199, 89, 0.2)' }
        };
        const activeColors = suitColors[this.primieraCalcActiveSuit];

        // 7, 6, Asso, and then continue (decreasing Primiera point order)
        const ranks = [
            { val: 7, name: '7' },
            { val: 6, name: '6' },
            { val: 1, name: 'Asso' },
            { val: 5, name: '5' },
            { val: 4, name: '4' },
            { val: 3, name: '3' },
            { val: 2, name: '2' },
            { val: 8, name: 'Fante' },
            { val: 9, name: 'Cavallo' },
            { val: 10, name: 'Re' }
        ];

        const activePlayer = this.state.primieraCalc.activePlayerId;
        const currentSelection = this.state.primieraCalc.selections[activePlayer][this.primieraCalcActiveSuit];

        const game = this.state.activeGame;
        const otherPlayer = game ? game.players.find(p => p.id !== activePlayer) : null;
        const otherSelection = (otherPlayer && this.state.primieraCalc.selections[otherPlayer.id])
            ? this.state.primieraCalc.selections[otherPlayer.id][this.primieraCalcActiveSuit]
            : null;

        ranks.forEach(rank => {
            const isSelected = currentSelection === rank.val;
            const isSelectedByOther = otherSelection === rank.val;
            const pts = this.primieraPoints[rank.val];
            const btn = document.createElement('button');
            
            let btnClass = 'card-rank-btn';
            if (isSelected) {
                btnClass += ' active';
            } else if (isSelectedByOther) {
                btnClass += ' taken-by-other';
            }
            btn.className = btnClass;
            
            if (isSelected) {
                btn.style.setProperty('--active-suit-color', activeColors.border);
                btn.style.setProperty('--active-suit-color-bg', activeColors.bg);
            }

            btn.onclick = () => app.togglePrimieraCard(rank.val);
            
            if (isSelectedByOther && otherPlayer) {
                btn.innerHTML = `
                    <span class="card-rank-name">${rank.name}</span>
                    <span class="card-rank-pts">${pts} pt</span>
                    <span class="card-rank-taken-label">${this.escapeHTML(otherPlayer.name)}</span>
                `;
            } else {
                btn.innerHTML = `
                    <span class="card-rank-name">${rank.name}</span>
                    <span class="card-rank-pts">${pts} pt</span>
                `;
            }
            container.appendChild(btn);
        });
    },

    togglePrimieraCard(rankVal) {
        const activePlayer = this.state.primieraCalc.activePlayerId;
        const suit = this.primieraCalcActiveSuit;
        
        const current = this.state.primieraCalc.selections[activePlayer][suit];
        
        if (current === rankVal) {
            // Deselect card
            delete this.state.primieraCalc.selections[activePlayer][suit];
        } else {
            // Select card
            this.state.primieraCalc.selections[activePlayer][suit] = rankVal;

            // Deselect from the other player if they had selected it (since a card is unique)
            const game = this.state.activeGame;
            if (game && game.players) {
                const otherPlayer = game.players.find(p => p.id !== activePlayer);
                if (otherPlayer && this.state.primieraCalc.selections[otherPlayer.id]) {
                    if (this.state.primieraCalc.selections[otherPlayer.id][suit] === rankVal) {
                        delete this.state.primieraCalc.selections[otherPlayer.id][suit];
                    }
                }
            }
        }

        this.renderPrimieraSuitSelector();
        this.renderPrimieraCardsGrid();
        this.updatePrimieraScores();
    },

    getPrimieraScoreForPlayer(playerId) {
        const playerSels = this.state.primieraCalc.selections[playerId] || {};
        let total = 0;
        Object.values(playerSels).forEach(rankVal => {
            total += this.primieraPoints[rankVal] || 0;
        });
        return total;
    },

    updatePrimieraScores() {
        const game = this.state.activeGame;
        const p1 = game.players[0];
        const p2 = game.players[1];

        const score1 = this.getPrimieraScoreForPlayer(p1.id);
        const score2 = this.getPrimieraScoreForPlayer(p2.id);

        // Update score labels inside switch tabs
        const tab1Val = document.getElementById(`calc-tab-val-${p1.id}`);
        const tab2Val = document.getElementById(`calc-tab-val-${p2.id}`);
        if (tab1Val) tab1Val.textContent = `${score1} pt`;
        if (tab2Val) tab2Val.textContent = `${score2} pt`;

        // Update summary overview at bottom
        document.querySelector('#calc-score-p1 .calc-name').textContent = p1.name;
        document.querySelector('#calc-score-p1 .calc-value').textContent = `${score1} pt`;

        document.querySelector('#calc-score-p2 .calc-name').textContent = p2.name;
        document.querySelector('#calc-score-p2 .calc-value').textContent = `${score2} pt`;

        // Determine winner
        const banner = document.getElementById('calc-winner-banner');
        const applyBtn = document.getElementById('btn-apply-primiera');
        
        if (score1 === 0 && score2 === 0) {
            banner.textContent = 'Seleziona le carte per iniziare il calcolo.';
            banner.className = 'calc-winner-banner';
            applyBtn.disabled = true;
            this.calculatedPrimieraWinnerId = null;
        } 
        else if (score1 === score2) {
            banner.textContent = `Pareggio a ${score1} punti!`;
            banner.className = 'calc-winner-banner';
            applyBtn.disabled = false; // can apply none
            this.calculatedPrimieraWinnerId = null;
        } 
        else {
            const winner = score1 > score2 ? p1 : p2;
            const loser = score1 > score2 ? p2 : p1;
            const winPts = score1 > score2 ? score1 : score2;
            const losePts = score1 > score2 ? score2 : score1;
            
            banner.textContent = `Vince ${winner.name} (${winPts} a ${losePts} pt)`;
            banner.className = 'calc-winner-banner victory';
            applyBtn.disabled = false;
            this.calculatedPrimieraWinnerId = winner.id;
        }
    },

    applyPrimieraWinner() {
        // Apply winner back to Scopa/Ciccopaolo round editor
        this.setScopaClassicWinner('primiera', this.calculatedPrimieraWinnerId);
        this.closeModal('modal-primiera-calc');
    },

    // 12. HELPER UTILS
    escapeHTML(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')
                  .replace(/"/g, '&quot;')
                  .replace(/'/g, '&#039;');
    },

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    getPlayerNameById(id) {
        if (!id) return 'Nessuno';
        // Check active game players first
        if (this.state.activeGame) {
            const ap = this.state.activeGame.players.find(p => p.id === id);
            if (ap) return ap.name;
        }
        // Fallback to roster
        const p = this.state.players.find(pl => pl.id === id);
        return p ? p.name : 'Giocatore';
    },

    updateActiveGameBadges() {
        const game = this.state.activeGame;
        const badges = ['scopa', 'briscola', 'bisca', 'ciccopaolo', 'scala40', 'standard'];
        
        badges.forEach(b => {
            const badgeEl = document.getElementById(`badge-${b}`);
            if (badgeEl) {
                if (game && game.isActive && game.type === b) {
                    badgeEl.classList.remove('hidden');
                } else {
                    badgeEl.classList.add('hidden');
                }
            }
        });
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('active');
    },

    showConfirm(title, message, onConfirm) {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-message').textContent = message;
        
        const confirmBtn = document.getElementById('btn-confirm-action');
        confirmBtn.onclick = () => {
            onConfirm();
            this.closeModal('modal-confirm');
        };
        
        this.openModal('modal-confirm');
    }
};

// Start app on DOM Loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
