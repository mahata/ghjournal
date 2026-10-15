import './style.css';

import { defineContentScript } from 'wxt/utils/define-content-script';

import { startCommentSaver } from '@/lib/comment-saver';

export default defineContentScript({
  // GitHub navigates between pages without full reloads, so the script runs on every
  // github.com page and decides by URL whether a conversation is shown.
  matches: ['https://github.com/*'],
  main(ctx) {
    const saver = startCommentSaver({ signal: ctx.signal });
    ctx.addEventListener(window, 'wxt:locationchange', () => saver.sync());
  },
});
