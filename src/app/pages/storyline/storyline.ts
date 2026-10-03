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
  ];
}
