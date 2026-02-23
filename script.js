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

// Helper function to convert blob to data URL
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Apply blue tint to grayscale water texture
async function applyBlueTint(dataUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Check if image is grayscale (first 100 pixels)
            let isGrayscale = true;
            for (let i = 0; i < Math.min(100 * 4, data.length); i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (Math.abs(r - g) > 10 || Math.abs(g - b) > 10 || Math.abs(r - b) > 10) {
                    isGrayscale = false;
                    break;
                }
            }
            
            // If grayscale, apply blue tint
            if (isGrayscale) {
                for (let i = 0; i < data.length; i += 4) {
                    const gray = data[i]; // R, G, B are same in grayscale
                    const alpha = data[i + 3];
                    
                    // Apply blue tint: keep brightness but make it blue
                    // Blue water color: approximately RGB(63, 118, 228)
                    const brightness = gray / 255;
                    data[i] = Math.floor(63 * brightness);     // R
                    data[i + 1] = Math.floor(118 * brightness); // G  
                    data[i + 2] = Math.floor(228 * brightness); // B
                    data[i + 3] = alpha; // Keep original alpha
                }
                
                ctx.putImageData(imageData, 0, 0);
                
                // Convert to base64 PNG
                const base64 = canvas.toDataURL('image/png').split(',')[1];
                resolve(base64);
            } else {
                // Not grayscale, return null (keep original)
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
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
            const percent = 10 + Math.floor((processedFiles / totalFiles) * 55);
            
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

            // Get file content
            const content = await file.async('blob');

            // Add the original file
            outputZip.file(path, content);

            // Create legacy duplicates for compatibility
            await createLegacyDuplicates(outputZip, path, content);
        }

        updateProgress(65, 'Processing water textures...');

        // Process water textures - apply blue tint if grayscale
        const waterStillPath = 'assets/minecraft/textures/block/water_still.png';
        const waterFlowPath = 'assets/minecraft/textures/block/water_flow.png';
        
        for (const waterPath of [waterStillPath, waterFlowPath]) {
            const waterFile = outputZip.file(waterPath);
            if (waterFile) {
                try {
                    const waterBlob = await waterFile.async('blob');
                    const waterDataUrl = await blobToDataURL(waterBlob);
                    
                    // Check if image is grayscale and apply blue tint
                    const tintedWater = await applyBlueTint(waterDataUrl);
                    if (tintedWater) {
                        outputZip.file(waterPath, tintedWater, {base64: true});
                    }
                } catch (error) {
                    console.warn('Could not process water texture:', error);
                }
            }
        }
        
        // Add missing water animation metadata if needed
        const waterMcmetaPath = 'assets/minecraft/textures/block/water_still.png.mcmeta';
        if (outputZip.file(waterStillPath) && !outputZip.file(waterMcmetaPath)) {
            const waterMcmeta = { animation: { frametime: 2 } };
            outputZip.file(waterMcmetaPath, JSON.stringify(waterMcmeta, null, 2));
        }

        updateProgress(75, 'Creating wallpaper...');
        
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

    return false;
}

async function createLegacyDuplicates(outputZip, originalPath, content) {
    const path = originalPath.toLowerCase();
    
    // Helper function to add duplicate
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
    
    // === DYES (color_dye to dye_color) ===
    const dyeColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 
                       'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of dyeColors) {
        if (path.endsWith(`/item/${color}_dye.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_dye\\.png$`, 'i'), `dye_${color}.png`));
        }
    }
    
    // === GLASS & GLASS PANES (color_stained_glass to glass_color) ===
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
    
    // === WOOL (color_wool to wool_colored_color) ===
    const woolColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                        'gray', 'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of woolColors) {
        if (path.endsWith(`/block/${color}_wool.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_wool\\.png$`, 'i'), `wool_colored_${color}.png`));
        }
    }
    
    // === CONCRETE (color_concrete to concrete_color) ===
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
    
    // === TERRACOTTA (color_terracotta to hardened_clay_stained_color) ===
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
    
    // === GLAZED TERRACOTTA (color_glazed_terracotta to glazed_terracotta_color) ===
    const glazedColors = ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink',
                          'gray', 'silver', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'];
    
    for (const color of glazedColors) {
        if (path.endsWith(`/block/${color}_glazed_terracotta.png`)) {
            addDuplicate(originalPath.replace(new RegExp(`${color}_glazed_terracotta\\.png$`, 'i'), `glazed_terracotta_${color}.png`));
        }
    }
    
    // === LOGS (oak_log to log_oak) ===
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
    
    // === PLANKS (oak_planks to planks_oak) ===
    const plankTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of plankTypes) {
        if (path.endsWith(`/block/${wood}_planks.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_planks\\.png$`, 'i'), `planks_${legacyName}.png`));
        }
    }
    
    // === LEAVES (oak_leaves to leaves_oak) ===
    const leafTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    
    for (const wood of leafTypes) {
        if (path.endsWith(`/block/${wood}_leaves.png`)) {
            const legacyName = wood === 'dark_oak' ? 'big_oak' : wood;
            addDuplicate(originalPath.replace(new RegExp(`${wood}_leaves\\.png$`, 'i'), `leaves_${legacyName}.png`));
        }
    }
    
    // === SAPLINGS (oak_sapling to sapling_oak) ===
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
    
    // === DOORS (oak_door to door_wood, iron_door to door_iron) ===
    if (path.endsWith('/block/oak_door_bottom.png')) {
        addDuplicate(originalPath.replace(/oak_door_bottom\.png$/i, 'door_wood_lower.png'));
    }
    if (path.endsWith('/block/oak_door_top.png')) {
        addDuplicate(originalPath.replace(/oak_door_top\.png$/i, 'door_wood_upper.png'));
    }
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
        
        // Only update description if custom pack name is provided
        if (state.options.packName) {
            data.pack.description = `${state.options.packName} - Tuff Client Edition`;
        }
        
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
