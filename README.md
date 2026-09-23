# Neverbeen

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.24.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Routes

| Path          | Page       | Notes                                                                                                |
| ------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `/`           | Home       | Hero, how it works, destinations, gallery, pricing, FAQ, contact                                     |
| `/audience`   | Audience   | Who NeverBeen is for, age note, destination list, privacy promises                                   |
| `/collection` | Collection | Mobile-gallery wall of every photograph in `public/collection`; tap to enlarge, tap outside to close |
| `/founder`    | Founder    | Founder profile and expertise                                                                        |
| `/login`      | Login      | Sign-in form                                                                                         |

## The Collection page

Photographs shown on `/collection` live in `public/collection`. Drop image files (`jpg`, `jpeg`,
`png`, `webp`, `avif`, `gif`) into that folder — sub-folders become album headings — then run:

```bash
npm run generate:collection
```

This rewrites the generated manifest `src/app/pages/collection/collection-photos.ts`. `npm start`
and `npm run build` run the generator automatically, so photographs added to the folder appear on
the page without any further wiring. Titles are derived from the file names and can be overridden with
an optional `public/collection/captions.json` (see `public/collection/README.md`).

Photographs attached in Arena chat land in `/home/user/uploads` as UUID-named files. Run

```bash
npm run ingest:collection
```

to copy them into `public/collection` with readable names and captions
(`scripts/collection-ingest-map.json` holds the name/caption/album for each attachment) and
regenerate the manifest in one step.

While `public/collection` is empty, the page shows the sample studio photographs from
`public/audience` so it is never blank.

## Community Backend API

The NeverBeen Community backend is an ASP.NET Core (.NET 7) Web API located in [`NeverBeen.API/`](./NeverBeen.API/README.md). It powers:

- **OAuth (SSO) authentication** with Google, Facebook, and Microsoft Outlook accounts
- **New member registration**
- **User profiles** (About Me, Details, Gallery, Settings)
- **Photo storage** for avatars and galleries
- **Community Message Book** (posts, nested replies, like/dislike reactions)
- **Geographic and profession lookup data**

See the [NeverBeen.API README](./NeverBeen.API/README.md) for architecture, configuration, database options (Azure SQL and SQLite), and API endpoints.

## Deploying to Cloudflare Pages

Create a Pages project connected to this repository with these settings:

- Build command: `npm run build`
- Build output directory: `dist/neverbeen/browser`
- Node.js version: `22`

The `public/_redirects` file is copied into the production output and routes all paths to `index.html`, so Angular routes such as `/login` work when opened directly.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
