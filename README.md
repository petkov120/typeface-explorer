# Typeface Explorer

Chrome MV3 overlay. Try typefaces and pairings on a live http(s) page (including localhost) without touching source. When it peaks, copy CSS.

Nothing is written to your repo. Overlay only.

## Load

1. Open `chrome://extensions`
2. Developer mode on
3. Load unpacked → this folder (the one with `manifest.json`)
4. Pin the icon
5. Open any http(s) page, including localhost
6. Enable picker, click text, hover a face

After you **Reload** the extension, also **refresh the page tab**. Old overlay code stays on the tab until you do.

Specimen page in this repo:

```
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765/examples/specimen.html`.

Static chrome mock: `preview/ui.html`.

## Use

- Hover a font → that text previews on the page
- Enter or click → keep it
- **Fonts | Pairings** in the studio
- Apply to: This / same tag / Headings / Paragraphs / All text
- Pairings follow the page’s visual hierarchy (display vs body), not only `h1` / `p`
- Size, leading, tracking sliders
- Weight chips: on Fonts, one cut; on Pairings, display weight + body weight
- Copy CSS when you are done
- Reset restores the host page

The widget moves from the header and resizes from the eight handles. Esc drops an uncommitted look.
