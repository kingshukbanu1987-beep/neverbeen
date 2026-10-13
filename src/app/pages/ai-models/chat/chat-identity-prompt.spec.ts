import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiModelProfiles } from '../ai-model-data';
import {
  CHAT_FACE_DETECTOR,
  CHAT_NO_FACE_ERROR,
  CHAT_FACE_CHECK_ERROR,
} from './chat-face-detection';
import { ChatIdentity } from './chat-identity';
import { ChatIdentityPrompt } from './chat-identity-prompt';

const detectFace = vi.fn<(dataUrl: string) => Promise<boolean>>();

const alisha = aiModelProfiles.find((model) => model.slug === 'alisha-bhattacharya')!;

/** A one-byte JPEG: small enough that the compressor hands it back untouched. */
const PHOTO = new File(['x'], 'me.jpg', { type: 'image/jpeg' });

interface Harness {
  fixture: ComponentFixture<ChatIdentityPrompt>;
  element: HTMLElement;
  confirmed: ChatIdentity[];
  cancelled: number[];
}

async function form(): Promise<Harness> {
  const fixture = TestBed.createComponent(ChatIdentityPrompt);
  fixture.componentRef.setInput('model', alisha);
  fixture.detectChanges();
  const confirmed: ChatIdentity[] = [];
  const cancelled: number[] = [];
  fixture.componentInstance.confirmed.subscribe((identity) => confirmed.push(identity));
  fixture.componentInstance.cancelled.subscribe(() => cancelled.push(1));
  return { fixture, element: fixture.nativeElement as HTMLElement, confirmed, cancelled };
}

function typeName(harness: Harness, name: string): void {
  const input = harness.element.querySelector<HTMLInputElement>('.gate-field input')!;
  input.value = name;
  input.dispatchEvent(new Event('input'));
  harness.fixture.detectChanges();
}

/** Picks a picture the way the visitor does: the hidden file input, then a change event. */
async function pickPhoto(harness: Harness, file: File, which = 0): Promise<void> {
  const input = harness.element.querySelectorAll<HTMLInputElement>('.gate-file')[which];
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change'));
  await vi.waitFor(() => {
    harness.fixture.detectChanges();
    expect(harness.element.querySelector('.gate-spinner')).toBeNull();
  });
  harness.fixture.detectChanges();
}

function start(harness: Harness): HTMLButtonElement {
  return harness.element.querySelector<HTMLButtonElement>('.gate-start')!;
}

