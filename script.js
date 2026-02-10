/**
 * Tuff Client Universal Converter - Pro API Edition
 * Fixes: SyntaxError in Meta, Black Mobs, Leaf/Grass defaults, and Double Chests.
 */

const state = {
    file: null,
    mappingData: {},
    options: {
        removeNonTextures: true,
        convertNewMobs: false,
        updateMcmeta: true,
        packName: ''
    }
};

// Official Mapping API sources (1.13+ Flattening)
const API_SOURCES = [
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/block_renames.json",
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/item_renames.json"
];

const FOLDERS_TO_REMOVE = ['models', 'sounds', 'lang', 'advancements', 'loot_tables', 'recipes', 'structures', 'shaders', 'font', 'texts', 'eagler'];

// Initialize and Fetch API
document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    loadOptions();
    await fetchAndInvertMappings();
});

async function fetchAndInvertMappings() {
    try {
        for (const url of API_SOURCES) {
            const resp = await fetch(url);
            const data = await resp.json();
            for (const [oldName, newName] of Object.entries(data)) {
                // Invert the map: New Name (1.21) -> Old Name (1.12)
                state.mappingData[newName.replace('minecraft:', '')] = oldName.replace('minecraft:', '');
            }
        }
        console.log("✅ API Mapping Engine Ready");
    } catch (e) {
        console.error("❌ API Fetch failed. Ensure you have internet access.");
    }
}

async function convertPack() {
    if (!state.file) return;
    const btn = document.getElementById('convertBtn');
    btn.disabled = true;
    document.getElementById('progressSection').style.display = 'block';

    try {
        updateProgress(5, 'Analyzing ZIP...');
        const zip = await JSZip.loadAsync(state.file);
        const outputZip = new JSZip();
        const files = Object.keys(zip.files);
        const chestParts = { normal: {}, trapped: {} };

        for (let i = 0; i < files.length; i++) {
            const path = files[i];
            const file = zip.files[path];
            if (file.dir || shouldSkip(path)) continue;

            const content = await file.async('blob');
            const pathLower = path.toLowerCase();

            // 1. Capture Chests for Stitching (Fixes Double Chest texture)
            if (pathLower.includes('entity/chest/')) {
                const type = pathLower.includes('trapped') ? 'trapped' : 'normal';
                if (pathLower.endsWith('left.png')) chestParts[type].left = content;
                if (pathLower.endsWith('right.png')) chestParts[type].right = content;
            }

            // 2. Process Textures (API Rename + Entity Flattening)
            if (pathLower.includes('assets/minecraft/textures/')) {
                await processTexture(outputZip, path, content);
            } 
            // 3. Fix pack.mcmeta Syntax & Format
            else if (pathLower.endsWith('pack.mcmeta')) {
                const text = await file.async('string');
                outputZip.file(path, modifyPackMcmeta(text));
            } else {
                outputZip.file(path, content);
            }

            if (i % 50 === 0) updateProgress(5 + (i / files.length * 85), 'Converting Assets...');
        }

        // 4. Final Logic: Stitch modern chest halves into 1.12 single file
        updateProgress(92, 'Stitching Double Chests...');
        await stitchDoubleChests(outputZip, chestParts);

        updateProgress(95, 'Finalizing Pack...');
        const blob = await outputZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        saveAs(blob, (state.options.packName || "Universal_Pack") + ".zip");
        updateProgress(100, 'Conversion Successful!');
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        updateProgress(0, 'Error: ' + err.message);
        btn.disabled = false;
    }
}

