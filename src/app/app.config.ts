import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  NavigationError,
  provideRouter,
  withInMemoryScrolling,
  withNavigationErrorHandler,
} from '@angular/router';

import { routes } from './app.routes';
import { SiteRecoveryService } from './services/site-recovery.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The community pages call the NeverBeen Web API (OAuth sign-in, member
    // registration, profiles, lookups). Without this provider every HttpClient
    // injection is null and the site silently falls back to browser-only data —
    // nothing would ever reach the database.
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      }),
      // A tab that has been open for a while still runs the JavaScript it downloaded then. If
      // the site was redeployed in the meantime, the chunk a lazy route needs (AI Models,
      // Collection, Community …) no longer exists and the navigation is rejected — which used
      // to leave the click doing nothing at all. Repair the tab with a fresh document for the
      // requested URL instead (once per URL per tab session — see SiteRecoveryService).
      withNavigationErrorHandler((error: NavigationError) =>
        inject(SiteRecoveryService).recoverFailedNavigation(error.url),
      ),
    ),
  ],
};
