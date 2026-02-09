# Tuff Client Texture Pack Converter

Convert Minecraft 1.21 resource packs to Tuff Client format - directly in your browser!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/hatrix1307/tuff-texture-converter)

## Features

- **Client-Side Processing** - All conversion happens in your browser, your files never leave your computer
- **Zero Dependencies** - Pure HTML, CSS, and JavaScript (uses JSZip for zip handling)
- **Fast & Efficient** - Process resource packs in seconds
- **Smart Conversion** - Automatically removes unnecessary files (models, blockstates, sounds, etc.)
- **Tuff Client Compatible** - Output packs work seamlessly with Tuff Client
- **Persistent Settings** - Your preferences are saved locally

## What It Does

This converter transforms vanilla Minecraft 1.21 resource packs into Tuff Client format by:

1. **Removing non-texture content**: Strips models, blockstates, sounds, language files, recipes, etc.
2. **Updating pack.mcmeta**: Sets the description to "Just like the trailers!" and ensures pack_format is 3
3. **Filtering incompatible files**: Removes template-only files that don't exist in Tuff Client
4. **Preserving textures**: Keeps all block, item, GUI, and entity textures intact

### Important Note

This tool converts the **structure** of resource packs, not the art style. To achieve the true "Bare Bones" minimalist aesthetic, textures would need to be manually redrawn. This converter focuses on file organization and compatibility.

## Usage

### Online (Recommended)

Visit the live demo: [YOUR_VERCEL_URL]

### Local Development

1. Clone this repository:
```bash
git clone https://github.com/hatrix1307/tuff-texture-converter.git
cd tuff-texture-converter
```

2. Open `index.html` in your browser (no build step required!)

Alternatively, use a local server:
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# PHP
php -S localhost:8000
```

Then open http://localhost:8000

## Conversion Options

- **Remove Non-Textures** (Default: ON) - Strips models, blockstates, sounds, and other non-texture files
- **Include New Mobs** (Default: OFF) - Keep textures for Warden, Allay, Frogs (experimental)
- **Update pack.mcmeta** (Default: ON) - Sets Tuff Client description and pack format
- **Custom Pack Name** - Optional custom name for your converted pack

## Deploy Your Own

### Deploy to Vercel

1. Fork this repository
2. Import to Vercel: https://vercel.com/new
3. Deploy! (No configuration needed)

### Deploy to GitHub Pages

1. Fork this repository
2. Go to Settings → Pages
3. Source: Deploy from a branch
4. Branch: main / (root)
5. Save

Your site will be live at: `https://YOUR_USERNAME.github.io/tuff-texture-converter/`

### Deploy to Netlify

1. Fork this repository
2. Connect to Netlify: https://app.netlify.com/start
3. Deploy!

## Project Structure

```
tuff-texture-converter/
├── index.html          # Main HTML structure
├── styles.css          # Pixel-art inspired styling
├── script.js           # Conversion logic
├── README.md           # This file
└── vercel.json         # Vercel configuration (optional)
```

## Technical Details

### Files Removed During Conversion

- `blockstates/` - Block state definitions
- `models/` - 3D model files
- `sounds/` - Sound definitions and audio
- `lang/` - Language files
- `advancements/` - Advancement JSON
- `loot_tables/` - Loot table definitions
- `recipes/` - Crafting recipes
- `structures/` - Structure templates
- `shaders/` - Shader files
- `font/` - Font definitions
- `texts/` - Text files
- `eagler/` - EaglercraftX specific files
- `sounds.json` - Sound index

### Template-Only Files Removed

Files that exist in the Tuff template but not in Bare Bones Tuff Client:
- `bamboo_bottom.png`, `bamboo_side.png`, `bamboo_top.png`
- `bell_bottom.png`, `bell_side.png`, `bell_top.png`
- `bush.png`, `cactus_flower.png`, `conduit.png`
- And more...

### Browser Compatibility

Requires a modern browser with support for:
- ES6+ JavaScript
- File API
- Blob API
- LocalStorage

Tested on: Chrome, Firefox, Safari, Edge (latest versions)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### To-Do List

- [ ] Add drag-and-drop visual preview
- [ ] Support for converting multiple packs at once
- [ ] Advanced filtering options
- [ ] Pack comparison tool
- [ ] Texture atlas viewer
- [ ] Automatic style conversion (AI-powered)

## License

MIT License - Feel free to use, modify, and distribute!

## Credits

- **Bare Bones Texture Pack** - Original minimalist aesthetic
- **Tuff Network** - Tuff Client and community
- **JSZip** - Zip file manipulation
- **FileSaver.js** - File download handling

## Disclaimer

This tool is not affiliated with Mojang Studios or Microsoft. Minecraft is a trademark of Mojang Studios.

---

Made with for the Tuff Network Community

[Report an Issue](https://github.com/hatrix1307/tuff-texture-converter/issues) • [Suggest a Feature](https://github.com/YOUR_USERNAME/tuff-texture-converter/issues)
