/**
 * Tuff Client Universal Converter - API & Stitching Edition
 * Handles: Double Chest Stitching, Black Mobs, Flattening Inconsistencies.
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

// --- CORE MAPPING API (The "Flattening" Engine) ---
// This handles the name changes from 1.13+ back to 1.12
const MAPPING_API_URL = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/block_renames.json";

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    initializeEventListeners();
    loadOptions();
    // Pre-load mapping data from a reliable source
    try {
        const resp = await fetch(MAPPING_API_URL);
        state.mappingData = await resp.json();
    } catch (e) {
        console.warn("Could not fetch remote API, using built-in legacy rules.");
    }
});

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
    if (!file || !file.name.endsWith('.zip')) return alert('Please select a valid .zip pack.');
    state.file = file;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('convertBtn').disabled = false;
}

// --- CONVERSION ENGINE ---
async function convertPack() {
    const btn = document.getElementById('convertBtn');
    btn.disabled = true;
    document.getElementById('progressSection').style.display = 'block';

    try {
        updateProgress(5, 'Initializing engine...');
        const zip = await JSZip.loadAsync(state.file);
        const outputZip = new JSZip();
        
        // Cache for Double Chest stitching
        const chestParts = { normal: {}, trapped: {}, ender: {} };
        const files = Object.keys(zip.files);

        for (let i = 0; i < files.length; i++) {
            const path = files[i];
            const file = zip.files[path];
            if (file.dir) continue;

            const pathLower = path.toLowerCase();
            const content = await file.async('blob');

            // 1. Logic: Collect Chest Parts for stitching later
            if (pathLower.includes('entity/chest/')) {
                const type = pathLower.includes('trapped') ? 'trapped' : (pathLower.includes('ender') ? 'ender' : 'normal');
                if (pathLower.endsWith('left.png')) chestParts[type].left = content;
                if (pathLower.endsWith('right.png')) chestParts[type].right = content;
            }

            // 2. Logic: Process standard textures
            if (pathLower.includes('assets/minecraft/textures/')) {
                await processTexture(outputZip, path, content);
            } else if (pathLower.endsWith('pack.mcmeta')) {
                const text = await file.async('string');
                outputZip.file(path, modifyMcmeta(text));
            } else if (!shouldSkip(pathLower)) {
                outputZip.file(path, content);
            }

            if (i % 40 === 0) updateProgress(5 + (i / files.length * 85), 'Processing assets...');
        }

        // 3. Logic: Stitch Double Chests (The Final Inconsistency)
        updateProgress(92, 'Stitching double chests...');
        await stitchDoubleChests(outputZip, chestParts);

        updateProgress(95, 'Finalizing Zip...');
        const blob = await outputZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        saveAs(blob, (state.options.packName || "Tuff_Pack") + ".zip");
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
    
    // KEEP ORIGINAL (For 1.13+ Compatibility / Template Style)
    zip.file(path, blob);

    const match = pathLower.match(/textures\/(.*)\.png$/);
    if (!match) return;
    const internalPath = match[1]; // e.g. "block/oak_leaves"
    
    let legacyPath = null;

    // A. Use the Mapping API for names
    // Example: "block/oak_leaves" -> "blocks/leaves_oak"
    if (state.mappingData && state.mappingData[internalPath]) {
        legacyPath = `assets/minecraft/textures/${state.mappingData[internalPath]}.png`;
    } 
    
    // B. Entity Flattening (Fixes Black Mobs)
    // Moves textures/entity/zombie/zombie.png -> textures/entity/zombie.png
    else if (internalPath.startsWith('entity/')) {
        const parts = internalPath.split('/');
        if (parts.length > 2) {
            legacyPath = `assets/minecraft/textures/entity/${parts[parts.length - 1]}.png`;
        }
    }

    // C. Special Fallbacks (Leaves/Wood/Tools)
    else if (internalPath.includes('_leaves')) {
        legacyPath = path.replace(/block\/(.*)_leaves\.png$/, 'blocks/leaves_$1.png');
    } else if (internalPath.includes('wooden_')) {
        legacyPath = path.replace('wooden_', 'wood_').replace('/item/', '/items/');
    }

    // D. Pluralization Fallback
    if (!legacyPath) {
        legacyPath = path.replace('/textures/block/', '/textures/blocks/')
                         .replace('/textures/item/', '/textures/items/');
    }

    // Add Legacy file if different
    if (legacyPath !== path) zip.file(legacyPath, blob);
}

// --- IMAGE STITCHING ENGINE ---
async function stitchDoubleChests(zip, chestParts) {
    for (const type of ['normal', 'trapped']) {
        if (chestParts[type].left && chestParts[type].right) {
            const stitched = await mergeChestImages(chestParts[type].left, chestParts[type].right);
            const fileName = type === 'normal' ? 'normal_double.png' : 'trapped_double.png';
            zip.file(`assets/minecraft/textures/entity/chest/${fileName}`, stitched);
        }
    }
}

async function mergeChestImages(leftBlob, rightBlob) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const imgL = new Image();
        const imgR = new Image();

        imgL.onload = () => {
            imgR.onload = () => {
                // 1.12 Double Chests are 128x64 (standard) or proportional
                canvas.width = imgL.width * 2;
                canvas.height = imgL.height;
                // Stitching order for 1.12 double chest maps
                ctx.drawImage(imgR, 0, 0); 
                ctx.drawImage(imgL, imgL.width, 0);
                canvas.toBlob(resolve);
            };
            imgR.src = URL.createObjectURL(rightBlob);
        };
        imgL.src = URL.createObjectURL(leftBlob);
    });
}

// --- UTILITIES ---
function shouldSkip(path) {
    if (!state.options.removeNonTextures) return false;
    const skip = ['models', 'sounds', 'lang', 'advancements', 'loot_tables', 'recipes', 'structures', 'shaders', 'font', 'texts'];
    return skip.some(f => path.includes(`/${f}/`));
}

function modifyMcmeta(json) {
    try {
        const data = JSON.parse(json);
        data.pack.pack_format = 3;
        if (state.options.packName) data.pack.description = state.options.packName;
        return JSON.stringify(data, null, 4);
    } catch { return json; }
}

function updateProgress(p, m) {
    document.getElementById('progressFill').style.width = p + '%';
    document.getElementById('progressLabel').textContent = m;
}

function loadOptions() {
    const cfg = JSON.parse(localStorage.getItem('tuff_cfg') || '{}');
    if (cfg.packName) document.getElementById('packName').value = cfg.packName;
}

function saveOptions() {
    state.options.packName = document.getElementById('packName').value;
    localStorage.setItem('tuff_cfg', JSON.stringify(state.options));
}
