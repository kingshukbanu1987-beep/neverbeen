# NeverBeen Community API

.NET 7 Web API (ASP.NET Core + EF Core) for the **NeverBeen** community website. It provides:

- **OAuth (SSO) authentication** with **Google**, **Facebook** and **Microsoft Outlook** accounts,
- **Registration** of new community members (the Angular "Connect to NeverBeen Community" flow),
- **User profiles** with the four sections of the profile page: **About Me, Details, Gallery, Settings**,
- **Profile photograph + user photo gallery** storage (images stored in the database),
- The **NeverBeen Community Message Book** – text posts by any member (with the poster's details shown),
  replies to posts, and **like / dislike** reactions,
- **Lookup data**: all countries and cities (city list depends on the selected country) and the fixed
  profession / gender option lists,
- **Azure SQL Database** as the persistence store (with a Sqlite mode for quick local development).

---

## Solution layout

```
NeverBeen.API/
└── NeverBeen.API/                     (the Web API project)
    ├── Controllers/
    │   ├── AuthController.cs          OAuth (SSO) login + /me
    │   ├── RegistrationController.cs  completes a new member's profile
    │   ├── ProfileController.cs       profile page: About Me / Details / Gallery / Settings
    │   ├── GalleryController.cs       user photo gallery
    │   ├── MessageBookController.cs   community message book (posts, replies, like/dislike)
    │   └── LookupController.cs        countries, cities, professions, genders
    ├── Data/
    │   ├── AppDbContext.cs            EF Core model + indexes/relationships
    │   ├── DbInitializer.cs           creates schema + seeds countries/cities at startup
    │   └── GeoSeedData.cs             embedded seed data (184 countries, 1000+ cities)
    ├── Entities/                      UserProfile, ExternalIdentity, UserSettings,
    │                                  Country, City, GalleryPhoto,
    │                                  CommunityComment, CommentReaction
    ├── Dtos/                          request/response models + mappers
    ├── Services/                      JwtTokenService, OAuth providers (Google/Facebook/Microsoft)
    ├── Common/                        constants, validation, helpers
    └── Middleware/                    JSON error handling middleware
```

### Data model

| Table | Purpose |
|---|---|
| `Users` | Member profile (name, email, gender, DOB, country/city, pincode, contact, address, about me, profession, status, profile photo bytes) |
| `ExternalIdentities` | Links a user to each OAuth account (Provider + stable ProviderKey), unique per provider key |
| `UserSettings` | 1:1 settings (notifications, public-profile toggle, theme, timezone) |
| `Countries` / `Cities` | Drop-down lookup data (seeded at first start) |
| `GalleryPhotos` | Gallery images (bytes + caption) per user |
| `CommunityComments` | Message-book posts; `ParentId` makes it a reply to a post |
| `CommentReactions` | Like (1) / dislike (-1), one per user per comment (toggle) |

`Users.Status` is `Pending` right after the first SSO login and becomes `Active` once the
registration page is submitted.

---

## 1. Create the Azure SQL database

1. In the Azure Portal create a **SQL Server** (logical server) and an Azure **SQL Database**, e.g.
   server `neverbeensql.database.windows.net`, database `NeverBeen`.
2. On the server, under **Networking**, allow access from your dev machine / CI address
   (or "Allow all" temporarily), and create a login, e.g. `neverbeenadmin` with a strong password.
3. Create the database schema – **nothing manual is required**: on first start the API runs
   `EnsureCreated` and seeds all countries/cities automatically. (If you prefer migrations,
   generate one – see [Switching to EF migrations](#switching-to-ef-migrations).)

## 2. Configure the API

Configuration lives in `appsettings.json` (overridable with user secrets / environment
variables / Azure App Configuration). Set your values, for example:

```bash
# run from the NeverBeen.API folder
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:NeverBeen" "Server=tcp:neverbeensql.database.windows.net,1433;Initial Catalog=NeverBeen;User ID=neverbeenadmin;Password=YourP@ssw0rd;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
dotnet user-secrets set "Jwt:SigningKey" "some-long-random-value-with-at-least-32-characters"
dotnet user-secrets set "Cors:AllowedOrigins" "http://localhost:4200,https://neverbeen.example.com"
```

### OAuth (SSO) applications

Register **one** OAuth (authorization-code) app per provider and add the **frontend callback URL**
(the URL of the Angular page that receives the `code`, e.g. `http://localhost:4200/auth/callback`)
as its redirect URI. The same client id is used by the browser redirect *and* by the API's token
exchange, so the client **secret stays only on the API**.

| Provider | Registration | Scopes to request | Client id / secret |
|---|---|---|---|
| Google | [Google Cloud Console → OAuth consent + Credentials](https://console.cloud.google.com/apis/credentials) – "OAuth client ID" of type *Web application* | `openid email profile` | `OAuth:Google:ClientId` / `ClientSecret` |
| Facebook | [Meta for Developers → Apps → Facebook Login](https://developers.facebook.com/apps) | `email public_profile` | `OAuth:Facebook:ClientId` / `ClientSecret` |
| Microsoft (Outlook) | [Azure Portal → App registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade) → API permissions: *Graph* `User.Read` (delegated) + OpenID `email profile`; add the frontend callback as a **Mobile & desktop / Web** redirect (SPA) | `openid email profile User.Read` | `OAuth:Microsoft:ClientId` / `ClientSecret` (Certificates & secrets) |

```bash
dotnet user-secrets set "OAuth:FrontendRedirectUri" "http://localhost:4200/auth/callback"
dotnet user-secrets set "OAuth:Google:ClientId" "..."
dotnet user-secrets set "OAuth:Google:ClientSecret" "..."
dotnet user-secrets set "OAuth:Facebook:ClientId" "..."
dotnet user-secrets set "OAuth:Facebook:ClientSecret" "..."
dotnet user-secrets set "OAuth:Microsoft:ClientId" "..."
dotnet user-secrets set "OAuth:Microsoft:ClientSecret" "..."
```

> Production: replace the localhost origin in `Cors:AllowedOrigins` and
> `OAuth:FrontendRedirectUri` with the deployed frontend URL (https).
> For production secrets prefer **Azure Key Vault / App Configuration** or
> environment variables on the host.

## 3. Run

```bash
cd NeverBeen.API
dotnet run            # http://localhost:5080  →  Swagger UI at /swagger
```

`appsettings.Development.json` defaults to **Sqlite** (`Data Source=neverbeen.db`) so you can run
and exercise every endpoint without SQL Server. To develop against Azure SQL instead, set:

```bash
dotnet user-secrets set "Database:Provider" "SqlServer"
```

Useful checks:

- `GET /health` – API + database health
- `GET /api/lookup/countries` – seeded countries
- `GET /api/messagebook` – message book (public read)

---

## API reference

Base URL (local): `http://localhost:5080`. Authenticated calls send
`Authorization: Bearer <token>`.

### Authentication

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/oauth/login` | Exchange an OAuth code → JWT. Body: `{ "provider": "google"\|"facebook"\|"microsoft", "code": "..." }` |
| GET | `/api/auth/me` | Signed-in user (validates the JWT, restores sessions) |

`POST /api/auth/oauth/login` response:

```json
{
  "token": "eyJ0eXAiOiJKV1QiLC...",
  "tokenType": "Bearer",
  "expiresIn": 259200,
  "isNewUser": true,
  "profileComplete": false,
  "message": "New NeverBeen community member. Please complete your registration.",
  "user": { "id": 1, "fullName": "John", "email": "john@gmail.com", "status": "Pending", "profileComplete": false, "profilePhotoUrl": "https://lh3.googleusercontent.com/..." }
}
```

The frontend logic: `profileComplete == false` → go to the **Registration Page**,
otherwise → go to the **User Profile (home) page**.

### Registration

| Method | Route | Description |
|---|---|---|
| POST | `/api/registration` | `multipart/form-data` (auth required, user must be `Pending`). Form fields: `fullName`, `gender`, `dateOfBirth` (`yyyy-MM-dd`), `countryId`, `cityId`, `pincode`, `contactNumber`, `postalAddress`, `aboutMe`, `email`, `profession`, `photo` (file, optional). Returns the full `ProfileDto`. |

### Profile (About Me / Details / Gallery / Settings)

| Method | Route | Description |
|---|---|---|
| GET | `/api/profile/me` | Own full profile (auth) |
| GET | `/api/profile/{id}` | Public profile of a member (respects the "public profile" setting) |
| PUT | `/api/profile` | Update details (`UpdateProfileRequest`, null = keep) |
| PUT | `/api/profile/photo` | Upload profile photo (`multipart`, field `photo`) |
| DELETE | `/api/profile/photo` | Remove uploaded profile photo |
| PUT | `/api/profile/settings` | Update settings (notifications, public profile, theme, timezone) |
| GET | `/api/profile/{id}/photo` | Image bytes for `<img src>` |

### Gallery

| Method | Route | Description |
|---|---|---|
| GET | `/api/gallery` | Own gallery (auth) |
| POST | `/api/gallery` | Add photo (`multipart`: `photo` + optional `caption`) |
| DELETE | `/api/gallery/{id}` | Delete own photo (auth) |
| GET | `/api/gallery/{id}` | Image bytes |
| GET | `/api/gallery/users/{userId}` | Another member's gallery (public) |

### Community Message Book

| Method | Route | Description |
|---|---|---|
| GET | `/api/messagebook?page=1&pageSize=20&includeReplies=true` | Paged posts with author details, replies, counts, and the visitor's reaction |
| GET | `/api/messagebook/{id}` | One post with all replies |
| POST | `/api/messagebook` | New post `{ "text": "..." }` or reply `{ "text": "...", "parentId": 12 }` (auth) |
| POST | `/api/messagebook/{id}/reactions` | `{ "type": "like" \| "dislike" }` – toggles/switches (auth) |
| DELETE | `/api/messagebook/{id}` | Delete own post (removes its replies + reactions) (auth) |

Example post item:

```json
{
  "id": 12,
  "text": "Just joined NeverBeen! Excited to meet everyone.",
  "createdAtUtc": "2026-09-21T10:15:30Z",
  "likeCount": 3,
  "dislikeCount": 0,
  "author": { "id": 1, "fullName": "John Doe", "profilePhotoUrl": "/api/profile/1/photo", "profession": "Freelancer" },
  "myReaction": "Like",
  "replyCount": 1,
  "replies": [
    { "id": 13, "text": "Welcome aboard!", "createdAtUtc": "2026-09-21T11:00:00Z", "likeCount": 1, "dislikeCount": 0,
      "author": { "id": 2, "fullName": "Sara Ali", "profilePhotoUrl": "/api/profile/2/photo", "profession": "Teacher" },
      "myReaction": null, "replyCount": 0, "replies": [] }
  ]
}
```

### Lookup

| Method | Route | Description |
|---|---|---|
| GET | `/api/lookup/countries` | All countries `[{ id, isoCode2, name, phoneCode }]` |
| GET | `/api/lookup/countries/{id}/cities?search=` | Cities of the selected country |
| GET | `/api/lookup/professions` | The 13 fixed profession options |
| GET | `/api/lookup/genders` | `["Male", "Female", "Other"]` |

---

## 4. Angular integration guide

The Angular app stores the returned JWT (e.g. `localStorage`) and sends it in the
`Authorization` header; an `HTTP_INTERCEPTOR` makes this automatic.

### "Connect to NeverBeen Community" page

```typescript
// auth.service.ts (excerpt)
const API = environment.apiUrl;            // e.g. "http://localhost:5080"
private readonly clientId: Record<string, string> = {
  google: "GOOGLE_CLIENT_ID.apps.googleusercontent.com",   // public id, safe in the browser
  facebook: "FACEBOOK_CLIENT_ID",
  microsoft: "MICROSOFT_CLIENT_ID"
};
private get redirectUri() { return `${location.origin}/auth/callback`; }

connectWith(provider: 'google' | 'facebook' | 'microsoft') {
  const scopes: Record<string, string> = {
    google:    'openid email profile',
    facebook:  'email public_profile',
    microsoft: 'openid email profile User.Read'
  };
  const authEndpoints: Record<string, string> = {
    google:    'https://accounts.google.com/o/oauth2/v2/auth',
    facebook:  'https://www.facebook.com/v19.0/dialog/oauth',
    microsoft: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
  };
  const p = new URLSearchParams({
    client_id: this.clientId[provider],
    redirect_uri: this.redirectUri,
    response_type: 'code',
    scope: scopes[provider],
    state: provider
  });
  window.location.href = `${authEndpoints[provider]}?${p.toString()}`;
}
```

### Callback page (`/auth/callback`)

```typescript
// auth-callback.component.ts (excerpt)
ngOnInit() {
  const params = new URLSearchParams(location.search);
  const provider = params.get('state') ?? 'google';
  const code = params.get('code');
  if (!code) { this.error = 'Missing code'; return; }

  this.http.post(`${API}/api/auth/oauth/login`, { provider, code }).subscribe({
    next: (res: any) => {
      this.storeToken(res.token);                       // keep for all later calls
      if (res.profileComplete) this.router.navigate(['/profile']);   // existing user → home page
      else this.router.navigate(['/register']);                          // new user → registration
    },
    error: e => this.error = e.error?.error ?? 'Login failed'
  });
}
```

### Registration page

```typescript
// registration component (excerpt) – one FormData POST creates the profile
submit() {
  const fd = new FormData();
  fd.append('fullName', this.form.fullName);
  fd.append('gender', this.form.gender);
  fd.append('dateOfBirth', this.form.dateOfBirth);      // from the date picker, yyyy-MM-dd
  fd.append('countryId', this.form.countryId);
  fd.append('cityId', this.form.cityId);                // loaded from /api/lookup/countries/{id}/cities
  fd.append('pincode', this.form.pincode ?? '');
  fd.append('contactNumber', this.form.contactNumber ?? '');
  fd.append('postalAddress', this.form.postalAddress ?? '');
  fd.append('aboutMe', this.form.aboutMe ?? '');
  fd.append('email', this.form.email);
  fd.append('profession', this.form.profession);        // from /api/lookup/professions
  if (this.file) fd.append('photo', this.file, this.file.name);

  this.http.post(`${API}/api/registration`, fd, { headers: this.authHeaders() }).subscribe({
    next: profile => this.router.navigate(['/profile']),        // → user profile page
    error: e => this.showError(e)
  });
}
```

### Profile page

- `GET /api/profile/me` returns **all four sections in one payload** (`aboutMe`,
  details fields, `settings`, `gallery[]`) – perfect for a side panel + main panel layout.
- Profile picture: `profilePhotoUrl` is a relative API URL → render as
  `<img [src]="apiUrl + profile.profilePhotoUrl">`.
- Settings changes: `PUT /api/profile/settings`; details: `PUT /api/profile`;
  photo: `PUT /api/profile/photo`; gallery: `POST /api/gallery`.

### Message Book

```typescript
// load posts
this.http.get(`${API}/api/messagebook`, { params: { page: this.page, pageSize: 20 } }).subscribe(...);

// post / reply
this.http.post(`${API}/api/messagebook`, { text, parentId: replyTo ?? undefined },
  { headers: this.authHeaders() }).subscribe(...);

// like / dislike (toggle)
this.http.post(`${API}/api/messagebook/${id}/reactions`, { type: 'like' },
  { headers: this.authHeaders() }).subscribe(res => this.applyReaction(id, res));
```

---

## Notes & next steps

- **Image storage** – profile/gallery photos are stored as `varbinary(max)` in Azure SQL
  (5 MB / 8 MB limits enforced by the API). For very large galleries, swap the byte storage
  for **Azure Blob Storage** – the controller/mapper boundaries (`GalleryController`,
  `ProfileController.UploadPhoto`) are the only places that change.
- **Like/dislike concurrency** – counters are updated in the same EF transaction as the
  reaction write; under heavy concurrent load consider a DB-level constraint or periodic recount.
- **Adding more countries/cities** – extend the JSON in `Data/GeoSeedData.cs` and restart
  (or run a one-off seeding script); no schema change needed.
- **Facebook Graph version** – the provider uses `v19.0`; bump the version string in
  `Services/FacebookOauthLoginProvider.cs` to the current Graph API version if Meta deprecates it.

### Switching to EF migrations

The app currently creates the schema with `EnsureCreated` (simplest for v1) and will
automatically use `Migrate()` as soon as migrations exist. To adopt migrations:

```bash
dotnet tool install --global dotnet-ef
cd NeverBeen.API
dotnet ef migrations add InitialCreate
```

then change `DbInitializer` behavior is already handled – `MigrateAsync` takes over, and you
can drop the Sqlite dev database and start fresh.

### Upgrading the .NET version

The project targets `net7.0` to match this repository. To move to .NET 8/10 later, change
`TargetFramework` in `NeverBeen.API.csproj` and bump the `Microsoft.*` package versions
(e.g. `Microsoft.EntityFrameworkCore.SqlServer` to `8.0.x`/`10.0.x`) – no code changes needed.
