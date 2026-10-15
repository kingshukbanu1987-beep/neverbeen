# Premium Live Chat: temporary UPI payment (app handoff and desktop QR)

## Current policy (2026-10-15)

Payment verification is **temporarily disabled**, and automatic continuation is enabled at the
owner's request: after returning from Google Pay or PhonePe on a phone or tablet, and ten seconds
after the payment QR code appears on a laptop or desktop. **Neither returning from a payment app
nor the desktop timer is proof of payment.** A cancelled, failed or unpaid attempt can therefore
also open Live Chat. This is not an enforced paid-access gateway.

The previous implementation only accepted a plausible typed UTR and waited on a timer; it did
not verify a bank transaction. That simulated verification and its UTR field have been removed.

## Look of the payment page

The payment step has an **ultra-modern white finish over a photograph of the model**:

- One of the selected model's own album photographs (a new one on each visit to the step, never
  the cover) fills the page at **90% opacity**, pinned behind the checkout while it scrolls
  (`position: sticky`; the shell uses `overflow: clip` so the pin works).
- Every control sits on a frosted white glass sheet (translucent white, `backdrop-filter` blur, a
  hairline white border and soft shadow) with white cards, slate text and violet accents.
- Laptops and desktops (≥ 1100 px) float the sheet on the right and frame the photograph in the
  space to its left, so the model stays in view whatever the photo's composition; a blurred wash
  of the same photo continues behind the sheet. Tablets and phones centre the sheet below a band
  of the photograph.
- The step always opens scrolled to its top, and the photo and sheet animations are disabled for
  `prefers-reduced-motion`.

The button is labelled exactly **Pay and Chat** in every state — it never shows the amount, which
appears in the price breakdown and in the summary line instead.

## Customer flow — phones and tablets

1. A registered Community member chooses Premium and reviews their chat details. Existing model
   prices and member requirements are unchanged.
2. The payment page shows the selected model's price, **Google Pay** (preselected) and
   **PhonePe**, and one **Pay and Chat** button. The summary reads, for example:
   **Pay ₹124.95 to NeverBeen with Google Pay or PhonePe.** No receiver ID or UTR field is
   rendered.
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
5. A blocked app link, or no detected handoff within four focused seconds, stays on the payment
   page with **Payment Failed**, and **Pay and Chat** tries again. These are **app-launch
   failures**, not bank-reported payment results. The launch timeout pauses while a blurred
   browser awaits an app-opening permission response; blur alone never opens the chat. The pending
   **Cancel payment** action also stays on the page and permits a retry.

## Customer flow — laptops and desktops

A laptop or desktop browser cannot open a phone's payment app. It also cannot send a UPI
**collect** request ("approve this payment" notification) to a typed UPI ID: NPCI ended P2P
collect requests on 1 Oct 2025 and merchant collect from desktop web on 28 Feb 2026 (payment
gateways now require a UPI QR code on desktop). The receivers above are personal UPI IDs and no
gateway is used, so the desktop flow is a **scan-to-pay QR code**:

1. Any browser that `upiPlatform()` does not recognise as Android or iOS/iPadOS gets this flow,
   including an Android tablet that requests the desktop site. No app is preselected; pressing
   **Pay and Chat** first asks the member to **choose Google Pay or PhonePe**.
2. Choosing an app reveals a **mandatory "Your UPI ID" box** (focused automatically; the
   placeholder follows the app, e.g. `yourname@okaxis` / `yourname@ybl`). Pressing **Pay and Chat**
   (or Enter) with it empty or malformed shows an inline error, marks the box `aria-invalid` and
   returns focus to it. Spaces and capitals are tidied (`normalizeUpiId`) and the format is checked
   by `upiIdError` (`name@handle`). The typed ID is kept when the member switches apps or goes back.
