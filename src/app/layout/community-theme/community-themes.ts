import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { CommunityService } from '../../services/community.service';

/**
 * Community themes. A theme only restyles the Community (community pages, member profiles,
 * chats, Message Book) and the website header while the member is there — the rest of the
 * website always uses the default look.
 *
 * How it works: community stylesheets use colour tokens with the original colour as fallback,
 * e.g. `background: var(--ct-sf, #ffffff)`. The Default theme defines no tokens, so it is
 * exactly the classic look. Picking a theme sets `data-ctheme` on <html>, and
 * community-themes.css defines the tokens for that theme.
 */
export type CommunityThemeId =
  | 'default'
  | 'winter-wonderland'
  | 'city-explorer'
  | 'green-nature'
  | 'travel-classic'
  | 'midnight'
  | 'cherry-blossom'
  | 'tropical-paradise'
  | 'mountain-escape'
  | 'ocean-breeze'
  | 'dreamscape'
  | 'boarding-pass'
  | 'cosmic'
  | 'pixel-world'
  | 'social-snap'
  | 'retro-90s'
  | 'graffiti'
  | 'fantasy'
  | 'disney-world'
  | 'peppa-pig'
  | 'dino-world'
  | 'unicorn-magic'
  | 'japanese-aesthetic'
  | 'haunted-house'
  | 'spooky-night'
  | 'disco-diva'
  | 'minions'
  | 'santas-village'
  | 'kpop-demon-hunters'
  | 'fashion-editor'
  | 'spongebob'
  | 'business-pro'
  | 'entrepreneur'
  | 'digital-earth'
  | 'aurora'
  | 'galactic-void'
  | 'digital-dna'
  | 'football-arena';

export interface CommunityTheme {
  id: CommunityThemeId;
  name: string;
  icon: string;
  /** Colour story shown under the name. */
  palette: string;
  /** Who it's for. */
  audience: string;
  mode: 'light' | 'dark';
  /** Swatch preview (CSS background) + the surface / accent chips drawn on it. */
  preview: string;
  surface: string;
  accent: string;
}

