// --- VARIÁVEIS GLOBAIS ---
let meuTime = null;
let rodadaAtual = 1;
let faseAtual = 'FASE_DE_GRUPOS';
let tabelaGeral = [];
let calendario = [];
let elencoAtual = [];
let escalacao = [];
let jogoPlayoff = null;

// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    renderizarSelecaoTimes();
});

function renderizarSelecaoTimes() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    timesData.forEach(time => {
        const div = document.createElement('div');
        div.className = 'team-card-select';
        div.innerHTML = `
            <div style="font-size:30px; margin-bottom:10px;">🛡️</div>
            <strong>${time.nome}</strong><br>
            <small>${time.estadio}</small>
        `;
        div.onclick = () => iniciarJogo(time.id);
        grid.appendChild(div);
    });
}

function iniciarJogo(timeId) {
    // 1. Setup do Time
    meuTime = JSON.parse(JSON.stringify(timesData.find(t => t.id === timeId)));
    
    // --- NOVO: APLICA A COR DO TIME AO CSS ---
    // Se o time não tiver cor no JSON, usa verde padrão
    const corTema = meuTime.cor || '#00ff88';
    document.documentElement.style.setProperty('--team-theme', corTema);

    // Zera cartões
    elencoAtual = meuTime.jogadores.map((j, index) => ({ 
        ...j, 
        id: index, 
        cartoesAmarelos: 0, 
        suspenso: false 
    }));
    
    // Setup Adversários
    tabelaGeral = timesData.map(t => ({
        id: t.id,
        nome: t.nome,
        forcaBase: calcularForcaMedia(t.jogadores),
        pontos: 0,
        vitorias: 0,
        saldo: 0,
        golsPro: 0,
        jogos: 0
    }));

    gerarCalendarioFase1();

    document.getElementById('screen-selection').classList.add('hidden');
    document.getElementById('screen-manager').classList.remove('hidden');
    atualizarInterface();
}

function calcularForcaMedia(jogadores) {
    const sorted = [...jogadores].sort((a, b) => b.forca - a.forca);
    const top11 = sorted.slice(0, 11);
    return top11.reduce((acc, j) => acc + j.forca, 0) / 11;
}

function gerarCalendarioFase1() {
    const adversariosPossiveis = timesData.filter(t => t.id !== meuTime.id);
    adversariosPossiveis.sort(() => Math.random() - 0.5);
    calendario = adversariosPossiveis.slice(0, 8).map(adv => ({
        adversario: adv,
        local: Math.random() > 0.5 ? 'CASA' : 'FORA'
    }));
}

// --- INTERFACE ---
function atualizarInterface() {
    document.getElementById('team-name').innerText = meuTime.nome;
    const moralElem = document.getElementById('team-moral');
    moralElem.innerText = Math.round(meuTime.moral);
    
    // Ajuste de cor da moral (mantém lógica de perigo)
    if (meuTime.moral > 70) moralElem.style.color = '#00ff88';
    else if (meuTime.moral < 40) moralElem.style.color = '#ff4d4d';
    else moralElem.style.color = 'white';

    const labelRodada = document.getElementById('current-round');
    if (faseAtual === 'FASE_DE_GRUPOS') {
        if (rodadaAtual > 8) labelRodada.innerText = "Fim 1ª Fase";
        else labelRodada.innerText = `${rodadaAtual}/8`;
        atualizarCardProximoJogoFase1();
    } else {
        labelRodada.innerText = faseAtual.replace('_', ' '); 
        atualizarCardMataMata();
    }

    renderizarElenco();
    renderizarTabela();
}

function atualizarCardProximoJogoFase1() {
    if (rodadaAtual <= 8) {
        const jogo = calendario[rodadaAtual - 1];
        document.getElementById('enemy-name').innerText = jogo.adversario.nome;
        document.getElementById('enemy-initial').innerText = jogo.adversario.nome.substring(0, 3).toUpperCase();
        document.getElementById('match-venue').innerText = jogo.local === 'CASA' ? `🏟️ Casa (${meuTime.estadio})` : `✈️ Fora (${jogo.adversario.estadio})`;
    } else {
        document.getElementById('news-text').innerText = "Fase de Grupos encerrada.";
        document.querySelector('.next-match-card').innerHTML = `<h3>Fase Finalizada</h3><p>Confira a tabela.</p>`;
    }
}

