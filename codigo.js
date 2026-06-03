let game = {
    round: 0,
    stability: 10,
    started: false,
    players: [],
    decisions: {} // Aquí se guardan las decisiones: { "id": "tipo" }
};

function save() {
    localStorage.setItem("colapso2099_v2", JSON.stringify(game));
    render();
}

function load() {
    let data = localStorage.getItem("colapso2099_v2");
    if (data) {
        game = JSON.parse(data);
    }
    render();
}

function addPlayer() {
    let input = document.getElementById("playerName");
    let name = input.value.trim();
    if (!name) return;
    
    game.players.push({
        name,
        wealth: 0,
        trust: 10,
        scrap: 10,
        reputation: 0, // Inicialización de reputación
        escape: false
    });
    
    input.value = "";
    save();
}

function startGame() {
    if(game.players.length === 0) return alert("Registra jugadores primero.");
    game.started = true;
    game.round = 1;
    game.stability = 10;
    save();
}

function render() {
    document.getElementById("round").innerText = game.round;
    let stabEl = document.getElementById("stability");
    stabEl.innerText = game.stability;
    stabEl.style.color = game.stability > 6 ? "#00ff99" : game.stability > 3 ? "#e6a23c" : "#ff5555";

    let select = document.getElementById("playerSelect");
    select.innerHTML = '<option value="">-- Seleccionar Jugador --</option>';
    game.players.forEach((p, i) => {
        let op = document.createElement("option");
        op.value = i;
        op.textContent = p.name;
        select.appendChild(op);
    });

    let ranking = game.players.slice().sort((a, b) => b.wealth - a.wealth);
    
    // Control de seguridad: se usa (p.reputation || 0) por si quedan datos viejos en el navegador
    let html = `<table><tr><th>Jugador</th><th>Riqueza</th><th>Reputación</th><th>Chatarra</th><th>Estado</th></tr>`;
    ranking.forEach(p => {
        html += `<tr>
            <td>${p.name}</td>
            <td>$${p.wealth.toFixed(1)}</td>
            <td>${p.reputation || 0}</td>
            <td>${p.scrap}</td>
            <td>${p.escape ? '<span class="escape-badge">🚀 EN NAVE</span>' : '🌍 TIERRA'}</td>
        </tr>`;
    });
    html += "</table>";
    document.getElementById("ranking").innerHTML = html;
}

function sendDecision(type) {
    if(!game.started) return alert("El Facilitador debe iniciar la partida.");
    
    let select = document.getElementById("playerSelect");
    let idx = select.value;
    if(idx === "") return alert("Selecciona tu nombre de la lista.");

    game.decisions[idx] = type;
    save();

    let statusEl = document.getElementById("status");
    statusEl.innerHTML = `✅ ${game.players[idx].name}: Decisión registrada.<br><small>Se contará la última acción pulsada.</small>`;
    
    setTimeout(() => { statusEl.innerText = "Esperando siguiente jugador..."; }, 3000);
}

function nextRound() {
    if (!game.started) return;
    if (Object.keys(game.decisions).length === 0) return alert("Nadie ha votado en esta ronda.");

    let cooperators = 0, betrayers = 0, repairers = 0;

    Object.entries(game.decisions).forEach(([id, decision]) => {
        if (decision === "cooperate") cooperators++;
        if (decision === "betray") betrayers++;
        if (decision === "repair") repairers++;
    });

    game.players.forEach((p, id) => {
        let decision = game.decisions[id];
        
        let share = (cooperators * 15) / game.players.length;
        p.wealth += share;

        // Si es un jugador viejo, aseguramos que tenga la propiedad creada antes de operar
        if (p.reputation === undefined) p.reputation = 0;

        if (decision === "cooperate") {
            p.scrap += 5;
            p.reputation += 5; 
        } else if (decision === "betray") {
            p.wealth += 20;
            p.scrap += 20;
            p.reputation -= 7; 
        } else if (decision === "repair") {
            if (p.scrap >= 5) p.scrap -= 5;
            else p.wealth = Math.max(0, p.wealth - 10);
            p.reputation += 7; 
        }
    });

    game.stability = Math.min(10, game.stability - (betrayers * 2) + (repairers * 1));

    // Sistema de selección aleatoria equitativa (pregunta a todos sin detenerse)
    let candidates = [];
    game.players.forEach((p, id) => {
        if (p.scrap >= 50) {
            candidates.push({ player: p, id: id });
        }
    });

    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let candidate of candidates) {
        let p = candidate.player;
        let currentOwner = game.players.find(player => player.escape);
        
        if (p.escape) continue;

        let confirmMessage = currentOwner 
            ? `¡LA NAVE YA TIENE DUEÑO! ${p.name} tiene ${p.scrap} de Chatarra. ¿Quieres gastar 50 unidades para ROBARLE la única nave a ${currentOwner.name}?`
            : `${p.name} tiene ${p.scrap} de Chatarra. ¿Construir la única Nave de Escape del planeta?`;

        if (confirm(confirmMessage)) {
            if (currentOwner) {
                currentOwner.escape = false;
            }
            p.scrap -= 50;
            p.escape = true;
        }
    }

    // Criterios de evaluación de finales y condiciones de victoria
    if (game.stability <= 0) {
        let finalWinner = game.players.find(p => p.escape);
        if (finalWinner) {
            alert(`💥 COLAPSO TOTAL 💥\nLa Tierra ha sido destruida. Condición: Estabilidad 0. ¡El último dueño de la nave y único ganador es: ${finalWinner.name}!`);
        } else {
            alert(`💥 COLAPSO TOTAL 💥\nLa Tierra ha sido destruida. Nadie abordó la nave. Todos han muerto.`);
        }
        manualReset(true);
        return;
    }

    if (game.round >= 5) {
        let winner;
        if (game.stability >= 7) {
            winner = game.players.slice().sort((a, b) => b.wealth - a.wealth)[0];
            alert(`🏆 FIN DE LA PARTIDA 🏆\nEl planeta sobrevivió con alta estabilidad (${game.stability}/10).\nEl líder más rico y ganador es: ${winner.name} ($${winner.wealth.toFixed(1)})`);
        } else {
            winner = game.players.slice().sort((a, b) => b.reputation - a.reputation)[0];
            alert(`🏆 FIN DE LA PARTIDA 🏆\nEl planeta sobrevivió con baja estabilidad (${game.stability}/10).\nEl líder con más reputación y ganador es: ${winner.name} (Reputación: ${winner.reputation})`);
        }
        manualReset(true);
        return;
    }

    game.round++;
    game.decisions = {}; 
    save();
}

function manualReset(silent = false) {
    if(silent || confirm("¿Borrar todo y empezar de cero?")) {
        game = { round: 0, stability: 10, started: false, players: [], decisions: {} };
        localStorage.removeItem("colapso2099_v2");
        save();
    }
}

load();