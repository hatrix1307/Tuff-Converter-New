/**
 * Tuff Client Universal Converter - PRO API EDITION
 * Fixes: Black Mobs, Leaf/Grass/Farmland defaults, Double Chests.
 * Features: Automatic API Reversal & Dual-Path preservation.
 */

const state = {
    file: null,
    mappingData: null, // This will hold the REVERSED mapping (New -> Old)
    options: {
        removeNonTextures: true,
        convertNewMobs: false,
        updateMcmeta: true,
        packName: ''
    }
};

// Official source for "The Flattening" data
const API_URL = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/block_renames.json";

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    loadOptions();
    await loadAndReverseAPI();
});

async function loadAndReverseAPI() {
    const status = document.getElementById('progressLabel');
    if(status) status.textContent = "Fetching Mapping API...";

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // REVERSE THE MAPPING: The API is Old -> New, we need New -> Old
        state.mappingData = {};
        for (const [oldName, newName] of Object.entries(data)) {
            const cleanOld = oldName.replace('minecraft:', '');
            const cleanNew = newName.replace('minecraft:', '');
            // We map the New Name to the Old Name
            state.mappingData[cleanNew] = cleanOld;
        }
        console.log("✅ API Mapping Inverted & Loaded:", Object.keys(state.mappingData).length, "rules.");
    } catch (e) {
        console.error("❌ API Load Failed:", e);
        alert("Failed to load Mapping API. Please check your internet connection.");
    }
}

// --- CONVERSION ENGINE ---
async function convertPack() {
    if (!state.mappingData) return alert("Mapping API is still loading...");

    const btn = document.getElementById('convertBtn');
    btn.disabled = true;
    document.getElementById('progressSection').style.display = 'block';

    try {
        updateProgress(10, 'Reading ZIP Content...');
        const zip = await JSZip.loadAsync(state.file);
        const outputZip = new JSZip();
        const files = Object.keys(zip.files);
        
        // Storage for Double Chest Stitching
        const chestParts = { normal: {}, trapped: {}, ender: {} };

        for (let i = 0; i < files.length; i++) {
            const path = files[i];
            const file = zip.files[path];
            if (file.dir) continue;

            const content = await file.async('blob');
            const pathLower = path.toLowerCase();

            // 1. Logic: Collect Chests for stitching
            if (pathLower.includes('entity/chest/')) {
                const type = pathLower.includes('trapped') ? 'trapped' : (pathLower.includes('ender') ? 'ender' : 'normal');
                if (pathLower.endsWith('left.png')) chestParts[type].left = content;
                if (pathLower.endsWith('right.png')) chestParts[type].right = content;
            }

            // 2. Logic: Process Textures
            if (pathLower.includes('assets/minecraft/textures/')) {
                await processAsset(outputZip, path, content);
            } 
            // 3. Logic: Meta & Cleanup
            else if (pathLower.endsWith('pack.mcmeta')) {
                const text = await file.async('string');
                outputZip.file(path, modifyMcmeta(text));
            } else if (!isTrash(pathLower)) {
                outputZip.file(path, content);
            }

            if (i % 50 === 0) updateProgress(10 + (i/files.length * 80), 'Converting with API...');
        }

        // 4. Logic: Final Stitching
        updateProgress(90, 'Stitching Double Chests...');
        await stitchChests(outputZip, chestParts);

        updateProgress(95, 'Finalizing Universal Pack...');
        const blob = await outputZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        saveAs(blob, (state.options.packName || "Converted_Tuff_Pack") + ".zip");
        updateProgress(100, 'Conversion Complete!');
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        updateProgress(0, 'Error: ' + err.message);
        btn.disabled = false;
    }
}

