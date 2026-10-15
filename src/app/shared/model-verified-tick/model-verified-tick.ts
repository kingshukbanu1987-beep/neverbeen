import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { requiresRegisteredChat } from '../../pages/ai-models/chat/live-chat-policy';

/** Radius-and-lobe outline of the Instagram-style scalloped badge, drawn on a 24-unit grid. */
const BADGE_LOBES = 12;
const BADGE_BASE_RADIUS = 9.2;
const BADGE_LOBE_DEPTH = 0.8;
const BADGE_STEPS = 180;

function scallopedBadgePath(): string {
  const points: string[] = [];
  for (let step = 0; step <= BADGE_STEPS; step++) {
    const angle = (step / BADGE_STEPS) * Math.PI * 2;
    const radius = BADGE_BASE_RADIUS + BADGE_LOBE_DEPTH * Math.cos(BADGE_LOBES * angle);
    const x = 12 + radius * Math.cos(angle);
    const y = 12 + radius * Math.sin(angle);
    points.push(`${step === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${points.join('')}Z`;
}

const BADGE_PATH = scallopedBadgePath();

/**
 * The blue tick that stands after the name of an Exclusive or a Premium model (the models of
 * {@link requiresRegisteredChat}) — the verified NeverBeen models. It draws nothing for any other
 * model, so a parent can place it unconditionally beside every name. It is sized in `em`, so it
 * grows and shrinks with whatever heading or text it follows.
 */
@Component({
  selector: 'app-model-verified-tick',
  template: `
    @if (verified()) {
      <span class="model-verified-tick" role="img" [attr.aria-label]="label" [attr.title]="label">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path class="tick-badge" [attr.d]="badgePath" />
          <path class="tick-check" d="M7.7 12.5l2.8 2.8 5.8-6" />
        </svg>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
    }

    .model-verified-tick {
      display: inline-flex;
      flex: none;
      width: 1.05em;
      height: 1.05em;
      margin-left: 0.28em;
      transform: translateY(-0.04em);
    }

    .model-verified-tick svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .tick-badge {
      fill: #0095f6;
      filter: drop-shadow(0 1px 2px rgb(0 149 246 / 0.4));
    }

    .tick-check {
      fill: none;
      stroke: #ffffff;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelVerifiedTick {
  /** Slug of the model the tick belongs to, as in the AI model profiles. */
  readonly slug = input.required<string>();

  protected readonly verified = computed(() => requiresRegisteredChat({ slug: this.slug() }));
  protected readonly label = 'Verified NeverBeen model · Exclusive or Premium';
  protected readonly badgePath = BADGE_PATH;
}
