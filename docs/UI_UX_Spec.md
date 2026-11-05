# UI and UX Spec

## 1. Principles

Map first. One clear action per screen. Explain, never just score. Every screen has loading, empty, and error states. Do not rely on color alone.

## 2. Navigation

Top bar: logo, "Map", "My enquiries", "My assessments", user menu (name, logout). Authority also sees "Authority" (dashboard), "Enquiry inbox", "Audit log". Visitors see only "Log in" and "Sign up".

## 3. Screens

| Route | Access | Contents |
|---|---|---|
| `/login`, `/signup` | Public | Forms with inline validation, link between them. |
| `/map` | User+ | Full-screen map, search box, legend, layer toggle, side panel. |
| `/enquiries` | User+ | Own enquiries with status chips and replies. |
| `/assessments` | User+ | Past risk assessments table. |
| `/authority` | Authority | Parcel table, "Record transaction", "Edit parcel", dispute toggle. |
| `/authority/enquiries` | Authority | Inbox with status filter and reply box. |
| `/authority/audit` | Authority | Paginated audit log. |
| `*` | any | Not found page. |

## 4. Map screen

**Layout:** map fills the viewport below the top bar. Side panel docks right (desktop) or becomes a bottom sheet (mobile). Search box top-left over the map. Legend bottom-left.

**Map behaviour**
- Fits all parcels on first load.
- Hover: polygon outline thickens, tooltip shows "Dag 14".
- Click: polygon gets a strong outline, panel opens, URL updates to `?dag=14`.
- Click empty area: clears selection.
- Search a dag: select, zoom to bounds, panel opens. Not found shows an inline message.
- Decorative features (roads, river) are non-interactive shapes drawn under the parcels.

**Fill colors by land type** (always paired with a legend and a text label in the panel):
Agricultural green, Residential orange, Commercial blue, Wetland teal, Government gray. Disputed parcels get a dashed red outline. Exact values are in section 10.1.

**Optional layer toggle (stretch):** "Land type" or "Risk" coloring using the latest stored assessment band.

## 5. Parcel side panel

Header: "Dag 14 · Khatian 220" plus status chip and dispute badge.
Tabs:
1. **Details**: current owner, khatian owner, land type, recorded area, mouza, and a notice if owner and khatian owner differ.
2. **History**: vertical timeline of ledger entries (type chip, from, to, date, performed by) and a "Verify integrity" button showing a green valid banner or a red banner naming the first broken entry.
3. **Risk**: "Run risk assessment" button, then score gauge, band chip, and finding cards.
4. **Enquire**: textarea with character counter and submit.

Authority extras inside the panel: "Edit parcel", "Record transaction", "Set dispute".

## 6. Components to build

`MapView`, `ParcelLayer`, `SearchBox`, `Legend`, `ParcelPanel`, `DetailsTab`, `HistoryTimeline`, `IntegrityBanner`, `RiskReport`, `ScoreGauge`, `FindingCard`, `EnquiryForm`, `EnquiryList`, `TransactionForm`, `ParcelForm`, `DisputeDialog`, `AuditTable`, `RoleGuard`, `EmptyState`, `ErrorState`, `Spinner`.

## 7. States

- Loading: skeletons for panel, spinner on map load.
- Empty: "No enquiries yet", "No history entries".
- Error: inline message with retry.
- Success: toast after enquiry sent, reply saved, transaction recorded.
- Forbidden: redirect users away from authority routes with a clear message.

## 8. Risk presentation

Gauge 0 to 100 with band label. Findings sorted by points. Each card: title, "+points", one-sentence explanation, "Show evidence" expander. Footer note: "Prototype on fictional data. Not legal advice."

## 9. Accessibility and responsiveness

Keyboard focus rings, aria labels on map controls and tabs, contrast at least AA, text equivalents for parcel colors, tablet-width layout tested, bottom sheet on mobile.

## 10. Visual style (design system)

**Concept:** "a modern land-survey office". Warm paper-like neutrals, one deep ink-navy brand color, and one survey-marker gold used only for selection and small highlights. The map's land-type colors are the only colorful element, so the map is the hero. Light theme only (no dark mode; a half-finished dark mode looks worse than none).

**Rule for the agent:** use only the tokens below. Do not invent colors, fonts, radii, or shadows. If something is missing, ask.

### 10.1 Color tokens

**Brand and neutrals** (map these to the shadcn/ui CSS variables in the right column)

| Token | Hex | Use | shadcn variable |
|---|---|---|---|
| Ink Navy | `#17324D` | Top bar, primary buttons, headings accents | `--primary` |
| On Navy | `#FFFFFF` | Text on navy | `--primary-foreground` |
| Survey Gold | `#F2A900` | Active nav underline, map selection ring, small highlights only | `--accent` |
| Gold Ink | `#3A2A00` | Text on gold backgrounds | `--accent-foreground` |
| Paper | `#F6F7F5` | App background | `--background` |
| Surface | `#FFFFFF` | Cards, side panel, inputs | `--card` |
| Text | `#1B2430` | Body and headings | `--foreground` |
| Muted text | `#5B6670` | Secondary text, labels (contrast 5.6:1 on white) | `--muted-foreground` |
| Muted fill | `#EEF0EC` | Tab strip, skeletons, table stripes | `--muted` |
| Border | `#E2E5E0` | Card and input borders, dividers | `--border`, `--input` |
| Focus ring | `#17324D` | 2px ring with 2px offset on every focusable element | `--ring` |
| Danger | `#B3261E` | Destructive buttons, errors | `--destructive` |