export const COMMUNITY_THEMES: readonly CommunityTheme[] = [
  {
    id: 'default',
    name: 'Default',
    icon: '✨',
    palette: 'Current theme and style',
    audience: 'The classic NeverBeen look',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 45%, #e0f2fe 100%)',
    surface: '#ffffff',
    accent: '#2563eb',
  },
  {
    id: 'winter-wonderland',
    name: 'Winter Wonderland',
    icon: '❄️',
    palette: 'White · icy blue',
    audience: 'Snow destinations',
    mode: 'light',
    preview:
      'radial-gradient(circle at 25% 30%, #ffffff 0 3px, transparent 4px), radial-gradient(circle at 70% 65%, #ffffff 0 2px, transparent 3px), linear-gradient(135deg, #eaf6ff 0%, #bfe3fa 55%, #7cc0ec 100%)',
    surface: '#ffffff',
    accent: '#2a8bd4',
  },
  {
    id: 'city-explorer',
    name: 'City Explorer',
    icon: '🏙️',
    palette: 'Dark gray · vibrant accents',
    audience: 'Urban travelers',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #1d2027 0%, #2a2f39 50%, #ff3d7f 78%, #00a8e8 100%)',
    surface: '#1d2027',
    accent: '#ff3d7f',
  },
  {
    id: 'green-nature',
    name: 'Green Nature',
    icon: '🌿',
    palette: 'Green · earthy colors',
    audience: 'Nature lovers',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f5f2e9 0%, #c6dcb9 45%, #6a994e 75%, #8a5a2b 100%)',
    surface: '#fffdf7',
    accent: '#3f7d3a',
  },
  {
    id: 'travel-classic',
    name: 'Travel Classic',
    icon: '🧳',
    palette: 'White · blue',
    audience: 'Clean, professional profile',
    mode: 'light',
    preview: 'linear-gradient(135deg, #ffffff 0%, #eef3f9 45%, #0b5ed7 100%)',
    surface: '#ffffff',
    accent: '#0b5ed7',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    icon: '🌙',
    palette: 'Black · dark gray',
    audience: 'Minimalist users',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #0a0a0b 0%, #18181b 55%, #3f3f46 100%)',
    surface: '#141416',
    accent: '#a1a1aa',
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom',
    icon: '🌸',
    palette: 'Pink · white · soft pastel',
    audience: 'Japan / Asia travel',
    mode: 'light',
    preview:
      'radial-gradient(circle at 30% 35%, #ffffff 0 3px, transparent 4px), linear-gradient(135deg, #fff8fa 0%, #fbd3e1 50%, #ec6f9b 80%, #b7a1f0 100%)',
    surface: '#ffffff',
    accent: '#e0457b',
  },
  {
    id: 'tropical-paradise',
    name: 'Tropical Paradise',
    icon: '🌴',
    palette: 'Palm green · aqua',
    audience: 'Tropical destinations',
    mode: 'light',
    preview: 'linear-gradient(135deg, #e2f6f0 0%, #1fae63 45%, #0fb5b0 75%, #0784b5 100%)',
    surface: '#ffffff',
    accent: '#0c9c7f',
  },
  {
    id: 'mountain-escape',
    name: 'Mountain Escape',
    icon: '🏔️',
    palette: 'Green · blue · earthy tones',
    audience: 'Adventure travelers',
    mode: 'light',
    preview: 'linear-gradient(160deg, #dbe7ee 0%, #2d6a8a 40%, #4a7c59 70%, #7d5534 100%)',
    surface: '#fcfdfb',
    accent: '#2d6a8a',
  },
  {
    id: 'ocean-breeze',
    name: 'Ocean Breeze',
    icon: '🌊',
    palette: 'Blue · turquoise · waves',
    audience: 'Beach & island travelers',
    mode: 'light',
    preview:
      'repeating-radial-gradient(circle at 50% 130%, rgba(255,255,255,0.35) 0 2px, transparent 2px 9px), linear-gradient(135deg, #cdf0fa 0%, #06b6d4 50%, #0284c7 80%, #1d4ed8 100%)',
    surface: '#ffffff',
    accent: '#0284c7',
  },
  {
    id: 'dreamscape',
    name: 'Dreamscape',
    icon: '🔮',
    palette: 'Purple · blue gradient',
    audience: 'Creative profiles',
    mode: 'light',
    preview: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #2563eb 100%)',
    surface: '#ffffff',
    accent: '#7c3aed',
  },
  {
    id: 'boarding-pass',
    name: 'Boarding Pass',
    icon: '✈️',
    palette: 'Navy · ticket paper · amber',
    audience: 'Aviation-inspired profile',
    mode: 'light',
    preview:
      'linear-gradient(90deg, #0b1f3a 0 38%, #fffdf6 38% 100%), repeating-linear-gradient(0deg, #e8590c 0 3px, transparent 3px 6px)',
    surface: '#fffdf6',
    accent: '#0b3d91',
  },
  {
    id: 'cosmic',
    name: 'Cosmic',
    icon: '🪐',
    palette: 'Galaxy gradients · orbiting planets',
    audience: 'For the stargazers',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #10112d, #7850ba 60%, #268ca8)',
    surface: '#1c1c3b',
    accent: '#7850ba',
  },
  {
    id: 'pixel-world',
    name: 'Pixel World',
    icon: '👾',
    palette: 'Pixel landscapes · arcade colors',
    audience: 'An adventure, one pixel at a time',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #161e35, #5a55b3 60%, #257c6e)',
    surface: '#232d49',
    accent: '#5a55b3',
  },
  {
    id: 'social-snap',
    name: 'Social Snap',
    icon: '📷',
    palette: 'Photo collage · sunset pink',
    audience: 'Your life in little snapshots',
    mode: 'light',
    preview: 'linear-gradient(135deg, #fff1f4, #b52f68 60%, #7046b8)',
    surface: '#fffafb',
    accent: '#b52f68',
  },
  {
    id: 'retro-90s',
    name: 'Retro 90s',
    icon: '📼',
    palette: 'Vintage peach · nostalgic graphics',
    audience: 'Rewind to the good times',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f2dfc5, #895068 60%, #326c68)',
    surface: '#fff8eb',
    accent: '#895068',
  },
  {
    id: 'graffiti',
    name: 'Graffiti',
    icon: '🎨',
    palette: 'Spray paint · street-art energy',
    audience: 'Leave your colorful mark',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #192330, #ab3c75 60%, #237b70)',
    surface: '#252e40',
    accent: '#ab3c75',
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    icon: '🪄',
    palette: 'Magical gradients · enchanted castles',
    audience: 'A little everyday magic',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f3e6fa, #7c3eb0 60%, #277b85)',
    surface: '#fffbff',
    accent: '#7c3eb0',
  },
  {
    id: 'disney-world',
    name: 'Disney World',
    icon: '🏰',
    palette: 'Elsa · Cinderella · Ariel · Simba',
    audience: 'Step into a storybook adventure',
    mode: 'light',
    preview: 'linear-gradient(135deg, #ece9fc, #6850ac 60%, #276b9b)',
    surface: '#fdfbff',
    accent: '#6850ac',
  },
  {
    id: 'peppa-pig',
    name: 'Peppa Pig',
    icon: '🐷',
    palette: 'Peppa & family · sunny playtime',
    audience: 'Little adventures, big smiles',
    mode: 'light',
    preview: 'linear-gradient(135deg, #fff0f6, #b53670 60%, #287752)',
    surface: '#fffafd',
    accent: '#b53670',
  },
  {
    id: 'dino-world',
    name: 'Dino World',
    icon: '🦕',
    palette: 'Dinosaurs · jungle · volcanoes',
    audience: 'Explore the prehistoric wild',
    mode: 'light',
    preview: 'linear-gradient(135deg, #e9f0df, #286b53 60%, #9a542d)',
    surface: '#fcfff6',
    accent: '#286b53',
  },
  {
    id: 'unicorn-magic',
    name: 'Unicorn Magic',
    icon: '🦄',
    palette: 'Rainbows · stars · unicorns',
    audience: 'Follow your own rainbow',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f8eafb, #97459c 60%, #456caf)',
    surface: '#fffbff',
    accent: '#97459c',
  },
  {
    id: 'japanese-aesthetic',
    name: 'Japanese Aesthetic',
    icon: '⛩️',
    palette: 'Washi pastel · soft sakura',
    audience: 'Quiet, mindful Japan travel',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f7f2ea, #eecbd6 60%, #31556f)',
    surface: '#fffdf9',
    accent: '#31556f',
  },
  {
    id: 'haunted-house',
    name: 'Haunted House',
    icon: '🏚️',
    palette: 'Moonlit fog · gothic mansion',
    audience: 'A cold shiver, all night long',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #0b0f18, #24324a 60%, #d9a441)',
    surface: '#141a26',
    accent: '#d9a441',
  },
  {
    id: 'spooky-night',
    name: 'Spooky Night',
    icon: '🕷️',
    palette: 'Halloween black · purple · cobwebs',
    audience: 'For the spookiest night of the year',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #120720, #5b21b6 60%, #ff7a1a)',
    surface: '#1c0f30',
    accent: '#a855f7',
  },
  {
    id: 'disco-diva',
    name: 'Disco Diva',
    icon: '🪩',
    palette: 'Chrome sparkle · neon glow',
    audience: 'The dance floor never closes',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #17131f, #ff4fd8 60%, #4fe3ff)',
    surface: '#1e1729',
    accent: '#ff4fd8',
  },
  {
    id: 'minions',
    name: 'Minions',
    icon: '🍌',
    palette: 'Banana yellow · overalls blue',
    audience: 'Bello! Big, goofy fun',
    mode: 'light',
    preview: 'linear-gradient(135deg, #fff3a1, #ffd82a 60%, #2f5da8)',
    surface: '#fffbe8',
    accent: '#2f5da8',
  },
  {
    id: 'santas-village',
    name: "Santa's Village",
    icon: '🦌',
    palette: 'Snowy village · festive red',
    audience: 'Holiday cheer, year-round',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f2f7fc, #cfe2f2 60%, #c1272d)',
    surface: '#ffffff',
    accent: '#c1272d',
  },
  {
    id: 'kpop-demon-hunters',
    name: 'KPop Demon Hunters',
    icon: '🐉',
    palette: 'K-pop neon · anime glow',
    audience: 'Stage-ready for the supernatural',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #14081f, #a855f7 60%, #ff2d78)',
    surface: '#1e0f31',
    accent: '#c26bff',
  },
  {
    id: 'fashion-editor',
    name: 'Fashion Editor',
    icon: '✂️',
    palette: 'Editorial ink · gallery white',
    audience: 'Runway-ready profiles',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f7f4ee, #e6e0d4 60%, #17181c)',
    surface: '#fffdf9',
    accent: '#c3122e',
  },
  {
    id: 'spongebob',
    name: 'SpongeBob SquarePants',
    icon: '🧽',
    palette: 'Bikini Bottom blue · sponge yellow',
    audience: 'Boo-yeah, always in a good mood',
    mode: 'light',
    preview: 'linear-gradient(135deg, #d6f2ff, #5ec6f2 60%, #f8e71c)',
    surface: '#ffffff',
    accent: '#0b7fbb',
  },
  {
    id: 'business-pro',
    name: 'Business Pro',
    icon: '💼',
    palette: 'Business blue · charcoal',
    audience: 'Polished, structured, professional',
    mode: 'light',
    preview: 'linear-gradient(135deg, #f1f4f9, #1d4fd7 60%, #232a33)',
    surface: '#ffffff',
    accent: '#1d4fd7',
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    icon: '🚀',
    palette: 'Bold gradients · go-getter energy',
    audience: 'Builders, dreamers, doers',
    mode: 'light',
    preview: 'linear-gradient(135deg, #4f46e5, #9333ea 55%, #ff6a3d)',
    surface: '#ffffff',
    accent: '#4f46e5',
  },
  {
    id: 'digital-earth',
    name: 'Digital Earth',
    icon: '🌍',
    palette: 'Glowing globe · connection arcs',
    audience: 'See your world from above',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #071019, #14506b 60%, #22d3ee)',
    surface: '#0d1826',
    accent: '#22d3ee',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    icon: '🌌',
    palette: 'Dark sky · northern lights',
    audience: 'Chase the polar glow',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #050914, #134e4a 55%, #34d399)',
    surface: '#0a1120',
    accent: '#34d399',
  },
  {
    id: 'galactic-void',
    name: 'Galactic Void',
    icon: '🛰️',
    palette: 'Stars · planets · spacecraft',
    audience: 'Explore the endless void',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #05060f, #1e1b4b 60%, #a78bfa)',
    surface: '#0b0d1c',
    accent: '#a78bfa',
  },
  {
    id: 'digital-dna',
    name: 'Digital DNA',
    icon: '🧬',
    palette: 'Code streams · flowing strands',
    audience: 'Sequenced for the future',
    mode: 'dark',
    preview: 'linear-gradient(135deg, #041210, #065f46 60%, #2dd4bf)',
    surface: '#071512',
    accent: '#2dd4bf',
  },
  {
    id: 'football-arena',
    name: 'Football Arena',
    icon: '⚽',
    palette: 'Pitch green · floodlight white',
    audience: 'Match-day energy',
    mode: 'light',
    preview: 'linear-gradient(135deg, #e8f5e9, #2e7d32 60%, #fffde7)',
    surface: '#ffffff',
    accent: '#2e7d32',
  },
];

