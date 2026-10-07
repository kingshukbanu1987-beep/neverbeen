import { CommunityService } from './community.service';

/**
 * Test-only access to the seeded demo community.
 *
 * The product has exactly one way into the demo data — the **“Explore as Guest”** button
 * (`CommunityService.exploreAsGuest()`). The make-believe accounts behind the old preview
 * toggle are gone from the application, but the specs still need a session that is an
 * “active member” of the seeded community (a stored founder profile + token) to render the
 * profile, messenger, circles and admin pages against known data.
 *
 * Nothing in `src/` imports this module except `*.spec.ts`, so it never reaches a bundle.
 */
export type DemoAccountMode = 'new_pending' | 'active_member';

interface DemoAccountInternals {
  openDemoAccount(mode: DemoAccountMode): void;
}

/** Opens the seeded demo community as one of its make-believe accounts. */
export function openDemoAccount(service: CommunityService, mode: DemoAccountMode): void {
  (service as unknown as DemoAccountInternals).openDemoAccount(mode);
}