Gold is never used for text on white (too low contrast). Gold text is allowed only on navy.

**Land types** (parcel fill at 60% opacity, stroke at full strength; chip uses the same fill color)

| Land type | Fill | Stroke |
|---|---|---|
| Agricultural | `#7BB661` | `#4F8A3A` |
| Residential | `#F0A35E` | `#C77A2E` |
| Commercial | `#5B8FD6` | `#356BB0` |
| Wetland | `#5DBFB4` | `#2E8F85` |
| Government | `#A7B0BA` | `#6F7A86` |

**Map base**

| Element | Style |
|---|---|
| Map background (outside plots) | `#EDEBE3` parchment |
| Main road and feeder road | `#FFFFFF` fill with `#D5D2C8` casing, 10 to 14 px wide |
| River | `#BFD9EC` fill with `#9CC3DE` edge |
| Small labels (dag numbers inside plots, visible from mid zoom) | 11px, weight 600, `#1B2430` at 80%, white 2px halo |
| Hover | stroke `#17324D`, weight 3, fill opacity rises to 75% |
| Selected | double ring: outer stroke `#17324D` weight 6, inner stroke `#F2A900` weight 3, fill opacity 85% (the navy casing keeps the gold visible on any fill) |
| Disputed | stroke `#C0392B`, dashed `8 6`, weight 3, plus a small "!" badge at the polygon center |

**Risk bands and status** (always show the band as a text label next to the color)

| Band or state | Solid | Soft background | Text on soft |
|---|---|---|---|
| LOW | `#2E7D4F` | `#E6F4EA` | `#1E5A37` |
| MEDIUM | `#D69E00` | `#FFF6D6` | `#6B4E00` |
| HIGH | `#E26A2C` | `#FDE9DC` | `#8A3A0F` |
| CRITICAL | `#B3261E` | `#FDECEA` | `#8C1C16` |
| Integrity valid | `#2E7D4F` | `#E6F4EA` | `#1E5A37` |
| Integrity invalid | `#B3261E` | `#FDECEA` | `#8C1C16` |
| Enquiry OPEN | `#356BB0` | `#E8F0FA` | `#244C7D` |
| Enquiry ANSWERED | `#2E7D4F` | `#E6F4EA` | `#1E5A37` |
| Enquiry CLOSED | `#6F7A86` | `#EEF0EC` | `#454F5A` |

### 10.2 Typography

| Role | Font | Notes |
|---|---|---|
| Headings and numbers | **Manrope** | Weights 600 and 700. Gives the product a modern, confident look. |
| Body and UI | **Inter** | Weights 400, 500, 600. |
| Dag numbers, hashes, IDs | **JetBrains Mono** | Weight 500. Hashes shown shortened, first 8 and last 6 characters. |

Fallbacks: `system-ui, sans-serif` and `ui-monospace, monospace`. Load from one font provider and use font-display swap.

Type scale (size / line height): Caption 12/16, Small 13/18, Body 14/20, Body large 16/24, Heading 3 20/28 (Manrope 600), Heading 2 24/32 (Manrope 700), Heading 1 32/40 (Manrope 700), Score number 44/48 (Manrope 700). Letter spacing −1% on headings 24px and up. Labels above form fields: 13px, weight 500, muted text.

### 10.3 Shape, spacing, depth

- Spacing unit 4px; common steps 8, 12, 16, 24, 32.
- Radius: buttons and inputs 8px, cards and panel 12px, chips and badges full pill, mobile bottom sheet 20px top corners.
- Borders: 1px `#E2E5E0` on cards; no heavy outlines.
- Shadows (navy-tinted, soft): card `0 1px 2px rgba(23,50,77,.06), 0 4px 12px rgba(23,50,77,.06)`; side panel and popovers `0 8px 30px rgba(23,50,77,.14)`; map controls `0 2px 8px rgba(23,50,77,.12)`.
- Layout: top bar 56px high; side panel 400px wide on desktop; page content max width 1100px for non-map pages; 24px page padding.

### 10.4 Components

**Top bar:** navy background, white text, logo mark (a small shield containing a 2 by 2 plot grid) plus "PlotGuard" in Manrope 700. Active link has a 2px gold underline; hover lightens text to `#DCE6F0`. Right side shows the user's initials in a gold circle with navy text, and a dropdown for logout. Authority accounts show a small "Authority" pill in gold with `#3A2A00` text so the role is always visible.

**Buttons (40px high, text 14px weight 600):** Primary is navy fill with white text, hover `#1F4468`, pressed `#102536`. Secondary is white with navy text and a 1px border, hover muted fill. Ghost has no border and hovers to muted fill. Destructive is `#B3261E` fill. Disabled uses 45% opacity with no hover. Loading state shows a small spinner and keeps the width fixed.

