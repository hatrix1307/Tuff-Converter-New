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
    
    // Update UI
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
    
    // Show progress
    progressSection.style.display = 'block';
    convertBtn.disabled = true;
    convertBtn.querySelector('.btn-text').textContent = 'CONVERTING...';

    try {
        updateProgress(0, 'Loading resource pack...');
        
        // Load the zip file
        const zip = await JSZip.loadAsync(state.file);
        updateProgress(10, 'Analyzing file structure...');

        // Create output zip
        const outputZip = new JSZip();
        let processedFiles = 0;
        const totalFiles = Object.keys(zip.files).length;

        // Process each file
        for (const [path, file] of Object.entries(zip.files)) {
            processedFiles++;
            const percent = 10 + Math.floor((processedFiles / totalFiles) * 70);
            
            if (processedFiles % 10 === 0) {
                updateProgress(percent, `Processing files... (${processedFiles}/${totalFiles})`);
                await sleep(0); // Allow UI to update
            }

            // Skip if it's a directory
            if (file.dir) continue;

            // Check if we should skip this file
            if (shouldSkipFile(path)) {
                continue;
            }

            // Special handling for pack.mcmeta
            if (path.endsWith('pack.mcmeta') && state.options.updateMcmeta) {
                const content = await file.async('string');
                const modified = modifyPackMcmeta(content);
                outputZip.file(path, modified);
                continue;
            }

            // Get file content once
            const content = await file.async('blob');

            // Add the original file
            outputZip.file(path, content);

            // Check if we need to create duplicate files with legacy names
            const duplicates = getDuplicateFilesNeeded(path);
            for (const duplicatePath of duplicates) {
                outputZip.file(duplicatePath, content);
            }
        }

        updateProgress(80, 'Finalizing conversion...');

        // Generate the zip file
        updateProgress(90, 'Generating download...');
        const blob = await outputZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }, (metadata) => {
            const percent = 90 + Math.floor(metadata.percent / 10);
            updateProgress(percent, 'Compressing files...');
        });

        updateProgress(100, 'Complete! Downloading...');

        // Download the file
        const filename = state.options.packName 
            ? `${state.options.packName}_TuffClient.zip`
            : state.file.name.replace('.zip', '_TuffClient.zip');
        
        saveAs(blob, filename);

        // Success message
        setTimeout(() => {
            updateProgress(100, '✅ Conversion complete! Check your downloads.');
            convertBtn.querySelector('.btn-text').textContent = 'CONVERT ANOTHER PACK';
            convertBtn.disabled = false;
        }, 500);

    } catch (error) {
        console.error('Conversion error:', error);
        updateProgress(0, `❌ Error: ${error.message}`);
        convertBtn.querySelector('.btn-text').textContent = 'TRY AGAIN';
        convertBtn.disabled = false;
    }
}

function shouldSkipFile(path) {
    const pathLower = path.toLowerCase();

    // Skip files in folders to remove
    if (state.options.removeNonTextures) {
        for (const folder of FOLDERS_TO_REMOVE) {
            if (pathLower.includes(`/${folder}/`) || pathLower.includes(`\\${folder}\\`)) {
                return true;
            }
        }

        // Skip specific files
        for (const file of FILES_TO_REMOVE) {
            if (pathLower.endsWith(file)) {
                return true;
            }
        }
    }

    // Skip template-only files
    const filename = path.split('/').pop();
    if (TEMPLATE_ONLY_FILES.includes(filename)) {
        return true;
    }

    // Only skip specific new mob textures if option is disabled
    if (!state.options.convertNewMobs && pathLower.includes('entity/')) {
        const newMobs = ['warden', 'allay', 'frog.png', 'camel', 'sniffer'];
        for (const mob of newMobs) {
            if (pathLower.includes(mob)) {
                return true;
            }
        }
    }
    // Entity textures are preserved by default (chests, signs, end portal frames, etc.)

    return false;
}

