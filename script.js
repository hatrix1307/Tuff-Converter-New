// Tuff Client Texture Pack Converter
// Merges 1.12 reference pack with 1.21 source pack

const state = {
    file112: null,
    file121: null,
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

// Patterns to prefer from 1.12 (better compatibility, animated, or commonly vanilla in 1.21 packs)
const PREFER_112_PATTERNS = [
    // Animated textures
    '/block/water_still.png',
    '/block/water_flow.png',
    '/block/lava_still.png',
    '/block/lava_flow.png',
    // Legacy stone variants (often vanilla in 1.21 packs)
    '/block/stone_andesite',
    '/block/stone_diorite',
    '/block/stone_granite',
    // Furnaces (often vanilla in 1.21 packs)
    '/block/furnace_',
    // Legacy entity textures
    '/entity/alex.png',
    '/entity/arrow.png',
    '/entity/iron_golem.png',
    '/entity/sign.png',
    '/entity/snowman.png',
    // GUI elements
    '/gui/book.png',
    '/gui/recipe_book.png',
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadOptions();
});

function initializeEventListeners() {
    const dropZone112 = document.getElementById('dropZone112');
    const dropZone121 = document.getElementById('dropZone121');
    const fileInput112 = document.getElementById('fileInput112');
    const fileInput121 = document.getElementById('fileInput121');
    const convertBtn = document.getElementById('convertBtn');

    // File inputs
    dropZone112.addEventListener('click', () => fileInput112.click());
    dropZone121.addEventListener('click', () => fileInput121.click());
    fileInput112.addEventListener('change', (e) => handleFileSelect(e, '112'));
    fileInput121.addEventListener('change', (e) => handleFileSelect(e, '121'));

    // Drag and drop for 1.12
    dropZone112.addEventListener('dragover', handleDragOver);
    dropZone112.addEventListener('dragleave', handleDragLeave);
    dropZone112.addEventListener('drop', (e) => handleDrop(e, '112'));

    // Drag and drop for 1.21
    dropZone121.addEventListener('dragover', handleDragOver);
    dropZone121.addEventListener('dragleave', handleDragLeave);
    dropZone121.addEventListener('drop', (e) => handleDrop(e, '121'));

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

function handleDrop(e, version) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.zip')) {
        handleFile(files[0], version);
    } else {
        alert('Please drop a .zip file');
    }
}

function handleFileSelect(e, version) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file, version);
    }
}

