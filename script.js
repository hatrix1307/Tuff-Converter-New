// Tuff Client Texture Pack Converter
// Merges 1.12 reference pack with 1.21 source pack

const state = {
    file112: null,
    file121: null,
    options: {
        removeNonTextures: true,
        convertNewMobs: false,
        updateMcmeta: true,
        packName: '',
        useBetaBuild: false
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
    '/block/water_still.png',
    '/block/water_flow.png',
    '/block/lava_still.png',
    '/block/lava_flow.png',
    '.mcmeta',
    '/block/stone_andesite',
    '/block/stone_diorite',
    '/block/stone_granite',
    '/block/andesite.png',
    '/block/polished_andesite.png',
    '/block/diorite.png',
    '/block/polished_diorite.png',
    '/block/granite.png',
    '/block/polished_granite.png',
    '/block/furnace_front.png',
    '/block/furnace_front_on.png',
    '/block/furnace_side.png',
    '/block/furnace_top.png',
    '/entity/alex.png',
    '/entity/arrow.png',
    '/entity/iron_golem.png',
    '/entity/sign.png',
    '/entity/snowman.png',
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

    dropZone112.addEventListener('click', () => fileInput112.click());
    dropZone121.addEventListener('click', () => fileInput121.click());
    fileInput112.addEventListener('change', (e) => handleFileSelect(e, '112'));
    fileInput121.addEventListener('change', (e) => handleFileSelect(e, '121'));

    dropZone112.addEventListener('dragover', handleDragOver);
    dropZone112.addEventListener('dragleave', handleDragLeave);
    dropZone112.addEventListener('drop', (e) => handleDrop(e, '112'));

    dropZone121.addEventListener('dragover', handleDragOver);
    dropZone121.addEventListener('dragleave', handleDragLeave);
    dropZone121.addEventListener('drop', (e) => handleDrop(e, '121'));

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
    document.getElementById('useBetaBuild').addEventListener('change', (e) => {
        state.options.useBetaBuild = e.target.checked;
        saveOptions();
    });

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

function shouldPrefer112(path) {
    const pathLower = path.toLowerCase();
    for (const pattern of PREFER_112_PATTERNS) {
        if (pathLower.includes(pattern)) {
            return true;
        }
    }
    return false;
}

// FIXED: Wallpaper creation with explicit cleanup to prevent ghost classic.jpg files
async function createWallpaperFromPanorama(outputZip, panoramaBlobs, useBetaBuild) {
    return new Promise((resolve) => {
        const wpPath = 'assets/tuff/textures/ui/wallpaper/';
        const classicFile = wpPath + 'classic.jpg';
        const betaFile = wpPath + 'background.png';

        // ALWAYS remove both first to ensure no conflicts or "old method" leftovers
        outputZip.remove(classicFile);
        outputZip.remove(betaFile);

        if (!useBetaBuild) {
            // Standard mode: create classic.jpg
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 1920;
                canvas.height = 1080;
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                const scale = Math.max(1920 / img.width, 1080 / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const x = (1920 - scaledWidth) / 2;
                const y = (1080 - scaledHeight) / 2;
                
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
                canvas.toBlob((blob) => {
                    outputZip.file(classicFile, blob);
                    resolve();
                }, 'image/jpeg', 1.0);
            };
            img.onerror = () => resolve();
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(panoramaBlobs[0]);
            
        } else {
            // Beta mode: stitch 4 panoramas into background.png
            const images = [];
            let loaded = 0;
            
            const onAllLoaded = () => {
                if (!images.every(img => img.complete && img.naturalWidth > 0)) {
                    console.warn('Stitching failed: One or more panorama images failed to load.');
                    resolve();
                    return;
                }
                
                const imgWidth = images[0].width;
                const imgHeight = images[0].height;
                
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgWidth * 4;
                tempCanvas.height = imgHeight;
                const tempCtx = tempCanvas.getContext('2d');
                
                // Stitching order: back(2), right(0), front(3), left(1)
                tempCtx.drawImage(images[2], 0, 0);
                tempCtx.drawImage(images[0], imgWidth, 0);
                tempCtx.drawImage(images[3], imgWidth * 2, 0);
                tempCtx.drawImage(images[1], imgWidth * 3, 0);
                
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = 1920;
                finalCanvas.height = 1080;
                const finalCtx = finalCanvas.getContext('2d');
                finalCtx.imageSmoothingEnabled = true;
                finalCtx.imageSmoothingQuality = 'high';
                
                const scale = Math.max(1920 / tempCanvas.width, 1080 / tempCanvas.height);
                const scaledWidth = tempCanvas.width * scale;
                const scaledHeight = tempCanvas.height * scale;
                const x = (1920 - scaledWidth) / 2;
                const y = (1080 - scaledHeight) / 2;
                
                finalCtx.drawImage(tempCanvas, x, y, scaledWidth, scaledHeight);
                finalCanvas.toBlob((blob) => {
                    outputZip.file(betaFile, blob);
                    resolve();
                }, 'image/png');
            };

            for (let i = 0; i < 6; i++) {
                images[i] = new Image();
                images[i].onload = () => { loaded++; if (loaded === 6) onAllLoaded(); };
                images[i].onerror = () => { loaded++; if (loaded === 6) onAllLoaded(); };
                const reader = new FileReader();
                reader.onload = (e) => { images[i].src = e.target.result; };
                reader.readAsDataURL(panoramaBlobs[i]);
            }
        }
    });
}

async function convertPack() {
    if (!state.file112 || !state.file121) return;

    const progressSection = document.getElementById('progressSection');
    const convertBtn = document.getElementById('convertBtn');
    progressSection.style.display = 'block';
    convertBtn.disabled = true;
    convertBtn.querySelector('.btn-text').textContent = 'CONVERTING...';

    try {
        updateProgress(0, 'Loading 1.12 reference pack...');
        const zip112 = await JSZip.loadAsync(state.file112);
        
        updateProgress(5, 'Loading 1.21 source pack...');
        const zip121 = await JSZip.loadAsync(state.file121);
        
        const outputZip = new JSZip();
        let processedFiles = 0;
        const totalFiles = Object.keys(zip121.files).length + Object.keys(zip112.files).length;

        // Process 1.21 files
        for (const [path, file] of Object.entries(zip121.files)) {
            processedFiles++;
            const percent = 10 + Math.floor((processedFiles / totalFiles) * 40);
            if (processedFiles % 10 === 0) updateProgress(percent, `Processing 1.21 files...`);
            if (file.dir || shouldSkipFile(path)) continue;

            if (path.endsWith('pack.mcmeta') && state.options.updateMcmeta) {
                const content = await file.async('string');
                outputZip.file(path, modifyPackMcmeta(content));
                continue;
            }

            const content = await file.async('blob');
            outputZip.file(path, content);
            await createLegacyDuplicates(outputZip, path, content);
        }

        // Merge 1.12 files
        updateProgress(50, 'Merging 1.12 reference textures...');
        for (const [path, file] of Object.entries(zip112.files)) {
            processedFiles++;
            if (file.dir) continue;
            
            if (path.includes('/textures/') || path.includes('/gui/') || path.includes('/entity/') || path.endsWith('pack.png')) {
                const content = await file.async('blob');
                if (shouldPrefer112(path)) {
                    outputZip.remove(path);
                    outputZip.file(path, content);
                    await createLegacyDuplicates(outputZip, path, content);
                } else if (!outputZip.file(path)) {
                    outputZip.file(path, content);
                    await createLegacyDuplicates(outputZip, path, content);
                }
            }
        }

        updateProgress(70, 'Creating wallpaper...');
        const panoramaBasePath = 'assets/minecraft/textures/gui/title/background/panorama_';
        const panoramaBlobs = [];
        for (let i = 0; i < 6; i++) {
            const panoFile = outputZip.file(panoramaBasePath + i + '.png');
            if (panoFile) panoramaBlobs[i] = await panoFile.async('blob');
        }
        
        if (panoramaBlobs[0]) {
            try {
                // EXPLICIT: pass the current state option
                await createWallpaperFromPanorama(outputZip, panoramaBlobs, state.options.useBetaBuild);
            } catch (error) {
                console.warn('Could not create wallpaper:', error);
            }
        }

        updateProgress(90, 'Generating download...');
        const blob = await outputZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });

        const filename = state.options.packName 
            ? `${state.options.packName}_TuffClient.zip`
            : state.file121.name.replace('.zip', '_TuffClient.zip');
        
        saveAs(blob, filename);
        updateProgress(100, '✅ Conversion complete!');
        convertBtn.disabled = false;

    } catch (error) {
        console.error('Conversion error:', error);
        updateProgress(0, `❌ Error: ${error.message}`);
        convertBtn.disabled = false;
    }
}

