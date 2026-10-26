import { HowItWorksStep, destinations, faqItems, howItWorksSteps, howItWorksTracks, pricingPlans } from '../models/site-content';

/**
 * Registry of every website component that can be managed from
 * Admin Console → Website Management. Each component declares its editable
 * fields together with the default (shipped) value, so the site renders
 * exactly as before until an administrator publishes an override.
 */

export type CmsPage = 'global' | 'home' | 'community';

export type CmsFieldType = 'text' | 'textarea' | 'toggle' | 'number' | 'select' | 'color' | 'url' | 'items' | 'records';

/** One row of an `items` field: a fixed element that can be renamed, hidden and re-ordered. */
export interface CmsItem {
  id: string;
  label: string;
  visible: boolean;
}

export interface CmsRecordField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'toggle' | 'lines';
}

export type CmsRecord = Record<string, string | boolean | string[]>;

export interface CmsField {
  key: string;
  label: string;
  type: CmsFieldType;
  default: unknown;
  hint?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  /** items: whether the admin may rename rows. */
  labelEditable?: boolean;
  /** items: rows that must stay visible (e.g. the default profile section). */
  lockedIds?: string[];
  /** records: the sub-fields of each record. */
  recordFields?: CmsRecordField[];
  /** records: which sub-field is used as the record's title in the editor. */
  recordTitleKey?: string;
  maxRecords?: number;
}

export interface CmsComponentDef {
  key: string;
  page: CmsPage;
  label: string;
  icon: string;
  description: string;
  /** Route shown in the live preview when this component is selected. */
  previewPath: string;
  previewFragment?: string;
  fields: CmsField[];
}

export const CMS_PAGES: { key: CmsPage; label: string; icon: string; hint: string }[] = [
  { key: 'global', label: 'Site-wide', icon: '🌐', hint: 'Announcement bar, navigation, footer & brand colours' },
  { key: 'home', label: 'Home page', icon: '🏠', hint: 'Section order, visibility and every section’s content' },
  { key: 'community', label: 'Community', icon: '💬', hint: 'Connect (sign-in) page and member profile features' },
];

const heading = (eyebrow: string, title: string, copy: string): CmsField[] => [
  { key: 'eyebrow', label: 'Eyebrow (small label above the title)', type: 'text', default: eyebrow, maxLength: 60 },
  { key: 'title', label: 'Section title', type: 'text', default: title, maxLength: 120 },
  { key: 'copy', label: 'Intro copy', type: 'textarea', default: copy, maxLength: 800 },
];

const items = (rows: [string, string][]): CmsItem[] => rows.map(([id, label]) => ({ id, label, visible: true }));