**Inputs:** 40px high, white, 1px border, 8px radius. Focus shows the navy 2px ring. Error shows a `#B3261E` border with the message below in 13px. Helper text is muted.

**Cards:** white, 12px radius, card shadow, 16 to 20px padding, optional 13px muted uppercase label at the top.

**Chips and badges:** pill shape, 12px text weight 600. Land type chips show a 8px colored dot plus text on the muted fill. Status and risk chips use the soft background and "text on soft" colors from 10.1.

**Tabs (parcel panel):** underline style. Active tab has navy text and a 2px navy underline; inactive tabs use muted text. 44px tall touch targets.

**Search box (on the map):** white pill, 44px high, shadow, magnifier icon on the left, placeholder "Search dag number, e.g. 14". Enter selects and zooms. A clear button appears when text exists.

**Legend (on the map):** small white card, 12px text, colored squares matching the land-type fills, collapsible on mobile.

**Toasts:** bottom center, navy background with white text for success, danger red for errors, auto close after 4 seconds.

**Icons:** lucide-react, 18px in UI, 20px in headers, stroke 1.75. Suggested: `Map`, `Search`, `ShieldCheck`, `ShieldAlert`, `History`, `Gauge`, `MessageSquare`, `FileWarning`, `Landmark`, `User`.

### 10.5 Signature elements (what judges notice first)

1. **Login and signup screens:** split layout. Left half is a navy panel with a faint outline pattern of parcel polygons (the actual mouza outlines at 8% white) and the tagline "Land records you can see, question, and trust." in Manrope 700, 32px, white. Right half is a centered white card with the form. On mobile, the navy panel becomes a short header band.
2. **Map first impression:** map loads with a smooth fit-to-bounds animation (400ms). Parcels fade in together (200ms). The side panel starts closed, and a small hint card appears bottom-center: "Click any plot to see its owner." It disappears after the first click.
3. **Selection moment:** the double ring appears, the map eases toward the plot, and the panel slides in from the right (220ms ease-out).
4. **Risk gauge:** semicircle gauge, 0 to 100. Track `#E2E5E0`, filled arc in the band's solid color, score number in Manrope 700 44px centered, band chip beneath. The arc animates from 0 to the score over 600ms. Finding cards then fade in one after another, 60ms apart.
5. **Integrity banners:** valid is a soft green banner with a `ShieldCheck` icon and "History verified: N entries, no changes detected". Invalid is a soft red banner with a `ShieldAlert` icon and "History altered: entry 2 does not match its recorded hash". The invalid banner also gives the matching timeline entry a red outline.

### 10.6 History timeline

Vertical line `#D5D9DD`, 2px. Each node is a 12px circle: navy for REGISTRATION, blue for SALE, orange for INHERITANCE, teal for GIFT, gray for MUTATION, red outline for CORRECTION. Entry card shows the type chip, "From → To" owner names, effective date in muted text, performer, and the short hash in mono 12px muted. Entries that fail verification get a red border and a soft red background.

### 10.7 Finding cards (risk)

White card with a 4px left border in the severity's solid color. Title in Manrope 600, a "+40" pill on the right in the soft background of that severity, a one-sentence explanation in body text, and a "Show evidence" text button that expands a muted-fill box with the evidence in 13px. Footer of the Risk tab: "Prototype on fictional data. Not legal advice." in 12px muted.

### 10.8 Authority-area differences

Same design system. Tables use 44px rows, a muted-fill header with 12px uppercase labels, zebra stripes in `#F6F7F5`, and a sticky header. Forms use two columns on desktop. Destructive or irreversible actions (record transaction) show a confirmation dialog summarizing what will be written to the history.

### 10.9 Motion

Durations 150 to 220ms with ease-out for UI, 400ms for map camera moves, 600ms for the gauge. Skeleton loaders use a subtle shimmer on the muted fill. Respect `prefers-reduced-motion` by removing animations except opacity fades.

### 10.10 Responsive behavior

- 1280px and wider: map plus 400px side panel.
- 768 to 1279px: panel overlays the map at 360px with a close button.
- Below 768px: panel becomes a bottom sheet with three snap heights (peek 96px, half, full); legend collapses to an icon; top bar collapses to a menu.

### 10.11 Accessibility checks

All text meets contrast AA (4.5:1) against its background; parcel colors are never the only signal (land type text appears in the panel and the legend); focus ring visible everywhere; map controls and tabs have aria labels; the parcel list can also be reached through the search box and a keyboard-accessible "Browse plots" list (stretch).

### 10.12 Visual QA checklist (do before every demo)

- Login screen looks intentional at 1440px and 390px widths.
- Map loads with no flash of unstyled content; fonts loaded.
- Every parcel color matches the table in 10.1; legend matches.
- Selection ring is clearly visible on every land type.
- Risk gauge and banners show the exact colors for each band.
- No default browser styling leaks (scrollbars, focus outlines, form controls).
- No layout jumps while data loads; skeletons match final layout.
- Screenshots taken for the pitch deck: login, map, panel with history, risk report on dag 14, invalid integrity on dag 18, authority dashboard.