function atualizarCardMataMata() {
    if (!jogoPlayoff) return;
    const divCard = document.querySelector('.next-match-card');
    divCard.innerHTML = `
        <h3 style="color:#ffcc00">MATA-MATA: ${faseAtual}</h3>
        <div class="matchup">
            <div class="team-logo my-logo">EU</div>
            <span style="font-size:1.5em; font-weight:bold">VS</span>
            <div class="team-logo enemy-logo">${jogoPlayoff.adversario.nome.substring(0,3).toUpperCase()}</div>
        </div>
        <p style="font-weight:bold; font-size:1.2em; margin:10px 0;">${jogoPlayoff.adversario.nome}</p>
        <p>🏟️ ${jogoPlayoff.local === 'CASA' ? 'Mando: SEU' : 'Mando: DELES'}</p>
    `;
    atualizarStatsTime(); 
}

// --- ESCALAÇÃO ---
function renderizarElenco() {
    const lista = document.getElementById('players-list');
    
    // Segurança: Se a lista não existir no HTML, para aqui pra não dar erro
    if (!lista) {
        console.error("Elemento players-list não encontrado!");
        return;
    }

    lista.innerHTML = '';
    
    // Verifica se o elencoAtual tem gente
    if (!elencoAtual || elencoAtual.length === 0) {
        lista.innerHTML = '<p style="padding:10px; color:#666;">Elenco não carregado...</p>';
        return;
    }
    
    elencoAtual.forEach(jogador => {
        const div = document.createElement('div');
        const isSelected = escalacao.includes(jogador.id);
        
        div.className = `player-row ${isSelected ? 'selected' : ''} ${jogador.suspenso ? 'suspended' : ''}`;
        
        let statusExtra = '';
        if (jogador.suspenso) statusExtra = '<span style="color:red; font-weight:bold"> (SUSP)</span>';
        
        let icon = '⚽';
        if (jogador.pos === 'GOL') icon = '🧤';
        if (jogador.pos === 'ZAG' || jogador.pos === 'LAT') icon = '🛡️';

        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <span class="pos-tag">${jogador.pos}</span>
                <span>${icon} ${jogador.nome} ${statusExtra}</span>
                <span class="cards-icon">${'🟨'.repeat(jogador.cartoesAmarelos)}</span>
            </div>
            <div style="font-weight:bold; color: #ddd;">${jogador.forca}</div>
        `;
        
        div.onclick = () => toggleJogador(jogador.id);
        lista.appendChild(div);
    });

    atualizarStatsTime();
}
function toggleJogador(id) {
    if (rodadaAtual > 8 && faseAtual === 'FASE_DE_GRUPOS') return;

    const jogador = elencoAtual.find(j => j.id === id);
    if (jogador.suspenso) {
        alert("Jogador suspenso!");
        return;
    }

    if (escalacao.includes(id)) {
        escalacao = escalacao.filter(sid => sid !== id);
    } else {
        if (escalacao.length >= 11) {
            alert("Já escalou 11!");
            return;
        }
        if (jogador.pos === 'GOL') {
            const temGoleiro = escalacao.some(pid => elencoAtual.find(p => p.id === pid).pos === 'GOL');
            if (temGoleiro) {
                alert("Apenas 1 Goleiro!");
                return;
            }
        }
        escalacao.push(id);
    }
    renderizarElenco();
}

function atualizarStatsTime() {
    const btn = document.getElementById('btn-play');
    const warning = document.getElementById('lineup-warning');

    if (rodadaAtual > 8 && faseAtual === 'FASE_DE_GRUPOS') {
        btn.disabled = false;
        warning.style.display = 'none';
        return; 
    }

    let ataque = 0;
    let defesa = 0;

    escalacao.forEach(id => {
        const jog = elencoAtual.find(j => j.id === id);
        if (['ATA', 'MEI'].includes(jog.pos)) ataque += jog.forca;
        else ataque += jog.forca * 0.5;

        if (['GOL', 'ZAG', 'LAT', 'MEI'].includes(jog.pos)) defesa += jog.forca;
        else defesa += jog.forca * 0.3;
    });

    const fatorMoral = meuTime.moral / 50; 
    ataque = Math.floor(ataque * fatorMoral);
    defesa = Math.floor(defesa * fatorMoral);

    document.getElementById('stat-att').innerText = ataque;
    document.getElementById('stat-def').innerText = defesa;
    
    if (escalacao.length === 11) {
        const temGoleiro = escalacao.some(pid => elencoAtual.find(p => p.id === pid).pos === 'GOL');
        if (!temGoleiro) {
            btn.disabled = true;
            warning.innerText = "Faltou goleiro!";
            return;
        }
        btn.disabled = false;
        warning.style.display = 'none';
    } else {
        btn.disabled = true;
        warning.style.display = 'block';
        warning.innerText = `${escalacao.length}/11`;
    }
}

// --- LÓGICA DE PARTIDA COM NARRATIVA ---

document.getElementById('btn-play').addEventListener('click', () => {
    // Tratamento botão de fase
    if (rodadaAtual > 8 && faseAtual === 'FASE_DE_GRUPOS') {
        finalizarFaseGrupos();
        return;
    }

    // Configuração dos Times
    let adversarioObj, localJogo, nomeAdv, idAdv;
    if (faseAtual === 'FASE_DE_GRUPOS') {
        const jogo = calendario[rodadaAtual - 1];
        adversarioObj = jogo.adversario;
        localJogo = jogo.local;
    } else {
        adversarioObj = jogoPlayoff.adversario;
        localJogo = jogoPlayoff.local;
    }
    
    // Cálculo do Resultado (Nos bastidores)
    const forcaAdvMedia = calcularForcaMedia(adversarioObj.jogadores);
    const result = calcularResultado(forcaAdvMedia * 11, localJogo);
    
    // Inicia Narrativa Visual (Opção 1)
    iniciarNarrativa(result.golsMeu, result.golsAdv, adversarioObj.nome, adversarioObj.id);
});

function calcularResultado(forcaAdvTotal, local) {
    let meuAtaque = parseInt(document.getElementById('stat-att').innerText);
    let minhaDefesa = parseInt(document.getElementById('stat-def').innerText);
    let advAtaque = forcaAdvTotal; 
    let advDefesa = forcaAdvTotal;

    if (local === 'CASA') {
        meuAtaque *= 1.15; minhaDefesa *= 1.1;
    } else {
        advAtaque *= 1.15; advDefesa *= 1.1;
    }

    const chanceGolMeu = meuAtaque / (meuAtaque + advDefesa);
    const chanceGolAdv = advAtaque / (advAtaque + minhaDefesa);

    let golsMeu = 0;
    let golsAdv = 0;

    for(let i=0; i<6; i++) {
        if (Math.random() < chanceGolMeu * 0.6) golsMeu++;
        if (Math.random() < chanceGolAdv * 0.6) golsAdv++;
    }
    
    return { golsMeu, golsAdv };
}

// --- SISTEMA DE NARRATIVA ---
function iniciarNarrativa(golsFinaisMeu, golsFinaisAdv, nomeAdv, idAdv) {
    // Esconde Manager, Mostra Simulação
    document.getElementById('screen-manager').classList.add('hidden');
    document.getElementById('screen-simulation').classList.remove('hidden');

    const timerEl = document.getElementById('match-timer');
    const scoreHomeEl = document.getElementById('live-score-home');
    const scoreAwayEl = document.getElementById('live-score-away');
    const logEl = document.getElementById('live-narrative');

    // Reset
    timerEl.innerText = "00:00";
    scoreHomeEl.innerText = "0";
    scoreAwayEl.innerText = "0";
    
    // Distribui os gols aleatoriamente nos 90 minutos
    let minutosGolsMeu = [];
    for(let i=0; i<golsFinaisMeu; i++) minutosGolsMeu.push(Math.floor(Math.random() * 88) + 1);
    
    let minutosGolsAdv = [];
    for(let i=0; i<golsFinaisAdv; i++) minutosGolsAdv.push(Math.floor(Math.random() * 88) + 1);

    let minutoAtual = 0;
    let golsAtuaisMeu = 0;
    let golsAtuaisAdv = 0;

    // Loop da animação
    const intervalo = setInterval(() => {
        minutoAtual += 2; // Avança 2 minutos por tick
        if (minutoAtual > 90) minutoAtual = 90;

        timerEl.innerText = minutoAtual < 10 ? `0${minutoAtual}:00` : `${minutoAtual}:00`;

        // Verifica Gol Meu
        if (minutosGolsMeu.includes(minutoAtual) || minutosGolsMeu.includes(minutoAtual-1)) {
            golsAtuaisMeu++;
            scoreHomeEl.innerText = golsAtuaisMeu;
            logEl.innerText = "GOOOOOOL! DO SEU TIME!";
            logEl.className = "narrative-log goal-event";
            // Remove da lista pra não contar duplo
            minutosGolsMeu = minutosGolsMeu.filter(m => m !== minutoAtual && m !== minutoAtual-1);
        }
        // Verifica Gol Deles
        else if (minutosGolsAdv.includes(minutoAtual) || minutosGolsAdv.includes(minutoAtual-1)) {
            golsAtuaisAdv++;
            scoreAwayEl.innerText = golsAtuaisAdv;
            logEl.innerText = `Gol do ${nomeAdv}...`;
            logEl.className = "narrative-log danger-event";
            minutosGolsAdv = minutosGolsAdv.filter(m => m !== minutoAtual && m !== minutoAtual-1);
        }
        // Eventos de Sabor (Flavor Text)
        else if (Math.random() < 0.1) {
            const frases = [
                "Bola na trave!", "Quase!", "Grande defesa do goleiro.", 
                "Jogo truncado no meio campo.", "O técnico grita com o time.",
                "Escanteio perigoso...", "Falta dura!"
            ];
            logEl.innerText = frases[Math.floor(Math.random() * frases.length)];
            logEl.className = "narrative-log";
        }

        if (minutoAtual === 90) {
            clearInterval(intervalo);
            setTimeout(() => {
                // Fim da Simulação -> Vai para Resultado
                document.getElementById('screen-simulation').classList.add('hidden');
                aplicarCartoes();
                mostrarResultado(golsFinaisMeu, golsFinaisAdv, nomeAdv, idAdv);
            }, 1500);
        }

    }, 100); // Velocidade do relógio (quanto menor, mais rápido)
}

// --- RESULTADO E FINALIZAÇÃO (Mantido igual, só reconectando) ---

function aplicarCartoes() {
    elencoAtual.forEach(j => {
        if (j.suspenso && !escalacao.includes(j.id)) j.suspenso = false; 
        if (escalacao.includes(j.id)) {
            let chanceAmarelo = meuTime.moral < 30 ? 0.20 : 0.10;
            if (Math.random() < chanceAmarelo) j.cartoesAmarelos++;
            if (Math.random() < 0.005) j.suspenso = true;
            if (j.cartoesAmarelos >= 3) { j.suspenso = true; j.cartoesAmarelos = 0; }
        }
    });
}

function mostrarResultado(golsMeu, golsAdv, nomeAdv, idAdv) {
    document.getElementById('screen-result').classList.remove('hidden');

    const placarEl = document.querySelector('.scoreboard');
    const resumoEl = document.getElementById('match-summary');
    const btnNext = document.getElementById('btn-next-round');
    
    // Pênaltis (Mata-Mata Empatado)
    if (faseAtual !== 'FASE_DE_GRUPOS' && golsMeu === golsAdv) {
        let penaltisMeu = 0, penaltisAdv = 0;
        for(let k=0; k<5; k++) {
            if(Math.random() > 0.2) penaltisMeu++;
            if(Math.random() > 0.2) penaltisAdv++;
        }
        while(penaltisMeu === penaltisAdv) {
            if(Math.random() > 0.2) penaltisMeu++;
            if(Math.random() > 0.2) penaltisAdv++;
        }
        
        placarEl.innerHTML = `${golsMeu} <small>(${penaltisMeu})</small> x <small>(${penaltisAdv})</small> ${golsAdv}`;
        
        if (penaltisMeu > penaltisAdv) {
            resumoEl.innerText = `Vencemos nos PÊNALTIS!`;
            meuTime.moral += 15;
            btnNext.onclick = () => avancarFaseMataMata(true);
        } else {
            resumoEl.innerText = `Eliminado nos Pênaltis...`;
            meuTime.moral -= 20;
            btnNext.onclick = () => gameOver("Eliminado nos Pênaltis.");
        }
    } else {
        placarEl.innerHTML = `<span id="score-my">${golsMeu}</span> x <span id="score-enemy">${golsAdv}</span>`;
        let vitoria = golsMeu > golsAdv;
        
        if (vitoria) {
            resumoEl.innerText = "Vitória!";
            meuTime.moral = Math.min(100, meuTime.moral + 10);
        } else if (golsMeu === golsAdv) {
            resumoEl.innerText = "Empate.";
        } else {
            resumoEl.innerText = "Derrota.";
            meuTime.moral = Math.max(0, meuTime.moral - 10);
        }

        if (faseAtual === 'FASE_DE_GRUPOS') {
            atualizarTabelaPosRodada(golsMeu, golsAdv, idAdv);
            btnNext.innerText = "Continuar";
            btnNext.onclick = () => avancarRodadaFase1();
        } else {
            if (vitoria) {
                btnNext.innerText = "Avançar de Fase";
                btnNext.onclick = () => avancarFaseMataMata(true);
            } else {
                btnNext.innerText = "Sair do Jogo";
                btnNext.onclick = () => gameOver("Eliminado no Mata-Mata.");
            }
        }
    }
}

// Funções de Navegação e Tabela (Mantidas do anterior, sem alterações lógicas)
function avancarRodadaFase1() {
    rodadaAtual++;
    escalacao = [];
    document.getElementById('screen-result').classList.add('hidden');
    document.getElementById('screen-manager').classList.remove('hidden');
    if (rodadaAtual > 8) finalizarFaseGrupos();
    else { gerarNoticia(); atualizarInterface(); }
}

function atualizarTabelaPosRodada(gM, gA, idAdv) {
    const eu = tabelaGeral.find(t => t.id === meuTime.id);
    eu.jogos++; eu.golsPro += gM; eu.saldo += (gM - gA);
    if (gM > gA) { eu.pontos += 3; eu.vitorias++; } else if (gM === gA) eu.pontos += 1;

    const adv = tabelaGeral.find(t => t.id === idAdv);
    adv.jogos++; adv.golsPro += gA; adv.saldo += (gA - gM);
    if (gA > gM) { adv.pontos += 3; adv.vitorias++; } else if (gA === gM) adv.pontos += 1;

    tabelaGeral.forEach(t => {
        if (t.id !== meuTime.id && t.id !== idAdv && t.jogos < rodadaAtual) {
            const gP = Math.floor(Math.random() * 3);
            const gC = Math.floor(Math.random() * 3);
            t.jogos++; t.golsPro += gP; t.saldo += (gP - gC);
            if (Math.random() > 0.6) { t.pontos += 3; t.vitorias++; }
            else if (Math.random() > 0.3) { t.pontos += 1; }
        }
    });
    tabelaGeral.sort((a, b) => b.pontos - a.pontos || b.vitorias - a.vitorias || b.saldo - a.saldo);
}

function finalizarFaseGrupos() {
    renderizarTabela();
    document.getElementById('news-text').innerText = "Fase 1 Encerrada!";
    const minhaPosicao = tabelaGeral.findIndex(t => t.id === meuTime.id) + 1;
    const btnAction = document.getElementById('btn-play');
    const novoBtn = btnAction.cloneNode(true);
    btnAction.parentNode.replaceChild(novoBtn, btnAction);
    novoBtn.disabled = false;
    
    if (minhaPosicao <= 8) {
        novoBtn.innerText = `JOGAR QUARTAS (${minhaPosicao}º)`;
        novoBtn.style.background = "#FFD700"; 
        novoBtn.addEventListener('click', () => prepararMataMata('QUARTAS'));
    } else if (minhaPosicao >= 15) {
        novoBtn.innerText = "REBAIXADO (Game Over)";
        novoBtn.style.background = "#ff4d4d";
        novoBtn.addEventListener('click', () => gameOver("Rebaixado!"));
    } else {
        novoBtn.innerText = "ELIMINADO (Game Over)";
        novoBtn.style.background = "#aaa";
        novoBtn.addEventListener('click', () => gameOver("Eliminado!"));
    }
}

function prepararMataMata(novaFase) {
    faseAtual = novaFase;
    escalacao = [];
    elencoAtual.forEach(j => j.cartoesAmarelos = 0);
    alert("Mata-Mata! Cartões zerados.");

    const minhaPosicao = tabelaGeral.findIndex(t => t.id === meuTime.id);
    let adversarioIndex = 7 - minhaPosicao; // 0x7, 1x6...
    if (adversarioIndex < 0) adversarioIndex = 0; // Fallback
    
    let advData = tabelaGeral[adversarioIndex];
    const advFull = timesData.find(t => t.id === advData.id);
    const local = minhaPosicao < adversarioIndex ? 'CASA' : 'FORA';

    jogoPlayoff = { adversario: advFull, local: local };

    document.getElementById('screen-selection').classList.add('hidden');
    document.getElementById('screen-manager').classList.remove('hidden');
    
    const btnAction = document.getElementById('btn-play');
    const novoBtn = btnAction.cloneNode(true);
    btnAction.parentNode.replaceChild(novoBtn, btnAction);
    
    novoBtn.innerText = "JOGAR PARTIDA";
    novoBtn.style.background = "#00ff88";
    novoBtn.addEventListener('click', () => {
         const forcaAdvMedia = calcularForcaMedia(jogoPlayoff.adversario.jogadores);
         const result = calcularResultado(forcaAdvMedia * 11 * 1.1, jogoPlayoff.local);
         iniciarNarrativa(result.golsMeu, result.golsAdv, jogoPlayoff.adversario.nome, jogoPlayoff.adversario.id);
    });

    atualizarInterface();
}

function avancarFaseMataMata(venceu) {
    if (!venceu) return;
    if (faseAtual === 'QUARTAS') prepararMataMata('SEMI');
    else if (faseAtual === 'SEMI') prepararMataMata('FINAL');
    else if (faseAtual === 'FINAL') gameOver("CAMPEÃO!");
    document.getElementById('screen-result').classList.add('hidden');
}

function gameOver(msg) { alert(msg); location.reload(); }
function gerarNoticia() { document.getElementById('news-text').innerText = "Rodada decisiva!"; }
function renderizarTabela() {
    const tbody = document.querySelector('#league-table tbody');
    tbody.innerHTML = '';
    tabelaGeral.forEach((time, index) => {
        const tr = document.createElement('tr');
        if (time.id === meuTime.id) tr.className = 'highlight-row';
        if (index < 8) tr.style.borderLeft = "3px solid gold"; 
        if (index >= 14) tr.classList.add('z2-zone');
        tr.innerHTML = `<td>${index+1}º</td><td>${time.nome}</td><td><strong>${time.pontos}</strong></td><td>${time.vitorias}</td><td>${time.saldo}</td>`;
        tbody.appendChild(tr);
    });
}