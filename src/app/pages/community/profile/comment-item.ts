import { Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AuthorInfo,
  HOLD_REACTION_OPTIONS,
  JourneyComment,
  REACTION_ICONS,
  ReactionType,
  getTopReactionIcon,
  getTopReactionIcons,
} from '../../../models/community';

@Component({
  selector: 'app-comment-thread',
  standalone: true,
  imports: [CommonModule, FormsModule, forwardRef(() => CommentThreadComponent)],
  templateUrl: './comment-item.html',
  styleUrl: './comment-item.css',
})
export class CommentThreadComponent {
  @Input({ required: true }) comment!: JourneyComment;
  @Input({ required: true }) postId!: number;
  @Input() depth = 0;
  @Input() currentUserId?: number;
  @Input() isProfileOwner = true;
  @Input() isCurrentUserVerified = false;

  @Output() reply = new EventEmitter<{ postId: number; parentCommentId: number; text: string; imageUrl?: string }>();
  @Output() like = new EventEmitter<{ postId: number; commentId: number }>();
  @Output() react = new EventEmitter<{ postId: number; commentId: number; reaction: ReactionType }>();
  @Output() showReactionsModal = new EventEmitter<{ comment: JourneyComment; commentId: number }>();
  @Output() openUser = new EventEmitter<AuthorInfo>();
  @Output() reportAbuse = new EventEmitter<{ commentId: number; author: AuthorInfo; text: string }>();
  @Output() deleteComment = new EventEmitter<{ postId: number; commentId: number }>();

  readonly replyOpen = signal(false);
  replyText = '';
  readonly replyPhotoPreview = signal<string | null>(null);
  readonly replyPhotoError = signal<string | null>(null);

  readonly MAX_PICTURE_SIZE = 100 * 1024; // 100 KB limit (Requirement A)

  // Hold reaction popover state
  readonly showReactionPicker = signal(false);
  readonly holdReactions = HOLD_REACTION_OPTIONS;
  readonly REACTION_ICONS = REACTION_ICONS;
  private likeHoldTimer?: any;
  private summaryHoldTimer?: any;
  protected isLongPressActive = false;

  getTop3Icons(): string[] {
    return getTopReactionIcons(this.comment.reactions, 3);
  }

  getTop1Icon(): string {
    return getTopReactionIcon(this.comment.reactions);
  }

  isAuthorVerified(): boolean {
    if (this.comment.author.isVerified) return true;
    if (this.currentUserId !== undefined && this.comment.author.id === this.currentUserId) {
      return this.isCurrentUserVerified;
    }
    return false;
  }

  startLikeHold(event?: Event): void {
    this.isLongPressActive = false;
    this.likeHoldTimer = setTimeout(() => {
      this.isLongPressActive = true;
      this.showReactionPicker.set(true);
    }, 350);
  }

  endLikeHold(): void {
    if (this.likeHoldTimer) {
      clearTimeout(this.likeHoldTimer);
      this.likeHoldTimer = undefined;
    }
  }

  handleLikeClick(): void {
    if (this.isLongPressActive) {
      this.isLongPressActive = false;
      return;
    }
    if (this.showReactionPicker()) {
      this.showReactionPicker.set(false);
      return;
    }
    this.toggleLike();
  }

  selectReaction(reaction: ReactionType): void {
    this.showReactionPicker.set(false);
    this.react.emit({
      postId: this.postId,
      commentId: this.comment.id,
      reaction,
    });
  }

  startReactionSummaryHold(event?: Event): void {
    this.summaryHoldTimer = setTimeout(() => {
      this.openReactionsModal();
    }, 300);
  }

  endReactionSummaryHold(): void {
    if (this.summaryHoldTimer) {
      clearTimeout(this.summaryHoldTimer);
      this.summaryHoldTimer = undefined;
    }
  }

  openReactionsModal(): void {
    this.showReactionsModal.emit({
      comment: this.comment,
      commentId: this.comment.id,
    });
  }

  toggleReply(): void {
    this.replyOpen.update((v) => !v);
    this.replyText = '';
    this.replyPhotoPreview.set(null);
    this.replyPhotoError.set(null);
  }

  onReplyPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    this.replyPhotoError.set(null);
    if (file.size > this.MAX_PICTURE_SIZE) {
      this.replyPhotoError.set('Picture size exceeds 100 KB limit.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.replyPhotoPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearReplyPhoto(): void {
    this.replyPhotoPreview.set(null);
    this.replyPhotoError.set(null);
  }

  submitReply(): void {
    if (!this.replyText.trim()) return;
    this.reply.emit({
      postId: this.postId,
      parentCommentId: this.comment.id,
      text: this.replyText.trim(),
      imageUrl: this.replyPhotoPreview() || undefined,
    });
    this.replyText = '';
    this.replyPhotoPreview.set(null);
    this.replyPhotoError.set(null);
    this.replyOpen.set(false);
  }

  toggleLike(): void {
    this.like.emit({
      postId: this.postId,
      commentId: this.comment.id,
    });
  }

  onAuthorClick(author: AuthorInfo): void {
    this.openUser.emit(author);
  }

  forwardReply(event: { postId: number; parentCommentId: number; text: string; imageUrl?: string }): void {
    this.reply.emit(event);
  }

  forwardLike(event: { postId: number; commentId: number }): void {
    this.like.emit(event);
  }

  forwardReact(event: { postId: number; commentId: number; reaction: ReactionType }): void {
    this.react.emit(event);
  }

  forwardShowReactionsModal(event: { comment: JourneyComment; commentId: number }): void {
    this.showReactionsModal.emit(event);
  }

  forwardOpenUser(author: AuthorInfo): void {
    this.openUser.emit(author);
  }

  onReportAbuse(): void {
    this.reportAbuse.emit({
      commentId: this.comment.id,
      author: this.comment.author,
      text: this.comment.text,
    });
  }

  forwardReportAbuse(event: { commentId: number; author: AuthorInfo; text: string }): void {
    this.reportAbuse.emit(event);
  }

  canDeleteComment(): boolean {
    if (this.isProfileOwner) return true;
    return this.currentUserId !== undefined && this.comment.author.id === this.currentUserId;
  }

  onDeleteComment(): void {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('Are you sure you want to delete this comment?')) {
        return;
      }
    }
    this.deleteComment.emit({
      postId: this.postId,
      commentId: this.comment.id,
    });
  }

  forwardDeleteComment(event: { postId: number; commentId: number }): void {
    this.deleteComment.emit(event);
  }

  formatTime(isoString?: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }
}
