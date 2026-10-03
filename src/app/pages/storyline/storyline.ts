import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface StoryPhoto {
  src: string;
  alt: string;
  caption: string;
  /** Distinguishes custom AI scenes from supporting destination-library images. */
  label?: string;
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
  contentNote?: string;
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
      id: 'singapore-family-preview',
      number: '04',
      place: 'Singapore',
      people: 'The Iyer family · two parents, a boy & a girl',
      title: 'The family album that starts before the flight',
      deck: 'For this family, NeverBeen is not a replacement trip. It is part of the excitement before one.',
      story: [
        'The Iyers have a Singapore holiday on the calendar. Their son wants to see the Supertrees; their daughter asks whether the Merlion really sprays water. The parents know that the anticipation—the dinner-table maps, the questions, the children imagining what they will see—is already becoming a family memory.',
        'Before they pack, they ask NeverBeen to picture the four of them in the places they hope to visit. They plan to put the images in a little “before we go” book, then add their real camera photos after the holiday. The imagined frames are a promise to the kids, not a record of a trip that has happened.',
      ],
      reason:
        'They chose NeverBeen to make the planning feel shared and tangible for their children—to capture the excitement before Singapore, then leave room for the real photographs that will come later.',
      quote:
        'Before we board the plane, the kids already have a picture of the adventure we are building together.',
      quotedBy: 'An imagined voice from the Iyer parents',
      photos: [
        {
          src: '/storyline/13-indian-family-singapore-gardens.jpg',
          alt: 'AI-generated illustration of an Indian family of four looking up at the Supertrees in Singapore.',
          caption: 'The Supertrees the children keep asking about',
        },
        {
          src: '/storyline/14-indian-family-singapore-merlion.jpg',
          alt: 'AI-generated illustration of the same Indian family of four at Singapore’s Merlion waterfront.',
          caption: 'A first family picture beside the Merlion',
        },
        {
          src: '/collection/ca136df3-a135-4af1-ad9f-6cad88536ab5.jpg',
          alt: 'Illustrative family-of-four snapshot at Marina Bay Sands after dark.',
          caption: 'Marina Bay after dark, saved for later',
          label: 'Destination illustration',
        },
        {
          src: '/collection/2349453a-0525-4939-8f03-85c722d8bb63.jpg',
          alt: 'Illustrative Singapore hawker-centre meal with diners sharing chicken rice.',
          caption: 'A hawker-centre supper on their wish list',
          label: 'Destination illustration',
        },
      ],
    },
    {
      id: 'italy-wedding-dream',
      number: '05',
      place: 'Tuscany, Italy',
      people: 'Meera & Arjun · an Indian couple',
      title: 'The Italian wedding they dreamed of—and never reached',
      deck: 'A tender imagined album for a wedding that did not happen, held with care for the loss behind it.',
      contentNote: 'This fictional story includes bereavement after an accident.',
      story: [
        'Meera and Arjun used to save photographs of small Italian villas and talk about a wedding beneath a Tuscan arch. They imagined family voices in the courtyard, a little music after sunset and one slow walk together through the old streets.',
        'Before that day could be planned, Meera died in an accident. The wedding never happened. Grief is not a problem a photograph can solve, and an imagined picture must never be confused with a memory of a real ceremony.',
        'In this fictional example, Arjun chooses a private, clearly labelled NeverBeen album inspired by the place they once dreamed about. It is not a claim about Meera’s wishes or a replacement for the life they shared. It is one possible way to give their unfinished dream a gentle place beside the memories that are real.',
      ],
      reason:
        'He chose NeverBeen as a carefully labelled keepsake of a shared dream—not to rewrite what happened, but to honour a future they once pictured together.',
      quote:
        'I do not need a picture to tell me what we had. I wanted one to hold the future we had imagined, without pretending it became our past.',
      quotedBy: 'An imagined voice for Arjun',
      photos: [
        {
          src: '/storyline/17-meera-arjun-tuscany-wedding.jpg',
          alt: 'AI-generated illustrative portrait of an Indian bride and groom beneath a Tuscan stone arch; the imagined wedding never took place.',
          caption: 'The ceremony they once pictured',
        },
        {
          src: 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?auto=format&fit=crop&w=1200&q=80',
          alt: 'Destination reference view of Italy’s coastal landscape in soft afternoon light.',
          caption: 'The Italian light they saved in photographs',
          label: 'Destination view',
        },
        {
          src: 'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1200&q=80',
          alt: 'Destination reference view of historic Italian stone streets and architecture.',
          caption: 'A quiet street for the walk after vows',
          label: 'Destination view',
        },
        {
          src: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
          alt: 'Destination reference view of an Italian landmark in warm daylight.',
          caption: 'A place setting for a day that stayed a dream',
          label: 'Destination view',
        },
      ],
    },
    {
      id: 'london-wedding-revisited',
      number: '06',
      place: 'London, United Kingdom',
      people: 'Helen & James · a British couple',
      title: 'The wedding album their old photographs could not finish',
      deck: 'A few faded prints hold the real day. They want imagined frames for the moments no one managed to photograph.',
      story: [
        'Helen and James married at a small London registry office decades ago. Their old wedding album is precious, but it is brief: a few posed portraits, a blurred family picture and a gap where the roll of film ran out. They often wonder what the walk outside looked like and who was laughing during the first dance.',
        'Now they bring those old photographs to NeverBeen and ask for a companion set that imagines the missing moments in London. The new images are not restorations, originals or evidence; they sit beside the real prints as a clearly labelled creative interpretation of the day they remember.',
      ],
      reason:
        'They chose NeverBeen to revisit the feeling around their wedding, using their own old photos as a starting point while keeping the difference between an original and an imagined frame clear.',
      quote:
        'The old pictures give us the real day. The imagined ones help us talk about everything around it.',
      quotedBy: 'An imagined voice for Helen & James',
      photos: [
        {
          src: '/storyline/21-emily-james-london-wedding.jpg',
          alt: 'AI-generated, softly faded illustration of a British bride and groom outside a London registry office in the late 1990s.',
          caption: 'A companion portrait inspired by an old print',
        },
        {
          src: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80',
          alt: 'Destination reference view of London beside the River Thames.',
          caption: 'The London skyline around their story',
          label: 'Destination view',
        },
        {
          src: 'https://images.unsplash.com/photo-1486299267070-83823f5448dd?auto=format&fit=crop&w=1200&q=80',
          alt: 'Destination reference view of Big Ben and the Houses of Parliament in London.',
          caption: 'The city they walked through after the ceremony',
          label: 'Destination view',
        },
        {
          src: 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80',
          alt: 'Destination reference view of Tower Bridge over the Thames in London.',
          caption: 'A second London landmark from their album',
          label: 'Destination view',
        },
      ],
    },
    {
      id: 'vienna-birthday-missed',
      number: '07',
      place: 'Vienna, Austria',
      people: 'Clara · her friends & the birthday she missed',
      title: 'A twenty-fifth birthday that happened in another version',
      deck: 'COVID took the restaurant evening off the calendar. The wish to celebrate together stayed.',
      story: [
        'Clara turned twenty-five in Austria during COVID restrictions. The restaurant table was cancelled, the friends stayed home, and the birthday arrived through messages on a phone instead of the noisy evening she had planned. She understood why people needed to stay apart; that did not make the milestone feel less lonely.',
        'A few years later, she asked NeverBeen to imagine the dinner she and her friends had hoped for: a little cake, a table close together, the laughter that had to wait. The pictures do not pretend the celebration happened. They give shape to a lost evening and to the friendship that carried on after it.',
      ],
      reason:
        'She chose NeverBeen to mark a milestone that was missed—not to erase the pandemic, but to honour the friends and the celebration she had looked forward to sharing.',
      quote:
        'I do not want that year back. I just wanted to see the evening we tried so hard to save.',
      quotedBy: 'An imagined voice for Clara',
      photos: [
        {
          src: '/storyline/25-clara-austria-25th-birthday.jpg',
          alt: 'AI-generated candid illustration of an adult woman celebrating her twenty-fifth birthday at a Vienna restaurant with three friends.',
          caption: 'The restaurant table she had pictured at twenty-five',
        },
        {
          src: '/audience/birthday.jpg',
          alt: 'Illustrative birthday portrait with balloons and a wrapped gift.',
          caption: 'A birthday remembered even when plans changed',
          label: 'Illustrative frame',
        },
        {
          src: '/collection/d0d34d89-595c-45ad-a231-b59c33b6c490.jpg',
          alt: 'Illustrative group of friends gathered close around coffee and pastries at a café table.',
          caption: 'Friends close enough to share the table',
          label: 'Illustrative frame',
        },
        {
          src: '/collection/0d356eed-3f73-4538-b685-b18155e98226.jpg',
          alt: 'Illustrative group of friends laughing together beneath evening market lights.',
          caption: 'The laughter she wanted around her',
          label: 'Illustrative frame',
        },
      ],
    },
    {
      id: 'everest-solo-dream',
      number: '08',
      place: 'Everest Region, Nepal',
      people: 'Elisabeth · a European solo trek dream',
      title: 'The mountain she carried through a working life',
      deck: 'She always imagined the Everest trail. Work kept turning the leave she planned into another year.',
      story: [
        'For years, Elisabeth kept a folded Everest-region map in the bottom drawer of her desk. She imagined a steady solo trek along a well-travelled route, a warm tea-house at the end of the day and the first quiet view of the mountain. It was never about conquering a summit; she wanted to be there and take the long walk in.',
        'Her job was demanding, and every time she tried to make space for the expedition, a deadline, a new responsibility or a team that needed her pushed the dates away. The years passed. She still holds the dream, while being honest that an imagined photograph is not the same thing as making a high-altitude journey.',
      ],
      reason:
        'She chose NeverBeen to see herself in the landscape she had carried in her mind for decades—a personal keepsake of the dream, without claiming she made the trek or reached a summit.',
      quote:
        'That map stayed in my desk through every deadline. I wanted one picture of the place I kept promising myself I would see.',
      quotedBy: 'An imagined voice for Elisabeth',
      photos: [
        {
          src: '/storyline/29-elisabeth-everest-trail.jpg',
          alt: 'AI-generated illustrative portrait of an older European woman on a safe, non-technical trekking path in Nepal’s Everest region.',
          caption: 'A quiet pause on the trail she imagined',
        },
        {
          src: '/collection/445689fc-283b-4be0-846e-4daec2f0b686.jpg',
          alt: 'Illustrative trekking scene among prayer flags at Everest Base Camp.',
          caption: 'Prayer flags above the base-camp path',
          label: 'Destination illustration',
        },
        {
          src: '/collection/472503fa-018b-48a9-8505-96eb3f3fd73f.jpg',
          alt: 'Illustrative scene inside a simple teahouse on a Himalayan trekking route.',
          caption: 'A warm teahouse at the end of a long day',
          label: 'Destination illustration',
        },
        {
          src: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
          alt: 'Destination reference view of the Himalayas near Mount Everest.',
          caption: 'The mountain still waiting beyond the clouds',
          label: 'Destination view',
        },
      ],
    },
  ];
}
