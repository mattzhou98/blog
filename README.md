# Field Notes — Matthew Zhou's blog

A professional blog by **Matthew Zhou**, built with
[Quarto](https://quarto.org), hosted free on **GitHub Pages**, and tracked with
**Google Analytics 4**.

- **Live site:** <https://mattzhou98.github.io/blog/>
- **Source:** <https://github.com/mattzhou98/blog>
- **Deploy:** push to `main` → GitHub Actions renders with Quarto and publishes
  automatically via the native **GitHub Pages** artifact pipeline.

---

## How it was set up (already done — for reference)

The repo, GitHub Pages, and the first deploy are **already configured** — you
don't need to redo any of this. It's documented here so you understand how the
pieces fit.

1. **Repo created & pushed** — this folder is the git repo; it was published with
   `gh repo create mattzhou98/blog --public --source . --remote origin --push`.
2. **Pages turned on with the Actions source** — equivalent to GitHub →
   **Settings → Pages → Source = "GitHub Actions"** (not "Deploy from a branch").
   It was set via the API: `gh api --method POST repos/mattzhou98/blog/pages -f
   build_type=workflow`.
3. **Every push to `main`** runs `.github/workflows/publish.yml`, which renders
   the site and deploys it. Watch progress under the repo's **Actions** tab.

> **The URL is fixed by the repo name.** This repo is named `blog`, so the site
> lives at `https://mattzhou98.github.io/blog` and `site-url` in `_quarto.yml`
> matches it (no trailing slash). To switch to a root URL later, rename the repo
> to `mattzhou98.github.io` and update `site-url`.

---

## Write a new post (the weekly habit)

1. Make a new folder under `posts/`, e.g. `posts/2026-06-29-my-topic/`.
2. Add an `index.qmd` inside it. Easiest: copy `posts/welcome/index.qmd` and edit
   the front matter:

   ```yaml
   ---
   title: "My post title"
   description: "One-sentence summary that shows on the home page."
   date: "2026-06-29"
   type: ml                  # home-page commit-log tag: feat / data / ml (optional)
   categories: [AI, Python]
   ---
   ```
   The home page renders posts as a **git commit log**. The `type:` field is the
   colored tag on each row — `feat` (indigo, code), `data` (teal, analytics), or
   `ml` (amber, AI/ML). If you omit `type:`, it's inferred from `categories`
   (AI/ML → `ml`, analytics/GA4/data → `data`, otherwise `feat`). `categories`
   also become the `#tag` labels on the row.
3. Write below the `---` in plain Markdown.
4. Publish:

   ```powershell
   git add .
   git commit -m "Add post: my topic"
   git push
   ```

   ~60 seconds later it's live. Check the **Actions** tab on GitHub to watch the
   build. (Optional: add an `image: thumbnail.jpg` line and drop a `thumbnail.jpg`
   in the post folder to give it a card image on the home page.)

## Preview locally (optional but recommended)

Once Quarto is installed (see below):

```powershell
quarto preview
```

This opens a live-reloading local copy at <http://localhost:4200>. Edits show
instantly. Stop it with `Ctrl+C`. Nothing you see locally is public until you
`git push`.

### Install Quarto on this machine (no admin, no winget)

> Quarto **1.9.38 is already installed** on this machine (under
> `%LOCALAPPDATA%\Quarto`) and on your user `PATH` — just open a new terminal and
> run `quarto --version`. The steps below are for reinstalling or setting up
> another machine.

The official portable **Windows ZIP** (`quarto-<ver>-win.zip`) is the
maintainer-recommended no-admin install. It just unzips and you add its `bin\`
to your PATH — no installer, no elevation, no registry writes. Run in a normal
(non-elevated) PowerShell window:

```powershell
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 1) Find the latest version via the GitHub Releases API
$rel   = Invoke-RestMethod -Uri 'https://api.github.com/repos/quarto-dev/quarto-cli/releases/latest' -Headers @{ 'User-Agent' = 'pwsh' }
$ver   = $rel.tag_name.TrimStart('v')          # e.g. 1.9.38
$asset = $rel.assets | Where-Object { $_.name -eq "quarto-$ver-win.zip" }

