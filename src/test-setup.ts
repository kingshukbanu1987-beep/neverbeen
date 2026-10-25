/**
 * Global test-environment shims.
 *
 * jsdom (the unit-test DOM) has no IntersectionObserver, while Angular's
 * `@defer (on viewport)` blocks create one as soon as they are rendered.
 * Test blocks render in playthrough mode, so the observer never has to report
 * an intersection — it only has to exist. This keeps the suite free of
 * `ReferenceError: IntersectionObserver is not defined` noise.
 */
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px';
    readonly thresholds: readonly number[] = [0];

    disconnect(): void {}
    observe(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    unobserve(): void {}
  }

  globalThis.IntersectionObserver =
    NoopIntersectionObserver as unknown as typeof IntersectionObserver;
}
