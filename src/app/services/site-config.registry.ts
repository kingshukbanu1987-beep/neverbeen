import { destinations, faqItems, galleryItems, howItWorksSteps, pricingPlans } from '../models/site-content';

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

/** Home page sections, in their shipped order. */
export const HOME_SECTIONS: [string, string][] = [
  ['hero', 'Hero banner'],
  ['how', 'How It Works'],
  ['destinations', 'Popular Destinations'],
  ['gallery', 'Gallery'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
  ['owner', 'Founder'],
  ['contact', 'Contact form'],
];

export const NAV_LINKS: [string, string][] = [
  ['home', 'Home'],
  ['how', 'How'],
  ['audience', 'Audience'],
  ['collection', 'Collection'],
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
  ['founder', 'Know the Founder'],
  ['create', 'Create My Vacation'],
  ['destinations', 'Dream Destinations'],
  ['collection', 'Neverbeen Collection'],
  ['gallery', 'Explore Gallery'],
];

export const PROFILE_SECTIONS: [string, string][] = [
  ['about', 'About me'],
  ['journey', 'Journey'],
  ['gallery', 'Gallery'],
  ['messagebook', 'MessageBook'],
  ['companions', 'Companions'],
  ['circles', 'Circles'],
  ['messenger', 'Messenger'],
  ['notifications', 'Notifications'],
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
    description: 'The first thing visitors see: headline, intro, call-to-action buttons and the rotating photo.',
    previewPath: '/',
    fields: [
      { key: 'eyebrow', label: 'Eyebrow', type: 'text', default: 'Travel photography, imagined', maxLength: 60 },
      { key: 'title', label: 'Headline', type: 'text', default: "Go Anywhere. Even Where You've Never Been.", maxLength: 120 },
      {
        key: 'lede',
        label: 'Intro paragraph',
        type: 'textarea',
        default: "Create stunning AI vacation photos of yourself in the world's most beautiful destinations. Nobody will know or detect that the places you have never been.",
        maxLength: 400,
      },
      { key: 'buttons', label: 'Call-to-action buttons', type: 'items', default: items(HERO_BUTTONS), labelEditable: true },
      { key: 'autoplay', label: 'Rotate the destination photo automatically', type: 'toggle', default: true },
      { key: 'interval', label: 'Seconds per photo', type: 'number', default: 3, min: 2, max: 20 },
    ],
  },
  {
    key: 'home.how',
    page: 'home',
    label: 'How It Works',
    icon: '⚙️',
    description: 'The studio process section with its numbered steps.',
    previewPath: '/',
    previewFragment: 'how-it-works',
    fields: [
      ...heading(
        'The studio process',
        'How It Works',
        "Four quiet steps from a portrait on your phone to a photograph that looks like you left. Our team use latest high definition, efficient, limited and expensive AI Models and Algorithms to create your Photographs that nowhere people can detect it's AI generated. It will look real, that's a Promise from nowhere Team. Furthermore, we will test those photographs in different AI Detection Systems to ensure that it pass the test and Detection System unable to detect its AI generated.",
      ),
      {
        key: 'steps',
        label: 'Steps',
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
    description: 'The example-photograph mosaic.',
    previewPath: '/',
    previewFragment: 'gallery',
    fields: [
      ...heading('The proof', 'Gallery', 'Example vacation stills—composed like editorial travel photographs, not generated novelties.'),
      { key: 'items', label: 'Photographs', type: 'items', default: galleryItems.map((g) => ({ id: g.title, label: `${g.title} · ${g.location}`, visible: true })), labelEditable: false },
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
        default: items([['google', 'Sign in with Google'], ['facebook', 'Sign in with Facebook'], ['apple', 'Sign in with Apple'], ['microsoft', 'Sign in with Microsoft']]),
        labelEditable: true,
      },
      { key: 'showLanguage', label: 'Show the language switcher', type: 'toggle', default: true },
      { key: 'showSimulation', label: 'Show the “Account status” demo toggle', type: 'toggle', default: true },
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
