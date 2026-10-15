import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { replaceTextareaValue } from '@/lib/text-field';

describe('replaceTextareaValue', () => {
  let textarea: HTMLTextAreaElement;
  let inputEvents: number;

  beforeEach(() => {
    document.body.innerHTML = '<textarea>old text</textarea>';
    textarea = document.querySelector('textarea')!;
    inputEvents = 0;
    textarea.addEventListener('input', () => inputEvents++);
  });

  afterEach(() => {
    // jsdom has no execCommand, so tests define it per case.
    Reflect.deleteProperty(document, 'execCommand');
  });

  function stubExecCommand(implementation: (command: string, showUi: boolean, value: string) => boolean) {
    const execCommand = vi.fn(implementation);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    return execCommand;
  }

  it('inserts through execCommand so the change stays undoable', () => {
    const execCommand = stubExecCommand((_command, _showUi, value) => {
      // A real insertText replaces the selection and fires input events itself.
      textarea.value = value;
      return true;
    });

    replaceTextareaValue(textarea, 'saved draft');

    expect(execCommand).toHaveBeenCalledWith('insertText', false, 'saved draft');
    expect(textarea.value).toBe('saved draft');
    expect(inputEvents).toBe(0);
    expect(document.activeElement).toBe(textarea);
    expect(textarea.selectionStart).toBe('saved draft'.length);
    expect(textarea.selectionEnd).toBe('saved draft'.length);
  });

  it('falls back to setting the value and firing input when execCommand is unsupported', () => {
    stubExecCommand(() => false);

    replaceTextareaValue(textarea, 'saved draft');

    expect(textarea.value).toBe('saved draft');
    expect(inputEvents).toBe(1);
  });

  it('falls back when execCommand throws', () => {
    stubExecCommand(() => {
      throw new Error('blocked');
    });

    replaceTextareaValue(textarea, 'saved draft');

    expect(textarea.value).toBe('saved draft');
    expect(inputEvents).toBe(1);
  });

  it('does not use execCommand when the textarea cannot take focus', () => {
    const execCommand = stubExecCommand(() => true);
    textarea.disabled = true;

    replaceTextareaValue(textarea, 'saved draft');

    expect(execCommand).not.toHaveBeenCalled();
    expect(textarea.value).toBe('saved draft');
    expect(inputEvents).toBe(1);
  });

  it('bypasses instance-level value setters so React notices the change', () => {
    stubExecCommand(() => false);
    const prototypeValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!;
    let trackedValue = 'old text';
    // React tracks the last value it saw by overriding `value` on the element itself.
    Object.defineProperty(textarea, 'value', {
      configurable: true,
      get: () => prototypeValue.get!.call(textarea),
      set: (value: string) => {
        trackedValue = value;
        prototypeValue.set!.call(textarea, value);
      },
    });

    replaceTextareaValue(textarea, 'saved draft');

    expect(prototypeValue.get!.call(textarea)).toBe('saved draft');
    expect(trackedValue).toBe('old text');
    expect(inputEvents).toBe(1);
  });
});
