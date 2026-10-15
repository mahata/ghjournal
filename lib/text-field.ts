/**
 * Replaces the textarea content so that the change can be undone with Cmd/Ctrl+Z
 * and frameworks such as React observe it like regular typing.
 */
export function replaceTextareaValue(textarea: HTMLTextAreaElement, value: string): void {
  const doc = textarea.ownerDocument;
  textarea.focus();

  // execCommand only edits the focused element, so it is skipped when the textarea
  // cannot take focus (for example while it is hidden behind a preview tab).
  if (doc.activeElement === textarea) {
    textarea.select();
    let inserted = false;
    try {
      inserted = doc.execCommand('insertText', false, value);
    } catch {
      inserted = false;
    }
    if (inserted && textarea.value === value) {
      moveCaretToEnd(textarea);
      return;
    }
  }

  setValueAndNotify(textarea, value);
  moveCaretToEnd(textarea);
}

/** Fallback that keeps frameworks in sync but cannot be undone. */
function setValueAndNotify(textarea: HTMLTextAreaElement, value: string): void {
  const prototype = textarea.ownerDocument.defaultView?.HTMLTextAreaElement.prototype;
  const setValue = prototype && Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setValue) {
    setValue.call(textarea, value);
  } else {
    textarea.value = value;
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

function moveCaretToEnd(textarea: HTMLTextAreaElement): void {
  const end = textarea.value.length;
  try {
    textarea.setSelectionRange(end, end);
  } catch {
    // Some hidden elements reject selection changes; the caret position is cosmetic.
  }
}
