# 🚀 Deployment Guide

This guide covers multiple ways to deploy the Tuff Client Texture Pack Converter.

## 📦 Quick Deploy Options

### 1. Vercel (Recommended)

**Why Vercel?**
- ✅ Zero configuration
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Free tier is generous

**Steps:**

1. **Fork the repository** on GitHub

2. **Import to Vercel:**
   - Go to https://vercel.com/new
   - Select your forked repository
   - Click "Deploy" (no configuration needed!)

3. **Done!** Your site is live at `https://your-project.vercel.app`

**Custom Domain (Optional):**
- Go to your project settings in Vercel
- Navigate to "Domains"
- Add your custom domain
- Update DNS records as instructed

---

### 2. GitHub Pages

**Why GitHub Pages?**
- ✅ Free hosting
- ✅ GitHub integration
- ✅ Simple setup

**Steps:**

1. **Fork the repository**

2. **Enable GitHub Pages:**
   - Go to repository Settings
   - Scroll to "Pages" section
   - Source: "Deploy from a branch"
   - Branch: `main` / `(root)`
   - Click "Save"

3. **Wait 1-2 minutes** for deployment

4. **Access your site:**
   - URL: `https://YOUR_USERNAME.github.io/tuff-texture-converter/`

**Custom Domain (Optional):**
- Add a `CNAME` file to root with your domain
- Configure DNS CNAME record to point to `YOUR_USERNAME.github.io`

---

### 3. Netlify

**Why Netlify?**
- ✅ Drag-and-drop deployment
- ✅ Easy custom domains
- ✅ Form handling (for future features)

**Steps:**

1. **Fork the repository**

2. **Deploy to Netlify:**
   - Go to https://app.netlify.com/start
   - Connect to your Git provider
   - Select the repository
   - Click "Deploy"

3. **Site is live!** at `https://random-name.netlify.app`

**Custom Domain:**
- Go to Site settings → Domain management
- Add custom domain
- Follow DNS configuration instructions

---

### 4. Cloudflare Pages

**Why Cloudflare Pages?**
- ✅ Fast global CDN
- ✅ Unlimited bandwidth
- ✅ Advanced features

**Steps:**

1. **Fork the repository**

2. **Create Pages project:**
   - Go to https://pages.cloudflare.com/
   - Click "Create a project"
   - Connect to Git
   - Select repository
   - Build settings: (leave empty - it's static!)
   - Click "Save and Deploy"

3. **Done!** Site is at `https://your-project.pages.dev`

---

## 💻 Local Development

### Option A: Simple File Server

**Python 3:**
```bash
cd tuff-texture-converter
python -m http.server 8000
```

**Node.js:**
```bash
npx http-server -p 8000
```

**PHP:**
```bash
php -S localhost:8000
```

Then open http://localhost:8000

### Option B: Direct File

Simply open `index.html` in your browser. Works perfectly for local testing!

---

## 🔧 Environment Variables

This project doesn't require any environment variables, but if you add features that need them:

### Vercel
- Go to Project Settings → Environment Variables
- Add your variables
- Redeploy

### Netlify
- Go to Site Settings → Environment Variables
- Add your variables

### GitHub Pages
- Use GitHub Secrets for sensitive data
- Access via GitHub Actions if needed

---

## 📊 Analytics (Optional)

### Add Google Analytics

Add to `index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Add Plausible Analytics

Add to `index.html` before `</head>`:

```html
<script defer data-domain="yourdomain.com" src="https://plausible.io/js/script.js"></script>
```

---

## 🔒 Security Headers

The included `vercel.json` already has security headers configured. For other platforms:

### Netlify (`netlify.toml`)

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Cloudflare Pages

Security headers are automatically applied. Additional headers can be configured in:
- Dashboard → Pages → [Your Project] → Settings → Headers

---

## 🐛 Troubleshooting

### Files not loading
- Check browser console for errors
- Ensure CDN links for JSZip and FileSaver.js are working
- Try clearing browser cache

### Conversion fails
- Check browser compatibility (needs modern browser)
- Check console for specific errors
- Ensure input is a valid .zip file

### Deployment issues

**Vercel:**
- Check build logs in dashboard
- Ensure `vercel.json` is in root directory

**GitHub Pages:**
- Check Actions tab for build status
- Ensure branch is set correctly in settings
- Wait a few minutes after enabling

**Netlify:**
- Check deploy logs
- Ensure no build command is set (static site)

---

## 📈 Performance Optimization

### Enable Compression

Most platforms enable gzip/brotli automatically. To verify:
- Check response headers for `Content-Encoding: gzip`

### CDN Configuration

All mentioned platforms use global CDNs by default. No additional configuration needed!

### Caching

Update cache headers in `vercel.json` or equivalent:

```json
{
  "headers": [
    {
      "source": "/(.*).css",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🆘 Support

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/YOUR_USERNAME/tuff-texture-converter/issues)
2. Review platform-specific documentation
3. Create a new issue with:
   - Browser and version
   - Error messages
   - Steps to reproduce

---

## 📝 Checklist Before Going Live

- [ ] Test conversion with multiple resource packs
- [ ] Verify all features work in different browsers
- [ ] Update README with your deployment URL
- [ ] Set up custom domain (optional)
- [ ] Add analytics (optional)
- [ ] Configure error tracking (optional)
- [ ] Test mobile responsiveness
- [ ] Check console for errors
- [ ] Verify all external CDN links work

---

**Happy Deploying! 🚀**
