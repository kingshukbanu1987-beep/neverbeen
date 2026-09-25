import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { heroDestinations } from '../../models/site-content';
import { SiteConfigService } from '../../services/site-config.service';

const BUTTONS: Record<string, { path: string; fragment?: string; cls: string }> = {
  community: { path: '/community', cls: 'btn-dream' },
  founder: { path: '/founder', cls: 'btn-founder' },
  create: { path: '/', fragment: 'contact', cls: 'btn-primary' },
  destinations: { path: '/', fragment: 'destinations', cls: 'btn-ghost' },
  collection: { path: '/collection', cls: 'btn-ghost' },
  gallery: { path: '/', fragment: 'gallery', cls: 'btn-ghost' },
};

@Component({
  selector: 'app-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Hero {
  private readonly cms = inject(SiteConfigService);
  private readonly index = signal(0);
  protected readonly destination = computed(() => heroDestinations[this.index()]);

  protected readonly eyebrow = computed(() => this.cms.text('home.hero', 'eyebrow'));
  protected readonly title = computed(() => this.cms.text('home.hero', 'title'));
  protected readonly lede = computed(() => this.cms.text('home.hero', 'lede'));
  protected readonly buttons = computed(() =>
    this.cms
      .visibleItems('home.hero', 'buttons')
      .filter((b) => BUTTONS[b.id])
      .map((b) => ({ id: b.id, label: b.label, ...BUTTONS[b.id], fragment: BUTTONS[b.id].fragment ?? undefined })),
  );

  protected showPreviousDestination(): void {
    this.index.update((value) => (value - 1 + heroDestinations.length) % heroDestinations.length);
  }

  protected showNextDestination(): void {
    this.index.update((value) => (value + 1) % heroDestinations.length);
  }

  constructor() {
    // Auto-rotation (on/off and speed) follows the published Website Management settings.
    const destroyRef = inject(DestroyRef);
    let elapsed = 0;
    const timer = setInterval(() => {
      if (!this.cms.flag('home.hero', 'autoplay')) {
        elapsed = 0;
        return;
      }
      const seconds = Math.max(2, Number(this.cms.get<number>('home.hero', 'interval')) || 3);
      elapsed += 1;
      if (elapsed >= seconds) {
        elapsed = 0;
        this.showNextDestination();
      }
    }, 1000);
    destroyRef.onDestroy(() => clearInterval(timer));
  }
}
