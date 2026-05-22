# Odds Converter (Web)

This project is a static web app.

## Run locally

Open `index.html` in a browser.

## Publish with GitHub Pages

### Option A (no git required)

1. Create a new empty GitHub repository.
2. Open the repository page and click **uploading an existing file**.
3. Drag in these files:
   - `index.html`
   - `popup.css`
   - `popup.js`
   - `README.md`
4. Commit directly to `main`.
5. In GitHub, open **Settings -> Pages**.
6. Under **Build and deployment**, set:
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/ (root)`
7. Save. GitHub will publish the site in about 1-2 minutes.
8. Open the site URL shown on the Pages settings screen.

### Option B (with git installed)

```powershell
cd "<your-project-folder>"
git init
git add .
git commit -m "Initial web app"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

Then enable Pages with the same settings above.

## Notes

- `index.html` is the page entry point.
- `popup.js` and `popup.css` are used by the web page.
- `manifest.json` and `popup.html` are leftover extension files and are not required for the website.
