let editor;

// === Node HTML generátor energynode-okhoz ===
function createEnergyNodeHTML(name, status = "on") {
    const isOff = status === "off";
    const buttonText = isOff ? "Off" : "On";
    const buttonClass = isOff ? "btn-danger" : "btn-success";
    return `
        <div class="energynode" data-status="${status}">
          <div class="title-box fw-bold">
            ${name}
            <button class="btn ${buttonClass} btn-sm toggle-btn" onclick="toggleNode(this)">${buttonText}</button>
          </div>
          <div class="box">sample text</div>
        </div>
    `;
}

// === Node státuszváltás (Ki/Bekapcsolás) ===
window.toggleNode = function (btn) {
    const node = btn.closest('.energynode');
    const isOn = node.dataset.status === "on";
    const parentNode = btn.closest('.drawflow-node');
    const nodeId = parseInt(parentNode.getAttribute("id").replace("node-", ""));
    const newStatus = isOn ? "off" : "on";
    node.dataset.status = newStatus;
    btn.classList.toggle("btn-success");
    btn.classList.toggle("btn-danger");
    btn.innerText = isOn ? "Off" : "On";
    editor.updateNodeDataFromId(nodeId, { ...editor.getNodeFromId(nodeId).data, status: newStatus });
};

// === Mentés localStorage-be ===
function saveFlow() {
    const data = editor.export();
    localStorage.setItem("energyFlow", JSON.stringify(data));
    alert("Mentve!");
    console.log("Mentett adat:", data);
}

// === Betöltés localStorage-ből ===
function loadFlow() {
    const raw = localStorage.getItem("energyFlow");
    if (!raw) return false;

    try {
        const parsed = JSON.parse(raw);
        editor.clear();
        editor.import(parsed);

        for (const nodeId in parsed.drawflow.Home.data) {
            const nodeData = parsed.drawflow.Home.data[nodeId];
            const el = document.querySelector(`#node-${nodeId} .energynode`);
            const button = el?.querySelector('button');
            if (!el || !button) continue;
            const isOff = nodeData.data.status === "off";
            el.classList.toggle("off", isOff);
            el.dataset.status = isOff ? "off" : "on";
            button.innerText = isOff ? "Off" : "On";
        }

        console.log("Flow betöltve a localStorage-ből");
        return true;
    } catch (e) {
        console.error("Hiba a flow betöltésekor:", e);
        return false;
    }
}

// === JSON megjelenítése textarea-ban ===
function sendFlow() {
    const exported = editor.export();
    const nodeData = exported.drawflow.Home.data;
    const [inputs, output, nodes, connections] = [[], [], [], []];

    for (const id in nodeData) {
        const node = nodeData[id];
        const base = { id: +id, name: node.data.name };

        if (node.name === "energynode") {
            nodes.push({ ...base, status: node.data.status || "on", x: node.pos_x, y: node.pos_y });
        } else if (["inputnode", "outputnode"].includes(node.name)) {
            (node.name === "inputnode" ? inputs : output).push({ ...base, x: node.pos_x, y: node.pos_y });
        }

        if (node.outputs) {
            const fromId = +id;
            connections.push(...Object.values(node.outputs).flatMap(o => o.connections.map(c => ({ from: fromId, to: c.node }))));
        }
    }

    const finalJSON = { inputs, output, nodes, connections };
    document.getElementById("jsonOutput").textContent = JSON.stringify(finalJSON, null, 2);
}

// === Prompt alapján új energynode ===
function addEnergyNodePrompt() {
    const name = prompt("Cella neve:");
    if (name) {
        const posX = Math.floor(Math.random() * 600 + 50);
        const posY = Math.floor(Math.random() * 300 + 50);
        const nodeHTML = createEnergyNodeHTML(name);
        editor.addNode("energynode", 1, 1, posX, posY, "energynode", { name, status: "on" }, nodeHTML);
    }
}

// === Új: Alapértelmezett node-ok + kapcsolatok létrehozása ===
function addDefaultNodesWithConnections() {
    const nodeIds = {};

    const createInput = (name, x, y) => {
        const html = `
            <div class="inputnode">
                <div class="title-box lead">${name}</div>
                <div class="box">Exogenous input</div>
            </div>
        `;
        nodeIds[name] = editor.addNode("inputnode", 0, 1, x, y, "inputnode", { name }, html);
    };

    const createOutput = (name, x, y) => {
        const html = `
            <div class="outputnode">
                <div class="title-box lead">${name}</div>
                <div class="box">Electricity demand is exogenous input</div>
            </div>
        `;
        nodeIds[name] = editor.addNode("outputnode", 1, 0, x, y, "outputnode", { name }, html);
    };

    const createEnergy = (name, x, y, status = "on") => {
        const html = createEnergyNodeHTML(name, status);
        nodeIds[name] = editor.addNode("energynode", 1, 1, x, y, "energynode", { name, status }, html);
    };

    // Input-ok
    createInput("Sunlight", 10, 20);
    createInput("Grid", 10, 170);
    createInput("Biogas", 10, 320);
    createInput("Sewage demand", 10, 470);

    // Energianode-ok
    createEnergy("Solar Plant", 300, 20);
    createEnergy("Battery", 600, 50);
    createEnergy("Electrolyzer", 600, 200);
    createEnergy("H2 storage", 850, 170);
    createEnergy("H2 Fuel station", 1130, 100);
    createEnergy("H2+Biogas engine", 1130, 260);
    createEnergy("Biogas storage", 850, 350);
    createEnergy("Biogas engine", 1130, 420);

    // Output
    createOutput("Sewage farm", 1400, 170);

    // Kapcsolatok
    const connections = [
        { from: 1, to: 5 }, { from: 2, to: 7 }, { from: 3, to: 11 }, { from: 4, to: 13 },
        { from: 5, to: 13 }, { from: 5, to: 6 }, { from: 5, to: 7 }, { from: 6, to: 13 },
        { from: 7, to: 8 }, { from: 8, to: 9 }, { from: 8, to: 10 }, { from: 10, to: 13 },
        { from: 11, to: 12 }, { from: 11, to: 10 }, { from: 12, to: 13 }
    ];
    connections.forEach(({ from, to }) => editor.addConnection(from, to, 'output_1', 'input_1'));

    console.log("Alapértelmezett node-ok és kapcsolatok létrehozva");
}

// === Indításkor: DOMContentLoaded ===
window.addEventListener("DOMContentLoaded", () => {
    editor = new Drawflow(document.getElementById("drawflow"));
    editor.reroute = true;
    editor.zoom = 0.85;
    editor.start();
    editor.zoom_refresh();

    const loadedLocal = loadFlow();
    !loadedLocal && addDefaultNodesWithConnections();

    editor.on('connectionCreated', conn => console.log("Kapcsolat létrejött:", conn));
    editor.on('connectionRemoved', conn => console.log("Kapcsolat törölve:", conn));
    editor.on('nodeCreated', id => console.log("Node létrejött:", id));
    editor.on('nodeRemoved', id => console.log("Node törölve:", id));
});