# 2) Download and extract under the user profile
$dest = Join-Path $env:LOCALAPPDATA 'Programs\Quarto'
$zip  = Join-Path $env:TEMP "quarto-$ver-win.zip"
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zip
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
Expand-Archive -Path $zip -DestinationPath $dest -Force
Remove-Item $zip -Force

# 3) Add bin\ to the CURRENT-USER PATH (use the .NET API, NOT setx — setx
#    silently truncates PATH at 1024 chars).
$bin = Join-Path $dest 'bin'
$userPath = [Environment]::GetEnvironmentVariable('Path','User')
if (($userPath -split ';') -notcontains $bin) {
    $newPath = if ([string]::IsNullOrEmpty($userPath)) { $bin } else { "$userPath;$bin" }
    [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
}

# 4) Make it usable in THIS session too, then verify
$env:Path = "$env:Path;$bin"
quarto --version
quarto check
```

You do **not** need R or Python — this is a Markdown-only blog. (`quarto check`
confirms the bundled Pandoc/Deno are working.)

---

## Google Analytics (GA4)

The site is pre-wired for GA4 in `_quarto.yml`. You just need to drop in your own
**Measurement ID**:

1. Go to <https://analytics.google.com> and sign in with your Google account.
2. **Admin** (bottom-left gear) → **Create** → **Property**. Name it
   `Field Notes`, set your time zone/currency, **Next**, then complete the
   business details and **Create**.
3. On **Choose a platform**, pick **Web**. Enter **Website URL** =
   `https://mattzhou98.github.io/blog` and **Stream name** = `Field Notes`, then
   **Create stream**.
4. Copy the **Measurement ID** shown at the top right of the Web stream — it
   looks like `G-XXXXXXXXXX`.
5. In `_quarto.yml`, replace the placeholder under `google-analytics`:

   ```yaml
   google-analytics:
     tracking-id: "G-XXXXXXXXXX"   # ← your real ID here
     anonymize-ip: true
     version: 4
   ```
6. Commit and push. Within a minute the live site is tracking. The gtag script
   only exists in the **rendered** HTML, so verify on the deployed site (not the
   `.qmd`): open the site, accept the cookie banner, then check GA under
   **Reports → Realtime**, or DevTools → Network for a `collect` request to
   `google-analytics.com` returning `200`.

> Quarto injects `gtag.js` for you. Do **not** paste Google's own gtag snippet
> anywhere, or every hit will be counted twice.

## Link it to LinkedIn

- On **LinkedIn**: add this blog as your website (Contact info → Website), and
  consider a featured post linking here.
- On this **blog**: replace `PROFILENAME` in `_quarto.yml` and `about.qmd` with
  your LinkedIn vanity URL (the part after `linkedin.com/in/`).
- Use the **same professional photo** here and on LinkedIn — replace
  `profile.jpg` in this folder with your headshot (square works best).

## Add a custom domain later (optional, ~$10–20/yr)

1. Buy a domain (Namecheap, Cloudflare, etc.).
2. In the repo: **Settings → Pages → Custom domain**, enter it, save (this writes
   a `CNAME`).
3. At your registrar, add the DNS records GitHub shows you (4 `A` records for the
   apex, or a `CNAME` to `mattzhou98.github.io` for a `www` subdomain).
4. Update `site-url` in `_quarto.yml` to the new domain and push.

---

## How deployment works

`.github/workflows/publish.yml` runs on every push to `main`:

1. Checks out the source (`actions/checkout@v7`).
2. Installs Quarto in the runner (`quarto-dev/quarto-actions/setup@v2`).
3. Renders with `quarto-dev/quarto-actions/render@v2` → static site in `_site/`.
4. Uploads `_site/` (`actions/upload-pages-artifact@v5`) and deploys it to
   GitHub Pages (`actions/deploy-pages@v5`) using OIDC.

GitHub Pages **Source** must be **GitHub Actions** (Settings → Pages). The
`_site/` and `.quarto/` folders are build output and are **git-ignored** — never
commit them.
