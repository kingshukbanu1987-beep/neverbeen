import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { PremiumPaymentRequest, UPI_APPS, upiPaymentUrl, upiPlatform } from './premium-payment';

/** No handoff within this window means the app is missing or the browser blocked the link. */
export const UPI_APP_LAUNCH_TIMEOUT_MS = 4_000;

@Injectable({ providedIn: 'root' })
export class UpiAppLauncher {
  private readonly document = inject(DOCUMENT);

  /**
   * Resolves on a browser return after the page was actually hidden, NOT on payment success.
   * A blur/focus pair alone (e.g. dismissing an app-opening prompt) must not start a chat.
   * The temporary unverified access policy is applied by LiveChatAccess, not by this launcher.
   */
  async open(request: PremiumPaymentRequest, signal: AbortSignal): Promise<void> {
    const browser = this.document.defaultView;
    const platform = browser ? upiPlatform(browser.navigator) : null;
    const appName = UPI_APPS.find((app) => app.id === request.method)?.label ?? 'your UPI app';
    if (!browser || !platform) {
      throw new Error(
        `Open this page on an Android phone or tablet, iPhone or iPad with ${appName} installed to pay.`,
      );
    }
    const url = upiPaymentUrl(request, platform);

    return new Promise<void>((resolve, reject) => {
      let leftBrowser = false;
      let settled = false;
      let launchTimeout: ReturnType<typeof setTimeout> | undefined;
      const cleanup = () => {
        clearTimeout(launchTimeout);
        this.document.removeEventListener('visibilitychange', onReturn);
        browser.removeEventListener('focus', onReturn);
        browser.removeEventListener('blur', onBlur);
        browser.removeEventListener('pageshow', onReturn);
        signal.removeEventListener('abort', onAbort);
      };
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        if (error) reject(error);
        else resolve();
      };
      const onReturn = () => {
        if (this.document.visibilityState === 'hidden') {
          leftBrowser = true;
          clearTimeout(launchTimeout);
        } else if (this.document.visibilityState === 'visible') {
          if (leftBrowser) finish();
          else scheduleLaunchCheck();
        }
      };
      // A permission prompt may blur the browser for longer than four seconds. Give the member
      // time to respond, but never count blur alone as an app launch or a payment result.
      const onBlur = () => clearTimeout(launchTimeout);
      const onAbort = () =>
        finish(new DOMException('Payment app handoff cancelled.', 'AbortError'));
      const scheduleLaunchCheck = () => {
        clearTimeout(launchTimeout);
        launchTimeout = setTimeout(() => {
          finish(
            new Error(
              `We couldn’t open ${appName}. Make sure the app is installed and allow your browser to open it, then try again.`,
            ),
          );
        }, UPI_APP_LAUNCH_TIMEOUT_MS);
      };

      this.document.addEventListener('visibilitychange', onReturn);
      browser.addEventListener('focus', onReturn);
      browser.addEventListener('blur', onBlur);
      browser.addEventListener('pageshow', onReturn);
      signal.addEventListener('abort', onAbort, { once: true });
      if (signal.aborted) {
        onAbort();
        return;
      }

      scheduleLaunchCheck();
      try {
        // Synchronous with the Pay & Chat click: delaying this behind an await/pop-up can lose
        // the mobile browser's user activation and prevent the payment app from opening.
        browser.location.assign(url);
      } catch {
        finish(new Error(`We couldn’t open ${appName}. Please try again in your mobile browser.`));
      }
    });
  }
}
