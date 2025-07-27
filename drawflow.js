let editor;
const convertKey = key => key.toLowerCase().replace(/\s+/g, '_');
const restoreKey = snakeKey => snakeKey.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

// === Általános Node HTML-generátor ===
function createNodeHTML(name, type, status = "on", params = {}) {
    if (type === "energynode") {
        const isOff = status === "off";
        const buttonText = isOff ? "Off" : "On";
        const buttonClass = isOff ? "btn-danger" : "btn-success";
        const paramInputs = Object.entries(params).map(([key, val]) => {
            const inputName = restoreKey(key);
            const idName = convertKey(name + "_" + key);
            return `
                <div class="my-2">
                    <label for="${idName}" class="form-label mb-1">${inputName}</label>
                    <input type="number" class="form-control form-control-sm param-input shadow-none w-100"
                        name="${idName}" id="${idName}" data-key="${key}" value="${val}" min="0" step="any">
                </div>
            `;
        }).join("");

        return `
            <div class="energynode" data-status="${status}">
              <div class="title-box fw-bold">
                ${name} <button type="button" class="btn ${buttonClass} btn-sm" onclick="toggleNode(this)">${buttonText}</button>
              </div>
              <div class="box">${paramInputs || "No parameters"}</div>
            </div>
        `;
    }

    if (type === "inputnode" || type === "outputnode") {
        const isInput = type === "inputnode";
        return `
            <div class="${type}">
                <div class="title-box text-bg-secondary lead">${name}</div>
                <div class="box">${isInput ? "Exogenous input" : "Electricity demand is exogenous input"}</div>
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
    btn.classList.add(isOn ? "btn-danger" : "btn-success");
    btn.classList.remove(isOn ? "btn-success" : "btn-danger");
    btn.innerText = isOn ? "Off" : "On";
    editor.updateNodeDataFromId(nodeId, { ...editor.getNodeFromId(nodeId).data, status: newStatus });
};

// === Mentés localStorage-be ===
function saveFlow() {
    const data = editor.export();

    // Energynode-ok paraméterei-nek mentése
    for (const id in data.drawflow.Home.data) {
        const node = data.drawflow.Home.data[id];
        if (node.name === "energynode") {
            const el = document.querySelector(`#node-${id} .energynode`);
            const inputs = el?.querySelectorAll(".param-input");
            const params = {};
            inputs?.forEach(input => {
                const key = input.dataset.key;
                const value = parseFloat(input.value);
                if (!isNaN(value)) params[key] = value;
            });
            node.data.params = params;
        }
    }

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
            button.classList.add(isOff ? "btn-danger" : "btn-success");
            button.classList.remove(isOff ? "btn-success" : "btn-danger");
            button.innerText = isOff ? "Off" : "On";

            // Energynode-ok paramétereinek betöltése
            const paramInputs = el.querySelectorAll(".param-input");
            paramInputs.forEach(input => {
                const key = input.dataset.key;
                if (nodeData.data.params && key in nodeData.data.params) {
                    input.value = nodeData.data.params[key];
                }
            });
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
            const finalParams = node.data.params || {};
            nodes.push({ ...base, status: node.data.status || "on", params: finalParams, x: node.pos_x, y: node.pos_y });
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

    const add = (name, type, x, y, status = "on", params = {}) => {
        const html = createNodeHTML(name, type, status, params);
        const [inputs, outputs] = { inputnode: [0, 1], outputnode: [1, 0] }[type] ?? [1, 1];
        const data = { name, ...(type === "energynode" && { status, params }) };
        nodeIds[name] = editor.addNode(type, inputs, outputs, x, y, type, data, html);
    };

    // Inputok
    add("Sunlight", "inputnode", 10, 20);
    add("Grid", "inputnode", 10, 170);
    add("Biogas", "inputnode", 10, 320);
    add("Sewage demand", "inputnode", 10, 470);

    // Energynode-ok
    add("Solar Plant", "energynode", 280, 20, "on", { "capacity": 1000, "photovoltaic_coefficient": 1 });
    add("Battery", "energynode", 580, 50, "on", { "max_capacity": 600, "input_flow_rate": 300, "output_flow_rate": 300, "initial_charge": 0 });
    add("Electrolyzer", "energynode", 580, 450, "on", { "capacity": 500, "H2_efficient": 0.0187, "grid_rule": 0 });
    add("H2 storage", "energynode", 870, 70, "on", { "max_capacity": 300, "input_flow_rate": 300, "output_flow_rate": 100, "initial_stock": 0 });
    add("Biogas storage", "energynode", 870, 470, "on", { "max_capacity": 2720, "input_flow_rate": 2720, "output_flow_rate": 2720, "initial_stock": 0 });
    add("H2 Fuel station", "energynode", 1160, 20, "on", { "max_storage_capacity": 45, "input_flow_rate": 5, "output_flow_rate": 45, "initial_stock": 0, "mobility_H2_use": 40 });
    add("H2+Biogas engine", "energynode", 1160, 490, "on", { "capacity": 250, "prod_coefficient_from_biogas": 1.71, "prod_coefficient_from_H2": 1.05, "maximum_H2_mixture_ratio": 0.2, "H2_kgToM3": 11.123 });
    add("Biogas engine", "energynode", 1450, 350, "on", { "capacity": 500, "prod_coefficient": 1.71, "min_operating_capacity": 0.8 });

    // Output
    add("Sewage farm", "outputnode", 1750, 140);

    // Kapcsolatok
    const connections = [
        { from: 1, to: 5 }, { from: 2, to: 7 }, { from: 3, to: 9 }, { from: 4, to: 13 },
        { from: 5, to: 13 }, { from: 5, to: 6 }, { from: 5, to: 7 }, { from: 6, to: 13 },
        { from: 7, to: 8 }, { from: 8, to: 10 }, { from: 8, to: 11 }, { from: 9, to: 11 },
        { from: 9, to: 12 }, { from: 11, to: 13 }, { from: 12, to: 13 }
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