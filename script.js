// Tuff Client Texture Pack Converter
// Converts 1.21 vanilla resource packs to Tuff Client format

const state = {
    file: null,
    options: {
        removeNonTextures: true,
        convertNewMobs: false,
        updateMcmeta: true,
        packName: ''
    }
};

// Folders to remove (non-texture content)
const FOLDERS_TO_REMOVE = [
    'models',
    'sounds',
    'lang',
    'advancements',
    'loot_tables',
    'recipes',
    'structures',
    'shaders',
    'font',
    'texts',
    'eagler'
];

// Files to remove
const FILES_TO_REMOVE = [
    'sounds.json',
    '.mcassetsroot'
];

// Files that exist in template but not in Tuff Client (to remove)
const TEMPLATE_ONLY_FILES = [
    'bamboo_bottom.png',
    'bamboo_side.png',
    'bamboo_top.png',
    'bell_bottom.png',
    'bell_side.png',
    'bell_top.png',
    'bush.png',
    'cactus_flower.png',
    'conduit.png'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadOptions();
});

function initializeEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const convertBtn = document.getElementById('convertBtn');

    // File input
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    // Options
    document.getElementById('removeNonTextures').addEventListener('change', (e) => {
        state.options.removeNonTextures = e.target.checked;
        saveOptions();
    });
    document.getElementById('convertNewMobs').addEventListener('change', (e) => {
        state.options.convertNewMobs = e.target.checked;
        saveOptions();
    });
    document.getElementById('updateMcmeta').addEventListener('change', (e) => {
        state.options.updateMcmeta = e.target.checked;
        saveOptions();
    });
    document.getElementById('packName').addEventListener('input', (e) => {
        state.options.packName = e.target.value;
        saveOptions();
    });

    // Convert button
    convertBtn.addEventListener('click', convertPack);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.zip')) {
        handleFile(files[0]);
    } else {
        alert('Please drop a .zip file');
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    state.file = file;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatBytes(file.size);
    
    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = false;
    convertBtn.querySelector('.btn-text').textContent = 'CONVERT TO TUFF CLIENT';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function convertPack() {
    if (!state.file) return;

    const progressSection = document.getElementById('progressSection');
    const convertBtn = document.getElementById('convertBtn');
    
    progressSection.style.display = 'block';
    convertBtn.disabled = true;
    convertBtn.querySelector('.btn-text').textContent = 'CONVERTING...';

    try {
        updateProgress(0, 'Loading resource pack...');
        const zip = await JSZip.loadAsync(state.file);
        updateProgress(10, 'Analyzing file structure...');

        const outputZip = new JSZip();
        let processedFiles = 0;
        const totalFiles = Object.keys(zip.files).length;

        for (const [path, file] of Object.entries(zip.files)) {
            processedFiles++;
            const percent = 10 + Math.floor((processedFiles / totalFiles) * 70);
            
            if (processedFiles % 20 === 0) {
                updateProgress(percent, `Processing files... (${processedFiles}/${totalFiles})`);
                await sleep(0);
            }

            if (file.dir) continue;
            if (shouldSkipFile(path)) continue;

            if (path.endsWith('pack.mcmeta') && state.options.updateMcmeta) {
                const content = await file.async('string');
                outputZip.file(path, modifyPackMcmeta(content));
                continue;
            }

            // Get content once
            const content = await file.async('blob');

            // Process and Move the file to the correct Legacy location
            await processAndMoveFile(outputZip, path, content);
        }

        updateProgress(90, 'Generating download...');
        const blob = await outputZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            updateProgress(90 + Math.floor(metadata.percent / 10), 'Compressing files...');
        });

        const filename = state.options.packName 
            ? `${state.options.packName}_TuffClient.zip`
            : state.file.name.replace('.zip', '_TuffClient.zip');
        
        saveAs(blob, filename);

        setTimeout(() => {
            updateProgress(100, '✅ Conversion complete! Check your downloads.');
            convertBtn.querySelector('.btn-text').textContent = 'CONVERT ANOTHER PACK';
            convertBtn.disabled = false;
        }, 500);

    } catch (error) {
        console.error('Conversion error:', error);
        updateProgress(0, `❌ Error: ${error.message}`);
        convertBtn.disabled = false;
    }
}

function shouldSkipFile(path) {
    const pathLower = path.toLowerCase();

    // Skip non-minecraft assets (usually)
    if (!pathLower.includes('assets/minecraft/')) return true;

    if (state.options.removeNonTextures) {
        for (const folder of FOLDERS_TO_REMOVE) {
            if (pathLower.includes(`/${folder}/`) || pathLower.includes(`\\${folder}\\`)) {
                return true;
            }
        }
        for (const file of FILES_TO_REMOVE) {
            if (pathLower.endsWith(file)) return true;
        }
    }

    const filename = path.split('/').pop();
    if (TEMPLATE_ONLY_FILES.includes(filename)) return true;

    if (!state.options.convertNewMobs && pathLower.includes('entity/')) {
        const newMobs = ['warden', 'allay', 'frog.png', 'camel', 'sniffer', 'breeze', 'armadillo'];
        for (const mob of newMobs) {
            if (pathLower.includes(mob)) return true;
        }
    }

    return false;
}

