import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DestinationFeed, FeedSourceReport, TrendingDestination } from '../../models/travel-feeds';
import { TravelFeeds } from '../../services/travel-feeds';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Quick searches offered under the search box. */
const SUGGESTIONS = ['Kyoto', 'Iceland', 'Maldives', 'Hanoi'];

@Component({
  selector: 'app-travel-feeds',
  imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './travel-feeds.html',
  styleUrl: './travel-feeds.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelFeedsPage {
  private readonly feeds = inject(TravelFeeds);
  private readonly fb = inject(FormBuilder);

  protected readonly suggestions = SUGGESTIONS;

  protected readonly trendsState = signal<LoadState>('loading');
  protected readonly trending = signal<TrendingDestination[]>([]);

  protected readonly searchState = signal<LoadState>('idle');
  protected readonly result = signal<DestinationFeed | null>(null);
  protected readonly searchedTerm = signal('');

  protected readonly hasKeyedFeeds = this.feeds.hasKeyedFeeds;

  protected readonly form = this.fb.nonNullable.group({
    destination: ['', [Validators.required, Validators.minLength(2)]],
  });

  protected readonly liveSources = computed(
    () => this.result()?.sources.filter((source) => source.status === 'live') ?? [],
  );
  protected readonly offlineSources = computed(
    () => this.result()?.sources.filter((source) => source.status !== 'live') ?? [],
  );

  constructor() {
    void this.loadTrending();
  }

  protected async loadTrending(): Promise<void> {
    this.trendsState.set('loading');
    try {
      const board = await this.feeds.trending();
      this.trending.set(board.filter((entry) => entry.trend || entry.photo));
      this.trendsState.set(this.trending().length ? 'ready' : 'error');
    } catch {
      this.trendsState.set('error');
    }
  }

  protected async search(term?: string): Promise<void> {
    const value = (term ?? this.form.controls.destination.value).trim();
    if (value.length < 2) {
      this.form.controls.destination.markAsTouched();
      return;
    }

    this.form.controls.destination.setValue(value);
    this.searchedTerm.set(value);
    this.result.set(null);
    this.searchState.set('loading');

    try {
      const feed = await this.feeds.destinationFeed(value);
      this.result.set(feed);
      this.searchState.set('ready');
    } catch {
      this.searchState.set('error');
    }
  }

  protected clear(): void {
    this.form.reset({ destination: '' });
    this.result.set(null);
    this.searchedTerm.set('');
    this.searchState.set('idle');
  }

  protected sourceBadgeClass(source: FeedSourceReport): string {
    return `badge badge-${source.status}`;
  }

  protected views(value: number): string {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
  }

  /** Sparkline path for a trend's daily views, drawn in a 100 x 28 viewBox. */
  protected sparkPath(values: number[]): string {
    if (values.length < 2) {
      return 'M0 28 L100 28';
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 26 - ((value - min) / span) * 24;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  protected sparkArea(values: number[]): string {
    const line = this.sparkPath(values);
    return `${line} L100 28 L0 28 Z`;
  }
}
