/**
 * Tuff Client Universal Converter - API & Stitching Edition
 * Logic: Fetches official 1.13 renames, flattens entities, and stitches chests.
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

// Official Mapping API sources
const API_SOURCES = [
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/block_renames.json",
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/item_renames.json"
];

// Folders/Files to remove (from your original template)
const FOLDERS_TO_REMOVE = ['models', 'sounds', 'lang', 'advancements', 'loot_tables', 'recipes', 'structures', 'shaders', 'font', 'texts', 'eagler'];
const FILES_TO_REMOVE = ['sounds.json', '.mcassetsroot'];
const TEMPLATE_ONLY_FILES = ['bamboo_bottom.png', 'bamboo_side.png', 'bamboo_top.png', 'bell_bottom.png', 'bell_side.png', 'bell_top.png', 'bush.png', 'cactus_flower.png', 'conduit.png'];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    loadOptions();
    await fetchAndInvertMappings();
});

async function fetchAndInvertMappings() {
    try {
        for (const url of API_SOURCES) {
            const resp = await fetch(url);
            const data = await resp.json();
            for (const [oldName, newName] of Object.entries(data)) {
                // Invert: New -> Old
                state.mappingData[newName.replace('minecraft:', '')] = oldName.replace('minecraft:', '');
            }
        }
        console.log("✅ API Mappings Loaded:", Object.keys(state.mappingData).length);
    } catch (e) {
        console.error("❌ Failed to fetch mapping API:", e);
    }
}

function initializeEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    
    ['dragover', 'drop'].forEach(n => dropZone.addEventListener(n, (e) => {
        e.preventDefault();
        n === 'dragover' ? dropZone.classList.add('drag-over') : dropZone.classList.remove('drag-over');
        if (n === 'drop' && e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    }));

    convertBtn.addEventListener('click', convertPack);
}

function handleFile(file) {
    if (!file || !file.name.endsWith('.zip')) return;
    state.file = file;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('convertBtn').disabled = false;
}

// --- CORE CONVERSION ENGINE ---
async function convertPack() {
    const btn = document.getElementById('convertBtn');
    btn.disabled = true;
    document.getElementById('progressSection').style.display = 'block';

    try {
        updateProgress(5, 'Parsing Pack...');
        const zip = await JSZip.loadAsync(state.file);
        const outputZip = new JSZip();
        const files = Object.keys(zip.files);
        const chestParts = { normal: {}, trapped: {} };

        for (let i = 0; i < files.length; i++) {
            const path = files[i];
            const file = zip.files[path];
            if (file.dir || shouldSkip(path)) continue;

            const pathLower = path.toLowerCase();
            const content = await file.async('blob');

            // 1. Logic: Collect Chests for stitching
            if (pathLower.includes('entity/chest/')) {
                const type = pathLower.includes('trapped') ? 'trapped' : 'normal';
                if (pathLower.endsWith('left.png')) chestParts[type].left = content;
                if (pathLower.endsWith('right.png')) chestParts[type].right = content;
            }

            // 2. Logic: Process Textures (The API Pass)
            if (pathLower.includes('assets/minecraft/textures/')) {
                await processTexture(outputZip, path, content);
            } 
            // 3. Logic: Meta
            else if (pathLower.endsWith('pack.mcmeta')) {
                const text = await file.async('string');
                outputZip.file(path, modifyMcmeta(text));
            } else {
                outputZip.file(path, content);
            }

            if (i % 40 === 0) updateProgress(5 + (i / files.length * 85), 'Processing Assets...');
        }

        // 4. Logic: Final Stitching for Double Chests
        updateProgress(92, 'Stitching Double Chests...');
        await stitchDoubleChests(outputZip, chestParts);

        updateProgress(95, 'Generating Final Pack...');
        const blob = await outputZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        saveAs(blob, (state.options.packName || "Converted_Pack") + ".zip");
        updateProgress(100, 'Done!');
        btn.disabled = false;
    } catch (err) {
        console.error(err);
        updateProgress(0, 'Error: ' + err.message);
        btn.disabled = false;
    }
}

async function processTexture(zip, path, blob) {
    const pathLower = path.toLowerCase();
    
    // UNIVERSAL SUPPORT: Keep original modern file
    zip.file(path, blob);

    const match = pathLower.match(/textures\/(.*)\.png$/);
    if (!match) return;
    const internal = match[1]; // e.g., "block/oak_leaves"
    
    let legacyPath = null;
    const folder = internal.split('/')[0]; // "block" or "item" or "entity"
    const fileName = internal.split('/').pop(); // "oak_leaves"

    // A. API MAPPING (New -> Old)
    // Check for exact name or base-name renames (handles grass_block -> grass)
    let legacyName = state.mappingData[fileName];
    if (!legacyName) {
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
            // e.g., entity/zombie/zombie.png -> entity/zombie.png
            legacyPath = `assets/minecraft/textures/entity/${parts[parts.length - 1]}.png`;
        }
    }

    // C. SUFFIX SWAP (Leaves, Wood Tools, Dyes)
    if (!legacyPath) {
        if (fileName.includes('_leaves')) {
            legacyPath = path.replace(/block\/(.*)_leaves\.png$/, 'blocks/leaves_$1.png');
        } else if (fileName.startsWith('wooden_')) {
            legacyPath = path.replace('wooden_', 'wood_').replace('/item/', '/items/');
        } else if (fileName.includes('_dye')) {
            legacyPath = path.replace(/([a-z_]+)_dye\.png$/, 'dye_powder_$1.png').replace('/item/', '/items/');
        }
    }

    // D. PLURALIZATION FALLBACK
    if (!legacyPath) {
        legacyPath = path.replace('/textures/block/', '/textures/blocks/')
                         .replace('/textures/item/', '/textures/items/');
    }

    if (legacyPath !== path) zip.file(legacyPath, blob);
}

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
                ctx.drawImage(imgR, 0, 0); // 1.12 Double chests put right side first
                ctx.drawImage(imgL, imgL.width, 0);
                canvas.toBlob(res);
            };
            imgR.src = URL.createObjectURL(right);
        };
        imgL.src = URL.createObjectURL(left);
    });
}

// --- UTILS ---
function shouldSkip(path) {
    const p = path.toLowerCase();
    if (state.options.removeNonTextures) {
        if (FOLDERS_TO_REMOVE.some(f => p.includes(`/${f}/`))) return true;
        if (FILES_TO_REMOVE.some(f => p.endsWith(f))) return true;
    }
    const filename = path.split('/').pop();
    if (TEMPLATE_ONLY_FILES.includes(filename)) return true;
    return false;
}

function modifyMcmeta(str) {
    try {
        const d = JSON.parse(str.trim()); // Trim to prevent Syntax Error
        d.pack.pack_format = 3;
        if (state.options.packName) d.pack.description = state.options.packName + " (Tuff Client)";
        return JSON.stringify(d, null, 4);
    } catch (e) { return str; }
}

function updateProgress(p, m) {
    const fill = document.getElementById('progressFill');
    if (fill) fill.style.width = p + '%';
    const label = document.getElementById('progressLabel');
    if (label) label.textContent = m;
}

function loadOptions() {
    const saved = localStorage.getItem('tuff_cfg');
    if (saved) state.options = JSON.parse(saved);
}