// THIS FUNCTION HANDLES ALL RENAMING AND MOVING
async function processAndMoveFile(outputZip, originalPath, content) {
    const pathLower = originalPath.toLowerCase();
    
    // We only care about assets/minecraft/textures
    if (!pathLower.includes('assets/minecraft/textures/')) {
        // preserve other files (like pack.png)
        outputZip.file(originalPath, content);
        return;
    }

    // 1. Base Folder Correction (Singular -> Plural)
    let legacyPath = originalPath
        .replace(/\/textures\/block\//g, '/textures/blocks/')
        .replace(/\/textures\/item\//g, '/textures/items/');

    let renamed = false;

    // --- BLOCKS (renaming) ---
    
    // GRASS
    if (pathLower.endsWith('grass_block_side_overlay.png')) { legacyPath = legacyPath.replace(/grass_block_side_overlay\.png$/i, 'grass_side_overlay.png'); }
    else if (pathLower.endsWith('grass_block_side.png')) { legacyPath = legacyPath.replace(/grass_block_side\.png$/i, 'grass_side.png'); }
    else if (pathLower.endsWith('grass_block_top.png')) { legacyPath = legacyPath.replace(/grass_block_top\.png$/i, 'grass_top.png'); }
    else if (pathLower.endsWith('grass_block_snow.png')) { legacyPath = legacyPath.replace(/grass_block_snow\.png$/i, 'grass_side_snowed.png'); }
    
    // FARMLAND
    else if (pathLower.endsWith('farmland.png')) { legacyPath = legacyPath.replace(/farmland\.png$/i, 'farmland_dry.png'); }
    else if (pathLower.endsWith('farmland_moist.png')) { legacyPath = legacyPath.replace(/farmland_moist\.png$/i, 'farmland_wet.png'); }
    
    // GRASS PATH
    else if (pathLower.endsWith('dirt_path_top.png')) { legacyPath = legacyPath.replace(/dirt_path_top\.png$/i, 'grass_path_top.png'); }
    else if (pathLower.endsWith('dirt_path_side.png')) { legacyPath = legacyPath.replace(/dirt_path_side\.png$/i, 'grass_path_side.png'); }

    // LEAVES (Modern: oak_leaves.png -> Legacy: leaves_oak.png)
    else if (pathLower.includes('_leaves.png')) {
        const leafMatch = pathLower.match(/\/([a-z_]+)_leaves\.png$/);
        if (leafMatch) {
            let wood = leafMatch[1];
            // Dark oak special case
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            // Jungle leaves special case (sometimes texture packs have opaque/transparent variants, usually handled by game, but filename is simple)
            legacyPath = legacyPath.replace(`${wood}_leaves.png`, `leaves_${legacyName}.png`);
        }
    }

    // LOGS & PLANKS
    else if (pathLower.includes('_log.png') || pathLower.includes('_planks.png')) {
        const type = pathLower.includes('_log') ? 'log' : 'planks';
        const match = pathLower.match(new RegExp(`\/([a-z_]+)_${type}(_top)?\\.png$`));
        if (match) {
            let wood = match[1];
            let suffix = match[2] || '';
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            legacyPath = legacyPath.replace(`${wood}_${type}${suffix}.png`, `${type}_${legacyName}${suffix}.png`);
        }
    }

    // STONES
    else if (pathLower.endsWith('cobblestone.png')) { /* name same */ }
    else if (pathLower.endsWith('mossy_cobblestone.png')) { /* name same */ }
    else if (pathLower.endsWith('stone.png')) { /* name same */ }
    
    // ORES & MINERALS
    else if (pathLower.endsWith('nether_quartz_ore.png')) { legacyPath = legacyPath.replace('nether_quartz_ore.png', 'quartz_ore.png'); }
    
    // --- ITEMS (renaming) ---
    
    // TOOLS
    else if (pathLower.includes('wooden_')) { legacyPath = legacyPath.replace('wooden_', 'wood_'); }
    else if (pathLower.includes('golden_')) { 
        // Golden apple is exception
        if (pathLower.endsWith('golden_apple.png')) legacyPath = legacyPath.replace('golden_apple.png', 'apple_golden.png');
        else legacyPath = legacyPath.replace('golden_', 'gold_'); 
    }
    
    // DYES, GLASS, WOOL, TERRACOTTA
    // (Handled by generic patterns)
    else if (pathLower.includes('_dye.png')) {
        const m = pathLower.match(/\/([a-z_]+)_dye\.png$/);
        if (m) legacyPath = legacyPath.replace(`${m[1]}_dye.png`, `dye_${m[1]}.png`);
    }
    else if (pathLower.includes('_stained_glass.png')) {
        const m = pathLower.match(/\/([a-z_]+)_stained_glass\.png$/);
        if (m) legacyPath = legacyPath.replace(`${m[1]}_stained_glass.png`, `glass_${m[1]}.png`);
    }
    else if (pathLower.includes('_stained_glass_pane_top.png')) {
        const m = pathLower.match(/\/([a-z_]+)_stained_glass_pane_top\.png$/);
        if (m) legacyPath = legacyPath.replace(`${m[1]}_stained_glass_pane_top.png`, `glass_pane_top_${m[1]}.png`);
    }
    else if (pathLower.includes('_wool.png')) {
        const m = pathLower.match(/\/([a-z_]+)_wool\.png$/);
        if (m) legacyPath = legacyPath.replace(`${m[1]}_wool.png`, `wool_colored_${m[1]}.png`);
    }
    else if (pathLower.endsWith('/terracotta.png')) { legacyPath = legacyPath.replace('terracotta.png', 'hardened_clay.png'); }
    else if (pathLower.includes('_terracotta.png') && !pathLower.includes('glazed')) {
        const m = pathLower.match(/\/([a-z_]+)_terracotta\.png$/);
        if (m) legacyPath = legacyPath.replace(`${m[1]}_terracotta.png`, `hardened_clay_stained_${m[1]}.png`);
    }
    else if (pathLower.includes('_glazed_terracotta.png')) {
        const m = pathLower.match(/\/([a-z_]+)_glazed_terracotta\.png$/);
        if (m) legacyPath = legacyPath.replace(`${m[1]}_glazed_terracotta.png`, `glazed_terracotta_${m[1]}.png`);
    }

    // --- ENTITIES & GUI (Fixing the black mobs / default chest issues) ---
    
    // CHESTS (Modern has split files, Legacy has one. We map single chest.)
    else if (pathLower.includes('entity/chest/')) {
        if (pathLower.endsWith('normal.png')) { 
            // In 1.21 normal.png is single chest. In 1.12 it is also normal.png. 
            // Path is usually textures/entity/chest/normal.png
            // Ensure folder structure is clean
        }
        // Double chests are impossible to fix perfectly without canvas stitching
        // because modern has left.png + right.png, legacy wants double_normal.png
    }
    
    // SIGNS (Modern: entity/signs/oak.png -> Legacy: entity/sign.png)
    else if (pathLower.includes('entity/signs/')) {
        if (pathLower.endsWith('oak.png')) {
            legacyPath = legacyPath.replace('/signs/oak.png', '/sign.png');
        } else {
            // Remove other wood types for signs as 1.12 only supported oak visual
            return; 
        }
    }

    // BEDS (Modern: entity/bed/red.png -> Legacy: entity/bed/red.png)
    // Just ensure the folder maps correctly.
    
    // ENCHANTING TABLE BOOK
    else if (pathLower.includes('entity/enchanting_table_book.png')) {
        legacyPath = legacyPath.replace('enchanting_table_book.png', 'enchanting_table_book.png'); // ensure pass
    }

    // Add the file to the zip
    outputZip.file(legacyPath, content);
}

function modifyPackMcmeta(content) {
    try {
        const data = JSON.parse(content);
        if (state.options.packName) {
            data.pack.description = `${state.options.packName} - Tuff Client Edition`;
        }
        data.pack.pack_format = 3;
        return JSON.stringify(data, null, 4);
    } catch (error) {
        console.error('Error modifying pack.mcmeta:', error);
        return content;
    }
}

function updateProgress(percent, message) {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressLabel = document.getElementById('progressLabel');
    const progressDetails = document.getElementById('progressDetails');

    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    progressLabel.textContent = message;
    
    if (percent === 100) {
        progressDetails.textContent = '🎉 Your Tuff Client texture pack is ready!';
    } else {
        progressDetails.textContent = `Processing your resource pack...`;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function saveOptions() {
    localStorage.setItem('tuffConverterOptions', JSON.stringify(state.options));
}

function loadOptions() {
    const saved = localStorage.getItem('tuffConverterOptions');
    if (saved) {
        try {
            const options = JSON.parse(saved);
            state.options = { ...state.options, ...options };
            document.getElementById('removeNonTextures').checked = state.options.removeNonTextures;
            document.getElementById('convertNewMobs').checked = state.options.convertNewMobs;
            document.getElementById('updateMcmeta').checked = state.options.updateMcmeta;
            document.getElementById('packName').value = state.options.packName;
        } catch (error) {
            console.error('Error loading options:', error);
        }
    }
}

function checkBrowserSupport() {
    if (typeof JSZip === 'undefined' || typeof saveAs === 'undefined') {
        alert('Libraries failed to load. Please refresh the page.');
        return false;
    }
    return true;
}

window.addEventListener('load', () => {
    if (!checkBrowserSupport()) {
        document.getElementById('convertBtn').disabled = true;
    }
});