/** Local, decorative artwork shared by theme previews and the scene token sheet. */
export function communityThemeArtwork(id: CommunityThemeId): string | null {
  if (id === 'default') return null;
  const extension =
    id === 'social-snap' || id === 'peppa-pig' ? 'webp' : id === 'fashion-editor' ? 'jpg' : 'svg';
  return `/images/community-themes/${id}.${extension}`;
}

export const COMMUNITY_THEME_KEY = 'neverbeen_community_theme';
const THEME_IDS = new Set<string>(COMMUNITY_THEMES.map((t) => t.id));

export function communityTheme(id: string | null | undefined): CommunityTheme {
  return COMMUNITY_THEMES.find((t) => t.id === id) ?? COMMUNITY_THEMES[0];
}

/** Per-member theme choice (keyed by user id; "guest" when signed out) + applying it to <html>. */
@Injectable({ providedIn: 'root' })
export class CommunityThemeService {
  private readonly community = inject(CommunityService);
  private readonly choices = signal<Record<string, CommunityThemeId>>(this.load());
  private animTimer: ReturnType<typeof setTimeout> | undefined;

  readonly userKey = computed(() => {
    const id = this.community.currentUser()?.id;
    return id === undefined || id === null ? 'guest' : String(id);
  });
  readonly themeId = computed<CommunityThemeId>(
    () => communityTheme(this.choices()[this.userKey()]).id,
  );
  readonly theme = computed(() => communityTheme(this.themeId()));

