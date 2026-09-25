import type { AnnAudience, AnnCategory, AnnChannel, AnnHistory, AnnPriority, AnnState, Announcement } from './announcements.service';
import { emptyAudience } from './announcements.service';

/*
 * Sample announcements "sent earlier by other admins". Kept in their own lazily
 * loaded chunk: they are only needed the first time (before anything is stored),
 * so the site banner doesn't add them to every page load.
 */

const H = 3_600_000;
const D = 24 * H;

export function seedAnnouncements(now: number): Announcement[] {
  const iso = (ms: number) => new Date(ms).toISOString();
  const mk = (
    id: string,
    by: string,
    title: string,
    body: string,
    category: AnnCategory,
    priority: AnnPriority,
    channels: AnnChannel[],
    audience: Partial<AnnAudience>,
    sendOffset: number,
    lifetime: number | null,
    extra: Partial<Announcement> = {},
  ): Announcement => {
    const sendAt = now + sendOffset;
    const created = sendAt - (2 + (id.charCodeAt(id.length - 1) % 20)) * H;
    const state: AnnState = extra.state ?? 'published';
    const history: AnnHistory[] = [{ atUtc: iso(created), by, action: 'Created draft' }];
    if (state === 'published') history.push({ atUtc: iso(Math.min(sendAt, now) - 5 * 60_000), by, action: sendOffset > 0 ? 'Scheduled' : 'Published' });
    if (state === 'cancelled' && extra.cancelledAtUtc) history.push({ atUtc: extra.cancelledAtUtc, by, action: extra.endedEarly ? 'Ended early' : 'Cancelled before sending' });
    return {
      id,
      title,
      body,
      category,
      priority,
      channels,
      audience: { ...emptyAudience(), ...audience },
      state,
      createdBy: by,
      createdAtUtc: iso(created),
      updatedAtUtc: iso(Math.min(now, sendAt)),
      sendAtUtc: iso(sendAt),
      expiresAtUtc: lifetime === null ? null : iso(sendAt + lifetime),
      pinned: false,
      rates: { delivered: 0.985, open: 0.52, click: 0.18 },
      history,
      ...extra,
    };
  };

  return [
    mk('an-1008', 'priya', 'Beware of fake “NeverBeen Support” accounts', 'Our team will **never** ask for your password, OTP or payment details by message. Report any profile claiming to be NeverBeen Support using the ⋯ menu → Report.', 'safety', 'critical', ['inbox', 'push', 'email'], { mode: 'all' }, -20 * H, 10 * D, {
      pinned: true,
      ctaLabel: 'How to spot scams',
      ctaUrl: '/help',
      rates: { delivered: 0.992, open: 0.71, click: 0.24 },
    }),
    mk('an-1010', 'meera', 'Women Travellers Circle — monthly online meetup', 'Join fellow women travellers every first Sunday for trip swaps, safety tips and itinerary reviews. This month: solo travel in Japan with Kenji’s guest speakers.', 'event', 'normal', ['inbox', 'push'], { mode: 'filtered', genders: ['Female'], ageMin: 25, ageMax: 40 }, -6 * H, 12 * D, {
      ctaLabel: 'Reserve a seat',
      ctaUrl: '/community',
      rates: { delivered: 0.984, open: 0.63, click: 0.31 },
    }),
    mk('an-1001', 'priya', 'Stay safe when meeting fellow travellers', 'Meet in public places, share your plans with a friend and use in-app messages until you feel comfortable. Our new Safety Centre has checklists for first meetups.', 'safety', 'high', ['inbox', 'push', 'email'], { mode: 'all' }, -2 * D, 14 * D, {
      ctaLabel: 'Open Safety Centre',
      ctaUrl: '/help',
      rates: { delivered: 0.989, open: 0.58, click: 0.21 },
    }),
    mk('an-1003', 'ananya', 'Travel Feeds are now live for Pakistan & Bangladesh', 'Discover trending journeys from Lahore, Hunza, Dhaka and Cox’s Bazar in your Travel Feeds — share your own stories to get featured.', 'community', 'normal', ['banner', 'inbox'], { mode: 'filtered', countries: ['Pakistan', 'Bangladesh'] }, -5 * D, 14 * D, {
      ctaLabel: 'Explore feeds',
      ctaUrl: '/travel-feeds',
      rates: { delivered: 0.978, open: 0.66, click: 0.34 },
    }),
    mk('an-1005', 'sofia', 'Europe travellers meetup — Lisbon, 18 October', 'Members in Europe: join us in Lisbon for a sunset walking tour and dinner in Alfama. Limited to 40 places — verified members get priority.', 'event', 'normal', ['banner', 'inbox', 'email'], { mode: 'filtered', regions: ['Europe'] }, -3 * D, 21 * D, {
      ctaLabel: 'RSVP',
      ctaUrl: '/community',
      rates: { delivered: 0.995, open: 0.81, click: 0.46 },
    }),
    mk('an-1012', 'ananya', 'Thank you, top storytellers! 🏆', 'Your journeys inspired thousands of members this month. As a thank-you you’ll get early access to Collections and a “Top Storyteller” badge on your profile.', 'community', 'normal', ['inbox', 'email'], { mode: 'users', userIds: [101, 102, 103, 104, 105, 106, 107, 108], groupNames: ['Top contributors'] }, -8 * D, 30 * D, {
      rates: { delivered: 1, open: 0.88, click: 0.5 },
    }),
    mk('an-1009', 'daniel', 'Protect your account with 2-step verification', 'Add a second step when signing in from a new device. It takes 30 seconds and blocks 99% of account-takeover attempts.', 'feature', 'high', ['inbox', 'email'], { mode: 'filtered', verifiedOnly: true }, 26 * H, 14 * D, {
      ctaLabel: 'Turn on 2-step verification',
      ctaUrl: '/profile',
    }),
    mk('an-1002', 'arjun', 'Planned maintenance — Saturday 02:00–03:00 IST', 'NeverBeen will be read-only for up to an hour while we upgrade our database. Posts and messages you draft will be saved and sent automatically afterwards.', 'maintenance', 'high', ['inbox', 'email'], { mode: 'all' }, 2 * D + 5 * H, 2 * D),
    mk('an-1015', 'sofia', 'Monsoon travel tips for South Asia', 'Heading out this season? Pack light rain gear, check road closures on our destination pages and keep an offline copy of your itinerary.', 'general', 'normal', ['inbox', 'push'], { mode: 'filtered', regions: ['South Asia'], ageMin: 30 }, -26 * H, 7 * D, {
      ctaLabel: 'Read the guide',
      ctaUrl: '/travel-feeds',
      rates: { delivered: 0.981, open: 0.49, click: 0.16 },
    }),
    mk('an-1004', 'kenji', 'Dark mode is here for your profile', 'Easier on the eyes at night — switch between light, dark and automatic themes from Profile → Settings → Appearance.', 'feature', 'normal', ['inbox', 'push'], { mode: 'all' }, -12 * D, 10 * D, {
      rates: { delivered: 0.987, open: 0.55, click: 0.12 },
    }),
    mk('an-1006', 'farhan', 'Complete your profile to get 3× more companion matches', 'Members with a photo, bio and 3+ interests receive three times more companion requests. It only takes two minutes.', 'community', 'normal', ['inbox', 'push'], { mode: 'filtered', ageMax: 29 }, -20 * D, 7 * D, {
      ctaLabel: 'Complete profile',
      ctaUrl: '/profile',
      rates: { delivered: 0.983, open: 0.47, click: 0.28 },
    }),
    mk('an-1007', 'rahul', 'We’ve updated our Privacy Policy', 'We clarified how location data is used for companion suggestions and added new controls to download or delete your data. Nothing changes about how we share data — we don’t sell it.', 'policy', 'high', ['inbox', 'email'], { mode: 'all' }, -30 * D, 14 * D, {
      ctaLabel: 'Read the policy',
      ctaUrl: '/privacy',
      rates: { delivered: 0.991, open: 0.39, click: 0.09 },
    }),
    mk('an-1013', 'kenji', 'Beta: AI trip planner for Bengaluru & Mumbai', 'Be among the first to try our AI-assisted itinerary builder. Tell it your dates and interests — it drafts a day-by-day plan you can share with companions.', 'feature', 'normal', ['inbox', 'push'], { mode: 'filtered', countries: ['India'], cities: ['Bengaluru', 'Mumbai'] }, 3 * D, 14 * D, {
      state: 'cancelled',
      cancelledAtUtc: new Date(now - 10 * H).toISOString(),
    }),
    mk('an-1014', 'arjun', 'Photo uploads are fully restored', 'Yesterday’s upload delays have been fixed. If a post failed to publish, you can retry it from Profile → Drafts. Sorry for the inconvenience!', 'maintenance', 'normal', ['inbox'], { mode: 'all' }, -45 * D, 5 * D, {
      rates: { delivered: 0.99, open: 0.44, click: 0 },
    }),
    mk('an-1016', 'priya', 'Weekend flash giveaway — misfired audience', 'This giveaway notice was sent to the wrong segment and was ended early by Trust & Safety.', 'event', 'normal', ['inbox', 'push'], { mode: 'filtered', countries: ['India'], genders: ['Male'] }, -16 * D, 3 * D, {
      state: 'cancelled',
      endedEarly: true,
      cancelledAtUtc: new Date(now - 16 * D + 40 * 60_000).toISOString(),
      rates: { delivered: 0.97, open: 0.3, click: 0.05 },
    }),
    mk('an-1011', 'zoya', 'Holiday season: refund & payout timelines', 'Refunds requested between 20 Dec and 2 Jan may take up to 10 business days because of bank holidays. Payouts to hosts are not affected.', 'general', 'normal', ['inbox', 'email'], { mode: 'filtered', countries: ['India'] }, 30 * D, 20 * D, {
      state: 'draft',
    }),
  ];
}
