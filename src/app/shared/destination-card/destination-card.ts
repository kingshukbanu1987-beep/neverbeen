import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { Destination } from '../../models/site-content';

@Component({
  selector: 'app-destination-card',
  templateUrl: './destination-card.html',
  styleUrl: './destination-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DestinationCard {
  readonly destination = input.required<Destination>();
  private readonly imageIndex = signal(0);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly image = computed(() => this.destination().images[this.imageIndex()]);

  constructor() {
    interval(3000).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.imageIndex.update((index) => (index + 1) % this.destination().images.length);
    });
  }
}
