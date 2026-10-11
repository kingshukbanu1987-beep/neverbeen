import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { CommunityService } from './community.service';

/** Public Community member details returned with each model testimonial. */
export interface ModelTestimonialAuthor {
  id: number;
  uniqueId?: string;
  fullName?: string;
  profilePhotoUrl?: string;
  profession?: string;
  country?: string;
  city?: string;
  isVerified?: boolean;
  activeStatus?: string;
  customStatusText?: string;
  lastSeenUtc?: string | null;
}

/** A testimonial attached to one AI model portfolio. */
export interface ModelTestimonial {
  id: number;
  modelSlug: string;
  headline: string;
  text: string;
  rating: number;
  createdAtUtc: string;
  author: ModelTestimonialAuthor;
}

export interface ModelTestimonialsPage {
  items: ModelTestimonial[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateModelTestimonial {
  headline: string;
  text: string;
  rating: number;
}

/**
 * API bridge for public model testimonials. Reading is public; writes are sent
 * with the active Community JWT and are accepted only for real, active members.
 */
@Injectable({ providedIn: 'root' })
export class ModelTestimonialsService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly community = inject(CommunityService);

  list(modelSlug: string, page = 1, pageSize = 50): Promise<ModelTestimonialsPage> {
    const http = this.requireHttpClient();
    const url = this.endpoint(modelSlug);
    return firstValueFrom(
      http
        .get<ModelTestimonialsPage>(url, { params: { page, pageSize } })
        .pipe(timeout({ first: 20_000 })),
    );
  }

  create(modelSlug: string, testimonial: CreateModelTestimonial): Promise<ModelTestimonial> {
    const http = this.requireHttpClient();
    const token = this.community.token();
    if (!this.community.apiLive || !this.community.isAuthenticated() || !token) {
      return Promise.reject(new Error('Sign in to the Community before posting a testimonial.'));
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return firstValueFrom(
      http
        .post<ModelTestimonial>(this.endpoint(modelSlug), testimonial, { headers })
        .pipe(timeout({ first: 20_000 })),
    );
  }

  private endpoint(modelSlug: string): string {
    return `${this.community.apiUrl}/api/models/${encodeURIComponent(modelSlug)}/testimonials`;
  }

  private requireHttpClient(): HttpClient {
    if (!this.http) {
      throw new Error('The NeverBeen Web API is not configured in this browser build.');
    }
    return this.http;
  }
}
