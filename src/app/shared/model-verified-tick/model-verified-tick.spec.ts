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

describe('ModelVerifiedTick', () => {
  it('draws the blue tick for a model that only chats with Registered Users', () => {
    const exclusive = aiModelProfiles.find((model) => requiresRegisteredChat(model))!;
    expect(exclusive).toBeDefined();

    const element = render(exclusive.slug);
    const tick = element.querySelector<HTMLElement>('.model-verified-tick');
    expect(tick).not.toBeNull();
    expect(tick!.getAttribute('role')).toBe('img');
    expect(tick!.getAttribute('title')).toContain('Registered Users only');
    expect(tick!.querySelector('.tick-badge')?.getAttribute('d')).toMatch(/^M/);
    expect(tick!.querySelector('.tick-check')).not.toBeNull();
  });

  it('draws nothing for an ordinary model', () => {
    const ordinary = aiModelProfiles.find((model) => !requiresRegisteredChat(model))!;
    expect(ordinary).toBeDefined();

    const element = render(ordinary.slug);
    expect(element.querySelector('app-model-verified-tick')).not.toBeNull();
    expect(element.querySelector('.model-verified-tick')).toBeNull();
  });

  it('keeps the name in front of the tick', () => {
    const exclusive = aiModelProfiles.find((model) => requiresRegisteredChat(model))!;
    const heading = render(exclusive.slug).querySelector('#host')!;
    expect(heading.textContent?.trim().startsWith('Name')).toBe(true);
  });
});
