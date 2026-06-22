# Field Notes — Matthew Zhou's blog

A professional blog for the **2026 Digital Summer Clinic**, built with
[Quarto](https://quarto.org), hosted free on **GitHub Pages**, and tracked with
**Google Analytics 4**.

- **Live site:** <https://mattzhou98.github.io/blog/>
- **Source:** <https://github.com/mattzhou98/blog>
- **Deploy:** push to `main` → GitHub Actions renders and publishes automatically.

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
   categories: [Digital Summer Clinic, Analytics]
   ---
   ```
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

### Install Quarto on this machine

`winget` isn't available here, so install without admin rights:

```powershell
# 1. Download the latest Quarto installer
$rel = Invoke-RestMethod https://api.github.com/repos/quarto-dev/quarto-cli/releases/latest
$msi = ($rel.assets | Where-Object { $_.name -like "*-win.msi" }).browser_download_url
Invoke-WebRequest $msi -OutFile "$env:TEMP\quarto.msi"

# 2. Extract it to a per-user folder (no admin needed)
msiexec /a "$env:TEMP\quarto.msi" /qn TARGETDIR="$env:LOCALAPPDATA\Quarto"

# 3. Add it to your PATH for future terminals
$bin = "$env:LOCALAPPDATA\Quarto\Quarto\bin"
[Environment]::SetEnvironmentVariable("Path", "$env:Path;$bin", "User")

# 4. Open a NEW terminal, then verify
quarto --version
```

You do **not** need R or Python — this is a Markdown-only blog.

---

## Google Analytics (GA4)

The site is pre-wired for GA4 in `_quarto.yml`. You just need to drop in your own
**Measurement ID**:

1. Go to <https://analytics.google.com> and sign in with your clinic Google
   account.
2. **Admin** (bottom-left gear) → **Create** → **Property**. Name it
   `Field Notes`, set your time zone/currency, **Next**.
3. Choose **Web** as the platform. **Website URL:**
   `https://mattzhou98.github.io` · **Stream name:** `Field Notes`. Create the
   stream.
4. Copy the **Measurement ID** at the top right of the stream — it looks like
   `G-XXXXXXXXXX`.
5. In `_quarto.yml`, replace the placeholder:

   ```yaml
   google-analytics: "G-XXXXXXXXXX"   # ← your real ID here
   ```
6. Commit and push. Within a minute the live site is tracking. Verify in GA under
   **Reports → Realtime** while you have the site open in another tab.

## Link it to LinkedIn (clinic requirement)

- On **LinkedIn**: add this blog as your website (Contact info → Website), and
  consider a featured post linking here.
- On this **blog**: replace `PROFILENAME` in `_quarto.yml` and `about.qmd` with
  your LinkedIn vanity URL (the part after `linkedin.com/in/`).
- Use the **same professional photo** here and on LinkedIn — replace
  `profile.jpg` in this folder with your headshot (square works best).

## Add a custom domain later (optional, ~$10–20/yr)

1. Buy a domain (Namecheap, Cloudflare, Google Domains successor, etc.).
2. In the repo: **Settings → Pages → Custom domain**, enter it, save (this writes
   a `CNAME` file).
3. At your registrar, add the DNS records GitHub shows you (4 `A` records for the
   apex, or a `CNAME` to `mattzhou98.github.io` for a `www` subdomain).
4. Update `site-url` in `_quarto.yml` to the new domain and push.

---

## How deployment works

`.github/workflows/publish.yml` runs on every push to `main`:

1. Checks out the source.
2. Installs Quarto in the runner.
3. Runs `quarto render` → produces the static site in `_site/`.
4. Uploads `_site/` and deploys it to GitHub Pages.

GitHub Pages **Source** must be set to **GitHub Actions** (Settings → Pages). The
`_site/` and `.quarto/` folders are build output and are **git-ignored** — never
commit them.
