# Typeface Explorer

Internal build spec · August 2026 · Chrome MV3 · Version 0.1

Click any text on a live page, try a typeface or a heading/body pairing, apply it to that element or to all matching text, copy CSS.

**Why:** a fast way to slot in different fonts and pairings on a real layout instead of changing code and prompting.

No accounts. No backend. No CLI. No Figma. No color tools. Google Fonts CSS is the only network call, and only to load a chosen face.

Read in this order: **01 Product → 02 UX → 03 Architecture → 04 Data → 05 Build**

---

## 01 — Product

### One sentence

Click any text on a live page, try a typeface or a heading/body pairing, apply it to that element or to all matching text, copy CSS.

### Who

Frontend people choosing type on a real layout (localhost or production).

### In

- Text-only picker (no box outlines, no color map)
- Dropdown bound to the clicked text
- Hover a font in the list → that text previews
- Click a font → commit
- Scope: This / Same tag / Headings / All text
- Pairings: heading face + body face in one action
- Skip icons, SVG, code, pre
- Copy CSS of the current session
- Works on any http(s) page, including localhost

### Out

- Accounts, sync, analytics
- Uploading or ripping font files
- Writing into the user’s repo
- Contrast / theme / layout debugging
- Variable-axis studio
- Firefox / Safari for v1

---

## 02 — UX

### Start

1. Click the extension icon.
2. Press Enable picker.
3. Cursor is now a text picker.

### Pick

- Move over text → thin outline on that text only.
- Click the text → dropdown opens next to it.
- Click empty / Esc → close. Page CSS is untouched except our overlay sheet.

### Dropdown

```
[ search ]

Fonts
  Inter
  Geist
  Newsreader
  …

Pairings
  Newsreader + Geist
  Fraunces + Inter
  …

Scope
  ( This ) ( All h1 ) ( Headings ) ( All text )

[ Copy CSS ] [ Reset ]
```

- Arrow keys move the highlight.
- Highlight previews on the bound text (and on the scoped set if scope is not This).
- Enter or click applies.
- Esc closes and drops an uncommitted preview.

### Scope

| Control   | Applies to                          |
|-----------|-------------------------------------|
| This      | The clicked element                 |
| All h1    | Same tag as the clicked element     |
| Headings  | h1–h6                               |
| All text  | Every eligible text node            |

Pairing ignores “This”. It always sets Headings + Body. Body = `p`, `li`, `blockquote`, `dd`, `figcaption`. UI (buttons, nav, labels) follows body on “All text”, not on a pairing, unless we later add a toggle.

### Pairing

One click sets the heading family on h1–h6 and the body family on body selectors. Last heading + last body can be treated as “current pair” in the list.

### Reset

Clears the injected stylesheet and element marks. Host page CSS stays as it was.

---

## 03 — Architecture

Chrome MV3. No build step. No extra hosts except Google Fonts.

### Files

```
manifest.json
icons/
src/background.js    toggle picker from the popup
src/popup.html       enable / reset / copy CSS
src/popup.js
src/content.js       picker, dropdown, apply, export
src/content.css      picker + dropdown chrome
src/fonts.js         curated family list
src/pairings.js      curated pairs + selectors
```

### Permissions

- `activeTab` + `scripting` — talk to the current tab
- `storage` — remember last scope only
- `fonts.googleapis.com` and `fonts.gstatic.com` — load faces

Do not request `<all_urls>` beyond the content-script match list.

### Flow

```
popup --message--> content.js
                     | find text target
                     | open dropdown
                     | load Google Font stylesheet
                     | write rules into #tx-explorer-style
                     | keep session { heading, body, tag, elements }
popup <--css text-- content.js
```

### Rules

- Overlay UI lives in `#tx-root` (ignore clicks on it).
- Preview CSS lives in `#tx-explorer-style`. Never edit the page’s own stylesheets.
- One Google Fonts `<link id="tx-explorer-fonts">`. Rewrite its href as families accumulate.
- Selectors must exclude `TX_IGNORE_SELECTOR`.
- Content script is idempotent (`window.__txExplorer` guard).

---

## 04 — Data

All local. Nothing is posted anywhere.

### Fonts · `src/fonts.js`

```
{ family: "Inter", category: "sans" | "serif" | "mono" }
```

Curated list only. v1 does not search the full Google catalog.

```
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap
```

### Pairings · `src/pairings.js`

```
{ id, heading, body, note }
```

Plus three selector strings: `TX_HEADING_SELECTOR`, `TX_BODY_SELECTOR`, `TX_IGNORE_SELECTOR`.

### Session · in-memory in `content.js`

```
{
  heading: "Newsreader" | null,
  body: "Geist" | null,
  all: "Inter" | null,
  tags: { h1: "Fraunces" },
  elements: { "tx-id-1": "Outfit" }
}
```

`chrome.storage.local` holds `{ scope }` only.

### Export

Plain text. No files written to disk.

```css
@import url('https://fonts.googleapis.com/css2?family=...');
h1, h2, h3, h4, h5, h6 { font-family: "Newsreader", system-ui, sans-serif; }
p, li, blockquote { font-family: "Geist", system-ui, sans-serif; }
```

Only emit rules that exist in the session. Individual element overrides emit a `[data-tx-id="…"]` rule if we stamped one.

---

## 05 — Build

No bundler. Edit a file, reload the extension.

### Load

1. Open `chrome://extensions`
2. Developer mode on
3. Load unpacked → repo root (the folder that contains `manifest.json`)
4. Pin the icon
5. Open any site → Enable picker

### Change something

| Want              | File              |
|-------------------|-------------------|
| Add a font        | `src/fonts.js`    |
| Add a pairing     | `src/pairings.js` |
| Picker behavior   | `src/content.js`  |
| Dropdown look     | `src/content.css` |
| Popup copy        | `src/popup.html`  |
| Name / version / permissions | `manifest.json` |

Then Reload on `chrome://extensions` and refresh the tab.

### Done when

- Click text → dropdown
- Hover font → that text changes
- Scope This / tag / Headings / All text works
- A pairing sets heading + body together
- Icons and code do not change
- Copy CSS pastes a working `@import` + rules
- Reset restores the page
- Popup can enable / reset / copy without the dropdown open