async function processAsset(zip, path, blob) {
    const pathLower = path.toLowerCase();
    
    // REQUIREMENT: Always keep the 1.13+ Modern path for "Universal" support
    zip.file(path, blob);

    const parts = pathLower.split('/');
    const fileName = parts.pop().replace('.png', '');
    const category = parts.includes('block') ? 'blocks' : (parts.includes('item') ? 'items' : parts[parts.length-1]);
    
    let legacyPath = null;

    // RULE 1: API MAPPING (New Name -> Old Name)
    // We check if the 1.21 filename exists as a value in the Flattening map
    let mappedName = state.mappingData[fileName];
    
    // RULE 2: SUFFIX MAPPING (For things like grass_block_side)
    if (!mappedName) {
        for (let newName in state.mappingData) {
            if (fileName.startsWith(newName + "_")) {
                mappedName = state.mappingData[newName] + fileName.slice(newName.length);
                break;
            }
        }
    }

    if (mappedName) {
        legacyPath = `assets/minecraft/textures/${category}/${mappedName}.png`;
    }

    // RULE 3: ENTITY FLATTENING (Fixes Black Mobs)
    if (pathLower.includes('entity/') && !legacyPath) {
        const entityParts = pathLower.split('textures/entity/')[1].split('/');
        if (entityParts.length > 1) {
            // Pulls "zombie/zombie.png" out to "entity/zombie.png"
            legacyPath = `assets/minecraft/textures/entity/${entityParts[entityParts.length-1]}`;
        }
    }

    // RULE 4: MANUAL OVERRIDES (Leaves, Dyes, Wood)
    if (!legacyPath) {
        if (fileName.includes('_leaves')) {
            legacyPath = path.replace(/block\/(.*)_leaves\.png$/, 'blocks/leaves_$1.png');
        } else if (fileName.startsWith('wooden_')) {
            legacyPath = path.replace('wooden_', 'wood_').replace('/item/', '/items/');
        } else if (fileName.includes('_dye')) {
            legacyPath = path.replace(/([a-z_]+)_dye\.png$/, 'dye_powder_$1.png').replace('/item/', '/items/');
        }
    }

    // RULE 5: PLURALIZATION FALLBACK (block -> blocks)
    if (!legacyPath) {
        legacyPath = path.replace('/textures/block/', '/textures/blocks/')
                         .replace('/textures/item/', '/textures/items/');
    }

    // Write the 1.12 Legacy file
    if (legacyPath && legacyPath !== path) {
        zip.file(legacyPath, blob);
    }
}

// --- IMAGE STITCHING (Double Chests) ---
async function stitchChests(zip, parts) {
    for (const type of ['normal', 'trapped']) {
        if (parts[type].left && parts[type].right) {
            const stitchedBlob = await mergeImages(parts[type].left, parts[type].right);
            const name = type === 'normal' ? 'normal_double.png' : 'trapped_double.png';
            zip.file(`assets/minecraft/textures/entity/chest/${name}`, stitchedBlob);
        }
    }
}

async function mergeImages(left, right) {
    return new Promise(res => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imgL = new Image(), imgR = new Image();
        imgL.onload = () => {
            imgR.onload = () => {
                canvas.width = imgL.width * 2; canvas.height = imgL.height;
                ctx.drawImage(imgR, 0, 0); // Right side goes first in 1.12 map
                ctx.drawImage(imgL, imgL.width, 0);
                canvas.toBlob(res);
            };
            imgR.src = URL.createObjectURL(right);
        };
        imgL.src = URL.createObjectURL(left);
    });
}

// --- HELPERS ---
function isTrash(path) {
    if (!state.options.removeNonTextures) return false;
    const junk = ['models/', 'sounds/', 'lang/', 'advancements/', 'recipes/', 'shaders/', 'texts/', 'font/'];
    return junk.some(f => path.includes(f));
}

function modifyMcmeta(str) {
    try {
        const d = JSON.parse(str);
        d.pack.pack_format = 3;
        if (state.options.packName) d.pack.description = state.options.packName;
        return JSON.stringify(d, null, 4);
    } catch { return str; }
}

function updateProgress(p, m) {
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressLabel');
    if(fill) fill.style.width = p + '%';
    if(label) label.textContent = m;
}

function initializeUI() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFile(e.target.files[0]);
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    };
}

function handleFile(file) {
    if (!file || !file.name.endsWith('.zip')) return;
    state.file = file;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('convertBtn').disabled = false;
}

function loadOptions() {
    const saved = localStorage.getItem('tuff_cfg');
    if (saved) state.options = JSON.parse(saved);
}
