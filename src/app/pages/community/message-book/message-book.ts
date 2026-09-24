import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../../services/community.service';
import { TranslatableTextDirective } from '../../../shared/translate/translatable-text.directive';
import { UserHoverCard, UserPreviewDirective } from '../../../shared/user-hover-card';

@Component({
  selector: 'app-community-message-book',
  imports: [FormsModule, RouterLink, TranslatableTextDirective, UserPreviewDirective, UserHoverCard],
  templateUrl: './message-book.html',
  styleUrl: './message-book.css',
})
export class CommunityMessageBook {
  protected readonly service = inject(CommunityService);

  protected newPostText = '';
  protected replyText = '';
  protected readonly posting = signal(false);
  protected readonly postingReply = signal(false);
  protected readonly activeReplyPostId = signal<number | null>(null);

  protected readonly defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

  async submitPost(): Promise<void> {
    if (!this.newPostText.trim()) return;
    this.posting.set(true);
    try {
      await this.service.postComment(this.newPostText.trim());
      this.newPostText = '';
    } finally {
      this.posting.set(false);
    }
  }

  toggleReplyInput(postId: number): void {
    if (this.activeReplyPostId() === postId) {
      this.activeReplyPostId.set(null);
    } else {
      this.activeReplyPostId.set(postId);
      this.replyText = '';
    }
  }

  async submitReply(postId: number): Promise<void> {
    if (!this.replyText.trim()) return;
    this.postingReply.set(true);
    try {
      await this.service.postComment(this.replyText.trim(), postId);
      this.replyText = '';
    } finally {
      this.postingReply.set(false);
    }
  }

  async react(commentId: number, type: 'like' | 'dislike'): Promise<void> {
    await this.service.toggleReaction(commentId, type);
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.service.deleteComment(commentId);
  }

  canDelete(authorId: number): boolean {
    const current = this.service.currentUser();
    return !!(current && current.id === authorId);
  }

  formatTime(isoString: string): string {
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
      return 'Recently';
    }
  }
}
