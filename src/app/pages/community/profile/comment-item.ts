import { Component, EventEmitter, Input, Output, forwardRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthorInfo, JourneyComment } from '../../../models/community';

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

  @Output() reply = new EventEmitter<{ postId: number; parentCommentId: number; text: string }>();
  @Output() like = new EventEmitter<{ postId: number; commentId: number }>();
  @Output() openUser = new EventEmitter<AuthorInfo>();
  @Output() reportAbuse = new EventEmitter<{ commentId: number; author: AuthorInfo; text: string }>();

  readonly replyOpen = signal(false);
  replyText = '';

  toggleReply(): void {
    this.replyOpen.update((v) => !v);
    this.replyText = '';
  }

  submitReply(): void {
    if (!this.replyText.trim()) return;
    this.reply.emit({
      postId: this.postId,
      parentCommentId: this.comment.id,
      text: this.replyText.trim(),
    });
    this.replyText = '';
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

  forwardReply(event: { postId: number; parentCommentId: number; text: string }): void {
    this.reply.emit(event);
  }

  forwardLike(event: { postId: number; commentId: number }): void {
    this.like.emit(event);
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
