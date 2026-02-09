/**
 * Tuff Client Professional Converter (API-Driven)
 * Fixes: Black Mobs, Leaf/Grass/Sign inconsistencies, and Double Chests.
 * Logic: Fetches official 1.13 renames and applies texture-specific flattening.
 */

const state = {
    file: null,
    mappingData: null,
    options: {
        removeNonTextures: true,
        convertNewMobs: false,
        updateMcmeta: true,
        packName: ''
    }
};

// Official Mapping API source
const API_URL = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/block_renames.json";

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    loadOptions();
    
    // ENSURE API IS LOADED
    try {
        const resp = await fetch(API_URL);
        const data = await resp.json();
        // Convert the "minecraft:name" format from API to "name" for our logic
        state.mappingData = {};
        for (let key in data) {
            const newKey = key.replace('minecraft:', '');
            const newVal = data[key].replace('minecraft:', '');
            state.mappingData[newKey] = newVal;
        }
        console.log("✅ API Mapping Loaded:", Object.keys(state.mappingData).length, "rules.");
    } catch (e) {
        console.error("❌ API Fetch failed. Check your internet connection.");
    }
});

function initializeUI() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFile(e.target.files[0]);
    
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); };
    dropZone.ondragleave = () => dropZone.classList.remove('drag-over');
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    };

    document.getElementById('convertBtn').onclick = convertPack;
}

function handleFile(file) {
    if (!file || !file.name.endsWith('.zip')) return;
    state.file = file;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('convertBtn').disabled = false;
}

async function convertPack() {
    if (!state.mappingData) {
        alert("API data hasn't loaded yet. Please wait a moment or refresh.");
        return;
    }

    const btn = document.getElementById('convertBtn');
    btn.disabled = true;
    document.getElementById('progressSection').style.display = 'block';

    try {
        updateProgress(5, 'Parsing original pack...');
        const zip = await JSZip.loadAsync(state.file);
        const outputZip = new JSZip();
        
        const files = Object.keys(zip.files);
        const chestParts = { normal: {}, trapped: {} };

        for (let i = 0; i < files.length; i++) {
            const path = files[i];
            const file = zip.files[path];
            if (file.dir) continue;

            const content = await file.async('blob');
            const pathLower = path.toLowerCase();

            // 1. Collect Chests for Stitching
            if (pathLower.includes('entity/chest/')) {
                const type = pathLower.includes('trapped') ? 'trapped' : 'normal';
                if (pathLower.endsWith('left.png')) chestParts[type].left = content;
                if (pathLower.endsWith('right.png')) chestParts[type].right = content;
            }

            // 2. Handle Textures via API + Flattening
            if (pathLower.includes('assets/minecraft/textures/')) {
                await processWithAPI(outputZip, path, content);
            } 
            // 3. Meta Files
            else if (pathLower.endsWith('pack.mcmeta')) {
                const text = await file.async('string');
                outputZip.file(path, modifyMcmeta(text));
            }
            // 4. Default
            else if (!isUnwanted(pathLower)) {
                outputZip.file(path, content);
            }

            if (i % 50 === 0) updateProgress(5 + (i/files.length*85), 'Syncing with API...');
        }

        // 5. Final Stitching for Double Chests
        updateProgress(92, 'Fixing Double Chest textures...');
        await performChestStitch(outputZip, chestParts);

        updateProgress(98, 'Packaging universal zip...');
        const blob = await outputZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        saveAs(blob, (state.options.packName || "Universal_Tuff_Pack") + ".zip");
        updateProgress(100, 'CONVERSION COMPLETE');
        btn.disabled = false;
    } catch (e) {
        console.error(e);
        updateProgress(0, 'Critical Error: ' + e.message);
        btn.disabled = false;
    }
}

