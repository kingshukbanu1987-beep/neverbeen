import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  CHAT_FACE_DETECTOR,
  CHAT_NO_FACE_ERROR,
  CHAT_FACE_CHECK_ERROR,
} from './chat-face-detection';
import { AiModelProfile } from '../ai-model-data';
import { LIVE_CHAT_PLANS, LiveChatPlan } from './chat-types';
import {
  CHAT_IDENTITY_AVATAR_BYTES,
  CHAT_NAME_MAX_LENGTH,
  CHAT_NAME_MIN_LENGTH,
  ChatIdentity,
  chatNameError,
  cleanChatName,
  isValidChatName,
} from './chat-identity';
import {
  compressCommunityImage,
  readImageAsDataUrl,
} from '../../../shared/community-image-compression';

/**
 * A — the form in front of the chat window: the visitor's photograph (uploaded or taken with the
 * camera, always reduced to about 100 KB) and their name, checked between three and fourteen
 * letters. Both are required before the two hours start, because she talks to a person, not to a
 * window: her answers use the name, and every one of their messages carries their face.
 */
@Component({
  selector: 'app-chat-identity-prompt',
  templateUrl: './chat-identity-prompt.html',
  styleUrl: './chat-identity-prompt.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatIdentityPrompt {
  readonly model = input.required<AiModelProfile>();
  readonly plan = input<LiveChatPlan | 'legacy'>('legacy');
  readonly confirmed = output<ChatIdentity>();
  /** The visitor closed the form: the chat window goes with it. */
  readonly cancelled = output<void>();

  protected readonly minLength = CHAT_NAME_MIN_LENGTH;
  protected readonly maxLength = CHAT_NAME_MAX_LENGTH;
  protected readonly avatarLimit = CHAT_IDENTITY_AVATAR_BYTES;

  protected readonly name = signal('');
  protected readonly avatar = signal('');
  protected readonly problem = signal('');
  protected readonly working = signal(false);
  protected readonly touched = signal(false);

  private readonly detectFace = inject(CHAT_FACE_DETECTOR);
  private photoRequest = 0;

  private readonly photoInput = viewChild<ElementRef<HTMLInputElement>>('photoInput');
  private readonly cameraInput = viewChild<ElementRef<HTMLInputElement>>('cameraInput');

  protected readonly nameError = computed(() => (this.touched() ? chatNameError(this.name()) : ''));

  protected readonly ready = computed(
    () => !this.working() && isValidChatName(this.name()) && this.avatar().length > 0,
  );

  protected readonly durationLabel = computed(() => {
    const plan = this.plan();
    return plan === 'legacy' ? '2 hours' : LIVE_CHAT_PLANS[plan].durationLabel;
  });

  protected readonly firstName = computed(() => {
    const name = cleanChatName(this.name());
    return name ? name.split(' ')[0] : '';
  });

  protected onName(event: Event): void {
    this.touched.set(true);
    const value = (event.target as HTMLInputElement).value.slice(0, CHAT_NAME_MAX_LENGTH + 6);
    this.name.set(value);
  }

  /** The ✕ of the form: nothing is confirmed, the window simply closes. */
  protected cancel(): void {
    this.photoRequest++;
    this.cancelled.emit();
  }

  protected pickPhoto(): void {
    this.photoInput()?.nativeElement.click();
  }

  protected takePhoto(): void {
    this.cameraInput()?.nativeElement.click();
  }

  protected clearPhoto(): void {
    this.photoRequest++;
    this.working.set(false);
    this.avatar.set('');
    this.problem.set('');
  }

  /** The photograph the visitor chose, reduced to the 100 KB the window keeps. */
  protected async onPhotoPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const request = ++this.photoRequest;
    this.avatar.set('');
    this.working.set(true);
    this.problem.set('');
    try {
      if (!file.type.startsWith('image/')) {
        this.problem.set('That is not a picture — choose a photograph of yourself.');
        return;
      }
      const compressed = await compressCommunityImage(file, CHAT_IDENTITY_AVATAR_BYTES);
      const preview = await readImageAsDataUrl(compressed);
      let hasFace: boolean;
      try {
        hasFace = await this.detectFace(preview);
      } catch {
        if (request === this.photoRequest) this.problem.set(CHAT_FACE_CHECK_ERROR);
        return;
      }
      if (request !== this.photoRequest) return;
      if (!hasFace) {
        this.problem.set(CHAT_NO_FACE_ERROR);
        return;
      }
      this.avatar.set(preview);
    } catch (error) {
      if (request !== this.photoRequest) return;
      this.problem.set(
        error instanceof Error ? error.message : 'That picture could not be read. Try another one.',
      );
    } finally {
      if (request === this.photoRequest) this.working.set(false);
    }
  }

  protected confirm(): void {
    this.touched.set(true);
    if (this.working()) return;
    if (!isValidChatName(this.name())) return;
    if (!this.avatar()) {
      this.problem.set('One photograph of you, so I know who I am talking to.');
      return;
    }
    this.confirmed.emit({ name: cleanChatName(this.name()), avatar: this.avatar() });
  }
}
