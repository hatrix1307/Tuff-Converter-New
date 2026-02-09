/**
 * Tuff Client Universal Converter – Dual Renderer Edition
 * Keeps 1.13+ textures AND generates correct 1.12 legacy aliases
 */

const state = {
    file: null,
    mappingData: {},
    options: {
        removeNonTextures: true,
        updateMcmeta: true,
        packName: ''
    }
};

const API_SOURCES = [
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/block_renames.json",
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/1.13/item_renames.json"
];

const FOLDERS_TO_REMOVE = [
    'sounds','lang','advancements','loot_tables','recipes',
    'structures','shaders','font','texts','eagler'
];

/* ---------- LEGACY TABLES (1.12 ERA) ---------- */

const DYE_MAP = {
    white_dye:'dye_powder_white', orange_dye:'dye_powder_orange',
    magenta_dye:'dye_powder_magenta', light_blue_dye:'dye_powder_light_blue',
    yellow_dye:'dye_powder_yellow', lime_dye:'dye_powder_lime',
    pink_dye:'dye_powder_pink', gray_dye:'dye_powder_gray',
    light_gray_dye:'dye_powder_silver', cyan_dye:'dye_powder_cyan',
    purple_dye:'dye_powder_purple', blue_dye:'dye_powder_blue',
    brown_dye:'dye_powder_brown', green_dye:'dye_powder_green',
    red_dye:'dye_powder_red', black_dye:'dye_powder_black'
};

document.addEventListener('DOMContentLoaded', async () => {
    initializeUI();
    await fetchAndInvertMappings();
});

async function fetchAndInvertMappings() {
    for (const url of API_SOURCES) {
        const data = await (await fetch(url)).json();
        for (const [oldName, newName] of Object.entries(data)) {
            state.mappingData[newName.replace('minecraft:','')] =
                oldName.replace('minecraft:','');
        }
    }
}

/* ---------- CORE ---------- */

async function convertPack() {
    const zip = await JSZip.loadAsync(state.file);
    const out = new JSZip();
    const files = Object.keys(zip.files);
    const chestParts = { normal:{}, trapped:{} };

    for (const path of files) {
        const file = zip.files[path];
        if (file.dir || shouldSkip(path)) continue;

        const blob = await file.async('blob');
        const lower = path.toLowerCase();

        if (lower.includes('entity/chest/')) {
            if (lower.endsWith('left.png')) chestParts.normal.left = blob;
            if (lower.endsWith('right.png')) chestParts.normal.right = blob;
        }

        if (lower.includes('assets/minecraft/textures/')) {
            await processTexture(out, path, blob);
        } else if (lower.endsWith('pack.mcmeta')) {
            out.file(path, modifyPackMcmeta(await file.async('string')));
        } else {
            out.file(path, blob);
        }
    }

    await stitchDoubleChests(out, chestParts);
    saveAs(await out.generateAsync({type:'blob'}), "Universal_Tuff_Pack.zip");
}

/* ---------- TEXTURE PIPELINE ---------- */

async function processTexture(zip, path, blob) {
    const lower = path.toLowerCase();

    /* ALWAYS keep modern texture */
    zip.file(path, blob);

    const m = lower.match(/textures\/(.+)\.png$/);
    if (!m) return;

    const internal = m[1];
    const folder = internal.split('/')[0];
    const file = internal.split('/').pop();

    /* ----- ENTITY FIXES (BLACK MOBS) ----- */

    if (folder === 'entity') {
        if (file.includes('_overlay') || file.includes('_outer_layer')) return;

        const legacy = `assets/minecraft/textures/entity/${file}`;
        zip.file(legacy, await stripAlpha(blob));

        if (file.endsWith('_eyes.png')) {
            zip.file(
                legacy.replace('_eyes.png','.png'),
                await stripAlpha(blob)
            );
        }
        return;
    }

    /* ----- FAMILY FIXES ----- */

    if (file.endsWith('_planks.png'))
        zip.file(`assets/minecraft/textures/blocks/planks_${file.replace('_planks.png','')}.png`, blob);

    if (file.endsWith('_log.png'))
        zip.file(`assets/minecraft/textures/blocks/log_${file.replace('_log.png','')}.png`, blob);

    if (file.endsWith('_wool.png'))
        zip.file(`assets/minecraft/textures/blocks/wool_colored_${file.replace('_wool.png','')}.png`, blob);

    if (DYE_MAP[file.replace('.png','')])
        zip.file(`assets/minecraft/textures/items/${DYE_MAP[file.replace('.png','')]}.png`, blob);

    if (file === 'glass.png') {
        zip.file('assets/minecraft/textures/blocks/glass_pane_top.png', blob);
        zip.file('assets/minecraft/textures/blocks/glass_pane_side.png', blob);
    }

    if (file === 'nether_quartz_ore.png')
        zip.file('assets/minecraft/textures/blocks/quartz_ore.png', blob);

    if (file === 'totem_of_undying.png')
        zip.file('assets/minecraft/textures/items/totem.png', blob);

    /* ----- API FALLBACK ----- */

    const legacyName = state.mappingData[file.replace('.png','')];
    if (legacyName) {
        const f = folder === 'block' ? 'blocks' : 'items';
        zip.file(`assets/minecraft/textures/${f}/${legacyName}.png`, blob);
    }
}

/* ---------- HELPERS ---------- */

async function stripAlpha(blob) {
    const img = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img,0,0);
    const d = ctx.getImageData(0,0,c.width,c.height);
    for (let i=3;i<d.data.length;i+=4) d.data[i]=255;
    ctx.putImageData(d,0,0);
    return new Promise(r=>c.toBlob(r));
}

async function stitchDoubleChests(zip, parts) {
    if (!parts.normal.left || !parts.normal.right) return;
    const stitched = await mergeChestImages(parts.normal.left, parts.normal.right);
    zip.file('assets/minecraft/textures/entity/chest/normal_double.png', stitched);
    zip.file('assets/minecraft/textures/entity/chest/normal.png', stitched);
}

function mergeChestImages(left,right){
    return new Promise(res=>{
        const c=document.createElement('canvas'),x=c.getContext('2d');
        const l=new Image(),r=new Image();
        l.onload=()=>{r.onload=()=>{
            c.width=l.width*2;c.height=l.height;
            x.drawImage(r,0,0);x.drawImage(l,l.width,0);
            c.toBlob(res);
        };r.src=URL.createObjectURL(right)};
        l.src=URL.createObjectURL(left);
    });
}

function modifyPackMcmeta(t){
    const d=JSON.parse(t.trim().replace(/^\uFEFF/,''));d.pack.pack_format=3;
    return JSON.stringify(d,null,4);
}

function shouldSkip(p){
    return FOLDERS_TO_REMOVE.some(f=>p.includes(`/${f}/`));
}