/** Copy + steps for one How It Works capability (travel keeps the shared `steps` field). */
const capabilityFields = (
  trackId: 'rent' | 'chat' | 'shop',
  label: string,
  title: string,
  copy: string,
  steps: HowItWorksStep[],
): CmsField[] => [
  { key: `${trackId}Title`, label: `${label} — title`, type: 'text', default: title, maxLength: 120 },
  { key: `${trackId}Copy`, label: `${label} — intro copy`, type: 'textarea', default: copy, maxLength: 600 },
  {
    key: `${trackId}Steps`,
    label: `${label} — steps`,
    type: 'records',
    default: steps.map((s) => ({ number: s.number, title: s.title, description: s.description })),
    recordFields: [
      { key: 'number', label: 'Number', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
    ],
    recordTitleKey: 'title',
    maxRecords: 6,
  },
];

/** The shipped copy for one of the three capabilities beyond travel photography. */
const track = (id: 'travel' | 'rent' | 'chat' | 'shop') => howItWorksTracks.find((t) => t.id === id)!;

/** Home page sections, in their shipped order. */
export const HOME_SECTIONS: [string, string][] = [
  ['hero', 'Hero banner'],
  ['multiverse', 'The NeverBeen Multiverse Studio'],
  ['storyline', 'The Storyline of Parallel Universe'],
  ['brochure', 'The NeverBeen Brochure'],
  ['destinations', 'Popular Destinations'],
  ['gallery', 'Gallery'],
  ['how', 'How It Works'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
  ['owner', 'Founder'],
  ['contact', 'Contact form'],
];

export const NAV_LINKS: [string, string][] = [
  ['home', 'Home'],
  ['audience', 'Audience'],
  ['collection', 'Collection'],
  ['merchandise', 'Merchandise'],
  ['destinations', 'Destinations'],
  ['live', 'Live'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
  ['admin', 'Admin'],
  ['founder', 'Founder'],
  ['contact', 'Contact'],
  ['feedback', 'Feedback'],
];

export const HERO_BUTTONS: [string, string][] = [
  ['community', 'Connect to NeverBeen Community'],
  ['merchandise', 'Shop NeverBeen Merchandise'],
  ['create', 'Create My Vacation'],
];

export const PROFILE_SECTIONS: [string, string][] = [
  ['about', 'About me'],
  ['journey', 'Journey'],
  ['gallery', 'Gallery'],
  ['messagebook', 'MessageBook'],
  ['companions', 'Companions'],
  ['followers', 'Followers'],
  ['following', 'Following'],
  ['circles', 'Circles'],
  ['messenger', 'Messenger'],
  ['birthdays', 'Birthdays'],
  ['notifications', 'Notifications'],
  ['storage', 'Storage'],
  ['settings', 'Settings'],
];

export const THEME_VARS: Record<string, string> = {
  forest: '--forest',
  bronze: '--bronze',
  gold: '--gold',
  sand: '--sand',
  ink: '--ink',
};

export const CMS_COMPONENTS: CmsComponentDef[] = [
  // ------------------------------------------------------------------ Site-wide
  {
    key: 'global.announcement',
    page: 'global',
    label: 'Announcement bar',
    icon: '📣',
    description: 'A slim banner shown above the navigation on every public page.',
    previewPath: '/',
    fields: [
      { key: 'enabled', label: 'Show announcement bar', type: 'toggle', default: false },
      { key: 'text', label: 'Message', type: 'text', default: 'New: portrait collections for the monsoon season are open.', maxLength: 160 },
      { key: 'linkLabel', label: 'Link label', type: 'text', default: 'Explore the collection', maxLength: 40 },
      { key: 'linkUrl', label: 'Link target', type: 'url', default: '/collection', hint: 'A site path such as /collection or a full https:// URL.' },
      {
        key: 'tone',
        label: 'Style',
        type: 'select',
        default: 'promo',
        options: [
          { value: 'promo', label: 'Promotion (bronze)' },
          { value: 'info', label: 'Information (blue)' },
          { value: 'success', label: 'Good news (green)' },
          { value: 'warning', label: 'Warning (amber)' },
        ],
      },
      { key: 'dismissible', label: 'Visitors can dismiss it', type: 'toggle', default: true },
    ],
  },
  {
    key: 'global.navbar',
    page: 'global',
    label: 'Navigation menu',
    icon: '🧭',
    description: 'Rename, hide and re-order the options in the website header.',
    previewPath: '/',
    fields: [{ key: 'links', label: 'Menu options', type: 'items', default: items(NAV_LINKS), labelEditable: true, lockedIds: ['home'] }],
  },
  {
    key: 'global.footer',
    page: 'global',
    label: 'Footer',
    icon: '🧱',
    description: 'Tagline, link columns and copyright line at the bottom of every page.',
    previewPath: '/',
    previewFragment: 'site-footer',
    fields: [
      { key: 'tagline', label: 'Tagline', type: 'text', default: 'Vacation photographs of places you have never stood.', maxLength: 140 },
      { key: 'copyright', label: 'Copyright line (after “© year NeverBeen.”)', type: 'text', default: 'Portraits of elsewhere.', maxLength: 100 },
      { key: 'columns', label: 'Link columns', type: 'items', default: items([['studio', 'Studio'], ['visit', 'Visit'], ['support', 'Support']]), labelEditable: true },
      { key: 'showAdminLink', label: 'Show the “Admin” link', type: 'toggle', default: true },
    ],
  },
  {
    key: 'global.theme',
    page: 'global',
    label: 'Brand colours',
    icon: '🎨',
    description: 'The palette used by buttons, headings and section backgrounds across the site.',
    previewPath: '/',
    fields: [
      { key: 'forest', label: 'Primary (forest)', type: 'color', default: '#24352c' },
      { key: 'bronze', label: 'Accent (bronze)', type: 'color', default: '#8c5a32' },
      { key: 'gold', label: 'Highlight (gold)', type: 'color', default: '#c4a06a' },
      { key: 'sand', label: 'Section background (sand)', type: 'color', default: '#f3ece2' },
      { key: 'ink', label: 'Body text (ink)', type: 'color', default: '#1d1914' },
    ],
  },
  // ------------------------------------------------------------------ Home page
  {
    key: 'home.layout',
    page: 'home',
    label: 'Sections & order',
    icon: '🧩',
    description: 'Drag or move sections to change the order of the Home page; switch any section off.',
    previewPath: '/',
    fields: [{ key: 'sections', label: 'Home page sections', type: 'items', default: items(HOME_SECTIONS), labelEditable: false }],
  },
  {
    key: 'home.hero',
    page: 'home',
    label: 'Hero banner',
    icon: '🌅',
    description:
      'The first thing visitors see: the headline and intro copy above every photograph from public/travel inside a full-width card, the independent call-to-action buttons, then the full-size portrait preview from public/banner.',
    previewPath: '/',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'YOUR IMAGINATION. YOUR MULTIVERSE', maxLength: 60 },
      { key: 'title', label: 'Headline', type: 'text', default: 'Imagine Yourself Anywhere, Even Where You’ve Never Been', maxLength: 120 },
      {
        key: 'lede',
        label: 'Intro paragraph',
        type: 'textarea',
        default:
          'No flights. No passports. No Immigration. No VISA. No Bank Statement. Just you, your imagination, and the world’s most incredible Destinations inside NeverBeen Multiverse. Yes, there is a Parallel Universe within you — a world of endless possibilities, boundless imagination, and dreams beyond reality. Explore it now',
        maxLength: 400,
      },
      { key: 'buttons', label: 'Call-to-action buttons', type: 'items', default: items(HERO_BUTTONS), labelEditable: true },
      {
        key: 'peopleEyebrow',
        label: 'Portrait preview eyebrow',
        type: 'text',
        default: 'THE UNWRITTEN SOULS, WHO NEVER WERE',
        maxLength: 60,
      },
      {
        key: 'peopleTitle',
        label: 'Portrait preview headline',
        type: 'text',
        default: 'Meet the Souls Hidden between the Dimensions of Multiverse',
        maxLength: 140,
      },
      {
        key: 'peopleCopy',
        label: 'Portrait preview paragraph',
        type: 'textarea',
        default:
          'Not every world needs to exist biologically to be real. Not every character needs to be real to matter. What truly matters is the connection between souls, because a character doesn’t need to exist in our reality to leave a lasting impression on us',
        maxLength: 400,
      },
      {
        key: 'communityWelcomeTitle',
        label: 'Members: name line at the top of the hero',
        type: 'text',
        default: '{name}',
        maxLength: 120,
        hint: 'Rendered two spaces after the fixed “Welcome” greeting (set in the hero headline style) that always leads the signed-in line. {name} becomes their first name; it is set large, in rgb(101, 57, 129), in Calibri, with no period at the end.',
      },
      { key: 'autoplay', label: 'Change the preview photographs automatically', type: 'toggle', default: true },
      {
        key: 'interval',
        label: 'Seconds per preview photograph',
        type: 'number',
        default: 5,
        min: 2,
        max: 20,
        hint: 'The shipped pace is 5 seconds for both previews. They always move together.',
      },
    ],
  },
  {
    key: 'home.multiverse',
    page: 'home',
    label: 'The NeverBeen Multiverse Studio',
    icon: '🌠',
    description:
      'The promotion slideshow: one memo at a time from public/promotion, with a big headline and a short story over each photograph. Photographs come from the folder; the words and pace are managed here.',
    previewPath: '/',
    previewFragment: 'multiverse-studio',
    fields: [
      { key: 'title', label: 'Section title', type: 'text', default: 'The NeverBeen Multiverse Studio', maxLength: 120 },
      {
        key: 'copy',
        label: 'Intro copy',
        type: 'textarea',
        default:
          'There are worlds that have never been imagined, realities that have never been reached, and stories that have never been told. Some exist beyond the boundaries of time. Others live between the fragments of dreams, hidden in the spaces between what is and what could be. At The NeverBeen Multiverse Studio, we explore these possibilities. We build the unreal, question the familiar, and give form to ideas that have yet to find a place in existence.',
        maxLength: 1200,
      },
      { key: 'autoplay', label: 'Move to the next memo automatically', type: 'toggle', default: true },
      {
        key: 'seconds',
        label: 'Seconds per memo',
        type: 'number',
        default: 5,
        min: 2,
        max: 20,
        hint: 'The shipped pace is 5 seconds. Visitors can always move on themselves.',
      },
    ],
  },
  {
    key: 'home.brochure',
    page: 'home',
    label: 'The NeverBeen Brochure',
    icon: '📖',
    description:
      'Full-width brochure slideshow highlighting the 22 traveller story pages from the NeverBeen Brochure.',
    previewPath: '/',
    previewFragment: 'brochure',
    fields: [
      { key: 'title', label: 'Section title', type: 'text', default: 'The NeverBeen Brochure', maxLength: 120 },
      {
        key: 'copy',
        label: 'Intro copy',
        type: 'textarea',
        default:
          'Fifty-three colourful pages with the destinations we compose, the photographs clients keep, the packages and prices, and a step-by-step guide to placing your Neverbeen Request — plus traveller stories from across the world.',
        maxLength: 1200,
      },
      { key: 'autoplay', label: 'Move to the next memo automatically', type: 'toggle', default: true },
      {
        key: 'seconds',
        label: 'Seconds per memo',
        type: 'number',
        default: 5,
        min: 2,
        max: 20,
        hint: 'The shipped pace is 5 seconds. Visitors can always move on themselves.',
      },
    ],
  },
  {
    key: 'home.storyline',
    page: 'home',
    label: 'The Storyline of Parallel Universe',
    icon: '🌌',
    description:
      'Full-width slideshow featuring the nine stories from The Storyline of Parallel Universe.',
    previewPath: '/',
    previewFragment: 'storyline-section',
    fields: [
      { key: 'title', label: 'Section title', type: 'text', default: 'The Storyline of Parallel Universe', maxLength: 120 },
      {
        key: 'copy',
        label: 'Intro copy',
        type: 'textarea',
        default:
          'Nine real-feelings scenarios about the journeys people carry in their hearts — postponed by work, distance, illness or loss — and how a Parallel Universe frame lets an unlived moment be seen with honesty and care.',
        maxLength: 1200,
      },
      { key: 'autoplay', label: 'Move to the next memo automatically', type: 'toggle', default: true },
      {
        key: 'seconds',
        label: 'Seconds per memo',
        type: 'number',
        default: 5,
        min: 2,
        max: 20,
        hint: 'The shipped pace is 5 seconds. Visitors can always move on themselves.',
      },
    ],
  },
  {
    key: 'home.how',
    page: 'home',
    label: 'How It Works',
    icon: '⚙️',
    description:
      'The four NeverBeen capabilities — travel photography, AI model rental, live chat and merchandise — each explained step by step.',
    previewPath: '/',
    previewFragment: 'how-it-works',
    fields: [
      ...heading(
        'Four ways into the studio',
        'How It Works',
        'NeverBeen is four businesses under one roof: travel photographs of yourself, AI models for rent, live chat with the models, and merchandise. Each one runs on the same quiet discipline — a clear request, a human check, and a finished piece that never looks machine-made. Below, every capability is explained step by step.',
      ),
      {
        key: 'steps',
        label: 'Travel photography — steps',
        type: 'records',
        default: howItWorksSteps.map((s) => ({ number: s.number, title: s.title, description: s.description })),
        recordFields: [
          { key: 'number', label: 'Number', type: 'text' },
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ],
        recordTitleKey: 'title',
        maxRecords: 8,
      },
      ...capabilityFields('rent', 'AI model rental', track('rent').title, track('rent').description, track('rent').steps),
      ...capabilityFields('chat', 'Live chat', track('chat').title, track('chat').description, track('chat').steps),
      ...capabilityFields('shop', 'Merchandise', track('shop').title, track('shop').description, track('shop').steps),
    ],
  },
  {
    key: 'home.destinations',
    page: 'home',
    label: 'Popular Destinations',
    icon: '🗺️',
    description: 'The destination atlas: heading plus which destinations are shown and in what order.',
    previewPath: '/',
    previewFragment: 'destinations',
    fields: [
      ...heading('The atlas', 'Popular Destinations', 'Places people book in their minds long before they book a flight.'),
      { key: 'items', label: 'Destinations', type: 'items', default: destinations.map((d) => ({ id: d.slug, label: d.name, visible: true })), labelEditable: false },
    ],
  },
  {
    key: 'home.gallery',
    page: 'home',
    label: 'Gallery',
    icon: '🖼️',
    description:
      'The proof mosaic: 23 photographs drawn at random from the Neverbeen Collection (/collection) on every page load, so the set is not managed here.',
    previewPath: '/',
    previewFragment: 'gallery',
    fields: [
      ...heading('The proof', 'Gallery', 'Twenty-three stills drawn at random from the Neverbeen Collection—a new set every time you open this page.'),
    ],
  },
  {
    key: 'home.pricing',
    page: 'home',
    label: 'Pricing',
    icon: '🏷️',
    description: 'Collections and prices, including the highlighted (featured) plan.',
    previewPath: '/',
    previewFragment: 'pricing',
    fields: [
      ...heading('Collections', 'Pricing', 'Simple plans for a first postcard, a full trip, or a season of elsewhere.'),
      {
        key: 'plans',
        label: 'Plans',
        type: 'records',
        default: pricingPlans.map((p) => ({ name: p.name, price: p.price, cadence: p.cadence, description: p.description, cta: p.cta, featured: p.featured, features: [...p.features] })),
        recordFields: [
          { key: 'name', label: 'Plan name', type: 'text' },
          { key: 'price', label: 'Price', type: 'text' },
          { key: 'cadence', label: 'Cadence', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'cta', label: 'Button label', type: 'text' },
          { key: 'featured', label: 'Featured (highlighted)', type: 'toggle' },
          { key: 'features', label: 'Features (one per line)', type: 'lines' },
        ],
        recordTitleKey: 'name',
        maxRecords: 6,
      },
    ],
  },
  {
    key: 'home.faq',
    page: 'home',
    label: 'FAQ',
    icon: '❓',
    description: 'Frequently asked questions — add, edit, re-order or remove answers.',
    previewPath: '/',
    previewFragment: 'faq',
    fields: [
      ...heading('Before you go', 'FAQ', 'The practical questions, answered the way a studio would.'),
      {
        key: 'items',
        label: 'Questions',
        type: 'records',
        default: faqItems.map((f) => ({ question: f.question, answer: f.answer })),
        recordFields: [
          { key: 'question', label: 'Question', type: 'text' },
          { key: 'answer', label: 'Answer', type: 'textarea' },
        ],
        recordTitleKey: 'question',
        maxRecords: 30,
      },
    ],
  },
  {
    key: 'home.owner',
    page: 'home',
    label: 'Founder',
    icon: '🧑‍💼',
    description: 'The person behind NeverBeen.',
    previewPath: '/',
    previewFragment: 'owner',
    fields: heading(
      'The person behind NeverBeen',
      'A better way to dream about going somewhere',
      'NeverBeen was created by Kingshuk from a love of thoughtful travel and the places that stay with us long after we leave.',
    ),
  },
  {
    key: 'home.contact',
    page: 'home',
    label: 'Contact form',
    icon: '✉️',
    description: 'The enquiry form at the end of the Home page.',
    previewPath: '/',
    previewFragment: 'contact',
    fields: heading('Begin', "Tell us where you've never been", 'Share a portrait and a destination. A studio editor will reply with a collection brief.'),
  },
  // ------------------------------------------------------------------ Community
  {
    key: 'community.connect',
    page: 'community',
    label: 'Connect page',
    icon: '🔐',
    description: 'The Community landing / sign-in card: copy, sign-in providers and helpers.',
    previewPath: '/community',
    fields: [
      { key: 'badge', label: 'Badge', type: 'text', default: 'NeverBeen Community', maxLength: 40 },
      { key: 'title', label: 'Title', type: 'text', default: 'Connect to NeverBeen Community', maxLength: 90 },
      {
        key: 'subtitle',
        label: 'Subtitle',
        type: 'textarea',
        default: 'Sign in with your preferred account to join Neverbeen Social Network for discussions, share travel memoirs, and explore vacation galleries.',
        maxLength: 300,
      },
      {
        key: 'providers',
        label: 'Sign-in providers',
        type: 'items',
        default: items([['google', 'Sign in with Google'], ['facebook', 'Sign in with Facebook']]),
        labelEditable: true,
      },
      {
        key: 'showGuest',
        label: 'Show the “Explore as Guest” option',
        type: 'toggle',
        default: true,
      },
      {
        key: 'guestLabel',
        label: 'Guest option label',
        type: 'text',
        default: 'Explore as Guest',
        maxLength: 40,
      },
      {
        key: 'guestHint',
        label: 'Guest option hint',
        type: 'text',
        default: 'Explore the whole community default profile without an account. Sign in any time to connect and post.',
        maxLength: 120,
      },
      { key: 'showLanguage', label: 'Show the language switcher', type: 'toggle', default: true },
      { key: 'secureNote', label: 'Security footnote', type: 'text', default: 'Authentication is encrypted and secure.', maxLength: 90 },
      { key: 'showLegal', label: 'Show Privacy · Terms · Help links', type: 'toggle', default: true },
    ],
  },
  {
    key: 'community.profile',
    page: 'community',
    label: 'Member profile',
    icon: '🪪',
    description: 'Which social features members see in their profile menu, and the side panels.',
    previewPath: '/community/profile',
    fields: [
      { key: 'sections', label: 'Profile menu', type: 'items', default: items(PROFILE_SECTIONS), labelEditable: true, lockedIds: ['journey', 'settings'] },
      { key: 'showCompanionsPanel', label: 'Show “My Companions” side panel', type: 'toggle', default: true },
      { key: 'showCirclesPanel', label: 'Show “My Circles” side panel', type: 'toggle', default: true },
      { key: 'showModelAdsPanel', label: 'Show the AI Models advertisement under “Online Companions”', type: 'toggle', default: true },
      { key: 'showModelAdsInFeed', label: 'Show AI Models advertisements between Journey posts', type: 'toggle', default: true },
      { key: 'modelAdCount', label: 'Model advertisements in the right rail', type: 'number', default: 15, min: 4, max: 42 },
    ],
  },
  {
    key: 'community.shell',
    page: 'community',
    label: 'Community background',
    icon: '🌌',
    description: 'The animated aurora behind every Community page.',
    previewPath: '/community',
    fields: [{ key: 'aurora', label: 'Animated aurora background', type: 'toggle', default: true }],
  },
];

export function cmsComponent(key: string): CmsComponentDef | undefined {
  return CMS_COMPONENTS.find((c) => c.key === key);
}

export function cmsField(component: string, field: string): CmsField | undefined {
  return cmsComponent(component)?.fields.find((f) => f.key === field);
}
