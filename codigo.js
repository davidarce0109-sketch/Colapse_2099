let game = {
    round: 0,
    stability: 10,
    started: false,
    organizations: [], 
    decisions: {} 
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

function addOrganization() { 
    let input = document.getElementById("organizationName"); 
    let name = input.value.trim();
    if (!name) return;

    game.organizations.push({
        name,
        wealth: 0,
        trust: 10,
        scrap: 10,
        reputation: 0, 
        escape: false
    });

    input.value = "";
    save();
}

function startGame() {
    if(game.organizations.length === 0) return alert("Registra organizaciones primero.");
    game.started = true;
    game.round = 1;
    game.stability = 10;
    game.decisions = {}; // Limpiar decisiones previas al iniciar
    save();
}

function render() {
    document.getElementById("round").innerText = game.round;
    let stabEl = document.getElementById("stability");
    stabEl.innerText = game.stability;
    stabEl.style.color = game.stability > 6 ? "#00ff99" : game.stability > 3 ? "#e6a23c" : "#ff5555";

    let select = document.getElementById("organizationSelect"); 
    select.innerHTML = '<option value="">-- Seleccionar tu organización --</option>';
    game.organizations.forEach((org, i) => {
        let op = document.createElement("option");
        op.value = i;
        op.textContent = org.name;
        select.appendChild(op);
    });

    let ranking = game.organizations.slice().sort((a, b) => b.wealth - a.wealth);

    let html = `<table><tr><th>Organización</th><th>Riqueza</th><th>Reputación</th><th>Chatarra</th><th>Estado</th></tr>`;
    ranking.forEach(org => {
        html += `<tr>
            <td>${org.name}</td>
            <td>$${org.wealth.toFixed(1)}</td>
            <td>${org.reputation || 0}</td>
            <td>${org.scrap}</td>
            <td>${org.escape ? '<span class="escape-badge">🚀 EN NAVE</span>' : '🌍 TIERRA'}</td>
        </tr>`;
    });
    html += "</table>";
    document.getElementById("ranking").innerHTML = html;
}

function sendDecision(type) {
    if(!game.started) return alert("El Facilitador debe iniciar la partida.");

    let select = document.getElementById("organizationSelect"); 
    let idx = select.value;
    if(idx === "") return alert("Selecciona el nombre de tu organización de la lista.");

    game.decisions[idx] = type;
    save();

    let statusEl = document.getElementById("status");
    statusEl.innerHTML = `✅ ${game.organizations[idx].name}: Decisión registrada.<br><small>Se contará la última acción pulsada.</small>`;

    setTimeout(() => { statusEl.innerText = "Esperando siguiente organización..."; }, 3000);
}

function nextRound() {
    if (!game.started) return;
    if (Object.keys(game.decisions).length === 0) return alert("Ninguna organización ha votado en esta ronda.");

    let cooperators = 0, betrayers = 0, repairers = 0;

    Object.entries(game.decisions).forEach(([id, decision]) => {
        if (decision === "cooperate") cooperators++;
        if (decision === "betray") betrayers++;
        if (decision === "repair") repairers++;
    });

    game.organizations.forEach((org, id) => {
        let decision = game.decisions[id];
        
        // Control: Si una organización no votó, no procesa acciones pero si recibe el share cooperativo
        let share = (cooperators * 15) / game.organizations.length;
        org.wealth += share;

        if (org.reputation === undefined) org.reputation = 0;

        if (decision === "cooperate") {
            org.scrap += 5;
            org.reputation += 5; 
        } else if (decision === "betray") {
            org.wealth += 20;
            org.scrap += 20;
            org.reputation -= 7; 
        } else if (decision === "repair") {
            if (org.scrap >= 5) org.scrap -= 5;
            else org.wealth = Math.max(0, org.wealth - 10);
            org.reputation += 7; 
        }
    });

    game.stability = Math.min(10, game.stability - (betrayers * 2) + (repairers * 1));

    // Sistema de selección aleatoria equitativa de naves
    let candidates = [];
    game.organizations.forEach((org, id) => {
        if (org.scrap >= 50) {
            candidates.push({ organization: org, id: id });
        }
    });

    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let candidate of candidates) {
        let org = candidate.organization;
        let currentOwner = game.organizations.find(o => o.escape);

        if (org.escape) continue;

        let confirmMessage = currentOwner 
            ? `¡LA NAVE YA TIENE DUEÑO! ${org.name} tiene ${org.scrap} de Chatarra. ¿Quieres gastar 50 unidades para ROBARLE la única nave a la organización ${currentOwner.name}?`
            : `${org.name} tiene ${org.scrap} de Chatarra. ¿Construir la única Nave de Escape del planeta?`;

        if (confirm(confirmMessage)) {
            if (currentOwner) {
                currentOwner.escape = false;
            }
            org.scrap -= 50;
            org.escape = true;
        }
    }

    // Criterios de evaluación de finales y condiciones de victoria
    if (game.stability <= 0) {
        let finalWinner = game.organizations.find(org => org.escape);
        if (finalWinner) {
            alert(`💥 COLAPSO TOTAL 💥\nLa Tierra ha sido destruida. Condición: Estabilidad 0. ¡La organización dueña de la nave y única ganadora es: ${finalWinner.name}!`);
        } else {
            alert(`💥 COLAPSO TOTAL 💥\nLa Tierra ha sido destruida. Ninguna organización abordó la nave. Todos han muerto.`);
        }
        manualReset(true);
        return;
    }

    if (game.round >= 5) {
        let winner;
        if (game.stability >= 7) {
            winner = game.organizations.slice().sort((a, b) => b.wealth - a.wealth)[0];
            alert(`🏆 FIN DE LA PARTIDA 🏆\nEl planeta sobrevivió con alta estabilidad (${game.stability}/10).\nLa organización líder más rica y ganadora es: ${winner.name} ($${winner.wealth.toFixed(1)})`);
        } else {
            winner = game.organizations.slice().sort((a, b) => b.reputation - a.reputation)[0];
            alert(`🏆 FIN DE LA PARTIDA 🏆\nEl planeta sobrevivió con baja estabilidad (${game.stability}/10).\nLa organización líder con más reputación y ganadora es: ${winner.name} (Reputación: ${winner.reputation})`);
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
        game = { round: 0, stability: 10, started: false, organizations: [], decisions: {} };
        localStorage.removeItem("colapso2099_v2");
        save();
    }
}

load();