  constructor() {
    if (typeof window === 'undefined') return;
    // Same member in another tab changed the theme → follow it.
    const onStorage = (e: StorageEvent) => {
      if (e.key === COMMUNITY_THEME_KEY) this.choices.set(this.load());
    };
    window.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
  }

  select(id: CommunityThemeId): void {
    if (!THEME_IDS.has(id)) return;
    const key = this.userKey();
    this.choices.update((c) => {
      const next = { ...c };
      if (id === 'default') delete next[key];
      else next[key] = id;
      return next;
    });
    try {
      localStorage.setItem(COMMUNITY_THEME_KEY, JSON.stringify(this.choices()));
    } catch {
      /* storage full / unavailable — still applies for this visit */
    }
  }

  /** Put the current theme on <html>; `animate` cross-fades colours while switching. */
  apply(animate = false): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const t = this.theme();
    if (animate) {
      root.setAttribute('data-ctheme-anim', '');
      clearTimeout(this.animTimer);
      this.animTimer = setTimeout(() => root.removeAttribute('data-ctheme-anim'), 450);
    }
    if (t.id === 'default') {
      root.removeAttribute('data-ctheme');
      root.removeAttribute('data-ctheme-mode');
    } else {
      root.setAttribute('data-ctheme', t.id);
      root.setAttribute('data-ctheme-mode', t.mode);
    }
  }

  /** Leaving the Community: the website returns to its default look. */
  clear(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    clearTimeout(this.animTimer);
    root.removeAttribute('data-ctheme');
    root.removeAttribute('data-ctheme-mode');
    root.removeAttribute('data-ctheme-anim');
    root.classList.remove('ctp-open');
  }

  private load(): Record<string, CommunityThemeId> {
    try {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem(COMMUNITY_THEME_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      return Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => typeof v === 'string' && THEME_IDS.has(v)),
      ) as Record<string, CommunityThemeId>;
    } catch {
      return {};
    }
  }
}
