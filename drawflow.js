let editor;

// === Általános Node HTML-generátor ===
function createNodeHTML(name, type, status = "on") {
    if (type === "energynode") {
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

    if (type === "inputnode" || type === "outputnode") {
        const isInput = type === "inputnode";
        return `
            <div class="${type}">
                <div class="title-box text-bg-secondary lead">${name}</div>
                <div class="box">
                    ${isInput ? "Exogenous input" : "Electricity demand is exogenous input"}
                </div>
            </div>
        `;
    }

    return `<div class="box">${name}</div>`; // Fallback
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
        const html = createNodeHTML(name, "energynode", "on");
        editor.addNode("energynode", 1, 1, posX, posY, "energynode", { name, status: "on" }, html);
    }
}

// === Új: Alapértelmezett node-ok + kapcsolatok létrehozása ===
function addDefaultNodesWithConnections() {
    const nodeIds = {};

    const add = (name, type, x, y, status = "on") => {
        const html = createNodeHTML(name, type, status);
        const inputs = type === "inputnode" ? 0 : 1;
        const outputs = type === "outputnode" ? 0 : 1;
        const data = { name, ...(type === "energynode" && { status }) };
        nodeIds[name] = editor.addNode(type, inputs, outputs, x, y, type, data, html);
    };

    // Inputok
    add("Sunlight", "inputnode", 10, 20);
    add("Grid", "inputnode", 10, 170);
    add("Biogas", "inputnode", 10, 320);
    add("Sewage demand", "inputnode", 10, 470);

    // Energynode-ok
    add("Solar Plant", "energynode", 300, 20);
    add("Battery", "energynode", 600, 50);
    add("Electrolyzer", "energynode", 600, 200);
    add("H2 storage", "energynode", 850, 170);
    add("H2 Fuel station", "energynode", 1130, 100);
    add("H2+Biogas engine", "energynode", 1130, 260);
    add("Biogas storage", "energynode", 850, 350);
    add("Biogas engine", "energynode", 1130, 420);

    // Output
    add("Sewage farm", "outputnode", 1430, 20);

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