3. With a valid UPI ID, **Pay and Chat** shows a **UPI QR code with the exact total** (inline SVG,
   error-correction level Q, the chosen app's logo in the centre). It encodes a standard link that
   Google Pay, PhonePe and every other UPI app can scan:

   ```text
   upi://pay?pa=<receiver for the chosen app>&pn=NeverBeen&am=124.95&cu=INR
     &tn=NeverBeen%20Live%20Chat%20<model-slug>%20from%20<payer UPI ID>
   ```

   The note (at most 80 characters) names the model and the payer's UPI ID, so the owner can match
   a received payment to the chat. Scanning is a payer-initiated (push) payment — nothing is sent
   to the typed UPI ID. The panel shows the amount, **Paying from <UPI ID>**, three steps (open the
   app on your phone or tablet, tap Scan QR, approve with your UPI PIN) and a countdown ring.

4. **Ten seconds** after the code appears (`DESKTOP_CHAT_START_DELAY_MS`), Live Chat opens
   automatically, exactly once — after re-checking that the step, model and active Community
   member are unchanged. Duration, app and UPI ID are frozen while the code is on screen, and
   **Cancel payment** removes the code without opening the chat (**Pay and Chat** then shows a new
   one).

The timer is the owner's temporary access policy, not a payment check: the chat opens whether or
not the member actually paid.

## Shared behaviour

Back, close, cancellation and component destruction abort the pending handoff or desktop
countdown and remove its listeners/timer. Late returns cannot open a hidden chat. A changed model or changed/inactive
Community member cannot reuse the previous handoff. There is no additional Start Chat click or
payment-success/verified receipt screen.

The receiver IDs are hidden from the page's visible content, not secret: UPI requires them in the
app URL and the QR code, so the payment app, anyone scanning the code and someone inspecting the
browser code/link can still read them.

## Implementation

- `src/app/pages/ai-models/chat/premium-payment.ts`: app choices, receivers, platform detection,
  encoded app links, UPI ID checks (`normalizeUpiId`, `upiIdError`) and the desktop QR link
  (`upiQrPayload`); no UTR or fake verification API.
- `src/app/pages/ai-models/chat/upi-qr.ts`: QR geometry for the inline SVG (quiet zone, module
  runs, rounded finder eyes, centred logo clearing), encoded with the MIT-licensed
  [`uqr`](https://github.com/unjs/uqr) package. It ships only in the lazily loaded AI-model chunk.
- `src/app/pages/ai-models/chat/upi-app-launcher.ts`: `platform()` (phone/tablet or `null` for a
  laptop/desktop), synchronous launch, lifecycle observation, timeout, abort and cleanup. Resolving
  `open()` means **browser returned**, never **payment paid**.
- `src/app/pages/ai-models/chat/live-chat-access.*`: member checks, app selection, the desktop UPI
  ID box, QR panel and countdown, unverified automatic continuation, error/retry and cancellation
  UI, and the photograph background.

To enforce paid access later, create merchant orders server-side and verify their amount, currency,
model, member and successful payment with a supported gateway/bank API. Only that trusted status
should unlock the chat. Do not reinterpret browser visibility, a URL status parameter or a timer as
payment confirmation, and do not restore the old UTR-format check. A gateway can also replace the
static desktop QR code with a per-order dynamic QR whose payment status it reports.

## Checks

```bash
npm test -- --watch=false \
  --include=src/app/pages/ai-models/chat/premium-payment.spec.ts \
  --include=src/app/pages/ai-models/chat/upi-app-launcher.spec.ts \
  --include=src/app/pages/ai-models/chat/upi-qr.spec.ts \
  --include=src/app/pages/ai-models/chat/live-chat-access.spec.ts
```

These tests mock app navigation and browser lifecycle events; they do not charge money. They cover
both app-specific receivers, platform/amount encoding, no UTR/receiver in the rendered payment page,
the exact **Pay and Chat** label, automatic unverified return, blocked/missing apps, retry, duplicate
clicks, cancellation, stale model or member context, and listener cleanup. For laptops and desktops
they cover the app choice, the mandatory UPI ID (empty, malformed, tidied, kept), the QR link for
each app and duration package, the ten-second countdown, cancel/back/close/destroy and a member
change during the countdown. `upi-qr.spec.ts` paints the exact drawing the page renders and decodes
it with the independent [`jsQR`](https://github.com/cozmo/jsQR) decoder (a dev dependency) — also
with the logo area reading as solid dark — to prove the code scans back to the exact UPI link. Real installed-app handoff still needs a physical-device
smoke test on Android and iOS, and the desktop QR code a scan with Google Pay and PhonePe. If the browser fully unloads the page rather than preserving it,
there is no server-side payment order to resume after a reload in this temporary flow.