async function processTexture(zip, path, blob) {
    const pathLower = path.toLowerCase();
    
    // REQUIREMENT: Keep the original 1.21 path for Universal compatibility
    zip.file(path, blob);

    const match = pathLower.match(/textures\/(.*)\.png$/);
    if (!match) return;
    const internal = match[1]; 
    const folder = internal.split('/')[0]; 
    const fileName = internal.split('/').pop();

    let legacyPath = null;

    // A. API MAPPING (Fixes Grass, Leaves, Farmland, etc.)
    let legacyName = state.mappingData[fileName];
    if (!legacyName) {
        // Handle suffix-based renames (e.g., grass_block_side -> grass_side)
        for (const [nKey, oVal] of Object.entries(state.mappingData)) {
            if (fileName.startsWith(nKey + "_")) {
                legacyName = oVal + fileName.slice(nKey.length);
                break;
            }
        }
    }

    if (legacyName) {
        const pluralFolder = folder === 'block' ? 'blocks' : (folder === 'item' ? 'items' : folder);
        legacyPath = `assets/minecraft/textures/${pluralFolder}/${legacyName}.png`;
    }

    // B. ENTITY FLATTENING (Fixes Black Mobs)
    else if (folder === 'entity') {
        const parts = internal.split('/');
        if (parts.length > 2) {
            // Pulls texture out of subfolder: entity/creeper/creeper.png -> entity/creeper.png
            legacyPath = `assets/minecraft/textures/entity/${parts[parts.length - 1]}.png`;
        }
    }

    // C. SUFFIX REVERSAL (Leaves & Tools)
    if (!legacyPath) {
        if (fileName.includes('_leaves')) {
            legacyPath = path.replace(/block\/(.*)_leaves\.png$/, 'blocks/leaves_$1.png');
        } else if (fileName.startsWith('wooden_')) {
            legacyPath = path.replace('wooden_', 'wood_').replace('/item/', '/items/');
        }
    }

    // D. PLURALIZATION FALLBACK (block/ -> blocks/)
    if (!legacyPath) {
        legacyPath = path.replace('/textures/block/', '/textures/blocks/')
                         .replace('/textures/item/', '/textures/items/');
    }

    if (legacyPath && legacyPath !== path) zip.file(legacyPath, blob);
}

// --- IMAGE STITCHING ENGINE ---
async function stitchDoubleChests(zip, chestParts) {
    for (const type of ['normal', 'trapped']) {
        if (chestParts[type].left && chestParts[type].right) {
            const stitched = await mergeChestImages(chestParts[type].left, chestParts[type].right);
            const name = type === 'normal' ? 'normal_double.png' : 'trapped_double.png';
            zip.file(`assets/minecraft/textures/entity/chest/${name}`, stitched);
        }
    }
}

async function mergeChestImages(left, right) {
    return new Promise((res) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imgL = new Image(), imgR = new Image();
        imgL.onload = () => {
            imgR.onload = () => {
                canvas.width = imgL.width * 2; canvas.height = imgL.height;
                ctx.drawImage(imgR, 0, 0); // 1.12 map order
                ctx.drawImage(imgL, imgL.width, 0);
                canvas.toBlob(res);
            };
            imgR.src = URL.createObjectURL(right);
        };
        imgL.src = URL.createObjectURL(left);
    });
}

// --- UTILS & UI ---
function modifyPackMcmeta(content) {
    try {
        // FIX: Trim leading characters that cause SyntaxError
        const data = JSON.parse(content.trim().replace(/^\uFEFF/, ''));
        data.pack.pack_format = 3; 
        if (state.options.packName) data.pack.description = state.options.packName;
        return JSON.stringify(data, null, 4);
    } catch (error) {
        console.warn('Metadata cleanup performed due to syntax error.');
        return JSON.stringify({ "pack": { "description": "Converted Pack", "pack_format": 3 } }, null, 4);
    }
}

function shouldSkip(path) {
    const p = path.toLowerCase();
    return state.options.removeNonTextures && FOLDERS_TO_REMOVE.some(f => p.includes(`/${f}/`));
}

function updateProgress(p, m) {
    document.getElementById('progressFill').style.width = p + '%';
    document.getElementById('progressLabel').textContent = m;
}

function initializeUI() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => handleFile(e.target.files[0]);
    ['dragover', 'drop'].forEach(n => dropZone.addEventListener(n, (e) => {
        e.preventDefault();
        if (n === 'drop' && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    }));
}

function handleFile(file) {
    state.file = file;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('convertBtn').disabled = false;
}

function loadOptions() {
    const saved = localStorage.getItem('tuff_cfg');
    if (saved) state.options = JSON.parse(saved);
}
