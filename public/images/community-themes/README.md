# Community theme artwork

Local decorative assets for the Community theme picker, page backgrounds, and sidebar scenes.

- SVG scenes are custom vector illustrations, including stylized Elsa, Cinderella, Ariel, and Simba in `disney-world.svg`, and stylized Minion characters in `minions.svg` and the sponge character in `spongebob.svg`.
- `peppa-pig.webp` is an AI-generated Peppa-family illustration, optimized for the web.
- `social-snap.webp` is a photo collage made from the existing bundled Norway, Help, and Register images.
- `fashion-editor.jpg` is an AI-generated editorial fashion photograph (full-width magazine style).

Asset names match `CommunityThemeId` in `src/app/layout/community-theme/community-themes.ts`. The picker resolves them with `communityThemeArtwork`; `community-theme-scenes.css` references the same paths. Default deliberately has no artwork or scene tokens.

Keep assets local and decorative (empty alt text for picker previews). Do not replace member-uploaded cover photos, avatars, or post photos with theme artwork.
