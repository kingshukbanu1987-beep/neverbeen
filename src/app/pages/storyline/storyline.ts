import { ChangeDetectionStrategy, Component } from '@angular/core';
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

@Component({
  selector: 'app-storyline-page',
  imports: [RouterLink],
  templateUrl: './storyline.html',
  styleUrl: './storyline.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorylinePage {
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
          src: '/storyline/26-elisabeth-everest-teahouse-map.jpg',
          alt: 'AI-generated illustration of fictional Elisabeth studying a trekking map in a Himalayan teahouse during an imagined Everest-region expedition.',
          caption: 'The map that stayed in her desk',
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
  ];
}