function shouldSkipFile(path) {
    const pathLower = path.toLowerCase();
    if (state.options.removeNonTextures) {
        for (const folder of FOLDERS_TO_REMOVE) if (pathLower.includes(`/${folder}/`)) return true;
        for (const file of FILES_TO_REMOVE) if (pathLower.endsWith(file)) return true;
    }
    if (TEMPLATE_ONLY_FILES.includes(path.split('/').pop())) return true;
    return false;
}

async function createLegacyDuplicates(outputZip, originalPath, content) {
    const path = originalPath.toLowerCase();
    const addDup = (newPath) => outputZip.file(newPath, content);
    
    // Core duplicates for UI and terrain
    if (path.endsWith('grass_block_side.png')) addDup(originalPath.replace('grass_block_side', 'grass_side'));
    if (path.endsWith('grass_block_top.png')) addDup(originalPath.replace('grass_block_top', 'grass_top'));
    if (path.endsWith('wooden_sword.png')) addDup(originalPath.replace('wooden_sword', 'wood_sword'));
}

function modifyPackMcmeta(content) {
    try {
        const data = JSON.parse(content);
        data.pack.pack_format = 3;
        if (state.options.packName) data.pack.description = `${state.options.packName} - Tuff Client`;
        return JSON.stringify(data, null, 4);
    } catch (e) { return content; }
}

function updateProgress(percent, message) {
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressLabel').textContent = message;
}

function saveOptions() { localStorage.setItem('tuffConverterOptions', JSON.stringify(state.options)); }
function loadOptions() {
    const saved = localStorage.getItem('tuffConverterOptions');
    if (saved) {
        try {
            const options = JSON.parse(saved);
            state.options = { ...state.options, ...options };
            document.getElementById('useBetaBuild').checked = state.options.useBetaBuild;
            document.getElementById('packName').value = state.options.packName;
        } catch (error) {}
    }
}
