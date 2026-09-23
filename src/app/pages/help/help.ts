import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslationService } from '../../services/translation.service';

export interface HelpCategory {
  id: string;
  icon: string;
  title: string;
  blurb: string;
}

export interface HelpArticle {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string;
}

@Component({
  selector: 'app-help-page',
  imports: [RouterLink],
  templateUrl: './help.html',
  styleUrl: './help.css',
})
export class HelpPage {
  protected readonly translation = inject(TranslationService);

  protected readonly query = signal('');
  protected readonly activeCategory = signal<string | null>(null);
  protected readonly openArticle = signal<string | null>(null);

  protected readonly categories: HelpCategory[] = [
    {
      id: 'getting-started',
      icon: '🧭',
      title: 'Getting started',
      blurb: 'Joining NeverBeen, completing your profile, first steps in the community.',
    },
    {
      id: 'account',
      icon: '🔐',
      title: 'Account & sign-in',
      blurb: 'OAuth providers, signing out, simulating new vs existing members.',
    },
    {
      id: 'community',
      icon: '💬',
      title: 'Community & discussions',
      blurb: 'Message book, comments, being a good neighbour in discussions.',
    },
    {
      id: 'galleries',
      icon: '🖼️',
      title: 'Memoirs & galleries',
      blurb: 'Sharing travel memoirs, organising vacation galleries and collections.',
    },
    {
      id: 'privacy',
      icon: '🛡️',
      title: 'Privacy & safety',
      blurb: 'Your data, cookies, reporting content, closing an account.',
    },
    {
      id: 'language',
      icon: '🌐',
      title: 'Language & translation',
      blurb: 'Using the multilingual dropdown and changing your display language.',
    },
  ];

