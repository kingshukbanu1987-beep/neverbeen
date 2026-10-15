# Premium Live Chat: temporary UPI app handoff

## Current policy (2026-10-15)

Payment verification is **temporarily disabled**, and automatic continuation after returning from
Google Pay or PhonePe is enabled at the owner's request. **Returning from a payment app is not
proof of payment.** A cancelled, failed or unpaid attempt inside the payment app can therefore
also open Live Chat. This is not an enforced paid-access gateway.

The previous implementation only accepted a plausible typed UTR and waited on a timer; it did
not verify a bank transaction. That simulated verification and its UTR field have been removed.

## Customer flow

1. A registered Community member chooses Premium and reviews their chat details. Existing model
   prices and member requirements are unchanged.
2. The payment page shows the selected model's price, **Google Pay** and **PhonePe**, and one
   **Pay & Chat** button. The summary reads, for example:
   **Pay ₹119 to NeverBeen with Google Pay or PhonePe.** No receiver ID or UTR field is rendered.
3. Clicking the button immediately opens an app-specific UPI link with the selected model's
   amount, currency `INR` and payee name `NeverBeen`:

   | Choice     | Receiver (app-link parameter only) | Android scheme  | iPhone / iPad scheme |
   | ---------- | ---------------------------------- | --------------- | -------------------- |
   | Google Pay | `kingshuk.banu.temp@okhdfcbank`    | `tez://upi/pay` | `gpay://upi/pay`     |
   | PhonePe    | `kingshuk.banu.temp-1@ybl`         | `phonepe://pay` | `phonepe://pay`      |

   Android phones/tablets and iPads using desktop-style Safari user agents are recognised.
   The installed app, OS and browser ultimately control whether an external app can open; a
   browser permission prompt may still be required. No payment is made by simply opening the link:
   the member must authorise it in their payment app.

4. After the browser page has been hidden and becomes visible/focused again, the chat opens
   automatically, exactly once. A blur/focus pair alone is ignored, so dismissing a browser
   permission dialog without leaving the page is not treated as a handoff. `pageshow` also handles
   returning from the browser's back/forward cache. This is only a browser-visibility heuristic;
   the browser cannot prove which app opened or distinguish it from switching to another tab/app.
5. An unsupported desktop, blocked app link, or no detected handoff within four focused seconds
   stays on the payment page with **Payment Failed** and **Try again**. These are **app-launch
   failures**, not bank-reported payment results. The launch timeout pauses while a blurred
   browser awaits an app-opening permission response; blur alone never opens the chat. The pending
   **Cancel payment** action also stays on the page and permits a retry.

Back, close, cancellation and component destruction abort the pending handoff and remove its
listeners/timer. Late returns cannot open a hidden chat. A changed model or changed/inactive
Community member cannot reuse the previous handoff. There is no additional Start Chat click or
payment-success/verified receipt screen.

The receiver IDs are hidden from the page's visible content, not secret: UPI requires them in the
app URL, so the payment app and someone inspecting the browser code/link can still read them.

## Implementation

- `src/app/pages/ai-models/chat/premium-payment.ts`: app choices, receivers, platform detection and
  encoded UPI links; no UTR or fake verification API.
- `src/app/pages/ai-models/chat/upi-app-launcher.ts`: synchronous launch, lifecycle observation,
  timeout, abort and cleanup. Resolving `open()` means **browser returned**, never **payment paid**.
- `src/app/pages/ai-models/chat/live-chat-access.*`: member checks, app selection, unverified
  automatic continuation, error/retry and cancellation UI.

To enforce paid access later, create merchant orders server-side and verify their amount, currency,
model, member and successful payment with a supported gateway/bank API. Only that trusted status
should unlock the chat. Do not reinterpret browser visibility, a URL status parameter or a timer as
payment confirmation, and do not restore the old UTR-format check.

## Checks

```bash
npm test -- --watch=false \
  --include=src/app/pages/ai-models/chat/premium-payment.spec.ts \
  --include=src/app/pages/ai-models/chat/upi-app-launcher.spec.ts \
  --include=src/app/pages/ai-models/chat/live-chat-access.spec.ts
```

These tests mock app navigation and browser lifecycle events; they do not charge money. They cover
both app-specific receivers, platform/amount encoding, no UTR/receiver in the rendered payment page,
automatic unverified return, blocked/missing apps, retry, duplicate clicks, cancellation, stale model
or member context, and listener cleanup. Real installed-app handoff still needs a physical-device
smoke test on Android and iOS. If the browser fully unloads the page rather than preserving it,
there is no server-side payment order to resume after a reload in this temporary flow.
