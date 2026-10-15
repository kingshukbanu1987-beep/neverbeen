import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PremiumPaymentRequest } from './premium-payment';
import { UPI_APP_LAUNCH_TIMEOUT_MS, UpiAppLauncher } from './upi-app-launcher';

const request: PremiumPaymentRequest = {
  modelSlug: 'nourhan-durrani',
  amount: 119,
  method: 'gpay',
};

function browserContext() {
  const browser = Object.assign(new EventTarget(), {
    navigator: { userAgent: 'Android 15', platform: 'Linux armv8l', maxTouchPoints: 5 },
    location: { assign: vi.fn() },
  });
  const document = Object.assign(new EventTarget(), {
    defaultView: browser,
    visibilityState: 'visible',
  });
  const visibility = (state: 'hidden' | 'visible') => {
    document.visibilityState = state;
    document.dispatchEvent(new Event('visibilitychange'));
  };
  return { browser, document, visibility };
}

describe('UPI app handoff lifecycle, not payment verification', () => {
  let context: ReturnType<typeof browserContext>;
  let launcher: UpiAppLauncher;

  beforeEach(() => {
    vi.useFakeTimers();
    context = browserContext();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: context.document }],
    });
    launcher = TestBed.inject(UpiAppLauncher);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens synchronously from the user gesture and resolves only after a hidden → visible return', async () => {
    const returned = vi.fn();
    const pending = launcher.open(request, new AbortController().signal).then(returned);
    expect(context.browser.location.assign).toHaveBeenCalledOnce();
    const url = new URL(context.browser.location.assign.mock.calls[0][0]);
    expect(url.protocol).toBe('tez:');
    expect(url.searchParams.get('am')).toBe('119.00');
    await Promise.resolve();
    expect(returned).not.toHaveBeenCalled();

    context.visibility('hidden');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(returned).not.toHaveBeenCalled();
    context.visibility('visible');
    await pending;
    expect(returned).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);

    // Focus and duplicate visibility events must not continue the same attempt twice.
    context.browser.dispatchEvent(new Event('focus'));
    context.visibility('visible');
    expect(returned).toHaveBeenCalledOnce();
  });

  it('reports an app-launch failure if the page never leaves, without resolving on blur/focus', async () => {
    const pending = launcher.open(request, new AbortController().signal);
    const expectation = expect(pending).rejects.toThrow(/couldn’t open Google Pay/);
    context.browser.dispatchEvent(new Event('blur'));
    context.browser.dispatchEvent(new Event('focus'));
    context.visibility('visible');
    await vi.advanceTimersByTimeAsync(UPI_APP_LAUNCH_TIMEOUT_MS);
    await expectation;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not time out while the browser’s app-opening permission prompt is awaiting a response', async () => {
    const returned = vi.fn();
    const pending = launcher.open(request, new AbortController().signal).then(returned);
    context.browser.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(returned).not.toHaveBeenCalled();
    context.visibility('hidden');
    context.visibility('visible');
    await pending;
    expect(returned).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['focus', 'pageshow'])('also handles %s after a real handoff', async (event) => {
    const pending = launcher.open({ ...request, method: 'phonepe' }, new AbortController().signal);
    expect(context.browser.location.assign.mock.calls[0][0]).toContain('phonepe://pay?');
    context.visibility('hidden');
    context.document.visibilityState = 'visible';
    context.browser.dispatchEvent(new Event(event));
    await pending;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up every listener and timeout when the handoff is aborted', async () => {
    const controller = new AbortController();
    const removeDocumentListener = vi.spyOn(context.document, 'removeEventListener');
    const removeWindowListener = vi.spyOn(context.browser, 'removeEventListener');
    const pending = launcher.open(request, controller.signal);
    const expectation = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await expectation;
    expect(removeDocumentListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('focus', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('blur', expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith('pageshow', expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not launch an already-aborted attempt', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(launcher.open(request, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(context.browser.location.assign).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects unsupported desktops instead of silently opening a chat', async () => {
    context.browser.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    context.browser.navigator.platform = 'Win32';
    await expect(launcher.open(request, new AbortController().signal)).rejects.toThrow(
      /phone or tablet/,
    );
    expect(context.browser.location.assign).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleans up if the browser rejects navigation to the custom app scheme', async () => {
    context.browser.location.assign.mockImplementation(() => {
      throw new Error('blocked');
    });
    await expect(launcher.open(request, new AbortController().signal)).rejects.toThrow(
      /mobile browser/,
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports the phone or tablet platform, and null on a laptop or desktop', () => {
    expect(launcher.platform()).toBe('android');
    context.browser.navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)';
    context.browser.navigator.platform = 'MacIntel';
    expect(launcher.platform()).toBe('ios');
    context.browser.navigator.maxTouchPoints = 0;
    expect(launcher.platform()).toBeNull();
    context.browser.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
    context.browser.navigator.platform = 'Win32';
    expect(launcher.platform()).toBeNull();
  });

  it('uses the iOS Google Pay scheme for an iPad with a desktop user agent', async () => {
    context.browser.navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)';
    context.browser.navigator.platform = 'MacIntel';
    const pending = launcher.open(request, new AbortController().signal);
    expect(context.browser.location.assign.mock.calls[0][0]).toContain('gpay://upi/pay?');
    context.visibility('hidden');
    context.visibility('visible');
    await pending;
  });
});
