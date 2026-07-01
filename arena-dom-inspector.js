/**
 * AI Sparring Arena — DOM Inspector
 * 
 * Paste into browser console on any chat site (DeepSeek, ChatGPT, Gemini, etc.)
 * Produces a full DOM report + live MutationObserver for streaming detection.
 *
 * Usage:
 *   1. Open the chat site
 *   2. Have at least one assistant message visible
 *   3. Paste this entire script into the console
 *   4. Read the snapshot report
 *   5. Send a message to the AI and watch the "LIVE MUTATIONS" log
 *   6. After generation stops, run: ArenaInspector.stop() to get the summary
 *   7. Run: ArenaInspector.copy() to copy full report to clipboard
 */

(function() {
  'use strict';

  const R = []; // report lines
  const mutations = []; // live mutation log
  let observer = null;
  let observing = false;
  let generationStartTime = null;

  function log(section, ...args) {
    const line = `[${section}] ${args.join(' ')}`;
    R.push(line);
    console.log(`%c${line}`, 'color: #0f0; background: #111; padding: 2px 6px;');
  }

  function divider(title) {
    const line = `\n${'═'.repeat(20)} ${title} ${'═'.repeat(20)}`;
    R.push(line);
    console.log(`%c${line}`, 'color: #ff0; background: #111; font-weight: bold; padding: 4px;');
  }

  // ─── SNAPSHOT: Input Fields ─────────────────────────────
  function snapshotInputs() {
    divider('INPUT FIELDS');

    // Textareas
    document.querySelectorAll('textarea').forEach((el, i) => {
      log('TEXTAREA', `[${i}] placeholder="${el.placeholder}" name="${el.name}" id="${el.id}" class="${el.className.substring(0, 60)}"`);
    });

    // Contenteditable
    document.querySelectorAll('[contenteditable="true"]').forEach((el, i) => {
      log('EDITABLE', `[${i}] tag=${el.tagName} id="${el.id}" class="${el.className.substring(0, 60)}" role="${el.getAttribute('role') || ''}"`);
    });

    if (!document.querySelector('textarea') && !document.querySelector('[contenteditable="true"]')) {
      log('TEXTAREA', 'NONE FOUND');
    }
  }

  // ─── SNAPSHOT: Buttons ──────────────────────────────────
  function snapshotButtons() {
    divider('BUTTONS (bottom 300px)');

    const allClickable = [...document.querySelectorAll('button, div[role="button"], a[role="button"]')];
    const bottomClickable = allClickable.filter(el => {
      const r = el.getBoundingClientRect();
      return r.bottom > window.innerHeight - 300 && r.height > 0 && r.width > 0;
    });

    bottomClickable.forEach((el, i) => {
      const text = el.textContent?.trim().substring(0, 30) || '';
      const aria = el.getAttribute('aria-label') || '';
      const testid = el.getAttribute('data-testid') || '';
      const cls = el.className?.substring(0, 50) || '';
      const tag = el.tagName;
      const role = el.getAttribute('role') || '';
      const disabled = el.disabled ? ' DISABLED' : '';
      log('BTN', `[${i}] ${tag} class="${cls}" aria="${aria}" testid="${testid}" text="${text}" role="${role}"${disabled}`);
    });

    if (bottomClickable.length === 0) {
      log('BTN', 'No buttons found in bottom 300px');
    }
  }

  // ─── SNAPSHOT: Messages ─────────────────────────────────
  function snapshotMessages() {
    divider('MESSAGES');

    // Common message selectors across sites
    const selectors = [
      '[data-message-author-role]',
      '[data-role]',
      '[data-testid*="message"]',
      '.ds-message',
      '.ds-assistant-message-main-content',
      '[class*="message"]',
      '[class*="assistant"]',
      '[class*="user-message"]',
      '[class*="bot-message"]',
    ];

    const found = new Map();
    selectors.forEach(sel => {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length > 0) {
          found.set(sel, els.length);
        }
      } catch (_) {}
    });

    if (found.size === 0) {
      log('MSG', 'No messages found with common selectors');
    } else {
      found.forEach((count, sel) => {
        log('MSG', `"${sel}" → ${count} elements`);
      });
    }

    // Detail dump of most likely assistant messages
    const assistantSelectors = [
      '.ds-assistant-message-main-content',
      '[data-message-author-role="assistant"]',
      '[data-role="assistant"]'
    ];

    for (const sel of assistantSelectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        divider(`ASSISTANT MESSAGES via "${sel}"`);
        els.forEach((el, i) => {
          const text = el.innerText || '';
          const parent = el.parentElement;
          log('ASST', `[${i}] ${text.length} chars — "${text.substring(0, 50)}..."`);
          log('ASST', `  tag=${el.tagName} class="${el.className.substring(0, 60)}"`);
          log('ASST', `  parent.class="${parent?.className?.substring(0, 60) || 'none'}"`);
          log('ASST', `  childText selector test: .querySelector('.markdown, .prose, .ds-markdown, .ds-markdown-paragraph, [class*="markdown"]') → ${el.querySelector('.markdown, .prose, .ds-markdown, .ds-markdown-paragraph, [class*="markdown"]')?.tagName || 'null'}`);
        });
        break; // use first matching selector
      }
    }

    // Message structure for last message
    const lastMsg = document.querySelector('.ds-message:last-child, [data-message-author-role="assistant"]:last-child');
    if (lastMsg) {
      divider('LAST MESSAGE HTML (first 800 chars)');
      log('HTML', lastMsg.innerHTML.substring(0, 800));
    }
  }

  // ─── SNAPSHOT: Scroll Container ─────────────────────────
  function snapshotScroll() {
    divider('SCROLL CONTAINERS');
    const candidates = document.querySelectorAll('[class*="scroll"], [class*="react-scroll"], main, [role="main"]');
    candidates.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.height > 200) {
        log('SCROLL', `[${i}] ${el.tagName} class="${el.className.substring(0, 50)}" h=${Math.round(r.height)} scrollH=${el.scrollHeight}`);
      }
    });
  }

  // ─── SNAPSHOT: Animated Elements ────────────────────────
  function snapshotAnimations() {
    divider('ANIMATED ELEMENTS (potential streaming indicators)');
    let count = 0;
    document.querySelectorAll('*').forEach(el => {
      try {
        const s = window.getComputedStyle(el);
        if (s.animationName && s.animationName !== 'none') {
          log('ANIM', `${el.tagName}.${el.className?.substring(0, 50)} animation="${s.animationName}" duration="${s.animationDuration}"`);
          count++;
        }
      } catch (_) {}
    });
    if (count === 0) log('ANIM', 'No animated elements found');
  }

  // ─── LIVE: MutationObserver ─────────────────────────────
  function startObserver() {
    if (observer) observer.disconnect();

    const target = document.querySelector('main') || document.body;
    generationStartTime = Date.now();
    mutations.length = 0;

    observer = new MutationObserver((mutationList) => {
      const elapsed = Date.now() - generationStartTime;

      for (const mut of mutationList) {
        // Track added nodes (new message elements, cursors, loading indicators)
        if (mut.type === 'childList' && mut.addedNodes.length > 0) {
          mut.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return; // skip text nodes
            const cls = node.className || '';
            const tag = node.tagName;

            // Log interesting additions
            if (cls.toString().match(/cursor|blink|loading|typing|streaming|thinking|generating|pulse|dot|spinner/i) ||
                tag === 'SVG' || tag === 'svg') {
              const entry = `+${elapsed}ms ADDED: ${tag}.${cls.toString().substring(0, 60)}`;
              mutations.push(entry);
              console.log(`%c[LIVE] ${entry}`, 'color: #f80; background: #111;');
            }

            // Also log any element added inside the last assistant message
            const isInLastMsg = node.closest?.('.ds-assistant-message-main-content, [data-message-author-role="assistant"]');
            if (isInLastMsg) {
              const entry = `+${elapsed}ms IN_MSG: ${tag}.${cls.toString().substring(0, 60)} text="${(node.textContent || '').substring(0, 40)}"`;
              mutations.push(entry);
              console.log(`%c[LIVE] ${entry}`, 'color: #8f0; background: #111;');
            }
          });
        }

        // Track removed nodes (cursor disappearing = generation done)
        if (mut.type === 'childList' && mut.removedNodes.length > 0) {
          mut.removedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            const cls = node.className || '';
            if (cls.toString().match(/cursor|blink|loading|typing|streaming|thinking|generating|pulse|dot|spinner/i)) {
              const entry = `+${elapsed}ms REMOVED: ${node.tagName}.${cls.toString().substring(0, 60)}`;
              mutations.push(entry);
              console.log(`%c[LIVE] ${entry}`, 'color: #f00; background: #111;');
            }
          });
        }

        // Track class changes on buttons (send → stop transition)
        if (mut.type === 'attributes' && mut.attributeName === 'class') {
          const el = mut.target;
          if (el.getAttribute('role') === 'button' || el.tagName === 'BUTTON') {
            const r = el.getBoundingClientRect();
            if (r.bottom > window.innerHeight - 200) {
              const entry = `+${elapsed}ms BTN_CLASS: ${el.tagName}.${el.className?.substring(0, 60)}`;
              mutations.push(entry);
              console.log(`%c[LIVE] ${entry}`, 'color: #0ff; background: #111;');
            }
          }
        }
      }
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'aria-label', 'disabled']
    });

    observing = true;
    console.log('%c[Arena Inspector] MutationObserver started — send a message now, then run ArenaInspector.stop()', 'color: #0f0; font-size: 14px;');
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    observing = false;

    divider('MUTATION SUMMARY');
    if (mutations.length === 0) {
      log('MUTATIONS', 'No relevant mutations captured. The streaming indicator might use:');
      log('MUTATIONS', '  - CSS pseudo-elements (::after cursor)');
      log('MUTATIONS', '  - Canvas/WebGL rendering');
      log('MUTATIONS', '  - Shadow DOM');
      log('MUTATIONS', '  - Text node changes only (no element add/remove)');
    } else {
      log('MUTATIONS', `${mutations.length} events captured:`);
      mutations.forEach(m => log('MUT', m));
    }

    // Also snapshot animated elements NOW (they may only exist during generation)
    snapshotAnimations();

    console.log('%c[Arena Inspector] Observer stopped. Run ArenaInspector.copy() for full report.', 'color: #ff0; font-size: 14px;');
  }

  // ─── REPORT ─────────────────────────────────────────────
  function generateReport() {
    R.length = 0;
    divider('ARENA DOM INSPECTOR — ' + window.location.hostname);
    log('META', `URL: ${window.location.href}`);
    log('META', `Date: ${new Date().toISOString()}`);
    log('META', `User Agent: ${navigator.userAgent.substring(0, 80)}`);

    snapshotInputs();
    snapshotButtons();
    snapshotMessages();
    snapshotScroll();
    snapshotAnimations();

    divider('SNAPSHOT COMPLETE');
    console.log('%c[Arena Inspector] Snapshot done. Now starting MutationObserver...', 'color: #0f0; font-size: 14px;');
    console.log('%cSend a message to the AI, wait for it to finish, then run: ArenaInspector.stop()', 'color: #ff0; font-size: 13px;');

    startObserver();
  }

  function copyReport() {
    const full = R.join('\n');
    navigator.clipboard.writeText(full).then(() => {
      console.log('%c[Arena Inspector] Full report copied to clipboard! Paste it to Claude.', 'color: #0f0; font-size: 14px;');
    }).catch(() => {
      console.log('%c[Arena Inspector] Clipboard failed. Report logged below:', 'color: #f00;');
      console.log(full);
    });
    return full;
  }

  // ─── EXPOSE API ─────────────────────────────────────────
  window.ArenaInspector = {
    stop: stopObserver,
    copy: copyReport,
    snapshot: generateReport,
    mutations: mutations,
    report: R
  };

  // Auto-run
  generateReport();

})();
