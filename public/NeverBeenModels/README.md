# NeverBeen AI model portraits

Add one cover portrait per model to this folder. Use the exact filename listed in
`data/ai-models/profiles.json` (for example, `Toulene Arslan.png`); the filename without its
extension is the displayed model name. Supported image formats include PNG, JPG, JPEG, WebP, AVIF
and GIF.

Run `npm run generate:ai-models` after adding or changing files. The generator also supports the
legacy `public/ai-model-assets/portraits` folder. Optional gallery photographs remain in
`public/ai-model-assets/gallery`.
