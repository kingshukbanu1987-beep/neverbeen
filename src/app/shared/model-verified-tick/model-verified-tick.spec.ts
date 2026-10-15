import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { aiModelProfiles } from '../../pages/ai-models/ai-model-data';
import { requiresRegisteredChat } from '../../pages/ai-models/chat/live-chat-policy';
import { ModelVerifiedTick } from './model-verified-tick';

@Component({
  imports: [ModelVerifiedTick],
  template: `<h3 id="host">Name<app-model-verified-tick [slug]="slug" /></h3>`,
})
class TickHost {
  slug = '';
}

function render(slug: string): HTMLElement {
  const fixture = TestBed.createComponent(TickHost);
  fixture.componentInstance.slug = slug;
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const exclusiveSlug = 'rozalin-el-masry';
const premiumSlug = 'alisha-bhattacharya';
const freeSlug = 'sereenah-noorzai';

describe('ModelVerifiedTick', () => {
  it('draws the blue tick for an Exclusive model', () => {
    const element = render(exclusiveSlug);
    const tick = element.querySelector<HTMLElement>('.model-verified-tick');
    expect(tick).not.toBeNull();
    expect(tick!.getAttribute('role')).toBe('img');
    expect(tick!.getAttribute('title')).toContain('Exclusive or Premium');
    expect(tick!.querySelector('.tick-badge')?.getAttribute('d')).toMatch(/^M/);
    expect(tick!.querySelector('.tick-check')).not.toBeNull();
  });

  it('draws the same blue tick for a Premium model', () => {
    const element = render(premiumSlug);
    expect(element.querySelector<HTMLElement>('.model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.model-verified-tick')?.getAttribute('title')).toContain(
      'Exclusive or Premium',
    );
  });

  it('draws nothing for a Free model', () => {
    const element = render(freeSlug);
    expect(element.querySelector('app-model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.model-verified-tick')).toBeNull();
  });

  it('keeps the name in front of the tick', () => {
    const heading = render(exclusiveSlug).querySelector('#host')!;
    expect(heading.textContent?.trim().startsWith('Name')).toBe(true);
  });

  it('ticks exactly the models that require Community registration', () => {
    for (const model of aiModelProfiles) {
      const element = render(model.slug);
      const expected = requiresRegisteredChat(model);
      expect(Boolean(element.querySelector('.model-verified-tick')), model.slug).toBe(expected);
    }
  });
});
