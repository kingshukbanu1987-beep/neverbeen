# NeverBeen AI Model portfolio data

The `/ai-models` directory and each individual `/ai-models/:slug` portfolio are generated from
cover portraits in `public/ai-model-assets/portraits` and the profile metadata in `profiles.json`.

## Add model portraits

1. Add one cover image per model to `public/ai-model-assets/portraits/` (`jpg`, `jpeg`, `png`,
   `webp`, `avif` or `gif`).
2. The cover's file name without its extension becomes the model name. For example, `Ariya Sen.jpg`
   is shown as **Ariya Sen**.
3. Add that model's details to `profiles.json`, keyed by the cover filename. All fields are optional
   until the details are ready:

```json
{
  "Ariya Sen.jpg": {
    "location": "Kolkata, India",
    "age": "26",
    "height": "168 cm",
    "weight": "54 kg",
    "bodyShape": "Pear",
    "bio": "A short introduction to the model.",
    "gallery": ["ariya-sen/editorial-01.jpg", "ariya-sen/editorial-02.jpg"]
  }
}
```

4. Put any additional photos in `public/ai-model-assets/gallery/`. Gallery paths in `profiles.json`
   are relative to that folder.
5. Run `npm run generate:ai-models`, or use `npm start` / `npm run build` (both regenerate the
   manifest automatically).

The portfolio shows the cover, location, age, height, weight, body shape and short introduction.
Facts that have not been supplied are labelled **Details to be added** rather than being guessed.
The build compiles the data into a typed, static model manifest for the Angular pages.
