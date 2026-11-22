# Connecting the Kiddough Shopify store

Customers stay on the Kiddough store. Two additions there send their requests to the Safe Pro app:

| Store addition | What it does | Files |
|---|---|---|
| **Home Care page** (`/pages/home-care`) | Booking form: service, address, city, date, time slot. Shows the booking ID and 4-digit completion code after booking. | `home-care-page.liquid` · `theme/sections/kiddough-home-care.liquid` · `theme/templates/page.home-care.json` |
| **2 product buttons** | "Book installation" and "Book servicing" on the product page. They open the Home Care page with the product, variant and SKU filled in. | `product-buttons.liquid` · `theme/sections/kiddough-service-buttons.liquid` · `theme/snippets/kiddough-home-care-buttons.liquid` |

Nothing in the store's products, orders, customers or existing theme files is changed. Everything goes on a **copy** of the live theme first.

There are two ways to install. Both use the same code.

- **A. Theme editor only** (no tools needed): paste `home-care-page.liquid` and `product-buttons.liquid` into "Custom Liquid" blocks. Steps are at the top of each file.
- **B. Shopify CLI** (below): push the ready-made files in `theme/` to a copy of the theme. Cleaner, repeatable, and the sections appear by name in the theme editor.

`theme/` is generated: edit `home-care-page.liquid` / `product-buttons.liquid`, then run `npm run shopify:build`.

---

## 1. Collaborator account access

A collaborator account is a Shopify account (from your Partner / Dev Dashboard) that the store owner lets into their admin.

1. In your Partner / Dev Dashboard: **Stores → Add store → Request access** (collaborator), and enter the store's `.myshopify.com` address. Find it in the store admin under **Settings → Domains**, for example `kiddough-store.myshopify.com`.
2. Ask for only these permissions:
   - **Online Store → Themes** and **Edit code**: needed to pull and push theme files with the CLI
   - **Online Store → Pages** (Blog posts and pages): to create the Home Care page
   - No access to orders, customers or payments is needed for this setup.
3. The store owner approves the request (Settings → Users → Collaborators), sometimes with a 4-digit collaborator request code.
4. Log in to the store admin once from your Partner / Dev Dashboard to confirm access.

> The Shopify CLI logs in with this same Shopify account. Theme commands work with collaborator access as long as the theme permissions above are granted.

**No browser login?** For scripts or CI, the store owner can install Shopify's free **Theme Access** app and send you a theme password (`shptka_…`). Use it with `--password shptka_…` on every command below, or set `SHOPIFY_CLI_THEME_TOKEN`.

---

## 2. Install the Shopify CLI

The current Shopify CLI needs **Node.js 22.12 or newer** (this machine has Node 20, so install Node 22 LTS first from nodejs.org).

```bash
node -v                       # must be v22.12+ 
npm install -g @shopify/cli@5.0.1
shopify version
```

Set the store once per terminal so you don't repeat `--store`:

```bash
# PowerShell
$env:SHOPIFY_FLAG_STORE = "kiddough-store.myshopify.com"
# Git Bash / macOS / Linux
export SHOPIFY_FLAG_STORE=kiddough-store.myshopify.com
```

The first command opens a browser to log in. Use your collaborator Shopify account.

```bash
shopify theme list            # shows the live theme and its ID
```

---

## 3. Make a copy of the live theme with the Kiddough sections

Run these from the project folder (`c:\Users\anubh\Videos\pwa`):

```bash
# a) Download the live theme into a new folder (read-only: this changes nothing in the store)
shopify theme pull --live --path kiddough-theme

# b) Add the Kiddough files
npm run shopify:build
cp -r shopify/theme/* kiddough-theme/           # PowerShell: Copy-Item -Recurse -Force shopify\theme\* kiddough-theme\

# c) Upload as a NEW, UNPUBLISHED theme (the live theme is untouched)
shopify theme push --unpublished --path kiddough-theme --json
#    It asks for a name, e.g. "Live copy + Kiddough Home Care". Note the theme ID and preview link it prints.
```

Already duplicated the theme in the admin (Online Store → Themes → ⋯ → Duplicate)? Push only the Kiddough files into that copy instead:

```bash
shopify theme push --theme <COPY_THEME_ID> --path shopify/theme --nodelete \
  --only "sections/kiddough-*.liquid" --only "snippets/kiddough-*.liquid" --only "templates/page.home-care.json"
```

`--nodelete` keeps every other file in that theme. **Never** use `--live` or `--allow-live` with `push`.

---

## 4. Put the sections on the pages (in the copy)

1. **Create the page:** store admin → Online Store → **Pages → Add page**. Title "Home Care", leave the content empty, Save. The URL becomes `/pages/home-care`.
2. **Product buttons:** `shopify theme open --theme <COPY_THEME_ID> --editor`, then go to **Products → Default product**, **Add section → "Kiddough service buttons"**, and drag it under the product information. Save.
3. **Preview the booking page:** open the copy's preview and visit `/pages/home-care?view=home-care`. The `view` parameter shows the new template before it is assigned.
4. **Test:** on a product, click **Book installation**, submit a test request, and check it appears in the Safe Pro app under **Admin → Bookings** (with the product name). Then cancel that test booking there.
5. **Go live:** publish the copy (Online Store → Themes → Publish). Then open the Home Care page in the admin and set **Theme template → page.home-care**. Templates can only be assigned once they exist in the published theme. Add the page to the menu if you like.

**Rollback:** publish the previous theme again. The Safe Pro app keeps working either way.

### Which websites can send requests

The app accepts requests from `https://kiddough.in`, `https://www.kiddough.in` and Shopify share previews (`https://*.shopifypreview.com`). If you preview on the `.myshopify.com` address, or use `shopify theme dev` (`http://127.0.0.1:9292`), add that address to **`ALLOWED_ORIGINS`** in Vercel and redeploy. Otherwise the page shows "Online booking is not available right now".

---

## 5. Later: a full Shopify app (optional)

Everything above works without a Shopify app. An app (built with `shopify app init`, installed via a custom-distribution link that the store owner approves) becomes worthwhile when you want to:

- check that the customer really bought the product (read-only `read_orders`, `read_products`)
- serve the form at `kiddough.in/apps/home-care` through an app proxy, so requests are signed by Shopify (stronger than the website check above)
- add "Book installation / servicing" buttons inside the customer's account page

Typical commands, always against a **development store** first: `shopify app init` → `shopify app dev` → `shopify app deploy`, then **Custom distribution** in the Dev Dashboard to get the install link for the store owner.
