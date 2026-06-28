/* ==========================================================================
   1. ESTRUTURA DE DADOS REORGANIZADA (ALINHAMENTO GEOMÉTRICO PERFEITO)
   ========================================================================== */
const canvas = document.getElementById("espacoJogo");
const ctx = canvas.getContext("2d");

const especies = {
    // Cadeia Trófica Principal (Esquerda)
    v1: { id: "v1", nome: "Capim", emoji: "🌿", populacao: 50, ativo: true, x: 200, y: 380, corBase: "#2ecc71" }, 
    v2: { id: "v2", nome: "Gafanhoto", emoji: "🦗", populacao: 50, ativo: true, x: 200, y: 240, corBase: "#3498db" }, 
    v3: { id: "v3", nome: "Sapo", emoji: "🐸", populacao: 50, ativo: true, x: 200, y: 100, corBase: "#9b59b6" }, 
    v4: { id: "v4", nome: "Cobra", emoji: "🐍", populacao: 50, ativo: true, x: 420, y: 100, corBase: "#e74c3c" }, 

    // Bloco de Mutualismo (Direita)
    v5: { id: "v5", nome: "Abelha", emoji: "🐝", populacao: 50, ativo: true, x: 600, y: 240, corBase: "#f1c40f" }, 
    v6: { id: "v6", nome: "Flor", emoji: "🌸", populacao: 50, ativo: true, x: 600, y: 380, corBase: "#e67e22" } 
};

const arestas = [
    { de: "v1", para: "v2", tipo: "predacao" },   
    { de: "v2", para: "v3", tipo: "predacao" },   
    { de: "v3", para: "v4", tipo: "predacao" },   
    { de: "v5", para: "v6", tipo: "mutualismo" }, 
    { de: "v6", para: "v5", tipo: "mutualismo" }
];

/* ==========================================================================
   2. MOTOR DO JOGO E MODELAGEM DE REGRAS ECOLÓGICAS REAIS
   ========================================================================== */
function atualizarCiclo() {
    let proximoEstado = JSON.parse(JSON.stringify(especies));

    // 1. REGRA DO CAPIM (v1) - Produtor Principal
    if (especies.v1.ativo && especies.v1.populacao > 0) {
        // Crescimento intrínseco (fotossíntese)
        let crescimento = 8;
        // Pressão de consumo baseada na população de Gafanhotos
        let consumo = especies.v2.populacao > 0 ? (especies.v2.populacao * 0.16) : 0;
        
        proximoEstado.v1.populacao = Math.max(0, Math.min(100, especies.v1.populacao + crescimento - consumo));
    }

    // 2. REGRA DO GAFANHOTO (v2) - Consumidor Primário
    if (especies.v2.ativo && especies.v2.populacao > 0) {
        let ganhoAlimento = especies.v1.populacao > 10 ? 4 : -15; // Passa fome se Capim estiver escasso
        let perdaPredacao = (especies.v3.ativo && especies.v3.populacao > 0) ? (especies.v3.populacao * 0.08) : -4; // Sem predador, ele cresce livremente
        
        proximoEstado.v2.populacao = Math.max(0, Math.min(100, especies.v2.populacao + ganhoAlimento - perdaPredacao));
    }

    // 3. REGRA DO SAPO (v3) - Consumidor Secundário
    if (especies.v3.ativo && especies.v3.populacao > 0) {
        let ganhoAlimento = especies.v2.populacao > 15 ? 4 : -12; // Passa fome se Gafanhoto sumir
        let perdaPredacao = (especies.v4.ativo && especies.v4.populacao > 0) ? 4 : -4; // Sobe se Cobra sumir
        
        proximoEstado.v3.populacao = Math.max(0, Math.min(100, especies.v3.populacao + ganhoAlimento - perdaPredacao));
    }

    // 4. REGRA DA COBRA (v4) - Predador de Topo
    if (especies.v4.ativo && especies.v4.populacao > 0) {
        let ganhoAlimento = especies.v3.populacao > 15 ? 2 : -15; // Decai drasticamente sem Sapos
        let decaimentoNatural = especies.v4.populacao > 50 ? 2 : 0; // Evita superpopulação artificial de topo
        
        proximoEstado.v4.populacao = Math.max(0, Math.min(100, especies.v4.populacao + ganhoAlimento - decaimentoNatural));
    }

    // 5. SISTEMA DE MUTUALISMO: Abelha (v5) e Flor (v6)
    if (especies.v5.ativo && especies.v6.ativo) {
        // Ambas vivas cooperam para subir até o patamar de estabilidade (50)
        if (especies.v5.populacao < 50) proximoEstado.v5.populacao += 2;
        if (especies.v6.populacao < 50) proximoEstado.v6.populacao += 2;
        if (especies.v5.populacao > 50) proximoEstado.v5.populacao -= 2;
        if (especies.v6.populacao > 50) proximoEstado.v6.populacao -= 2;
    } else {
        // Se uma morrer, o elo simbiótico quebra e a outra decai por falta de suporte
        if (especies.v5.ativo) proximoEstado.v5.populacao = Math.max(0, especies.v5.populacao - 10);
        if (especies.v6.ativo) proximoEstado.v6.populacao = Math.max(0, especies.v6.populacao - 10);
    }

    // CONSOLIDAÇÃO DE ESTADOS E EXTINÇÃO BIOLÓGICA
    for (let id in especies) {
        // Se o usuário clicou para inativar, força o valor para zero
        if (!especies[id].ativo) {
            proximoEstado[id].populacao = 0;
        }

        // Transfere o valor matemático calculado para a árvore do grafo real
        especies[id].populacao = Math.round(proximoEstado[id].populacao);

        // Se a população zerou biologicamente, o card assume o estado visual de morte (💀)
        if (especies[id].populacao === 0) {
            especies[id].ativo = false;
        }
    }

    renderizarGrafo();
}

