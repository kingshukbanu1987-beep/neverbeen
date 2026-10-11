# AI model portfolio testimonials

Every `/ai-models/:slug` portfolio now ends with a Community testimonial section. Testimonials are public and ordered newest first. A completed, active Community member can publish a 0.5–5 star rating (half-star steps), a 10–100 character headline, and a 20–2,500 character testimonial. The page displays the author’s Community profile link, picture, presence status, city/country and a localized date/time. The list loads additional pages as the visitor scrolls.

Visitors see a compact Google Community sign-in card (no guest option). OAuth and any required new-member registration return to the model page so the testimonial form appears as soon as the Community profile is active.

## Frontend API contract

- `GET /api/models/{modelSlug}/testimonials?page=1&pageSize=50` — public, paged list.
- `POST /api/models/{modelSlug}/testimonials` — Bearer-authenticated write:

  ```json
  {
    "headline": "A memorable creative collaboration",
    "text": "The experience was thoughtful, professional, and genuinely collaborative.",
    "rating": 4.5
  }
  ```

The API validates the content lengths and half-star rating on the server, and only accepts writes from members whose Community account is `Active`. The author card reuses the API's `AuthorDto` shape.

## Apply the API and database patches

The API and database are maintained in separate repositories. Apply both patches before deploying the website feature:

```bash
git -C /path/to/neverbeen-api apply --check /path/to/neverbeen/docs/patches/neverbeen-api-model-testimonials.patch
git -C /path/to/neverbeen-api apply /path/to/neverbeen/docs/patches/neverbeen-api-model-testimonials.patch

git -C /path/to/neverbeen-database apply --check /path/to/neverbeen/docs/patches/neverbeen-database-model-testimonials.patch
git -C /path/to/neverbeen-database apply /path/to/neverbeen/docs/patches/neverbeen-database-model-testimonials.patch
```

The database repository patch adds the table and indexes to `schema.sql`. **Applying a source patch does not update an already-running database.** Run the standalone idempotent SQL migration against the production database (for example with `psql`) before deploying the API:

```bash
psql "$DATABASE_URL" -f /path/to/neverbeen/docs/patches/neverbeen-database-model-testimonials.sql
```

The SQL creates `ModelTestimonials` with checks for the slug, headline, testimonial and rating, plus an author foreign key that cascades on account deletion. The table/index creation is idempotent. Then build and deploy `neverbeen-api`, and deploy the website.
