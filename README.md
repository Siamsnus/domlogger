# ⚔ Arena DOM Inspector

A one-click bookmarklet that maps the DOM of any AI chat interface — inputs, buttons, message containers, scroll areas, and streaming indicators — in seconds. Built for the [AI Sparring Arena](https://github.com/Siamsnus) Firefox extension but useful for any browser automation project targeting chat UIs.

## The Problem

Every AI chat site (ChatGPT, DeepSeek, Gemini, Claude, etc.) has a different DOM structure. Building browser extensions or automation tools that interact with these interfaces requires mapping selectors for input fields, send buttons, stop buttons, assistant message containers, and streaming indicators. This mapping is tedious, requires multiple console commands, and needs to be repeated every time a site updates its frontend.

## The Solution

One bookmarklet. One click. Full DOM report. Copy-paste to your dev environment.

## Install

1. Open `arena-inspector.html` in your browser
2. Drag the green **⚔ Arena Inspector** button to your bookmarks bar
3. Done

Or create a bookmark manually and paste the contents of `arena-inspector-bookmarklet.txt` as the URL.

## Usage

1. Navigate to any AI chat site
2. Click the bookmarklet — a floating panel appears in the bottom-right corner
3. The tool automatically runs a **snapshot** and starts the **mutation observer**

### Panel Controls

| Button | Function |
|--------|----------|
| 📸 **Snap** | Re-scan the DOM for inputs, buttons, messages, and scroll containers |
| 👁 **Watch** | Start the MutationObserver (auto-starts on first run) |
| ⏹ **Stop** | Stop the observer and capture any animated elements |
| 📋 **Copy** | Copy the full report to clipboard |
| ✕ | Hide the panel (click bookmarklet again to show) |

### Recommended Workflow

1. Click bookmarklet (snapshot + observer start automatically)
2. Send a message to the AI
3. Wait for the response to complete
4. Click **⏹ Stop**
5. Click **📋 Copy**
6. Paste the report wherever you need it

## What It Captures

### Snapshot (instant)
- All `<textarea>` elements with placeholder, name, id, and class
- All `contenteditable` elements
- All buttons and `div[role="button"]` elements in the bottom 300px (near the input area)
- Message containers matching common selectors across sites
- Assistant message details: text length, classes, parent structure
- HTML structure of the last message
- Scroll containers
- Currently animated elements (CSS animations)

### Live Mutations (during AI generation)
- Elements added with streaming-related classes (cursor, blink, loading, typing, streaming, thinking, pulse, spinner)
- Elements added inside the last assistant message container
- Elements removed with streaming-related classes (generation complete signal)
- Button class changes in the input area (send → stop state transitions)

## Example Output

```
[META] URL: https://chat.deepseek.com/a/chat/s/abc123
[META] Time: 2026-07-01T13:00:00.000Z
[INPUT] textarea[0] placeholder="Message DeepSeek" name="search" class="ds-scroll-area..."
[BTN] DIV class="ds-button ds-button--primary" aria="" text=""
[MSG] ".ds-assistant-message-main-content" = 2 elements
[ASST] [0] 2347ch "The Hindenburg was a massive German pass..." tag=DIV class="ds-markdown ds-assistant-message-main-content"
[ASST] [1] 1765ch "Exactly! You've hit the nail on the head..." tag=DIV class="ds-markdown ds-assistant-message-main-content"
[MUT] +1200ms ADD: SPAN.ds-message-loading
[MUT] +15300ms DEL: SPAN.ds-message-loading
```

## Supported Sites

Tested on:
- ChatGPT (chatgpt.com)
- DeepSeek (chat.deepseek.com)

Designed to work on any site — the selectors cover common patterns across React-based chat interfaces.

## Files

| File | Description |
|------|-------------|
| `arena-inspector.html` | Installer page with draggable bookmarklet |
| `arena-inspector-bookmarklet.txt` | Raw bookmarklet code (paste as bookmark URL) |
| `inspector.js` | Full annotated source — readable version of the bookmarklet |

## Technical Notes

- Uses `MutationObserver` with `childList`, `subtree`, and `attributes` observation
- Monitors attribute changes on `class`, `aria-label`, and `disabled` only (performance)
- Filters mutations to streaming-relevant patterns to avoid noise
- The bookmarklet is idempotent — clicking it again toggles the panel
- No external dependencies, no network requests, no data collection
- Works in Firefox and Chromium-based browsers

## Background

This tool was built to support development of the AI Sparring Arena, a Firefox extension that orchestrates adversarial debates between Claude (Anthropic) and opponent models running in browser tabs. Adding new opponent sites requires precise DOM selector mapping — this bookmarklet reduces that process from thirty minutes of manual console work to thirty seconds.

## License

MIT
