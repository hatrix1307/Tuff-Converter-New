/**
 * Tuff Client Universal Texture Converter
 * Converts 1.21+ Resource Packs to Tuff Client (1.12) Format
 * Maintains dual-compatibility for 1.13+ textures.
 */

const state = {
    file: null,
    options: {
        removeNonTextures: true,
        convertNewMobs: false,
        updateMcmeta: true,
        packName: ''
    }
};

// --- COMPREHENSIVE MAPPING DICTIONARY ---
// Maps Modern (1.13+) names to Legacy (1.8-1.12) names
const LEGACY_MAPPINGS = {
    // Blocks
    "block/grass_block_side": "blocks/grass_side",
    "block/grass_block_top": "blocks/grass_top",
    "block/grass_block_side_overlay": "blocks/grass_side_overlay",
    "block/grass_block_snow": "blocks/grass_side_snowed",
    "block/dirt_path_side": "blocks/grass_path_side",
    "block/dirt_path_top": "blocks/grass_path_top",
    "block/farmland": "blocks/farmland_dry",
    "block/farmland_moist": "blocks/farmland_wet",
    "block/nether_quartz_ore": "blocks/quartz_ore",
    "block/red_nether_bricks": "blocks/red_nether_brick",
    "block/terracotta": "blocks/hardened_clay",
    
    // Items
    "item/wooden_sword": "items/wood_sword",
    "item/wooden_pickaxe": "items/wood_pickaxe",
    "item/wooden_axe": "items/wood_axe",
    "item/wooden_shovel": "items/wood_shovel",
    "item/wooden_hoe": "items/wood_hoe",
    "item/golden_sword": "items/gold_sword",
    "item/golden_pickaxe": "items/gold_pickaxe",
    "item/golden_axe": "items/gold_axe",
    "item/golden_shovel": "items/gold_shovel",
    "item/golden_hoe": "items/gold_hoe",
    "item/golden_helmet": "items/gold_helmet",
    "item/golden_chestplate": "items/gold_chestplate",
    "item/golden_leggings": "items/gold_leggings",
    "item/golden_boots": "items/gold_boots",
    "item/golden_apple": "items/apple_golden",
    "item/totem_of_undying": "items/totem",
    "item/slime_ball": "items/slimeball",

    // Entities
    "entity/signs/oak": "entity/sign"
};

// Wood Suffixes for batch conversion
const WOOD_TYPES = ["oak", "spruce", "birch", "jungle", "acacia", "dark_oak"];

// Cleanup Config
const FOLDERS_TO_REMOVE = ['models', 'sounds', 'lang', 'advancements', 'loot_tables', 'recipes', 'structures', 'shaders', 'font'];
const FILES_TO_REMOVE = ['sounds.json', '.mcassetsroot'];

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });

    // Option Listeners
    ['removeNonTextures', 'convertNewMobs', 'updateMcmeta'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => {
            state.options[id] = e.target.checked;
            saveOptions();
        });
    });
    document.getElementById('packName').addEventListener('input', (e) => {
        state.options.packName = e.target.value;
        saveOptions();
    });

    convertBtn.addEventListener('click', convertPack);
    loadOptions();
});

function handleFile(file) {
    if (!file || !file.name.endsWith('.zip')) return alert('Please select a valid .zip resource pack.');
    state.file = file;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('convertBtn').disabled = false;
}

