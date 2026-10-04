import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

interface StoryPhoto {
  src: string;
  alt: string;
  caption: string;
}

interface StoryAlbum {
  id: string;
  number: string;
  place: string;
  people: string;
  title: string;
  deck: string;
  story: string[];
  reason: string;
  quote: string;
  quotedBy: string;
  photos: StoryPhoto[];
}

interface ActiveStoryPhoto {
  albumId: string;
  photoIndex: number;
}

interface StoryLightboxPhoto {
  album: StoryAlbum;
  photo: StoryPhoto;
  photoIndex: number;
}

@Component({
  selector: 'app-storyline-page',
  imports: [RouterLink],
  templateUrl: './storyline.html',
  styleUrl: './storyline.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorylinePage {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly lightboxCloseButton = viewChild<ElementRef<HTMLButtonElement>>('lightboxClose');
  private lastFocusedTrigger: HTMLElement | null = null;
  private previousBodyOverflow = '';

  protected readonly storylinePath = '/storyline-of-parallel-universe';
  protected readonly albums: StoryAlbum[] = [
    {
      id: 'switzerland-honeymoon',
      number: '01',
      place: 'Switzerland',
      people: 'Lotte & Bram · a Dutch couple',
      title: 'The honeymoon that kept getting postponed',
      deck: 'They had the dream, the invitation and the same dates circled. Work kept taking those dates back.',
      story: [
        'Before they married, Lotte and Bram drew a tiny blue train on the back of their wedding invitation. It marked the honeymoon they imagined: Lucerne by rail, a slow afternoon beside Lake Brienz, and no alarm set for the next morning.',
        'Then work kept asking for one more thing. A teammate was away; a launch slipped; urgent shifts landed on the same dates. Their leave requests moved from spring to autumn, then off the calendar. They could afford the idea. What they could not find was a clear week when both of them could step away without letting someone down.',
        'On their anniversary, they sent NeverBeen portraits they already owned and asked to see the version of the story where the train did leave. The photographs here are imagined—not evidence of a trip. They gave the couple a picture to place beside the invitation, and a way to keep the promise visible until life makes room.',
      ],
      reason:
        'They chose NeverBeen for a personal, imagined keepsake while work pressure kept shifting their plans—not to pretend the honeymoon had happened, but to honour a promise they still hope to keep.',
      quote:
        'We were not waiting for a perfect price. We were waiting for a week when neither of us had to apologise for being away.',
      quotedBy: 'An imagined voice for Lotte & Bram',
      photos: [
        {
          src: '/storyline/01-lotte-bram-lake-brienz.jpg',
          alt: 'AI-generated illustrative portrait of a Dutch couple beside Lake Brienz, Switzerland.',
          caption: 'The blue water on their wedding map',
        },
        {
          src: '/storyline/03-lotte-bram-lauterbrunnen.jpg',
          alt: 'AI-generated phone-style illustration of a couple laughing in a Swiss Alpine village.',
          caption: 'A valley they hoped to explore slowly',
        },
        {
          src: '/storyline/04-lotte-bram-train.jpg',
          alt: 'AI-generated travel illustration of a couple sitting together by a Swiss train window.',
          caption: 'The train ride still waiting in the plan',
        },
        {
          src: '/storyline/05-lotte-bram-mountain-cafe.jpg',
          alt: 'AI-generated illustration of a couple studying a map at a mountain café.',
          caption: 'An unhurried stop for coffee and a map',
        },
      ],
    },
    {
      id: 'paris-solo-dream',
      number: '02',
      place: 'Paris, France',
      people: 'Ananya · a solo-travel dream',
      title: 'A Paris trip that never found its season',
      deck: 'She did not stop wanting to go. The practical pieces simply never lined up at once.',
      story: [
        'Ananya grew up in a middle-class family in Pune, collecting Paris in library books, films and the travel pages she saved for later. She pictured a day on her own terms: a walk beside the Seine, a map open at the Louvre, coffee at a little pavement table.',
        'The reason she stayed home was never one simple answer. Some years money mattered; in others, family responsibilities needed her, work leave would not line up, or the thought of travelling solo felt bigger than the time she had to prepare. Each reason was real. Paris kept becoming “maybe next year”—not because she did not care enough, but because life was already asking a lot of her.',
        'For her birthday, she asked NeverBeen to imagine a small set of portraits in the city she still hopes to explore. They are not proof that she has been to Paris. They let her see herself inside a dream that belongs to her, while the actual journey remains out of reach for now.',
      ],
      reason:
        'She chose NeverBeen to give a private, long-held wish a shape of its own—a gentle reminder that her dream matters too, even when family, timing, confidence or other responsibilities have to come first.',
      quote:
        'Paris is not a “no” for me. It is a “not yet”—and I wanted one thing to remind me the dream is still mine.',
      quotedBy: 'An imagined voice for Ananya',
      photos: [
        {
          src: '/storyline/02-ananya-paris-seine.jpg',
          alt: 'AI-generated mobile-style illustration of an Indian woman beside the Seine, with the Eiffel Tower in the distance.',
          caption: 'A first imagined pause beside the Seine',
        },
        {
          src: '/storyline/06-ananya-louvre.jpg',
          alt: 'AI-generated illustration of a woman holding a map in the Louvre courtyard in Paris.',
          caption: 'A map, a pause, a day on her own terms',
        },
        {
          src: '/storyline/07-ananya-cafe.jpg',
          alt: 'AI-generated phone-style illustration of a woman sitting alone with a notebook at a Paris café.',
          caption: 'A small table and nowhere else to be',
        },
        {
          src: '/storyline/08-ananya-montmartre.jpg',
          alt: 'AI-generated travel illustration of a woman walking alone on a Montmartre street in Paris.',
          caption: 'A long walk, taken at her own pace',
        },
      ],
    },
    {
      id: 'amazon-university-reunion',
      number: '03',
      place: 'Amazon Rainforest',
      people: 'Five old friends · 3 men & 2 women',
      title: 'The expedition that became a promise after graduation',
      deck: 'They planned it over a campus map. Then life scattered five calendars across five cities.',
      story: [
        'At an American university, five friends—three men and two women—covered the margin of a library map with an Amazon route. They promised to go after finals, when nobody had a paper due and they could all stay until the end of the story.',
        'Graduation sent them to different states. Work shifts, caring for family, new jobs and the cost of coordinating five lives kept winning over the group chat. Birthdays still brought the old map back into the conversation, but no reunion date ever survived everyone’s calendar. No one stopped wanting the trip; the shared time simply got harder to find.',
        'They chose NeverBeen together, sharing their own portraits with permission, to make an imagined expedition album and give the old promise a new reason to gather. The pictures are not proof that they went. They are a keepsake of the friendship—and perhaps a nudge toward planning the real reunion, even if it starts with dinner close to home.',
      ],
      reason:
        'NeverBeen gave the friends a collaborative way to picture the promise they made at university while they work out what a real reunion can look like now.',
      quote:
        'We still have the map. The hardest part has been getting five calendars to belong to the same week.',
      quotedBy: 'An imagined voice from the five friends',
      photos: [
        {
          src: '/storyline/09-five-friends-amazon-river.jpg',
          alt: 'AI-generated group selfie illustration of five adult American university friends, three men and two women, at an Amazon river overlook.',
          caption: 'Five friends, finally back around one map',
        },
        {
          src: '/storyline/10-five-friends-amazon-map.jpg',
          alt: 'AI-generated illustration of the same five friends planning a rainforest route around a paper map.',
          caption: 'The route they once drew between classes',
        },
        {
          src: '/storyline/11-five-friends-amazon-boardwalk.jpg',
          alt: 'AI-generated phone snapshot illustration of five friends walking together under the Amazon canopy.',
          caption: 'A boardwalk through the imagined green',
        },
        {
          src: '/storyline/12-five-friends-amazon-riverbank.jpg',
          alt: 'AI-generated candid illustration of five friends laughing beside a covered river boat in the Amazon.',
          caption: 'A riverbank reunion in the parallel version',
        },
      ],
    },
    {
      id: 'italy-wedding-dream',
      number: '05',
      place: 'Tuscany, Italy',
      people: 'Meera & Arjun · an Indian couple',
      title: 'The Tuscany wedding that never took place',
      deck: 'They imagined a destination wedding together. An accident ended that shared future before the ceremony could happen.',
      story: [
        'Meera and Arjun, a fictional Indian couple, used to picture a small destination wedding in Tuscany: an old stone courtyard, flowers from the garden, and both families sharing a long meal. They talked about the place and the feeling of the day, but the wedding was never held.',
        'Before they could make those plans real, Meera died in an accident. The wedding never happened. Arjun holds the dream alongside the grief; he does not want an imagined album to turn into a claim that the ceremony took place or to speak for what Meera might have wanted.',
        'For this fictional example, Arjun asks NeverBeen to create four clearly labelled, alternate-universe illustrations of the day they once imagined. The AI-made scenes are a creative keepsake—not photographs, a reconstruction of an actual wedding, or evidence of a real event. The memories they truly shared remain distinct and untouched.',
      ],
      reason:
        'He chose NeverBeen to hold a shared dream gently in a clearly fictional keepsake, without pretending the wedding happened or using images to speak for Meera.',
      quote:
        'I know the wedding never took place. I wanted a way to remember the future we once pictured without confusing it with the life we actually shared.',
      quotedBy: 'An imagined voice for Arjun',
      photos: [
        {
          src: '/storyline/13-meera-arjun-tuscany-courtyard.jpg',
          alt: 'AI-generated imagined illustration of fictional Indian couple Meera and Arjun at the Tuscan wedding they dreamed of but never held.',
          caption: 'The courtyard they once pictured',
        },
        {
          src: '/storyline/14-meera-arjun-tuscany-ceremony.jpg',
          alt: 'AI-generated imagined wedding scene of fictional Indian couple Meera and Arjun beneath a flowered canopy in a Tuscan villa courtyard.',
          caption: 'A ceremony in an imagined version',
        },
        {
          src: '/storyline/15-meera-arjun-tuscany-dinner.jpg',
          alt: 'AI-generated illustration of fictional Meera and Arjun at a long family table during an imagined Tuscan wedding reception.',
          caption: 'A family table their plans never reached',
        },
        {
          src: '/storyline/16-meera-arjun-tuscany-evening.jpg',
          alt: 'AI-generated illustration of fictional Meera and Arjun walking through a Tuscan villa garden after their imagined wedding ceremony.',
          caption: 'The evening walk in the parallel album',
        },
      ],
    },
    {
      id: 'london-wedding-revisited',
      number: '06',
      place: 'London, United Kingdom',
      people: 'Helen & James · a British couple',
      title: 'The wedding album with a few pages left blank',
      deck: 'Old photographs preserve their London registry-office wedding; they want companion images for the moments the camera missed.',
      story: [
        'Helen and James, a fictional British couple, married at a small London registry office decades ago. Their old wedding pictures are precious, but there are only a few: a portrait on the steps, a family picture softened by blur, and then the film ran out. The gaps are part of the album too.',
        'Now they bring those original prints and their own memories to NeverBeen as references for a companion set: the walk after the ceremony, a toast with friends, the first dance. They want to revisit the day together, not replace the photographs that truly document it.',
        'The new frames are AI-generated interpretations, not restorations or recovered images. They may evoke what the day felt like, but they cannot verify who stood where or recreate the exact moments. The original pictures remain the real record; these clearly labelled illustrations sit beside them as fiction.',
      ],
      reason:
        'They chose NeverBeen to imagine the in-between moments and revisit their shared memories together, while keeping the original wedding photos untouched and the new images clearly identified as AI-made companions.',
      quote:
        'The old photographs tell us what was there. These imagined ones give us a way to talk about what happened between them.',
      quotedBy: 'An imagined voice for Helen & James',
      photos: [
        {
          src: '/storyline/17-helen-james-london-registry.jpg',
          alt: 'AI-generated companion illustration of fictional British couple Helen and James outside a London registry office, inspired by their old wedding photographs.',
          caption: 'Confetti outside the registry office',
        },
        {
          src: '/storyline/18-helen-james-london-register.jpg',
          alt: 'AI-generated illustration of fictional Helen and James signing a marriage register in an imagined London wedding moment, not an original photograph.',
          caption: 'A moment missing from the surviving prints',
        },
        {
          src: '/storyline/19-helen-james-london-reception.jpg',
          alt: 'AI-generated illustration of fictional Helen and James sharing an imagined first dance at a small London wedding reception.',
          caption: 'The first dance their old album could not show',
        },
        {
          src: '/storyline/20-helen-james-london-thames.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James walking beside the Thames in their wedding clothes, an imagined moment rather than a real photograph.',
          caption: 'A riverside walk imagined from their memories',
        },
        {
          src: '/storyline/37-helen-james-london-confetti.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James sharing a confetti moment outside their London registry office.',
          caption: 'Confetti outside the registry steps',
        },
        {
          src: '/storyline/38-helen-james-london-black-cab.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James sharing a London black cab after their registry-office wedding.',
          caption: 'A taxi ride through the city after the ceremony',
        },
        {
          src: '/storyline/39-helen-james-london-thames-walk.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James taking a quiet, rain-softened walk beside the Thames.',
          caption: 'The Thames walk they remember between photographs',
        },
        {
          src: '/storyline/40-helen-james-london-pub-toast.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James raising a modest wedding toast with friends in a London pub.',
          caption: 'A toast with friends in a neighbourhood pub',
        },
        {
          src: '/storyline/41-helen-james-london-first-dance.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James sharing their first dance at a small London wedding reception.',
          caption: 'Their first dance in the community hall',
        },
        {
          src: '/storyline/42-helen-james-london-rainy-street.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James beneath an umbrella on a rainy London street after their wedding.',
          caption: 'An umbrella for the walk back through London',
        },
        {
          src: '/storyline/43-helen-james-london-monochrome-portrait.jpg',
          alt: 'AI-generated black-and-white companion portrait of fictional Helen and James beneath a stone London arcade after their small wedding.',
          caption: 'A quiet black-and-white portrait',
        },
        {
          src: '/storyline/44-helen-james-london-wedding-breakfast.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James sharing tea and a small wedding cake with friends in London.',
          caption: 'Tea and cake at their wedding breakfast',
        },
        {
          src: '/storyline/45-helen-james-london-vintage-snapshot.jpg',
          alt: 'AI-generated vintage-style companion illustration of fictional Helen and James laughing with friends in a London courtyard.',
          caption: 'A courtyard snapshot with their friends',
        },
        {
          src: '/storyline/47-helen-james-wedding-macro-rings.jpg',
          alt: 'AI-generated macro companion illustration of fictional Helen and James with their wedding rings, ivory sleeve and charcoal suit cuff in focus.',
          caption: 'The rings, close to the moment',
        },
        {
          src: '/storyline/48-helen-james-wedding-portrait.jpg',
          alt: 'AI-generated portrait-style companion illustration of fictional Helen and James in their original wedding outfits outside the registry office.',
          caption: 'An unposed portrait between the official shots',
        },
        {
          src: '/storyline/49-helen-james-wedding-wide-registry.jpg',
          alt: 'AI-generated wide-angle companion illustration of fictional Helen and James in their wedding clothes inside a modest London registry room.',
          caption: 'The registry room seen from the back',
        },
        {
          src: '/storyline/50-helen-james-wedding-romantic-steps.jpg',
          alt: 'AI-generated romantic companion illustration of fictional Helen and James sharing a quiet moment on the registry-office steps after confetti.',
          caption: 'A quiet pause after the confetti',
        },
        {
          src: '/storyline/51-helen-james-wedding-wide-thames.jpg',
          alt: 'AI-generated wide-angle companion illustration of fictional Helen and James walking beside the Thames in their original wedding outfits.',
          caption: 'A wider view of their riverside walk',
        },
        {
          src: '/storyline/52-helen-james-wedding-boutonniere.jpg',
          alt: 'AI-generated portrait-style companion illustration of fictional Helen straightening James’s white boutonniere during their wedding day.',
          caption: 'The little white boutonniere',
        },
        {
          src: '/storyline/53-helen-james-wedding-first-dance-bw.jpg',
          alt: 'AI-generated black-and-white companion illustration of fictional Helen and James slow-dancing in their original wedding attire.',
          caption: 'A slow dance in monochrome',
        },
        {
          src: '/storyline/54-helen-james-wedding-family-portrait.jpg',
          alt: 'AI-generated wide group companion illustration of fictional Helen and James with family outside the London registry office.',
          caption: 'The family picture, imagined in sharper focus',
        },
        {
          src: '/storyline/55-helen-james-wedding-macro-register.jpg',
          alt: 'AI-generated macro companion illustration of fictional Helen and James’s ringed hands signing the registry in their wedding outfits.',
          caption: 'The final stroke beside their rings',
        },
        {
          src: '/storyline/56-helen-james-wedding-kiss-courtyard.jpg',
          alt: 'AI-generated romantic companion illustration of fictional Helen and James kissing in the registry garden in their wedding clothes.',
          caption: 'A kiss in the registry garden',
        },
        {
          src: '/storyline/57-helen-london-wedding-portrait-front.jpg',
          alt: 'AI-generated front-facing portrait of fictional bride Helen in her long-sleeved ivory wedding dress, holding her bouquet outside the London registry office.',
          caption: 'A front-facing portrait in the registry light',
        },
        {
          src: '/storyline/58-helen-london-wedding-portrait-three-quarter.jpg',
          alt: 'AI-generated three-quarter portrait of fictional bride Helen in her ivory wedding dress, turning toward the camera beside a London brick wall.',
          caption: 'A three-quarter turn toward the camera',
        },
        {
          src: '/storyline/59-helen-london-wedding-portrait-profile.jpg',
          alt: 'AI-generated profile portrait of fictional bride Helen by a registry-office window, looking down at her white bouquet in her ivory wedding dress.',
          caption: 'A quiet profile by the window',
        },
        {
          src: '/storyline/60-helen-london-wedding-portrait-laughing.jpg',
          alt: 'AI-generated candid portrait of fictional bride Helen laughing on the London registry steps in her ivory wedding dress.',
          caption: 'A laugh caught on the registry steps',
        },
        {
          src: '/storyline/61-helen-london-wedding-portrait-monochrome.jpg',
          alt: 'AI-generated black-and-white portrait of fictional bride Helen beneath a stone registry-office arch, holding her wedding bouquet.',
          caption: 'A monochrome portrait under the stone arch',
        },
        {
          src: '/storyline/62-helen-london-wedding-portrait-wide-angle.jpg',
          alt: 'AI-generated wide-angle environmental portrait of fictional bride Helen alone on the London registry steps in her ivory wedding dress.',
          caption: 'A wide portrait on the registry steps',
        },
        {
          src: '/storyline/63-helen-london-wedding-portrait-soft-focus.jpg',
          alt: 'AI-generated soft-focus portrait of fictional bride Helen smiling down at her bouquet in the registry-office window light.',
          caption: 'A soft-focus pause with her bouquet',
        },
        {
          src: '/storyline/64-helen-london-wedding-portrait-thames.jpg',
          alt: 'AI-generated environmental portrait of fictional bride Helen by the Thames, turned toward the river in her original ivory wedding dress.',
          caption: 'A riverside bridal portrait',
        },
        {
          src: '/storyline/65-helen-london-wedding-portrait-low-angle.jpg',
          alt: 'AI-generated low-angle portrait of fictional bride Helen beneath the registry-office doorway, wearing her long-sleeved ivory dress.',
          caption: 'A low-angle view beneath the doorway',
        },
        {
          src: '/storyline/66-helen-london-wedding-portrait-over-shoulder.jpg',
          alt: 'AI-generated over-the-shoulder portrait of fictional bride Helen turning to smile at the camera in her ivory wedding dress.',
          caption: 'A glance over her shoulder',
        },
      ],
    },
    {
      id: 'vienna-birthday-missed',
      number: '07',
      place: 'Vienna, Austria',
      people: 'Clara · a birthday dinner with friends',
      title: 'The birthday dinner she never got to share',
      deck: 'COVID restrictions kept her twenty-fifth birthday off the restaurant calendar; the wish to celebrate with friends stayed.',
      story: [
        'Clara, a fictional Austrian woman, turned twenty-five during COVID restrictions. She had pictured a small dinner at a Vienna restaurant, a cake at the centre of the table and her friends around it. The reservation never happened; her birthday came through messages and a screen instead.',
        'She understood why people needed to keep apart, but missing that milestone with her friends still hurt. Time moved on and they stayed close, yet there was no way to revisit the exact evening she had hoped for. The celebration in this album is a what-if, not a hidden record of a party that took place.',
        'In this fictional example, Clara asks NeverBeen to imagine four casual snapshots of the restaurant evening she missed. They are not photographs from that year, and they do not rewrite the pandemic; they give a shape to a memory she wished she could have made with her friends.',
      ],
      reason:
        'She chose NeverBeen to mark a milestone that was missed and picture the friends she wanted around her table—not to erase COVID restrictions or pretend the celebration occurred.',
      quote:
        'I understood why we stayed home. I still wanted one picture of the dinner I had imagined with my friends.',
      quotedBy: 'An imagined voice for Clara',
      photos: [
        {
          src: '/storyline/21-clara-vienna-birthday-dinner.jpg',
          alt: "AI-generated imagined snapshot of fictional Clara and three friends celebrating Clara's twenty-fifth birthday at a Vienna restaurant, a dinner that never happened.",
          caption: 'The table she hoped to share',
        },
        {
          src: '/storyline/22-clara-vienna-birthday-candles.jpg',
          alt: 'AI-generated imagined snapshot of fictional Clara blowing out candles at the birthday dinner she missed during COVID restrictions.',
          caption: 'A candlelit wish in the parallel version',
        },
        {
          src: '/storyline/23-clara-vienna-friends.jpg',
          alt: 'AI-generated imagined snapshot of fictional Clara and friends walking together in Vienna after a birthday dinner that never took place.',
          caption: 'Friends after the dinner in another timeline',
        },
        {
          src: '/storyline/24-clara-vienna-toast.jpg',
          alt: 'AI-generated illustration of fictional Clara and three friends sharing a toast at an imagined Vienna restaurant birthday celebration.',
          caption: 'The toast they did not get to make',
        },
      ],
    },
    {
      id: 'everest-solo-dream',
      number: '08',
      place: 'Everest Region, Nepal',
      people: 'Elisabeth · a European solo-trek dream',
      title: 'The mountain she carried through a working life',
      deck: 'She always pictured the Everest trail. Work pressure kept turning the leave she planned into another year.',
      story: [
        'Elisabeth, a fictional older European woman, kept a folded map of Nepal’s Everest region in her desk for years. She imagined an independent solo trek along a well-travelled, non-technical route, with local support, a warm teahouse at day’s end and a first view of the Himalayan peaks. She wanted to make the journey, not climb a summit.',
        'Whenever she tried to book time away, a deadline or another responsibility at work pushed the leave to a later season. Her plans kept sliding into “next year”; the years passed. The dream stayed, even while she knew a high-altitude trek requires real preparation, good health and careful planning.',
        'In this fictional example, Elisabeth asks NeverBeen for four clearly labelled illustrations of a calm trekking day she had pictured. These AI images are not evidence that she travelled, reached Everest Base Camp or climbed a mountain. They hold the outline of a long-held hope, without pretending to complete it.',
      ],
      reason:
        'She chose NeverBeen to see a long-held solo travel dream pictured, not to claim an ascent or substitute an imagined frame for the preparation and safety a real high-altitude trek requires.',
      quote:
        'My leave kept moving to next year. I wanted one picture of the path I kept promising myself I would walk.',
      quotedBy: 'An imagined voice for Elisabeth',
      photos: [
        {
          src: '/storyline/25-elisabeth-everest-trail.jpg',
          alt: "AI-generated imagined portrait of fictional older European woman Elisabeth on a broad, non-technical trekking trail in Nepal's Everest region; not evidence of travel or an ascent.",
          caption: 'A quiet pause on the trail she imagined',
        },
        {
          src: '/storyline/26-elisabeth-everest-village-stop.jpg',
          alt: 'AI-generated imagined snapshot of fictional older European woman Elisabeth pausing in a quiet village on a safe Everest-region trekking route.',
          caption: 'A village stop along the route she imagined',
        },
        {
          src: '/storyline/27-elisabeth-everest-valley.jpg',
          alt: 'AI-generated mobile-style illustration of fictional older European woman Elisabeth pausing on a marked, gentle trekking path in the Everest region, without a summit climb.',
          caption: 'A safe path toward the distant peaks',
        },
        {
          src: '/storyline/28-elisabeth-everest-lodge.jpg',
          alt: 'AI-generated illustration of fictional Elisabeth enjoying tea at a mountain teahouse veranda on an imagined trek, with distant Himalayan peaks.',
          caption: 'Tea at a teahouse in the parallel version',
        },
      ],
    },
    {
      id: 'banaras-european-couple-dream',
      number: '10',
      place: 'Benaras (Varanasi), India',
      people: 'Ingrid & Peter · an older European couple',
      title: 'The Benaras visit that stayed on their map',
      deck: 'They longed to explore Varanasi. Health complications and repeated visa refusals kept the journey from happening.',
      story: [
        'Ingrid and Peter, a fictional older European couple, had long wanted to explore Benaras (Varanasi): the riverfront at dawn, shaded lanes and time to pause for tea. They pictured taking the city slowly, with accessible walks and room to rest.',
        'Health issues changed what the trip would require. As those concerns became part of their travel planning and visa applications, their visas were refused several times. Each refusal meant another wait, more uncertainty and another careful conversation about whether a long journey would be manageable. They never made the visit.',
        'For this fictional example, they ask NeverBeen to imagine four snapshots of the city they hoped to see. The AI illustrations are not evidence of a trip or visa approval, and they cannot resolve health, access or paperwork barriers. They are a clearly labelled keepsake of a place that mattered even though they did not reach it.',
      ],
      reason:
        'They chose NeverBeen to picture the city while health issues and repeated visa refusals kept travel on hold—not to suggest an application was approved or that they visited.',
      quote:
        'We kept Benaras on the map. I wanted one gentle picture of the place we hoped to explore together.',
      quotedBy: 'An imagined voice for Ingrid & Peter',
      photos: [
        {
          src: '/storyline/29-ingrid-peter-varanasi-riverfront.jpg',
          alt: 'AI-generated imagined illustration of fictional older European couple Ingrid and Peter at a safe upper riverside viewpoint in Benaras (Varanasi), India; they never made this visit.',
          caption: 'The riverfront at the quiet hour they imagined',
        },
        {
          src: '/storyline/30-ingrid-peter-varanasi-boat.jpg',
          alt: 'AI-generated imagined snapshot of fictional Ingrid and Peter seated safely in a passenger boat on the Ganges, viewing the Benaras riverfront.',
          caption: 'A calm river view from their parallel visit',
        },
        {
          src: '/storyline/31-ingrid-peter-varanasi-lane.jpg',
          alt: 'AI-generated imagined snapshot of fictional older European couple Ingrid and Peter pausing in a level, shaded lane in Varanasi.',
          caption: 'A slow walk through a shaded old-city lane',
        },
        {
          src: '/storyline/32-ingrid-peter-varanasi-chai.jpg',
          alt: 'AI-generated imagined snapshot of fictional Ingrid and Peter sharing chai over a map on a quiet riverside terrace in Banaras.',
          caption: 'Time for chai and a map',
        },
      ],
    },
    {
      id: 'norway-anniversary-dream',
      number: '11',
      place: 'Norway',
      people: 'Asha & Ravi · an Indian couple planning their 50th anniversary',
      title: 'The Norway anniversary they planned for years',
      deck: 'Asha and Ravi hoped to celebrate their 50th wedding anniversary in Norway. Her recent hospitalization has put the trip on hold.',
      story: [
        'Asha and Ravi, a fictional older Indian couple, had talked about a Norway trip for years. They hoped to mark their 50th wedding anniversary with fjord views, a scenic train ride and slow days together—small plans they had saved and revisited over time. It was still a plan, not a completed visit.',
        'Recently, Asha developed health issues and was admitted to hospital. Their attention is with her care and what she wants now; travel is on hold, with no assumption about what comes next. No imagined picture can stand in for medical care or promise a recovery.',
        'In this fictional example, they ask NeverBeen to imagine four gentle snapshots from their Norway itinerary. The AI-generated scenes do not claim they reached Norway, celebrated there, or that Asha has recovered. They hold a shared plan in view while the real priority remains her health and choices.',
      ],
      reason:
        'They chose NeverBeen to keep a long-planned anniversary dream somewhere they could picture together, while giving Asha’s care priority and leaving the future undecided.',
      quote:
        'We planned Norway long before this year. Right now her care comes first; I only wanted to keep the dream close.',
      quotedBy: 'An imagined voice for Ravi',
      photos: [
        {
          src: '/storyline/33-asha-ravi-norway-fjord.jpg',
          alt: 'AI-generated imagined portrait of fictional older Indian couple Asha and Ravi at a Norwegian fjord viewpoint, for a trip they had not made.',
          caption: 'A fjord view for their anniversary plan',
        },
        {
          src: '/storyline/34-asha-ravi-norway-train.jpg',
          alt: 'AI-generated imagined snapshot of fictional Asha and Ravi seated together on a Norwegian scenic train, not proof they travelled.',
          caption: 'A train day from the itinerary they saved',
        },
        {
          src: '/storyline/35-asha-ravi-norway-harbor.jpg',
          alt: 'AI-generated imagined snapshot of fictional older Indian couple Asha and Ravi resting together beside a quiet Norwegian harbor.',
          caption: 'A quiet pause by a Norwegian harbor',
        },
        {
          src: '/storyline/36-asha-ravi-norway-anniversary-dinner.jpg',
          alt: 'AI-generated imagined anniversary dinner for fictional Asha and Ravi in Norway; not a real celebration or proof of travel or recovery.',
          caption: 'An anniversary dinner in their imagined Norway',
        },
      ],
    },
  ];

  private readonly collapsedAlbums = signal<ReadonlySet<string>>(
    new Set(this.albums.map((album) => album.id)),
  );
  private readonly activePhotoSelection = signal<ActiveStoryPhoto | null>(null);
  private readonly lightboxIsOpen = computed(() => this.activePhotoSelection() !== null);

  protected readonly lightboxPhoto = computed<StoryLightboxPhoto | null>(() => {
    const selection = this.activePhotoSelection();
    if (!selection) return null;

    const album = this.albums.find((story) => story.id === selection.albumId);
    const photo = album?.photos[selection.photoIndex];
    return album && photo ? { album, photo, photoIndex: selection.photoIndex } : null;
  });

  constructor() {
    effect(() => {
      if (this.lightboxIsOpen()) this.lightboxCloseButton()?.nativeElement.focus();
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (!this.activePhotoSelection()) return;

      switch (event.key) {
        case 'Escape':
          this.closeLightbox();
          break;
        case 'ArrowRight':
          this.stepPhoto(1);
          break;
        case 'ArrowLeft':
          this.stepPhoto(-1);
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    this.document.addEventListener('keydown', onKeydown);
    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('keydown', onKeydown);
      if (this.activePhotoSelection()) this.unlockScroll();
    });
  }

  protected isAlbumExpanded(albumId: string): boolean {
    return !this.collapsedAlbums().has(albumId);
  }

  protected toggleAlbum(albumId: string): void {
    this.collapsedAlbums.update((collapsed) => {
      const next = new Set(collapsed);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  }

  protected openPhoto(albumId: string, photoIndex: number, event: Event): void {
    this.lastFocusedTrigger = event.currentTarget as HTMLElement | null;
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.activePhotoSelection.set({ albumId, photoIndex });
    this.document.body.style.overflow = 'hidden';
  }

  protected closeLightbox(): void {
    if (!this.activePhotoSelection()) return;

    this.activePhotoSelection.set(null);
    this.unlockScroll();
    this.lastFocusedTrigger?.focus();
    this.lastFocusedTrigger = null;
  }

  protected showPreviousPhoto(event: Event): void {
    event.stopPropagation();
    this.stepPhoto(-1);
  }

  protected showNextPhoto(event: Event): void {
    event.stopPropagation();
    this.stepPhoto(1);
  }

  private stepPhoto(delta: number): void {
    this.activePhotoSelection.update((selection) => {
      if (!selection) return null;

      const album = this.albums.find((story) => story.id === selection.albumId);
      const total = album?.photos.length ?? 0;
      if (!total) return selection;

      return {
        ...selection,
        photoIndex: (selection.photoIndex + delta + total) % total,
      };
    });
  }

  private unlockScroll(): void {
    this.document.body.style.overflow = this.previousBodyOverflow;
  }
}