describe('ChatIdentityPrompt', () => {
  beforeEach(async () => {
    detectFace.mockReset().mockResolvedValue(true);
    await TestBed.configureTestingModule({
      imports: [ChatIdentityPrompt],
      providers: [{ provide: CHAT_FACE_DETECTOR, useValue: detectFace }],
    }).compileComponents();
  });

  it('has a ✕ that closes the form without confirming anything', async () => {
    const harness = await form();
    const close = harness.element.querySelector<HTMLButtonElement>('.gate-close');
    expect(close?.getAttribute('aria-label')).toBe('Close the chat');
    close?.click();
    harness.fixture.detectChanges();
    expect(harness.cancelled.length).toBe(1);
    expect(harness.confirmed.length).toBe(0);
  });

  it('asks for the name with the words “Write your name here”, never another woman’s name', async () => {
    const harness = await form();
    const input = harness.element.querySelector<HTMLInputElement>('.gate-field input')!;
    expect(input.getAttribute('placeholder')).toBe('Write your name here');
    expect(input.getAttribute('placeholder')).not.toBe('Alisha');
  });

  it('asks for a photograph and a name before the chat window will start (requirement A)', async () => {
    const harness = await form();
    const element = harness.element;

    expect(element.querySelector('#chat-gate-title')?.textContent).toContain('Before we start');
    expect(element.querySelector('.gate-portrait img')?.getAttribute('src')).toBe(alisha.cover);
    expect(element.querySelector('.gate-lede')?.textContent).toContain(alisha.name);
    expect(start(harness).disabled).toBe(true);

    // A name alone is not enough, and she says which name she will use.
    typeName(harness, 'Rahul Verma');
    expect(element.querySelector('.gate-help')?.textContent).toContain('Rahul');
    expect(start(harness).disabled).toBe(true);

    // Three characters is the floor, fourteen the ceiling.
    typeName(harness, 'Al');
    expect(element.querySelector('.gate-help')?.textContent).toContain('At least 3');
    typeName(harness, 'Rahul Verma Singh');
    expect(element.querySelector('.gate-help')?.textContent).toContain('14');
    expect(start(harness).disabled).toBe(true);
  });

  it('hands her the name and the reduced photograph when the visitor starts the chat (requirement A)', async () => {
    const harness = await form();
    typeName(harness, '  Rahul   Verma  ');
    await pickPhoto(harness, PHOTO);

    // The photograph is read as a data URL — already reduced to the 100 KB the form promises.
    const preview = harness.element.querySelector('.gate-photo img')?.getAttribute('src') ?? '';
    expect(preview.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(
      harness.element.querySelector('.gate-photo-frame')?.classList.contains('is-filled'),
    ).toBe(true);

    const button = start(harness);
    expect(button.disabled).toBe(false);
    button.click();
    harness.fixture.detectChanges();

    // The name is tidied, both words stay, and she will use the first one.
    expect(harness.confirmed).toEqual([{ name: 'Rahul Verma', avatar: preview }]);
  });

  it('takes the picture from the camera as well as from the gallery, and says the 100 KB limit', async () => {
    const harness = await form();
    const [gallery, camera] = Array.from(
      harness.element.querySelectorAll<HTMLInputElement>('.gate-file'),
    );

    expect(gallery.getAttribute('accept')).toBe('image/*');
    expect(camera.getAttribute('accept')).toBe('image/*');
    expect(camera.getAttribute('capture')).toBe('user');
    expect(harness.element.querySelector('.gate-note')?.textContent).toContain('100 KB');

    await pickPhoto(harness, PHOTO, 1);
    expect(harness.element.querySelector('.gate-photo img')).not.toBeNull();
  });

  it('rejects a faceless replacement and removes the previously valid avatar', async () => {
    const harness = await form();
    typeName(harness, 'Rahul Verma');
    await pickPhoto(harness, PHOTO);
    expect(start(harness).disabled).toBe(false);
    detectFace.mockResolvedValueOnce(false);
    await pickPhoto(harness, PHOTO);
    expect(harness.element.querySelector('.gate-problem')?.textContent).toBe(CHAT_NO_FACE_ERROR);
    expect(harness.element.querySelector('.gate-photo img')).toBeNull();
    expect(start(harness).disabled).toBe(true);
    expect(harness.confirmed).toEqual([]);
    await pickPhoto(harness, PHOTO, 1);
    expect(start(harness).disabled).toBe(false);
  });

  it('fails closed when detection is unavailable and permits a retry', async () => {
    const harness = await form();
    typeName(harness, 'Rahul Verma');
    detectFace.mockRejectedValueOnce(new Error('offline'));
    await pickPhoto(harness, PHOTO);
    expect(harness.element.querySelector('.gate-problem')?.textContent).toBe(CHAT_FACE_CHECK_ERROR);
    expect(start(harness).disabled).toBe(true);
    await pickPhoto(harness, PHOTO);
    expect(start(harness).disabled).toBe(false);
  });

  it('blocks Enter while verification is pending', async () => {
    const harness = await form();
    typeName(harness, 'Rahul Verma');
    let resolve!: (value: boolean) => void;
    detectFace.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const input = harness.element.querySelector<HTMLInputElement>('.gate-file')!;
    Object.defineProperty(input, 'files', { value: [PHOTO], configurable: true });
    input.dispatchEvent(new Event('change'));
    await vi.waitFor(() => expect(resolve).toBeDefined());
    harness.element
      .querySelector<HTMLInputElement>('.gate-field input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    harness.fixture.detectChanges();
    expect(start(harness).disabled).toBe(true);
    expect(harness.confirmed).toEqual([]);
    resolve(true);
    await vi.waitFor(() => {
      harness.fixture.detectChanges();
      expect(start(harness).disabled).toBe(false);
    });
  });

  it('shows a relative error for offensive or sexual names', async () => {
    const harness = await form();
    typeName(harness, 'f*ck');
    expect(harness.element.querySelector('.gate-help')?.textContent).toContain('offensive');
    typeName(harness, 'porn');
    expect(harness.element.querySelector('.gate-help')?.textContent).toContain('sexual');
    expect(start(harness).disabled).toBe(true);
  });

  it('refuses anything that is not a picture, and asks again for one it does not have', async () => {
    const harness = await form();
    await pickPhoto(harness, new File(['x'], 'notes.txt', { type: 'text/plain' }));

    expect(harness.element.querySelector('.gate-problem')?.textContent).toContain('not a picture');
    expect(harness.element.querySelector('.gate-photo img')).toBeNull();

    typeName(harness, 'Rahul Verma');
    // Start stays disabled without a photograph, so the form is asked again from the name field.
    harness.element
      .querySelector<HTMLInputElement>('.gate-field input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    harness.fixture.detectChanges();

    expect(harness.element.querySelector('.gate-problem')?.textContent).toContain(
      'One photograph of you',
    );
    expect(harness.confirmed).toHaveLength(0);
  });
});