async function processWithAPI(zip, path, blob) {
    const pathLower = path.toLowerCase();
    
    // KEEP ORIGINAL (For 1.13+ Template structure)
    zip.file(path, blob);

    const match = pathLower.match(/textures\/(.*)\.png$/);
    if (!match) return;
    
    const internal = match[1]; // e.g. "block/grass_block_side"
    const isBlock = internal.startsWith('block/');
    const isItem = internal.startsWith('item/');
    const isEntity = internal.startsWith('entity/');
    
    // Clean key (e.g. "grass_block_side")
    const cleanKey = internal.split('/').pop();
    const folderKey = internal.split('/')[0]; // "block" or "item"
    
    let legacyPath = null;

    // STEP 1: API MAPPING (Check for technical renames)
    // Most API renames are for the base block (e.g. grass_block -> grass)
    // We check if the filename starts with an API-mapped name
    for (let oldName in state.mappingData) {
        if (cleanKey.startsWith(oldName)) {
            const newBase = state.mappingData[oldName];
            const suffix = cleanKey.slice(oldName.length); // e.g. "_side"
            const legacyFolder = isBlock ? 'blocks' : (isItem ? 'items' : folderKey);
            legacyPath = `assets/minecraft/textures/${legacyFolder}/${newBase}${suffix}.png`;
            break;
        }
    }

    // STEP 2: ENTITY FLATTENING (Fixes "Black Mobs")
    // If the path is entity/zombie/zombie.png, 1.12 MUST have entity/zombie.png
    if (isEntity && !legacyPath) {
        const parts = internal.split('/');
        if (parts.length > 2) {
            legacyPath = `assets/minecraft/textures/entity/${parts[parts.length - 1]}.png`;
        }
    }

    // STEP 3: TEXTURE REVERSAL (Leaves and special blocks)
    // API doesn't always handle "oak_leaves" -> "leaves_oak" reversal.
    if (!legacyPath) {
        if (cleanKey.includes('_leaves')) {
            legacyPath = path.replace(/block\/(.*)_leaves\.png$/, 'blocks/leaves_$1.png');
        } else if (cleanKey.startsWith('wooden_')) {
            legacyPath = path.replace('wooden_', 'wood_').replace('/item/', '/items/');
        } else if (cleanKey.startsWith('golden_')) {
            legacyPath = path.replace('golden_', 'gold_').replace('/item/', '/items/');
        }
    }

    // STEP 4: PLURALIZATION FALLBACK
    if (!legacyPath) {
        legacyPath = path.replace('/textures/block/', '/textures/blocks/')
                         .replace('/textures/item/', '/textures/items/');
    }

    // Write the legacy file
    if (legacyPath && legacyPath !== path) {
        zip.file(legacyPath, blob);
    }
}

async function performChestStitch(zip, parts) {
    for (let type of ['normal', 'trapped']) {
        if (parts[type].left && parts[type].right) {
            const blob = await stitch(parts[type].left, parts[type].right);
            const name = type === 'normal' ? 'normal_double.png' : 'trapped_double.png';
            zip.file(`assets/minecraft/textures/entity/chest/${name}`, blob);
        }
    }
}

async function stitch(left, right) {
    return new Promise(res => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const l = new Image(), r = new Image();
        l.onload = () => {
            r.onload = () => {
                canvas.width = l.width * 2; canvas.height = l.height;
                ctx.drawImage(r, 0, 0); ctx.drawImage(l, l.width, 0);
                canvas.toBlob(res);
            };
            r.src = URL.createObjectURL(right);
        };
        l.src = URL.createObjectURL(left);
    });
}

function isUnwanted(path) {
    if (!state.options.removeNonTextures) return false;
    const list = ['models/', 'sounds/', 'lang/', 'advancements/', 'recipes/', 'shaders/', 'texts/'];
    return list.some(f => path.includes(f));
}

function modifyMcmeta(str) {
    try {
        let d = JSON.parse(str);
        d.pack.pack_format = 3;
        if (state.options.packName) d.pack.description = state.options.packName;
        return JSON.stringify(d, null, 4);
    } catch { return str; }
}

function updateProgress(p, m) {
    document.getElementById('progressFill').style.width = p + '%';
    document.getElementById('progressLabel').textContent = m;
}

function loadOptions() {
    const s = localStorage.getItem('tuff_options');
    if (s) state.options = JSON.parse(s);
}

function saveOptions() {
    localStorage.setItem('tuff_options', JSON.stringify(state.options));
}