// --- CORE CONVERSION LOGIC ---
async function convertPack() {
    const btn = document.getElementById('convertBtn');
    const progressSection = document.getElementById('progressSection');
    
    btn.disabled = true;
    progressSection.style.display = 'block';

    try {
        updateProgress(5, 'Reading Zip...');
        const zip = await JSZip.loadAsync(state.file);
        const outputZip = new JSZip();
        
        const files = Object.keys(zip.files);
        let count = 0;

        for (const path of files) {
            count++;
            const file = zip.files[path];
            if (file.dir || shouldSkip(path)) continue;

            const content = await file.async('blob');
            const pathLower = path.toLowerCase();

            // 1. Handle pack.mcmeta
            if (pathLower.endsWith('pack.mcmeta')) {
                const text = await file.async('string');
                outputZip.file(path, modifyMcmeta(text));
                continue;
            }

            // 2. Process Textures (The Dual-Path System)
            if (pathLower.includes('assets/minecraft/textures/')) {
                await processTexture(outputZip, path, content);
            } else {
                // Keep non-texture files like pack.png as they are
                outputZip.file(path, content);
            }

            if (count % 50 === 0) updateProgress(5 + (count / files.length * 80), 'Processing textures...');
        }

        updateProgress(90, 'Zipping pack...');
        const blob = await outputZip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        saveAs(blob, (state.options.packName || "Tuff_Converted_Pack") + ".zip");
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
    
    // ALWAYS keep the original modern file (1.13+ / Template style)
    zip.file(path, blob);

    // Get internal texture path (e.g., block/oak_log)
    const match = pathLower.match(/textures\/(.*)\.png$/);
    if (!match) return;
    
    let internalPath = match[1];
    let legacyPath = null;

    // A. Check Explicit Mappings
    if (LEGACY_MAPPINGS[internalPath]) {
        legacyPath = `assets/minecraft/textures/${LEGACY_MAPPINGS[internalPath]}.png`;
    } 
    
    // B. Handle Dyes, Glass, Wool, Terracotta (Generic Patterns)
    else if (internalPath.includes('_dye')) {
        legacyPath = path.replace(/([a-z_]+)_dye\.png$/, 'dye_powder_$1.png').replace('/item/', '/items/');
    }
    else if (internalPath.includes('_stained_glass')) {
        legacyPath = path.replace(/([a-z_]+)_stained_glass\.png$/, 'glass_$1.png').replace('/block/', '/blocks/');
    }
    else if (internalPath.includes('_wool')) {
        legacyPath = path.replace(/([a-z_]+)_wool\.png$/, 'wool_colored_$1.png').replace('/block/', '/blocks/');
    }

    // C. Handle Wood Variants (Leaves, Logs, Planks)
    else {
        for (const wood of WOOD_TYPES) {
            if (internalPath.includes(wood)) {
                let legacyWood = (wood === 'dark_oak') ? 'big_oak' : wood;
                
                if (internalPath.includes('_leaves')) {
                    legacyPath = `assets/minecraft/textures/blocks/leaves_${legacyWood}.png`;
                } else if (internalPath.includes('_log')) {
                    const suffix = internalPath.endsWith('_top') ? '_top' : '';
                    legacyPath = `assets/minecraft/textures/blocks/log_${legacyWood}${suffix}.png`;
                } else if (internalPath.includes('_planks')) {
                    legacyPath = `assets/minecraft/textures/blocks/planks_${legacyWood}.png`;
                }
                if (legacyPath) break;
            }
        }
    }

    // D. Final Fallback: Just fix pluralization (block -> blocks, item -> items)
    if (!legacyPath) {
        legacyPath = path.replace('/textures/block/', '/textures/blocks/')
                         .replace('/textures/item/', '/textures/items/');
    }

    // Add the Legacy file if it's different from the modern one
    if (legacyPath !== path) {
        zip.file(legacyPath, blob);
    }
}

// --- UTILS ---
function shouldSkip(path) {
    const p = path.toLowerCase();
    if (state.options.removeNonTextures) {
        if (FOLDERS_TO_REMOVE.some(f => p.includes(`/${f}/`))) return true;
        if (FILES_TO_REMOVE.some(f => p.endsWith(f))) return true;
    }
    // Filter new mob entities if requested
    if (!state.options.convertNewMobs && p.includes('entity/')) {
        const newer = ['warden', 'allay', 'frog', 'camel', 'sniffer', 'breeze', 'armadillo'];
        if (newer.some(m => p.includes(m))) return true;
    }
    return false;
}

function modifyMcmeta(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        data.pack.pack_format = 3; // Legacy format
        if (state.options.packName) data.pack.description = state.options.packName + " (Tuff Client)";
        return JSON.stringify(data, null, 4);
    } catch { return jsonStr; }
}

function updateProgress(percent, msg) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressLabel').textContent = msg;
}

function saveOptions() { localStorage.setItem('tuff_conv_cfg', JSON.stringify(state.options)); }
function loadOptions() {
    const cfg = JSON.parse(localStorage.getItem('tuff_conv_cfg'));
    if (cfg) {
        state.options = cfg;
        document.getElementById('removeNonTextures').checked = cfg.removeNonTextures;
        document.getElementById('convertNewMobs').checked = cfg.convertNewMobs;
        document.getElementById('updateMcmeta').checked = cfg.updateMcmeta;
        document.getElementById('packName').value = cfg.packName || '';
    }
}