function handleFile(file, version) {
    if (version === '112') {
        state.file112 = file;
        document.getElementById('fileInfo112').style.display = 'block';
        document.getElementById('fileName112').textContent = file.name;
        document.getElementById('fileSize112').textContent = formatBytes(file.size);
        document.getElementById('dropZone112').classList.add('has-file');
    } else {
        state.file121 = file;
        document.getElementById('fileInfo121').style.display = 'block';
        document.getElementById('fileName121').textContent = file.name;
        document.getElementById('fileSize121').textContent = formatBytes(file.size);
        document.getElementById('dropZone121').classList.add('has-file');
    }
    
    // Enable convert button if both files are loaded
    const convertBtn = document.getElementById('convertBtn');
    if (state.file112 && state.file121) {
        convertBtn.disabled = false;
        convertBtn.querySelector('.btn-text').textContent = 'CONVERT TO TUFF CLIENT';
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Check if a path should prefer the 1.12 version
function shouldPrefer112(path) {
    const pathLower = path.toLowerCase();
    for (const pattern of PREFER_112_PATTERNS) {
        if (pathLower.includes(pattern)) {
            return true;
        }
    }
    return false;
}

// Create wallpaper from panorama_0 (1920x1080 crop)
async function createWallpaperFromPanorama(outputZip, panorama0Blob) {
    return new Promise((resolve) => {
        const img = new Image();
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1920;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            
            // Use better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Calculate scaling to cover the entire 1920x1080 canvas
            const scale = Math.max(1920 / img.width, 1080 / img.height);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            
            // Center the image
            const x = (1920 - scaledWidth) / 2;
            const y = (1080 - scaledHeight) / 2;
            
            // Draw scaled and centered
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
            
            // Convert to JPEG with maximum quality
            canvas.toBlob((blob) => {
                outputZip.file('assets/tuff/textures/ui/wallpaper/classic.jpg', blob);
                resolve();
            }, 'image/jpeg', 1.0);
        };
        
        img.onerror = () => resolve(); // Skip if error
        
        // Load image from blob
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.readAsDataURL(panorama0Blob);
    });
}

async function convertPack() {
    if (!state.file112 || !state.file121) return;

    const progressSection = document.getElementById('progressSection');
    const convertBtn = document.getElementById('convertBtn');
    
    // Show progress
    progressSection.style.display = 'block';
    convertBtn.disabled = true;
    convertBtn.querySelector('.btn-text').textContent = 'CONVERTING...';

    try {
        updateProgress(0, 'Loading 1.12 reference pack...');
        const zip112 = await JSZip.loadAsync(state.file112);
        
        updateProgress(5, 'Loading 1.21 source pack...');
        const zip121 = await JSZip.loadAsync(state.file121);
        
        updateProgress(10, 'Analyzing file structures...');

        // Create output zip
        const outputZip = new JSZip();
        let processedFiles = 0;
        const totalFiles = Object.keys(zip121.files).length + Object.keys(zip112.files).length;

        // First, process 1.21 files
        for (const [path, file] of Object.entries(zip121.files)) {
            processedFiles++;
            const percent = 10 + Math.floor((processedFiles / totalFiles) * 40);
            
            if (processedFiles % 10 === 0) {
                updateProgress(percent, `Processing 1.21 files... (${processedFiles}/${totalFiles})`);
                await sleep(0);
            }

            if (file.dir) continue;
            if (shouldSkipFile(path)) continue;

            // Skip if we should prefer the 1.12 version
            if (shouldPrefer112(path)) continue;

            // Special handling for pack.mcmeta
            if (path.endsWith('pack.mcmeta') && state.options.updateMcmeta) {
                const content = await file.async('string');
                const modified = modifyPackMcmeta(content);
                outputZip.file(path, modified);
                continue;
            }

            const content = await file.async('blob');
            outputZip.file(path, content);
            await createLegacyDuplicates(outputZip, path, content);
        }

        // Now add files from 1.12 (these override 1.21 where applicable)
        updateProgress(50, 'Merging 1.12 reference textures...');
        for (const [path, file] of Object.entries(zip112.files)) {
            processedFiles++;
            const percent = 50 + Math.floor((processedFiles / totalFiles) * 20);
            
            if (processedFiles % 20 === 0) {
                updateProgress(percent, `Adding 1.12 textures... (${processedFiles}/${totalFiles})`);
                await sleep(0);
            }

            if (file.dir) continue;
            
            // Add if it should be preferred from 1.12, or if it doesn't exist in output yet
            if (shouldPrefer112(path) || !outputZip.file(path)) {
                // Only add texture/GUI/entity files from 1.12, skip junk
                if (path.includes('/textures/') || path.includes('/gui/') || 
                    path.includes('/entity/') || path.endsWith('pack.png') || 
                    path.endsWith('pack.mcmeta')) {
                    const content = await file.async('blob');
                    outputZip.file(path, content);
                    await createLegacyDuplicates(outputZip, path, content);
                }
            }
        }

        updateProgress(70, 'Creating wallpaper...');
        
        // Create wallpaper from panorama_0
        const panorama0Path = 'assets/minecraft/textures/gui/title/background/panorama_0.png';
        const panorama0File = outputZip.file(panorama0Path);
        
        if (panorama0File) {
            try {
                const panorama0Blob = await panorama0File.async('blob');
                await createWallpaperFromPanorama(outputZip, panorama0Blob);
            } catch (error) {
                console.warn('Could not create wallpaper:', error);
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
            : state.file121.name.replace('.zip', '_TuffClient.zip');
        
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

    if (state.options.removeNonTextures) {
        for (const folder of FOLDERS_TO_REMOVE) {
            if (pathLower.includes(`/${folder}/`) || pathLower.includes(`\\${folder}\\`)) {
                return true;
            }
        }

        for (const file of FILES_TO_REMOVE) {
            if (pathLower.endsWith(file)) {
                return true;
            }
        }
    }

    const filename = path.split('/').pop();
    if (TEMPLATE_ONLY_FILES.includes(filename)) {
        return true;
    }

    if (!state.options.convertNewMobs && pathLower.includes('entity/')) {
        const newMobs = ['warden', 'allay', 'frog.png', 'camel', 'sniffer'];
        for (const mob of newMobs) {
            if (pathLower.includes(mob)) {
                return true;
            }
        }
    }

    return false;
}

async function createLegacyDuplicates(outputZip, originalPath, content) {
    const path = originalPath.toLowerCase();
    
    const addDuplicate = (newPath) => {
        outputZip.file(newPath, content);
    };
    
    // === GRASS BLOCKS ===
    if (path.endsWith('/block/grass_block_side_overlay.png')) {
        addDuplicate(originalPath.replace(/grass_block_side_overlay\.png$/i, 'grass_side_overlay.png'));
    }
    if (path.endsWith('/block/grass_block_side.png')) {
        addDuplicate(originalPath.replace(/grass_block_side\.png$/i, 'grass_side.png'));
    }
    if (path.endsWith('/block/grass_block_top.png')) {
        addDuplicate(originalPath.replace(/grass_block_top\.png$/i, 'grass_top.png'));
    }
    if (path.endsWith('/block/grass_block_snow.png')) {
        addDuplicate(originalPath.replace(/grass_block_snow\.png$/i, 'grass_side_snowed.png'));
    }
    
    // === FARMLAND ===
    if (path.endsWith('/block/farmland.png')) {
        addDuplicate(originalPath.replace(/farmland\.png$/i, 'farmland_dry.png'));
    }
    if (path.endsWith('/block/farmland_moist.png')) {
        addDuplicate(originalPath.replace(/farmland_moist\.png$/i, 'farmland_wet.png'));
    }
    
    // === GRASS PATH ===
    if (path.endsWith('/block/dirt_path_top.png')) {
        addDuplicate(originalPath.replace(/dirt_path_top\.png$/i, 'grass_path_top.png'));
    }
    if (path.endsWith('/block/dirt_path_side.png')) {
        addDuplicate(originalPath.replace(/dirt_path_side\.png$/i, 'grass_path_side.png'));
    }
    
    // === WOOD TOOLS ===
    if (path.endsWith('/item/wooden_sword.png')) {
        addDuplicate(originalPath.replace(/wooden_sword\.png$/i, 'wood_sword.png'));
    }
    if (path.endsWith('/item/wooden_pickaxe.png')) {
        addDuplicate(originalPath.replace(/wooden_pickaxe\.png$/i, 'wood_pickaxe.png'));
    }
    if (path.endsWith('/item/wooden_axe.png')) {
        addDuplicate(originalPath.replace(/wooden_axe\.png$/i, 'wood_axe.png'));
    }
    if (path.endsWith('/item/wooden_shovel.png')) {
        addDuplicate(originalPath.replace(/wooden_shovel\.png$/i, 'wood_shovel.png'));
    }
    if (path.endsWith('/item/wooden_hoe.png')) {
        addDuplicate(originalPath.replace(/wooden_hoe\.png$/i, 'wood_hoe.png'));
    }
    
    // === GOLD TOOLS & ARMOR ===
    if (path.endsWith('/item/golden_sword.png')) {
        addDuplicate(originalPath.replace(/golden_sword\.png$/i, 'gold_sword.png'));
    }
    if (path.endsWith('/item/golden_pickaxe.png')) {
        addDuplicate(originalPath.replace(/golden_pickaxe\.png$/i, 'gold_pickaxe.png'));
    }
    if (path.endsWith('/item/golden_axe.png')) {
        addDuplicate(originalPath.replace(/golden_axe\.png$/i, 'gold_axe.png'));
    }
    if (path.endsWith('/item/golden_shovel.png')) {
        addDuplicate(originalPath.replace(/golden_shovel\.png$/i, 'gold_shovel.png'));
    }
    if (path.endsWith('/item/golden_hoe.png')) {
        addDuplicate(originalPath.replace(/golden_hoe\.png$/i, 'gold_hoe.png'));
    }
    if (path.endsWith('/item/golden_helmet.png')) {
        addDuplicate(originalPath.replace(/golden_helmet\.png$/i, 'gold_helmet.png'));
    }
    if (path.endsWith('/item/golden_chestplate.png')) {
        addDuplicate(originalPath.replace(/golden_chestplate\.png$/i, 'gold_chestplate.png'));
    }
    if (path.endsWith('/item/golden_leggings.png')) {
        addDuplicate(originalPath.replace(/golden_leggings\.png$/i, 'gold_leggings.png'));
    }
    if (path.endsWith('/item/golden_boots.png')) {
        addDuplicate(originalPath.replace(/golden_boots\.png$/i, 'gold_boots.png'));
    }
    if (path.endsWith('/item/golden_apple.png')) {
        addDuplicate(originalPath.replace(/golden_apple\.png$/i, 'apple_golden.png'));
    }
    
    // === GLASS & GLASS PANES ===
    const glassColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                         'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of glassColors) {
        if (path.endsWith(`/block/${color}_stained_glass.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_stained_glass\\.png$`, 'i'), `glass_${color}.png`));
        }
        if (path.endsWith(`/block/${color}_stained_glass_pane_top.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_stained_glass_pane_top\\.png$`, 'i'), `glass_pane_top_${color}.png`));
        }
    }
    
    // === WOOL ===
    const woolColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                        'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of woolColors) {
        if (path.endsWith(`/block/${color}_wool.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_wool\\.png$`, 'i'), `wool_colored_${color}.png`));
        }
    }
    
    // === CONCRETE ===
    const concreteColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                            'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of concreteColors) {
        if (path.endsWith(`/block/${color}_concrete.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_concrete\\.png$`, 'i'), `concrete_${color}.png`));
        }
        if (path.endsWith(`/block/${color}_concrete_powder.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_concrete_powder\\.png$`, 'i'), `concrete_powder_${color}.png`));
        }
    }
    
    // === TERRACOTTA ===
    const terracottaColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                              'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of terracottaColors) {
        if (path.endsWith(`/block/${color}_terracotta.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_terracotta\\.png$`, 'i'), `hardened_clay_stained_${color}.png`));
        }
    }
    
    if (path.endsWith('/block/terracotta.png')) {
        addDuplicate(originalPath.replace(/terracotta\.png$/i, 'hardened_clay.png'));
    }
    
    // === GLAZED TERRACOTTA ===
    const glazedColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                          'gray', 'silver', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of glazedColors) {
        if (path.endsWith(`/block/${color}_glazed_terracotta.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_glazed_terracotta\\.png$`, 'i'), `glazed_terracotta_${color}.png`));
        }
    }
    
    // === LOGS ===
    const logTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of logTypes) {
        if (path.endsWith(`/block/${wood}_log.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_log\\.png$`, 'i'), `log_${legacyName}.png`));
        }
        if (path.endsWith(`/block/${wood}_log_top.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_log_top\\.png$`, 'i'), `log_${legacyName}_top.png`));
        }
    }
    
    // === PLANKS ===
    const plankTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of plankTypes) {
        if (path.endsWith(`/block/${wood}_planks.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_planks\\.png$`, 'i'), `planks_${legacyName}.png`));
        }
    }
    
    // === LEAVES ===
    const leafTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of leafTypes) {
        if (path.endsWith(`/block/${wood}_leaves.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_leaves\\.png$`, 'i'), `leaves_${legacyName}.png`));
        }
    }
    
    // === SAPLINGS ===
    const saplingTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of saplingTypes) {
        if (path.endsWith(`/block/${wood}_sapling.png`)) {
            const legacyName = wood === 'dark_oak' ? 'roofed_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_sapling\\.png$`, 'i'), `sapling_${legacyName}.png`));
        }
    }
    
    // === PODZOL ===
    if (path.endsWith('/block/podzol_top.png')) {
        addDuplicate(originalPath.replace(/podzol_top\.png$/i, 'dirt_podzol_top.png'));
    }
    if (path.endsWith('/block/podzol_side.png')) {
        addDuplicate(originalPath.replace(/podzol_side\.png$/i, 'dirt_podzol_side.png'));
    }
    
    // === STONE VARIANTS ===
    // Duplicate modern names to legacy names (andesite.png -> stone_andesite.png)
    if (path.endsWith('/block/andesite.png')) {
        addDuplicate(originalPath.replace(/andesite\.png$/i, 'stone_andesite.png'));
    }
    if (path.endsWith('/block/polished_andesite.png')) {
        addDuplicate(originalPath.replace(/polished_andesite\.png$/i, 'stone_andesite_smooth.png'));
    }
    if (path.endsWith('/block/diorite.png')) {
        addDuplicate(originalPath.replace(/diorite\.png$/i, 'stone_diorite.png'));
    }
    if (path.endsWith('/block/polished_diorite.png')) {
        addDuplicate(originalPath.replace(/polished_diorite\.png$/i, 'stone_diorite_smooth.png'));
    }
    if (path.endsWith('/block/granite.png')) {
        addDuplicate(originalPath.replace(/granite\.png$/i, 'stone_granite.png'));
    }
    if (path.endsWith('/block/polished_granite.png')) {
        addDuplicate(originalPath.replace(/polished_granite\.png$/i, 'stone_granite_smooth.png'));
    }
    
    // Duplicate legacy names to modern names (stone_andesite.png -> andesite.png)
    if (path.endsWith('/block/stone_andesite.png')) {
        addDuplicate(originalPath.replace(/stone_andesite\.png$/i, 'andesite.png'));
    }
    if (path.endsWith('/block/stone_andesite_smooth.png')) {
        addDuplicate(originalPath.replace(/stone_andesite_smooth\.png$/i, 'polished_andesite.png'));
    }
    if (path.endsWith('/block/stone_diorite.png')) {
        addDuplicate(originalPath.replace(/stone_diorite\.png$/i, 'diorite.png'));
    }
    if (path.endsWith('/block/stone_diorite_smooth.png')) {
        addDuplicate(originalPath.replace(/stone_diorite_smooth\.png$/i, 'polished_diorite.png'));
    }
    if (path.endsWith('/block/stone_granite.png')) {
        addDuplicate(originalPath.replace(/stone_granite\.png$/i, 'granite.png'));
    }
    if (path.endsWith('/block/stone_granite_smooth.png')) {
        addDuplicate(originalPath.replace(/stone_granite_smooth\.png$/i, 'polished_granite.png'));
    }
    
    // === END PORTAL FRAME ===
    if (path.endsWith('/block/end_portal_frame_top.png')) {
        addDuplicate(originalPath.replace(/end_portal_frame_top\.png$/i, 'endframe_top.png'));
    }
    if (path.endsWith('/block/end_portal_frame_side.png')) {
        addDuplicate(originalPath.replace(/end_portal_frame_side\.png$/i, 'endframe_side.png'));
    }
    if (path.endsWith('/block/end_portal_frame_eye.png')) {
        addDuplicate(originalPath.replace(/end_portal_frame_eye\.png$/i, 'endframe_eye.png'));
    }
    
    // === ICE ===
    if (path.endsWith('/block/packed_ice.png')) {
        addDuplicate(originalPath.replace(/packed_ice\.png$/i, 'ice_packed.png'));
    }
    
    // === NETHER PORTAL ===
    if (path.endsWith('/block/nether_portal.png')) {
        addDuplicate(originalPath.replace(/nether_portal\.png$/i, 'portal.png'));
    }
    if (path.endsWith('/block/nether_portal.png.mcmeta')) {
        addDuplicate(originalPath.replace(/nether_portal\.png\.mcmeta$/i, 'portal.png.mcmeta'));
    }
    
    // === NETHER QUARTZ ORE ===
    if (path.endsWith('/block/nether_quartz_ore.png')) {
        addDuplicate(originalPath.replace(/nether_quartz_ore\.png$/i, 'quartz_ore.png'));
    }
    
    // === RED NETHER BRICK ===
    if (path.endsWith('/block/red_nether_bricks.png')) {
        addDuplicate(originalPath.replace(/red_nether_bricks\.png$/i, 'red_nether_brick.png'));
    }
    
    // === TOTEM ===
    if (path.endsWith('/item/totem_of_undying.png')) {
        addDuplicate(originalPath.replace(/totem_of_undying\.png$/i, 'totem.png'));
    }
    
    // === DOORS - ALL WOOD TYPES ===
    const doorTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of doorTypes) {
        if (path.endsWith(`/block/${wood}_door_bottom.png`)) {
            const legacyName = wood === 'oak' ? 'wood' : wood === 'dark_oak' ? 'dark_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_door_bottom\\.png$`, 'i'), `door_${legacyName}_lower.png`));
        }
        if (path.endsWith(`/block/${wood}_door_top.png`)) {
            const legacyName = wood === 'oak' ? 'wood' : wood === 'dark_oak' ? 'dark_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_door_top\\.png$`, 'i'), `door_${legacyName}_upper.png`));
        }
    }
    
    // Iron door
    if (path.endsWith('/block/iron_door_bottom.png')) {
        addDuplicate(originalPath.replace(/iron_door_bottom\.png$/i, 'door_iron_lower.png'));
    }
    if (path.endsWith('/block/iron_door_top.png')) {
        addDuplicate(originalPath.replace(/iron_door_top\.png$/i, 'door_iron_upper.png'));
    }
    
    // === TALLGRASS / FERN ===
    if (path.endsWith('/block/short_grass.png')) {
        addDuplicate(originalPath.replace(/short_grass\.png$/i, 'tallgrass.png'));
    }
    
    // === DEAD BUSH ===
    if (path.endsWith('/block/dead_bush.png')) {
        addDuplicate(originalPath.replace(/dead_bush\.png$/i, 'deadbush.png'));
    }
    
    // === LILY PAD ===
    if (path.endsWith('/block/lily_pad.png')) {
        addDuplicate(originalPath.replace(/lily_pad\.png$/i, 'waterlily.png'));
    }
    
    // === PUMPKIN STEM ===
    if (path.endsWith('/block/pumpkin_stem.png')) {
        addDuplicate(originalPath.replace(/pumpkin_stem\.png$/i, 'stem_pumpkin_disconnected.png'));
    }
    if (path.endsWith('/block/attached_pumpkin_stem.png')) {
        addDuplicate(originalPath.replace(/attached_pumpkin_stem\.png$/i, 'stem_pumpkin_connected.png'));
    }
    
    // === MELON STEM ===
    if (path.endsWith('/block/melon_stem.png')) {
        addDuplicate(originalPath.replace(/melon_stem\.png$/i, 'stem_melon_disconnected.png'));
    }
    if (path.endsWith('/block/attached_melon_stem.png')) {
        addDuplicate(originalPath.replace(/attached_melon_stem\.png$/i, 'stem_melon_connected.png'));
    }
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
        progressDetails.textContent = `Merging 1.12 and 1.21 packs...`;
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

window.addEventListener('load', () => {
    if (!checkBrowserSupport()) {
        document.getElementById('convertBtn').disabled = true;
    }
});