function getDuplicateFilesNeeded(path) {
    const pathLower = path.toLowerCase();
    const duplicates = [];
    
    // === GRASS BLOCKS ===
    if (pathLower.includes('/block/grass_block_side_overlay.png')) {
        duplicates.push(path.replace(/grass_block_side_overlay\.png/i, 'grass_side_overlay.png'));
    }
    if (pathLower.includes('/block/grass_block_side.png')) {
        duplicates.push(path.replace(/grass_block_side\.png/i, 'grass_side.png'));
    }
    if (pathLower.includes('/block/grass_block_top.png')) {
        duplicates.push(path.replace(/grass_block_top\.png/i, 'grass_top.png'));
    }
    if (pathLower.includes('/block/grass_block_snow.png')) {
        duplicates.push(path.replace(/grass_block_snow\.png/i, 'grass_side_snowed.png'));
    }
    
    // === FARMLAND ===
    if (pathLower.includes('/block/farmland.png')) {
        duplicates.push(path.replace(/farmland\.png/i, 'farmland_dry.png'));
    }
    if (pathLower.includes('/block/farmland_moist.png')) {
        duplicates.push(path.replace(/farmland_moist\.png/i, 'farmland_wet.png'));
    }
    
    // === GRASS PATH ===
    if (pathLower.includes('/block/dirt_path_top.png')) {
        duplicates.push(path.replace(/dirt_path_top\.png/i, 'grass_path_top.png'));
    }
    if (pathLower.includes('/block/dirt_path_side.png')) {
        duplicates.push(path.replace(/dirt_path_side\.png/i, 'grass_path_side.png'));
    }
    
    // === WOOD TOOLS (wooden_ to wood_) ===
    if (pathLower.includes('/item/wooden_sword.png')) {
        duplicates.push(path.replace(/wooden_sword\.png/i, 'wood_sword.png'));
    }
    if (pathLower.includes('/item/wooden_pickaxe.png')) {
        duplicates.push(path.replace(/wooden_pickaxe\.png/i, 'wood_pickaxe.png'));
    }
    if (pathLower.includes('/item/wooden_axe.png')) {
        duplicates.push(path.replace(/wooden_axe\.png/i, 'wood_axe.png'));
    }
    if (pathLower.includes('/item/wooden_shovel.png')) {
        duplicates.push(path.replace(/wooden_shovel\.png/i, 'wood_shovel.png'));
    }
    if (pathLower.includes('/item/wooden_hoe.png')) {
        duplicates.push(path.replace(/wooden_hoe\.png/i, 'wood_hoe.png'));
    }
    
    // === GOLD TOOLS & ARMOR (golden_ to gold_) ===
    if (pathLower.includes('/item/golden_sword.png')) {
        duplicates.push(path.replace(/golden_sword\.png/i, 'gold_sword.png'));
    }
    if (pathLower.includes('/item/golden_pickaxe.png')) {
        duplicates.push(path.replace(/golden_pickaxe\.png/i, 'gold_pickaxe.png'));
    }
    if (pathLower.includes('/item/golden_axe.png')) {
        duplicates.push(path.replace(/golden_axe\.png/i, 'gold_axe.png'));
    }
    if (pathLower.includes('/item/golden_shovel.png')) {
        duplicates.push(path.replace(/golden_shovel\.png/i, 'gold_shovel.png'));
    }
    if (pathLower.includes('/item/golden_hoe.png')) {
        duplicates.push(path.replace(/golden_hoe\.png/i, 'gold_hoe.png'));
    }
    if (pathLower.includes('/item/golden_helmet.png')) {
        duplicates.push(path.replace(/golden_helmet\.png/i, 'gold_helmet.png'));
    }
    if (pathLower.includes('/item/golden_chestplate.png')) {
        duplicates.push(path.replace(/golden_chestplate\.png/i, 'gold_chestplate.png'));
    }
    if (pathLower.includes('/item/golden_leggings.png')) {
        duplicates.push(path.replace(/golden_leggings\.png/i, 'gold_leggings.png'));
    }
    if (pathLower.includes('/item/golden_boots.png')) {
        duplicates.push(path.replace(/golden_boots\.png/i, 'gold_boots.png'));
    }
    if (pathLower.includes('/item/golden_apple.png')) {
        duplicates.push(path.replace(/golden_apple\.png/i, 'apple_golden.png'));
    }
    
    // === DYES (color_dye to dye_color) ===
    const dyeColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 
                       'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of dyeColors) {
        if (pathLower.includes(`/item/${color}_dye.png`)) {
            duplicates.push(path.replace(new RegExp(`${color}_dye\\.png`, 'i'), `dye_${color}.png`));
        }
    }
    
    // === GLASS & GLASS PANES (color_stained to stained_color) ===
    const glassColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                         'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of glassColors) {
        if (pathLower.includes(`/block/${color}_stained_glass.png`)) {
            duplicates.push(path.replace(new RegExp(`${color}_stained_glass\\.png`, 'i'), `glass_${color}.png`));
        }
        if (pathLower.includes(`/block/${color}_stained_glass_pane_top.png`)) {
            duplicates.push(path.replace(new RegExp(`${color}_stained_glass_pane_top\\.png`, 'i'), `glass_pane_top_${color}.png`));
        }
    }
    
    // === WOOL (color_wool to wool_colored_color) ===
    const woolColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                        'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of woolColors) {
        if (pathLower.includes(`/block/${color}_wool.png`)) {
            duplicates.push(path.replace(new RegExp(`${color}_wool\\.png`, 'i'), `wool_colored_${color}.png`));
        }
    }
    
    // === TERRACOTTA (color_terracotta to hardened_clay_stained_color) ===
    const terracottaColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                              'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of terracottaColors) {
        if (pathLower.includes(`/block/${color}_terracotta.png`)) {
            duplicates.push(path.replace(new RegExp(`${color}_terracotta\\.png`, 'i'), `hardened_clay_stained_${color}.png`));
        }
    }
    
    // Uncolored terracotta
    if (pathLower.includes('/block/terracotta.png')) {
        duplicates.push(path.replace(/terracotta\.png/i, 'hardened_clay.png'));
    }
    
    // === GLAZED TERRACOTTA (color_glazed_terracotta to glazed_terracotta_color) ===
    const glazedColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                          'gray', 'silver', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of glazedColors) {
        if (pathLower.includes(`/block/${color}_glazed_terracotta.png`)) {
            duplicates.push(path.replace(new RegExp(`${color}_glazed_terracotta\\.png`, 'i'), `glazed_terracotta_${color}.png`));
        }
    }
    
    // === LOGS (oak_log to log_oak) ===
    const logTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of logTypes) {
        if (pathLower.includes(`/block/${wood}_log.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            duplicates.push(path.replace(new RegExp(`${wood}_log\\.png`, 'i'), `log_${legacyName}.png`));
        }
        if (pathLower.includes(`/block/${wood}_log_top.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            duplicates.push(path.replace(new RegExp(`${wood}_log_top\\.png`, 'i'), `log_${legacyName}_top.png`));
        }
    }
    
    // === PLANKS (oak_planks to planks_oak) ===
    const plankTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of plankTypes) {
        if (pathLower.includes(`/block/${wood}_planks.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            duplicates.push(path.replace(new RegExp(`${wood}_planks\\.png`, 'i'), `planks_${legacyName}.png`));
        }
    }
    
    // === NETHER QUARTZ ===
    if (pathLower.includes('/block/nether_quartz_ore.png')) {
        duplicates.push(path.replace(/nether_quartz_ore\.png/i, 'quartz_ore.png'));
    }
    
    // === RED NETHER BRICK ===
    if (pathLower.includes('/block/red_nether_bricks.png')) {
        duplicates.push(path.replace(/red_nether_bricks\.png/i, 'red_nether_brick.png'));
    }
    
    // === TOTEM ===
    if (pathLower.includes('/item/totem_of_undying.png')) {
        duplicates.push(path.replace(/totem_of_undying\.png/i, 'totem.png'));
    }
    
    return duplicates;
}

function modifyPackMcmeta(content) {
    try {
        const data = JSON.parse(content);
        
        // Only update description if custom pack name is provided
        if (state.options.packName) {
            data.pack.description = `${state.options.packName} - Tuff Client Edition`;
        }
        // Otherwise keep the original description from the 1.21 pack
        
        // Ensure pack format is 3 (1.11-1.12.x)
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
            
            // Update UI
            document.getElementById('removeNonTextures').checked = state.options.removeNonTextures;
            document.getElementById('convertNewMobs').checked = state.options.convertNewMobs;
            document.getElementById('updateMcmeta').checked = state.options.updateMcmeta;
            document.getElementById('packName').value = state.options.packName;
        } catch (error) {
            console.error('Error loading options:', error);
        }
    }
}

// Utility: Check if browser supports required features
function checkBrowserSupport() {
    if (typeof JSZip === 'undefined') {
        alert('JSZip library failed to load. Please refresh the page.');
        return false;
    }
    if (typeof saveAs === 'undefined') {
        alert('FileSaver library failed to load. Please refresh the page.');
        return false;
    }
    return true;
}

// Check on load
window.addEventListener('load', () => {
    if (!checkBrowserSupport()) {
        document.getElementById('convertBtn').disabled = true;
    }
});
