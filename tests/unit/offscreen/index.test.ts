// Unit tests for offscreen/index.ts

import type { handleOffscreenMessage as Handler } from '@/offscreen/index';
import { stubClipboard } from '@tests/helpers/hook-env';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SENDER = {} as chrome.runtime.MessageSender;
const COPY = { target: 'offscreen', type: 'copy', payload: { text: 'https://a.example/' } };

let handleOffscreenMessage: typeof Handler;
let listener: unknown;

/** Calls the handler and waits for its answer. */
async function ask(message: unknown): Promise<{ returned: boolean; response: unknown }> {
  let respond: (value: unknown) => void = () => undefined;
  const answer = new Promise<unknown>((done) => {
    respond = done;
  });
  const returned = handleOffscreenMessage(message, SENDER, respond);
  return { returned, response: returned ? await answer : undefined };
}

/** Sets document.execCommand to a stub for one test. */
function stubExecCommand(run: () => boolean): ReturnType<typeof vi.fn> {
  const stub = vi.fn(run);
  Object.defineProperty(document, 'execCommand', {
    value: stub,
    configurable: true,
    writable: true,
  });
  return stub;
}

describe('offscreen page', () => {
  beforeEach(async () => {
    vi.resetModules();
    const module = await import('@/offscreen/index');
    handleOffscreenMessage = module.handleOffscreenMessage;
    listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls[0]?.[0];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, 'execCommand');
    document.body.replaceChildren();
  });

  it('listens for runtime messages with the handler', () => {
    expect(listener).toBe(handleOffscreenMessage);
  });

  it('writes plain text and replies ok', async () => {
    const clipboard = stubClipboard();

    const { returned, response } = await ask(COPY);

    expect(returned).toBe(true);
    expect(response).toEqual({ ok: true });
    expect(clipboard.writeText).toHaveBeenCalledWith('https://a.example/');
  });

  it('writes both flavors for a payload with HTML', async () => {
    const clipboard = stubClipboard();
    const payload = { text: 'A (https://a.example/)', html: '<a href="https://a.example/">A</a>' };

    const { response } = await ask({ ...COPY, payload });

    expect(response).toEqual({ ok: true });
    expect(clipboard.write).toHaveBeenCalledOnce();
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('falls back to the copy command when the clipboard write rejects', async () => {
    const clipboard = stubClipboard();
    clipboard.writeText.mockRejectedValue(new Error('Document is not focused.'));
    let selected = '';
    const exec = stubExecCommand(() => {
      selected = document.querySelector('textarea')?.value ?? '';
      return true;
    });

    const { response } = await ask(COPY);

    expect(response).toEqual({ ok: true });
    expect(exec).toHaveBeenCalledWith('copy');
    expect(selected).toBe('https://a.example/');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('puts the HTML flavor on the clipboard in the fallback through the copy event', async () => {
    const clipboard = stubClipboard();
    clipboard.write.mockRejectedValue(new Error('Document is not focused.'));
    const setData = vi.fn();
    let event: Event | undefined;
    stubExecCommand(() => {
      event = new Event('copy', { cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { setData } });
      document.dispatchEvent(event);
      return true;
    });
    const payload = { text: 'A (https://a.example/)', html: '<a href="https://a.example/">A</a>' };

    const { response } = await ask({ ...COPY, payload });

    expect(response).toEqual({ ok: true });
    expect(setData).toHaveBeenCalledWith('text/plain', payload.text);
    expect(setData).toHaveBeenCalledWith('text/html', payload.html);
    expect(event?.defaultPrevented).toBe(true);
  });

  it('sets only the plain flavor in the fallback for a plain payload', async () => {
    const clipboard = stubClipboard();
    clipboard.writeText.mockRejectedValue(new Error('Document is not focused.'));
    const setData = vi.fn();
    stubExecCommand(() => {
      const event = new Event('copy', { cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { setData } });
      document.dispatchEvent(event);
      return true;
    });

    await ask(COPY);

    expect(setData).toHaveBeenCalledTimes(1);
    expect(setData).toHaveBeenCalledWith('text/plain', 'https://a.example/');
  });

  it('tolerates a copy event with no clipboard data', async () => {
    const clipboard = stubClipboard();
    clipboard.writeText.mockRejectedValue(new Error('Document is not focused.'));
    stubExecCommand(() => {
      document.dispatchEvent(new Event('copy', { cancelable: true }));
      return true;
    });

    const { response } = await ask(COPY);

    expect(response).toEqual({ ok: true });
  });

  it('replies with the error when the copy command also fails, and removes its textarea', async () => {
    const clipboard = stubClipboard();
    clipboard.writeText.mockRejectedValue(new Error('Document is not focused.'));
    stubExecCommand(() => false);

    const { response } = await ask(COPY);

    expect(response).toEqual({ ok: false, error: 'The copy command failed.' });
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('ignores a message for another target', async () => {
    const clipboard = stubClipboard();

    const { returned } = await ask({ ...COPY, target: 'popup' });

    expect(returned).toBe(false);
    expect(clipboard.writeText).not.toHaveBeenCalled();
  });

  it('ignores a message with an invalid payload and a message that is not an object', async () => {
    stubClipboard();

    expect((await ask({ ...COPY, payload: { text: 5 } })).returned).toBe(false);
    expect((await ask('copy')).returned).toBe(false);
  });
});
