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

// Files to take from 1.12 reference pack (better quality/animated)
const PREFER_112_FILES = [
    // Animated textures
    'assets/minecraft/textures/block/water_still.png',
    'assets/minecraft/textures/block/water_still.png.mcmeta',
    'assets/minecraft/textures/block/water_flow.png',
    'assets/minecraft/textures/block/water_flow.png.mcmeta',
    'assets/minecraft/textures/block/lava_still.png',
    'assets/minecraft/textures/block/lava_still.png.mcmeta',
    'assets/minecraft/textures/block/lava_flow.png',
    'assets/minecraft/textures/block/lava_flow.png.mcmeta',
    // Legacy entity textures
    'assets/minecraft/textures/entity/alex.png',
    'assets/minecraft/textures/entity/arrow.png',
    'assets/minecraft/textures/entity/iron_golem.png',
    'assets/minecraft/textures/entity/sign.png',
    'assets/minecraft/textures/entity/snowman.png',
    // GUI elements that are better in 1.12
    'assets/minecraft/textures/gui/book.png',
    'assets/minecraft/textures/gui/recipe_book.png',
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

// Helper function to convert blob to data URL
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Create wallpaper from panorama images
async function createWallpaperFromPanorama(outputZip, panorama0Blob, panorama1Blob) {
    return new Promise((resolve) => {
        const img0 = new Image();
        const img1 = new Image();
        let loaded = 0;
        
        const onBothLoaded = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1920;
            const ctx = canvas.getContext('2d');
            
            // Fill with black background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 1080, 1920);
            
            // Calculate scaling to fit 540x1920 for each half
            const targetWidth = 540;
            const targetHeight = 1920;
            
            // Draw panorama 0 on left half (0, 0, 540, 1920)
            const scale0 = Math.max(targetWidth / img0.width, targetHeight / img0.height);
            const scaledWidth0 = img0.width * scale0;
            const scaledHeight0 = img0.height * scale0;
            const x0 = (targetWidth - scaledWidth0) / 2;
            const y0 = (targetHeight - scaledHeight0) / 2;
            ctx.drawImage(img0, x0, y0, scaledWidth0, scaledHeight0);
            
            // Draw panorama 1 on right half (540, 0, 540, 1920)
            const scale1 = Math.max(targetWidth / img1.width, targetHeight / img1.height);
            const scaledWidth1 = img1.width * scale1;
            const scaledHeight1 = img1.height * scale1;
            const x1 = 540 + (targetWidth - scaledWidth1) / 2;
            const y1 = (targetHeight - scaledHeight1) / 2;
            ctx.drawImage(img1, x1, y1, scaledWidth1, scaledHeight1);
            
            // Convert to JPEG base64
            canvas.toBlob((blob) => {
                outputZip.file('assets/tuff/textures/ui/wallpaper/classic.jpg', blob);
                resolve();
            }, 'image/jpeg', 0.9);
        };
        
        img0.onload = () => {
            loaded++;
            if (loaded === 2) onBothLoaded();
        };
        
        img1.onload = () => {
            loaded++;
            if (loaded === 2) onBothLoaded();
        };
        
        img0.onerror = () => resolve(); // Skip if error
        img1.onerror = () => resolve();
        
        // Load images from blobs
        const reader0 = new FileReader();
        reader0.onload = (e) => { img0.src = e.target.result; };
        reader0.readAsDataURL(panorama0Blob);
        
        const reader1 = new FileReader();
        reader1.onload = (e) => { img1.src = e.target.result; };
        reader1.readAsDataURL(panorama1Blob);
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
        const totalFiles = Object.keys(zip121.files).length + PREFER_112_FILES.length;

        // First, process 1.21 files
        for (const [path, file] of Object.entries(zip121.files)) {
            processedFiles++;
            const percent = 10 + Math.floor((processedFiles / totalFiles) * 45);
            
            if (processedFiles % 10 === 0) {
                updateProgress(percent, `Processing 1.21 files... (${processedFiles}/${totalFiles})`);
                await sleep(0);
            }

            if (file.dir) continue;
            if (shouldSkipFile(path)) continue;

            // Skip if we prefer the 1.12 version
            if (PREFER_112_FILES.includes(path.toLowerCase())) continue;

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

        // Now add preferred files from 1.12
        updateProgress(55, 'Merging 1.12 reference textures...');
        for (const prefPath of PREFER_112_FILES) {
            const file112 = zip112.file(prefPath);
            if (file112) {
                const content = await file112.async('blob');
                outputZip.file(prefPath, content);
                await createLegacyDuplicates(outputZip, prefPath, content);
            }
        }

        // Add all legacy files from 1.12 that don't exist in 1.21
        updateProgress(60, 'Adding legacy 1.12 assets...');
        for (const [path, file] of Object.entries(zip112.files)) {
            if (file.dir) continue;
            if (outputZip.file(path)) continue; // Already added
            
            // Add legacy GUI, entity, and other assets
            if (path.includes('/gui/') || path.includes('/entity/') || 
                path.includes('/item/') && !outputZip.file(path)) {
                const content = await file.async('blob');
                outputZip.file(path, content);
            }
        }

        updateProgress(70, 'Creating wallpaper...');
        
        // Create wallpaper from panorama images
        const panorama0Path = 'assets/minecraft/textures/gui/title/background/panorama_0.png';
        const panorama1Path = 'assets/minecraft/textures/gui/title/background/panorama_1.png';
        
        const panorama0File = outputZip.file(panorama0Path);
        const panorama1File = outputZip.file(panorama1Path);
        
        if (panorama0File && panorama1File) {
            try {
                const panorama0Blob = await panorama0File.async('blob');
                const panorama1Blob = await panorama1File.async('blob');
                await createWallpaperFromPanorama(outputZip, panorama0Blob, panorama1Blob);
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
