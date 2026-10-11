import { beforeEach, describe, expect, it } from 'vitest';
import { rememberCommunityReturnPath, takeCommunityReturnPath } from './community-return-path';

describe('Community post-auth return path', () => {
  beforeEach(() => {
    takeCommunityReturnPath();
  });

  it('stores and consumes a same-origin portfolio path once', () => {
    rememberCommunityReturnPath('/ai-models/ana-santos?from=community#testimonials');

    expect(takeCommunityReturnPath()).toBe('/ai-models/ana-santos?from=community#testimonials');
    expect(takeCommunityReturnPath()).toBeNull();
  });

  it('does not retain external or protocol-relative destinations', () => {
    rememberCommunityReturnPath('https://example.com/account');
    expect(takeCommunityReturnPath()).toBeNull();

    rememberCommunityReturnPath('//example.com/account');
    expect(takeCommunityReturnPath()).toBeNull();
  });
});