  protected readonly articles: HelpArticle[] = [
    {
      id: 'join',
      category: 'getting-started',
      question: 'How do I join the NeverBeen Community?',
      answer:
        'Open the Community login page and pick Google, Facebook or Microsoft. Choose “New Member” if this is your first visit — you will land on the registration form to add a display name, bio and avatar. Existing members go straight to their profile.',
      keywords: 'join sign up register new member community oauth',
    },
    {
      id: 'profile',
      category: 'getting-started',
      question: 'What should I put in my profile?',
      answer:
        'A friendly photo, a short bio about where you have been (or dream of going), and your home city. Profiles with a photo get more replies in discussions — keep it genuine and travel-loving.',
      keywords: 'profile avatar bio display name setup',
    },
    {
      id: 'signin',
      category: 'account',
      question: 'Which sign-in options can I use?',
      answer:
        'NeverBeen Community supports Google, Facebook and Microsoft identity providers. Authentication is encrypted and secure, and we never see your provider password. Use the account-status toggle on the login card to preview the new-member or existing-member path.',
      keywords: 'login sign in google facebook microsoft oauth token encrypted secure',
    },
    {
      id: 'signed-out',
      category: 'account',
      question: 'Why was I signed out?',
      answer:
        'For safety, sessions end when the secure browser token expires, when you sign out, or when you clear site data. Simply sign in again with the same provider and your profile will be waiting.',
      keywords: 'signed out logout session expired cookie token',
    },
    {
      id: 'message-book',
      category: 'community',
      question: 'How does the Message Book work?',
      answer:
        'The Message Book is the community’s shared guestbook. Open it from your profile, leave a note for fellow travellers, and reply to notes others have left you. Keep it kind — moderation is friendly but firm.',
      keywords: 'message book guestbook comments reply discussion',
    },
    {
      id: 'report',
      category: 'community',
      question: 'How do I report a post or member?',
      answer:
        'Use the report action on the post, or send details through the feedback form with a link. The studio reviews every report — usually within a working day — and tells you the outcome when action is taken.',
      keywords: 'report abuse block spam harassment moderation',
    },
    {
      id: 'memoirs',
      category: 'galleries',
      question: 'How do I share a travel memoir?',
      answer:
        'From your profile, start a new memoir: add a title, the destination, your story and photos. Drafts autosave, and you choose the audience before publishing — the whole community or just members.',
      keywords: 'memoir story post publish write travel',
    },
    {
      id: 'gallery-organise',
      category: 'galleries',
      question: 'Can I organise photos into galleries?',
      answer:
        'Yes — create vacation galleries per trip, drag photos to reorder, and add captions. Galleries appear on your profile and can be featured in community collections curated by the studio.',
      keywords: 'gallery photos albums organise collection upload',
    },
    {
      id: 'data',
      category: 'privacy',
      question: 'What data does NeverBeen keep about me?',
      answer:
        'Your display name, email from the identity provider, the content you post, and basic technical logs. Nothing is sold or used for cross-site advertising. Read the full Privacy Policy for details and your rights.',
      keywords: 'data privacy gdpr delete export cookies personal information',
    },
    {
      id: 'delete-account',
      category: 'privacy',
      question: 'How do I delete my account?',
      answer:
        'Profile settings → Delete account. Your memoirs, comments and galleries are removed with it, and rolling backups clear within 30 days. If you only need a break, deactivate instead — your content stays hidden but safe.',
      keywords: 'delete account remove close deactivate erase goodbye',
    },
    {
      id: 'language-pick',
      category: 'language',
      question: 'How do I change the website language?',
      answer:
        'On the Community login card, use the globe dropdown in the header — English is selected by default. Pick any of the 30+ languages and the entire NeverBeen site (navbar, pages, footer) is translated instantly using an external translation API. Your choice is remembered for your next visit.',
      keywords: 'language multilingual translate dropdown english hindi spanish french german change',
    },
    {
      id: 'language-fallback',
      category: 'language',
      question: 'Some text stayed in English — is that normal?',
      answer:
        'Occasionally. If the translation API is unreachable or rate-limited, we keep the original English copy so nothing breaks. Names, brand words and code samples are also intentionally left untranslated.',
      keywords: 'english not translated missing fallback api error language',
    },
    {
      id: 'browser',
      category: 'getting-started',
      question: 'Which browsers work best with NeverBeen?',
      answer:
        'Current versions of Chrome, Edge, Firefox and Safari all work beautifully. For the sharpest photography experience use a device with a modern display — the site adapts its artwork for laptop, tablet and phone screens.',
      keywords: 'browser chrome firefox safari edge support mobile tablet laptop',
    },
    {
      id: 'contact',
      category: 'community',
      question: 'How do I reach a human at NeverBeen?',
      answer:
        'The feedback form opens a direct line to the studio (WhatsApp and the contact form on the home page). Mention your question and any screenshots — everything, including the hard parts, gets read.',
      keywords: 'contact help human support feedback whatsapp email reach',
    },
  ];

  protected readonly popularQueries = ['sign in', 'delete account', 'language', 'galleries', 'report'];

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const cat = this.activeCategory();
    return this.articles.filter((a) => {
      if (cat && a.category !== cat) return false;
      if (!q) return true;
      return (
        a.question.toLowerCase().includes(q) ||
        a.answer.toLowerCase().includes(q) ||
        a.keywords.includes(q)
      );
    });
  });

  protected readonly hasFilters = computed(() => this.query().trim().length > 0 || this.activeCategory() !== null);

  protected readonly activeCategoryTitle = computed(() => {
    const cat = this.activeCategory();
    return cat ? (this.categories.find((c) => c.id === cat)?.title ?? cat) : '';
  });

  protected countFor(categoryId: string): number {
    return this.articles.filter((a) => a.category === categoryId).length;
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  usePopular(term: string): void {
    this.query.set(term);
    this.activeCategory.set(null);
    this.openArticle.set(null);
    document.getElementById('help-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  selectCategory(id: string): void {
    this.activeCategory.set(this.activeCategory() === id ? null : id);
    this.query.set('');
    this.openArticle.set(null);
    document.getElementById('help-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  clearFilters(): void {
    this.query.set('');
    this.activeCategory.set(null);
  }

  toggleArticle(id: string): void {
    this.openArticle.set(this.openArticle() === id ? null : id);
  }

  categoryOf(article: HelpArticle): string {
    return this.categories.find((c) => c.id === article.category)?.title ?? article.category;
  }
}