/* ==========================================================================
   3. RENDERIZAÇÃO GRÁFICA SEM ACÚMULO DE TRANSLATION (ISOLADO)
   ========================================================================== */
function desenharSetaEstilizada(origem, destino, tipo) {
    const x1 = origem.x;
    const y1 = origem.y;
    const x2 = destino.x;
    const y2 = destino.y;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    const headlen = 12; 

    const larguraCardDestino = 90 + (destino.populacao * 0.3);
    const recuo = (larguraCardDestino / 2) + 5; 

    const targetX = x2 - Math.cos(angle) * recuo;
    const targetY = y2 - Math.sin(angle) * recuo;

    ctx.save(); 
    
    if (tipo === "predacao") {
        ctx.strokeStyle = "rgba(231, 76, 60, 0.8)";
        ctx.setLineDash([6, 4]); 
    } else {
        ctx.strokeStyle = "rgba(46, 204, 113, 0.8)";
        ctx.setLineDash([]); 
    }
    
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();

    if (tipo === "predacao") {
        ctx.translate(targetX, targetY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-headlen, -headlen / 1.5);
        ctx.lineTo(-headlen, headlen / 1.5);
        ctx.fillStyle = "#e74c3c";
        ctx.fill();
    }
    
    ctx.restore(); 
}

function renderizarGrafo() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    arestas.forEach(aresta => {
        desenharSetaEstilizada(especies[aresta.de], especies[aresta.para], aresta.tipo);
    });

    for (let id in especies) {
        const esp = especies[id];
        const larguraCard = 90 + (esp.populacao * 0.3);
        const alturaCard = 90 + (esp.populacao * 0.3);
        const raioCurvatura = 12;

        ctx.save();
        ctx.translate(esp.x - larguraCard / 2, esp.y - alturaCard / 2);

        ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.roundRect(0, 0, larguraCard, alturaCard, raioCurvatura);
        ctx.fillStyle = esp.ativo ? "#ffffff" : "#e6e6e6";
        ctx.fill();
        
        ctx.shadowColor = "transparent";
        ctx.lineWidth = esp.ativo ? 3 : 2;
        ctx.strokeStyle = esp.ativo ? esp.corBase : "#7f8c8d";
        ctx.stroke();

        ctx.font = `${28 + (esp.populacao * 0.1)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(esp.ativo ? esp.emoji : "💀", larguraCard / 2, alturaCard / 2 - 10);

        ctx.fillStyle = "#2c3e50";
        ctx.font = "bold 12px 'Segoe UI'";
        ctx.fillText(esp.nome, larguraCard / 2, alturaCard - 32);

        const larguraBarra = larguraCard - 20;
        const alturaBarra = 8;
        const xBarra = 10;
        const yBarra = alturaCard - 20;

        ctx.beginPath();
        ctx.roundRect(xBarra, yBarra, larguraBarra, alturaBarra, 4);
        ctx.fillStyle = "#eaeded";
        ctx.fill();

        if (esp.populacao > 0) {
            ctx.beginPath();
            ctx.roundRect(xBarra, yBarra, larguraBarra * (esp.populacao / 100), alturaBarra, 4);
            if (esp.populacao < 25) ctx.fillStyle = "#e74c3c";
            else if (esp.populacao > 80) ctx.fillStyle = "#e67e22";
            else ctx.fillStyle = "#2ecc71";
            ctx.fill();
        }

        ctx.fillStyle = "#7f8c8d";
        ctx.font = "9px monospace";
        ctx.fillText(`${esp.populacao}/100`, larguraCard / 2, alturaBarra + yBarra + 2);

        ctx.restore();
    }
}

/* ==========================================================================
   4. INTERAÇÃO POR CLIQUE RETANGULAR
   ========================================================================== */
canvas.addEventListener("click", function(event) {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    for (let id in especies) {
        const esp = especies[id];
        const larguraCard = 90 + (esp.populacao * 0.3);
        const alturaCard = 90 + (esp.populacao * 0.3);

        if (clickX >= esp.x - larguraCard/2 && clickX <= esp.x + larguraCard/2 &&
            clickY >= esp.y - alturaCard/2 && clickY <= esp.y + alturaCard/2) {
            
            esp.ativo = !esp.ativo;
            if (!esp.ativo) esp.populacao = 0;
            renderizarGrafo();
            break;
        }
    }
});

renderizarGrafo();
setInterval(atualizarCiclo, 2000);