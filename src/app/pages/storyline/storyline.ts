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

  private readonly albumCatalog: StoryAlbum[] = [
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
        'On their anniversary, they sent NeverBeen portraits they already owned and asked to see the version of the story where the train did leave. The imagined album follows the route they sketched—Lucerne by rail, Interlaken, Gstaad and Lake Brienz—through train windows, café tables, crooked phone snapshots and quiet moments together. A new Glacier Express sequence follows one imagined day from boarding at Zermatt to a platform stop and arrival in St. Moritz, with the couple in the same travel-day clothes throughout. The next stop wanders Zermatt’s shop-lined streets, pauses at a bakery and small local stores, and catches Lotte and Bram with friendly shopkeepers and two friends from the train in the same outfits. Another slow turn follows Zermatt’s old Hinterdorf lanes and a few smaller stalls, with more moments beside a local florist, shopkeepers and their train friends; Lotte and Bram stay in those same clothes. A separate snowy chapter follows Lotte on her own beneath the Matterhorn; she wanders empty mountain trails and pauses for frost, boot prints, wide views and solo selfies in one consistent winter outfit. A final sequence picks up later that night in a Swiss hotel room: Lotte and Bram unwind together in the same ivory-and-navy cotton sleepwear throughout, sharing cocoa, linked hands and phone-out-of-frame selfies beneath a bedside lamp. The night continues with another run of phone snapshots: the invitation’s tiny blue train, map-reading, late cocoa, quiet goodnight gestures and one last look through the snowy window, still in those same pajamas. These AI-generated scenes are not evidence that a trip happened; they gave the couple a picture to place beside their invitation while the real honeymoon waits.',
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
        {
          src: '/storyline/309-lotte-bram-switzerland-lucerne-chapel-bridge.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera wide-angle snapshot of fictional Lotte and Bram walking across Lucerne’s wooden Chapel Bridge in rain jackets, with a softly blurred hand at the edge of the frame.',
          caption: 'A crooked walk across Chapel Bridge',
        },
        {
          src: '/storyline/310-lotte-bram-switzerland-lucerne-cafe-map-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s wedding-ringed hands meeting over a folded Swiss rail map and two coffees in a Lucerne café, with a small blue train doodle on their invitation.',
          caption: 'Their little blue train, over coffee',
        },
        {
          src: '/storyline/311-lotte-bram-switzerland-brienz-lakeside-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte and Bram cheek-to-cheek at a Lake Brienz landing, with windblown hair and bright water behind them; the phone is not visible.',
          caption: 'A close selfie beside Lake Brienz',
        },
        {
          src: '/storyline/312-lotte-bram-switzerland-lauterbrunnen-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera portrait of fictional Lotte and Bram laughing together in a Lauterbrunnen meadow, with Staubbach Falls in the background and an imperfectly cropped edge.',
          caption: 'A laugh beneath the Lauterbrunnen falls',
        },
        {
          src: '/storyline/313-lotte-bram-switzerland-interlaken-train-candid.jpg',
          alt: 'AI-generated, slightly tilted candid mobile snapshot of fictional Lotte and Bram on a regional train leaving Interlaken, with window glare and a little motion blur across the lake outside.',
          caption: 'The view slipping past the train window',
        },
        {
          src: '/storyline/314-lotte-bram-switzerland-grindelwald-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle photo of fictional Lotte and Bram on a Grindelwald trail beneath the peaks, with a thumb partly intruding into the lower corner.',
          caption: 'Small figures under the Grindelwald peaks',
        },
        {
          src: '/storyline/315-lotte-bram-switzerland-wengen-cafe-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of a shared apple tart, coffee cups and map on a Wengen café table, with fictional Lotte and Bram’s sleeves and hands at the edges and crumbs left behind.',
          caption: 'Crumbs and coffee in Wengen',
        },
        {
          src: '/storyline/316-lotte-bram-switzerland-oeschinen-romantic-kiss.jpg',
          alt: 'AI-generated, slightly tilted mobile snapshot of fictional Bram kissing Lotte’s forehead beside Lake Oeschinen, with windblown hair, a soft-focus edge and the lake behind them.',
          caption: 'A quiet forehead kiss by the lake',
        },
        {
          src: '/storyline/317-lotte-bram-switzerland-murren-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte and Bram in a flower-lined Mürren lane, with an awkwardly cropped beanie and softly blurred chalets behind them; the phone is not visible.',
          caption: 'A beanie-weather selfie in Mürren',
        },
        {
          src: '/storyline/318-lotte-bram-switzerland-lucerne-dusk-candid.jpg',
          alt: 'AI-generated, slightly tilted low-light mobile snapshot of fictional Lotte and Bram sharing a scarf on a Lucerne lakeside bench after dusk, with grain, slight hand-shake blur and a streetlamp flare.',
          caption: 'The lake after the lights came on',
        },
        {
          src: '/storyline/319-lotte-bram-switzerland-goldenpass-train-candid.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera snapshot of fictional Lotte and Bram on a Swiss train journey between Interlaken and Gstaad, with a soft window reflection and motion blur in the valley.',
          caption: 'The GoldenPass route, watched from the window',
        },
        {
          src: '/storyline/320-lotte-bram-switzerland-train-ticket-map-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s wedding-ringed hands on a folded Swiss rail map and two punched train tickets, with an imperfect focus edge.',
          caption: 'Two tickets and the route between them',
        },
        {
          src: '/storyline/321-lotte-bram-interlaken-hohematte-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle photo of fictional Lotte and Bram walking across Interlaken’s Hohematte meadow beneath the Jungfrau, with a thumb softening one corner.',
          caption: 'A long walk across Hohematte',
        },
        {
          src: '/storyline/322-lotte-bram-interlaken-aare-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte and Bram beside the turquoise Aare River in Interlaken, with windblown hair and bright highlights; the phone is not visible.',
          caption: 'A river-side selfie in Interlaken',
        },
        {
          src: '/storyline/323-lotte-bram-gstaad-chalet-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera portrait of fictional Lotte and Bram laughing outside a snowy Gstaad chalet, with a softly blurred edge and natural winter light.',
          caption: 'A laugh outside a Gstaad chalet',
        },
        {
          src: '/storyline/324-lotte-bram-gstaad-village-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte and Bram walking through a snow-dusted Gstaad village lane, with one boot awkwardly cropped and a chalet window overexposed.',
          caption: 'A crooked walk through Gstaad',
        },
        {
          src: '/storyline/325-lotte-bram-lake-brienz-steamer-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte and Bram aboard a Lake Brienz passenger steamer, with windblown hair and a softly blurred boat rail; the phone is not visible.',
          caption: 'A windy boat-deck selfie',
        },
        {
          src: '/storyline/326-lotte-bram-lake-brienz-boat-rail-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s wedding-ringed hands on a wet wooden boat rail above Lake Brienz, with water droplets and a hazy lens corner.',
          caption: 'Rings, rain drops and lake water',
        },
        {
          src: '/storyline/327-lotte-bram-lake-brienz-jetty-romantic.jpg',
          alt: 'AI-generated, slightly tilted candid mobile snapshot of fictional Lotte and Bram touching foreheads and laughing on a Lake Brienz jetty, with a soft-focus corner and evening blur on the water.',
          caption: 'Foreheads together before sunset',
        },
        {
          src: '/storyline/328-lotte-bram-gstaad-cafe-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte and Bram squeezed together at a Gstaad café window with steaming mugs and fogged glass; the phone is not visible.',
          caption: 'Warm mugs after a cold village walk',
        },
        {
          src: '/storyline/329-lotte-bram-glacier-express-boarding.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf boarding the Glacier Express at Zermatt, with a blurred fingertip in one corner.',
          caption: 'Boarding the Glacier Express at Zermatt',
        },
        {
          src: '/storyline/330-lotte-bram-glacier-express-front-train-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf standing in front of the red-and-white Glacier Express, with a soft-focus edge.',
          caption: 'A quick portrait beside the carriage',
        },
        {
          src: '/storyline/331-lotte-bram-glacier-express-ticket-map-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s wedding-ringed hands, camel coat cuff and navy quilted sleeve beside Glacier Express tickets and a folded rail map.',
          caption: 'Tickets and the route on the little table',
        },
        {
          src: '/storyline/332-lotte-bram-glacier-express-panoramic-window.jpg',
          alt: 'AI-generated, slightly tilted mobile snapshot of fictional Lotte in the same camel coat and burgundy scarf and Bram in the same navy quilted jacket and olive scarf watching snowy peaks through a Glacier Express panoramic window, with faint reflection glare.',
          caption: 'The view from their window seat',
        },
        {
          src: '/storyline/333-lotte-bram-glacier-express-wide-interior.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle photo of fictional Lotte and Bram in their matching camel and navy travel outfits seated in the panoramic Glacier Express carriage, with bright snow outside and imperfect window exposure.',
          caption: 'A wide carriage view over the Oberalp Pass',
        },
        {
          src: '/storyline/334-lotte-bram-glacier-express-romantic-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf leaning cheek-to-cheek on the Glacier Express; the phone is not visible.',
          caption: 'A cheek-to-cheek train selfie',
        },
        {
          src: '/storyline/335-lotte-bram-glacier-express-dining-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s hands sharing a pastry and tea on the Glacier Express, with her camel sleeve and burgundy scarf and his navy quilted cuff visible.',
          caption: 'Tea, pastry and crumbs between stations',
        },
        {
          src: '/storyline/336-lotte-bram-glacier-express-andermatt-platform.jpg',
          alt: 'AI-generated, slightly tilted mobile snapshot of fictional Lotte in the same camel coat and burgundy scarf and Bram in the same navy quilted jacket and olive scarf during an Andermatt platform stop, with blurred passengers behind them.',
          caption: 'A short stop on the Andermatt platform',
        },
        {
          src: '/storyline/337-lotte-bram-glacier-express-window-reflection-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte and Bram in their matching camel and navy outfits reflected in the Glacier Express window, with river scenery and soft glare doubled in the glass.',
          caption: 'Two reflections in the panoramic glass',
        },
        {
          src: '/storyline/338-lotte-bram-glacier-express-st-moritz-arrival-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf arriving beside the Glacier Express in St. Moritz, with a passer-by blurred in the foreground.',
          caption: 'The train at the end of the imagined line',
        },
        {
          src: '/storyline/339-lotte-bram-zermatt-bahnhofstrasse-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf exploring Zermatt’s shop-lined Bahnhofstrasse, with the Matterhorn between rooftops and a passer-by blurred at the edge.',
          caption: 'A shop-window detour on Bahnhofstrasse',
        },
        {
          src: '/storyline/340-lotte-bram-zermatt-woodshop-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte in the same camel coat and burgundy scarf and Bram in the same navy quilted jacket and olive scarf chatting with an older local woodcarver outside his Zermatt shop, holding a tiny carved chalet.',
          caption: 'A carved chalet from the wood shop',
        },
        {
          src: '/storyline/341-lotte-bram-zermatt-bakery-owner-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf beside a friendly adult Zermatt bakery owner at the doorway, with paper bags and a softly cropped edge; the phone is not visible.',
          caption: 'A quick bakery-door selfie with a local',
        },
        {
          src: '/storyline/342-lotte-bram-zermatt-shop-chocolate-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte’s camel coat and cream-knit sleeve and Bram’s navy quilted cuff beside their wedding-ringed hands choosing Swiss chocolates and a small carved Matterhorn at a shop counter, with a crinkled paper bag and shallow focus.',
          caption: 'Chocolate, rings and a tiny Matterhorn',
        },
        {
          src: '/storyline/343-lotte-bram-zermatt-friends-group-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile group selfie of fictional Lotte in the same camel coat and burgundy scarf and Bram in the same navy quilted jacket and olive scarf leaning in with two adult friends they met on the Glacier Express beneath a Zermatt café awning; the phone is not visible.',
          caption: 'Four smiles beneath the café awning',
        },
        {
          src: '/storyline/344-lotte-bram-zermatt-village-friends-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf walking with one adult train friend between Zermatt’s wooden shops, with the Matterhorn above the rooftops and a passer-by in motion blur.',
          caption: 'Another block through the old village',
        },
        {
          src: '/storyline/345-lotte-bram-zermatt-local-shopkeeper-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf laughing with a friendly adult local shopkeeper at a Zermatt cheese counter, with window glare and an imperfectly cropped edge.',
          caption: 'A cheese-counter recommendation',
        },
        {
          src: '/storyline/346-lotte-bram-zermatt-postcard-shop-candid.jpg',
          alt: 'AI-generated, slightly tilted candid mobile snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf browsing Matterhorn postcards in a small Zermatt shop, with their friends softly blurred in the doorway and one card partly blocking the frame.',
          caption: 'Postcards before the next train',
        },
        {
          src: '/storyline/347-lotte-bram-zermatt-evening-romantic-selfie.jpg',
          alt: 'AI-generated, slightly tilted low-light mobile selfie of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf touching foreheads beside a warmly lit Zermatt chalet shop window, with streetlamp flare and windblown hair; the phone is not visible.',
          caption: 'One last close selfie at dusk',
        },
        {
          src: '/storyline/348-lotte-bram-zermatt-cafe-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte’s camel coat and cream-knit sleeve and Bram’s navy quilted cuff beside their wedding-ringed hands sharing a pastry and hot chocolate at an outdoor Zermatt café table, with crumbs and a folded local map in soft focus.',
          caption: 'Hot chocolate, one pastry, two hands',
        },
        {
          src: '/storyline/349-lotte-bram-zermatt-hinterdorf-lane-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf exploring Zermatt’s old Hinterdorf lane with a train friend, with a craft-shop window, the Matterhorn and a passerby softly blurred.',
          caption: 'A slower turn through Hinterdorf',
        },
        {
          src: '/storyline/350-lotte-bram-zermatt-craft-stall-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte’s camel coat and cream-knit sleeve and Bram’s navy quilted cuff beside wedding-ringed hands choosing tiny wooden bells and a felted Matterhorn ornament at a Zermatt craft stall, with a paper bag and shallow focus.',
          caption: 'Little wooden bells from a village stall',
        },
        {
          src: '/storyline/351-lotte-bram-zermatt-florist-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf leaning in beside a friendly adult local florist at a Zermatt flower shop, with alpine flowers, window glare and a cropped shoulder; the phone is not visible.',
          caption: 'A flower-shop selfie with a local',
        },
        {
          src: '/storyline/352-lotte-bram-zermatt-market-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf browsing a Zermatt market stall with a local vendor and two adult train friends, with honey jars, timber shops and a softly blurred passerby.',
          caption: 'A market stop with their train friends',
        },
        {
          src: '/storyline/353-lotte-bram-zermatt-friends-bookshop-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile group selfie of fictional Lotte in the same camel coat and burgundy scarf and Bram in the same navy quilted jacket and olive scarf with two adult train friends and a local bookshop owner outside a Zermatt map shop, tightly cropped with soft edge blur; the phone is not visible.',
          caption: 'A bookshop selfie before they part',
        },
        {
          src: '/storyline/354-lotte-bram-zermatt-post-office-candid.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf browsing postcards in a small Zermatt gift-and-post shop, with a local shopkeeper, reflected friends, window glare and an awkward crop.',
          caption: 'One last postcard for the invitation',
        },
        {
          src: '/storyline/355-lotte-bram-zermatt-riverside-romantic-selfie.jpg',
          alt: 'AI-generated, slightly tilted low-light mobile selfie of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf touching foreheads on a wooden footbridge over the Vispa in Zermatt, with shop lights and a hazy corner; the phone is not visible.',
          caption: 'A quiet moment above the Vispa',
        },
        {
          src: '/storyline/356-lotte-bram-zermatt-tea-shop-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte’s camel coat and cream-knit sleeve and Bram’s navy quilted cuff beside their wedding-ringed hands sampling alpine tea at a small Zermatt shop counter, with dried herbs, a folded map and soft phone focus.',
          caption: 'A warm tea sample after the walk',
        },
        {
          src: '/storyline/357-lotte-bram-zermatt-mountain-shop-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf looking over a walking map with a friendly adult local at a Zermatt mountain-gear shop, with soft edge blur and mixed window light.',
          caption: 'A local points them toward the next trail',
        },
        {
          src: '/storyline/358-lotte-bram-zermatt-friends-shopfront-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in her camel coat and burgundy scarf and Bram in his navy quilted jacket and olive scarf saying goodbye to two adult train friends and a local florist outside a Zermatt shop, with motion blur, window glare and a foreground shoulder.',
          caption: 'One more hello before the next train',
        },
        {
          src: '/storyline/359-lotte-matterhorn-snow-trail-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte alone on a snowy Matterhorn trail near Zermatt, wearing her rust-red parka, cream wool scarf, charcoal beanie, black snow trousers and tan boots, with the peak behind her and a softly blurred edge.',
          caption: 'A quiet turn toward the Matterhorn',
        },
        {
          src: '/storyline/360-lotte-matterhorn-frost-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte alone, showing the rust-red parka cuff, cream scarf edge and charcoal glove holding a tiny snowflake over powder, with the snowy Matterhorn slope out of focus.',
          caption: 'A snowflake on her glove',
        },
        {
          src: '/storyline/361-lotte-matterhorn-snow-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte alone beside a snow-laden larch, her auburn hair, freckles, rust-red parka, cream wool scarf and charcoal beanie visible against the snowy Matterhorn; the crop is slightly imperfect.',
          caption: 'Snow caught in her auburn hair',
        },
        {
          src: '/storyline/362-lotte-matterhorn-solo-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte alone in her rust-red parka, cream wool scarf and charcoal beanie with the snowy Matterhorn behind her, windblown hair and bright snow glare; the phone is not visible.',
          caption: 'A solo selfie beneath the snowy peak',
        },
        {
          src: '/storyline/363-lotte-matterhorn-glacier-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte alone crossing a broad snowfield in her rust-red parka, cream wool scarf, charcoal beanie, black snow trousers and tan boots, with the Matterhorn towering behind and a boot partly cropped.',
          caption: 'One small figure in a wide white landscape',
        },
        {
          src: '/storyline/364-lotte-matterhorn-bootprints-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte alone, her charcoal glove and rust-red parka sleeve above tan boot prints fading into clean snow, with a cream scarf edge and the Matterhorn foothills blurred beyond.',
          caption: 'Her boot prints across fresh powder',
        },
        {
          src: '/storyline/365-lotte-matterhorn-snow-candid.jpg',
          alt: 'AI-generated, slightly tilted candid mobile snapshot of fictional Lotte alone brushing snow from her rust-red parka beside an empty Matterhorn trail, wearing a cream wool scarf and charcoal beanie, with falling-snow blur and an awkwardly cropped edge.',
          caption: 'A pause to brush the snow away',
        },
        {
          src: '/storyline/366-lotte-matterhorn-snowfall-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte alone in her rust-red parka, cream wool scarf and charcoal beanie during soft snowfall, with the snowy Matterhorn behind her, a tiny snow fleck near the lens and phone grain; the phone is not visible.',
          caption: 'A second selfie as the snow starts',
        },
        {
          src: '/storyline/367-lotte-matterhorn-snow-hut-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte alone beside an empty snow-covered wooden mountain shelter below the Matterhorn, wearing the same rust-red parka, cream wool scarf, charcoal beanie and black snow trousers, with soft edge blur.',
          caption: 'The trail shelter before the climb back',
        },
        {
          src: '/storyline/368-lotte-matterhorn-sunset-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte alone in her rust-red parka, cream wool scarf, charcoal beanie, black snow trousers and tan boots on a snowy Matterhorn overlook at pink dusk, with a little edge blur and uneven snow exposure.',
          caption: 'The last light on the snowy Matterhorn',
        },
        {
          src: '/storyline/369-lotte-bram-switzerland-hotel-night-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte and Bram in the same ivory cotton pajamas with burgundy piping and midnight-navy pajamas with slate piping, sitting close together in their Swiss hotel room at night, with a warm bedside lamp and soft low-light grain.',
          caption: 'A quiet laugh after the snowy day',
        },
        {
          src: '/storyline/370-lotte-bram-hotel-wedding-rings-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s linked wedding-ringed hands, her ivory pajama cuff with burgundy piping and his midnight-navy pajama cuff with slate piping, beside cocoa cups and a brass hotel key under warm lamplight.',
          caption: 'Two rings beside the room key',
        },
        {
          src: '/storyline/371-lotte-bram-hotel-night-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte in her ivory cotton pajamas with burgundy piping and Bram in his midnight-navy cotton pajamas with slate piping, leaning forehead-to-forehead by the Swiss hotel window at night, with a softly blurred snowy view.',
          caption: 'Foreheads together in the lamplight',
        },
        {
          src: '/storyline/372-lotte-bram-hotel-window-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in ivory pajamas with burgundy piping and Bram in midnight-navy pajamas with slate piping, cheek-to-cheek beside their Swiss hotel window at night, with gentle grain and window glare; the phone is not visible.',
          caption: 'A sleepy window-side selfie',
        },
        {
          src: '/storyline/373-lotte-bram-hotel-cocoa-candid.jpg',
          alt: 'AI-generated, slightly tilted candid mobile snapshot of fictional Lotte in her ivory cotton pajamas with burgundy piping and Bram in his midnight-navy cotton pajamas with slate piping, sharing cocoa on the bed in their Swiss hotel room at night, with a folded map and slight motion blur.',
          caption: 'Cocoa and a map before sleep',
        },
        {
          src: '/storyline/374-lotte-bram-hotel-nightstand-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s linked hands and wedding bands, her ivory pajama sleeve with burgundy piping beside his midnight-navy pajama cuff with slate piping, two tea cups and a folded postcard on the hotel nightstand at night.',
          caption: 'A postcard left beside the cups',
        },
        {
          src: '/storyline/375-lotte-bram-hotel-lamp-candid-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Bram gently tucking Lotte’s auburn hair behind her ear; she wears ivory cotton pajamas with burgundy piping and he wears midnight-navy pajamas with slate piping in their Swiss hotel room at night, with a lamp flare and soft focus.',
          caption: 'A small, unplanned gesture',
        },
        {
          src: '/storyline/376-lotte-bram-hotel-duvet-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in ivory pajamas with burgundy piping and Bram in midnight-navy pajamas with slate piping, sitting close against the headboard beneath a quilt in their Swiss hotel room at night, with grain and an imperfect crop; the phone is not visible.',
          caption: 'One last selfie before the lights go out',
        },
        {
          src: '/storyline/377-lotte-bram-hotel-rug-romantic-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in the same ivory cotton pajama set with burgundy piping and Bram in the same midnight-navy set with slate piping, leaning together after a quiet hotel-room dance at night, with low-light grain and soft motion blur; the phone is not visible.',
          caption: 'A slow dance and a close selfie',
        },
        {
          src: '/storyline/378-lotte-bram-hotel-night-window-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in ivory cotton pajamas with burgundy piping and Bram in midnight-navy pajamas with slate piping, standing hand-in-hand by a dark snowy Swiss hotel window at night, with a bedside lamp slightly overexposed.',
          caption: 'The mountain night outside their window',
        },
        {
          src: '/storyline/379-lotte-bram-hotel-night-postcard-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in ivory cotton pajamas with burgundy piping and Bram in midnight-navy pajamas with slate piping, sitting close on the rug to read a postcard in their Swiss hotel room at night, with a dark snowy window and warm lamp grain.',
          caption: 'A postcard read twice before sleep',
        },
        {
          src: '/storyline/380-lotte-bram-hotel-blue-train-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s wedding-ringed hands, her ivory pajama cuff with burgundy piping and his midnight-navy cuff with slate piping, resting beside their little blue train doodle, cocoa cups and hotel key at night.',
          caption: 'The little blue train between two cups',
        },
        {
          src: '/storyline/381-lotte-bram-hotel-lamplight-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte in the same ivory pajamas with burgundy piping and Bram in the same midnight-navy pajamas with slate piping, leaning shoulder-to-shoulder over their wedding invitation in the Swiss hotel at night, with soft focus and lamp glow.',
          caption: 'The invitation in the lamplight',
        },
        {
          src: '/storyline/382-lotte-bram-hotel-postcard-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in ivory pajamas with burgundy piping and Bram in midnight-navy pajamas with slate piping, smiling together with a postcard by the Swiss hotel window at night, with mild reflection glare; the phone is not visible.',
          caption: 'A postcard selfie from the window',
        },
        {
          src: '/storyline/383-lotte-bram-hotel-cocoa-candid.jpg',
          alt: 'AI-generated, slightly tilted candid mobile snapshot of fictional Lotte in ivory cotton pajamas with burgundy piping and Bram in midnight-navy cotton pajamas with slate piping, sharing cocoa and a folded map on the hotel bed at night, with gentle motion blur.',
          caption: 'One last map check over cocoa',
        },
        {
          src: '/storyline/384-lotte-bram-hotel-pajama-sleeves-macro.jpg',
          alt: 'AI-generated, slightly tilted mobile-camera macro of fictional Lotte and Bram’s linked hands, ivory pajama sleeve with burgundy piping beside midnight-navy cuff with slate piping, over a folded invitation and tiny blue train doodle with tea cups cooling nearby at night.',
          caption: 'The doodle that started the journey',
        },
        {
          src: '/storyline/385-lotte-bram-hotel-forehead-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in ivory cotton pajamas with burgundy piping and Bram in midnight-navy pajamas with slate piping as he kisses her forehead in their Swiss hotel room at night, with lamp flare and soft grain; the phone is not visible.',
          caption: 'A forehead kiss caught between laughs',
        },
        {
          src: '/storyline/386-lotte-bram-hotel-night-bedside-portrait.jpg',
          alt: 'AI-generated, slightly tilted mobile portrait of fictional Lotte in the same ivory cotton pajamas with burgundy piping and Bram in the same midnight-navy cotton pajamas with slate piping, seated together beneath a quilt in the Swiss hotel room at night, with imperfect headroom and low-light grain.',
          caption: 'A quiet goodnight in the room',
        },
        {
          src: '/storyline/387-lotte-bram-hotel-late-night-selfie.jpg',
          alt: 'AI-generated, slightly tilted mobile selfie of fictional Lotte in ivory pajamas with burgundy piping and Bram in midnight-navy pajamas with slate piping, sitting close on the hotel-room floor after a private joke at night, with soft motion blur and a cropped edge; the phone is not visible.',
          caption: 'One more sleepy laugh together',
        },
        {
          src: '/storyline/388-lotte-bram-hotel-alpine-window-wide.jpg',
          alt: 'AI-generated, slightly tilted mobile wide-angle snapshot of fictional Lotte in ivory cotton pajamas with burgundy piping and Bram in midnight-navy cotton pajamas with slate piping, standing hand-in-hand at their Swiss hotel window at night, with snowy mountains, lamp glare and an imperfect crop.',
          caption: 'A final look at the snowy mountains',
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
        'The quietest part of the imagined visit is the end of the day: a small hotel room above the rooftops, the Eiffel Tower blinking in the window, tea going cold on the desk and the camera turned on herself the way anyone would after a long first day somewhere. Those imperfect evening frames were the ones she kept looking at.',
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
          src: '/storyline/198-ananya-paris-wide-notredame.jpg',
          alt: 'AI-generated wide-angle snapshot of fictional Ananya on the Seine quay beside Notre-Dame cathedral in Paris.',
          caption: 'The cathedral from the river walk',
        },
        {
          src: '/storyline/200-ananya-paris-selfie-montmartre.jpg',
          alt: 'AI-generated mobile selfie of fictional Ananya on a Montmartre street with Sacré-Cœur behind her; the phone is not visible.',
          caption: 'A quiet selfie under the dome',
        },
        {
          src: '/storyline/201-ananya-paris-selfie-local-cafe.jpg',
          alt: 'AI-generated mobile selfie of fictional Ananya with a Parisian café waiter on a pavement terrace; the phone is not visible.',
          caption: 'A smile shared with the waiter',
        },
        {
          src: '/storyline/202-ananya-paris-portrait-bridge.jpg',
          alt: 'AI-generated evening portrait of fictional Ananya in a navy coat on Pont Alexandre III in Paris.',
          caption: 'Lamp-light on the gold bridge',
        },
        {
          src: '/storyline/203-ananya-paris-wide-gardens.jpg',
          alt: 'AI-generated wide-angle snapshot of fictional Ananya reading in a mustard kurta on a chair in the Luxembourg Gardens.',
          caption: 'A book and an unhurried park hour',
        },
        {
          src: '/storyline/205-ananya-paris-selfie-local-market.jpg',
          alt: 'AI-generated mobile selfie of fictional Ananya with a Parisian market vendor and a paper cone of strawberries; the phone is not visible.',
          caption: 'Strawberries from a local stall',
        },
        {
          src: '/storyline/207-ananya-paris-winter-selfie-tilted-street.jpg',
          alt: 'Tilted amateur mobile selfie of fictional Ananya in a camel winter coat, beanie and red scarf on a wet Paris street; the phone is not visible.',
          caption: 'A crooked snap on a wet street',
        },
        {
          src: '/storyline/208-ananya-paris-winter-selfie-local-bookseller.jpg',
          alt: 'Tilted amateur mobile selfie of fictional Ananya in a black winter puffer jacket with a Parisian bookseller; the phone is not visible.',
          caption: 'Squeezed in a bookshop doorway',
        },
        {
          src: '/storyline/209-ananya-paris-winter-selfie-tilted-nightlights.jpg',
          alt: 'Tilted night-time mobile selfie of fictional Ananya in a navy winter coat and beanie under Paris market lights; the phone is not visible.',
          caption: 'Streetlamp grain and Christmas lights',
        },
        {
          src: '/storyline/210-ananya-paris-winter-selfie-local-baker.jpg',
          alt: 'Amateur mobile selfie of fictional Ananya in an olive winter parka with a Parisian baker and a bag of bread; the phone is not visible.',
          caption: 'Warm bread, fogged bakery glass',
        },
        {
          src: '/storyline/211-ananya-paris-winter-selfie-metro.jpg',
          alt: 'Tilted amateur mobile selfie of fictional Ananya in a black winter coat on the Paris Métro, glasses catching the lights; the phone is not visible.',
          caption: 'A tired smile between stations',
        },
        {
          src: '/storyline/212-ananya-paris-winter-selfie-local-florist.jpg',
          alt: 'Amateur mobile selfie of fictional Ananya in a cream winter coat with a Parisian florist and winter flowers; the phone is not visible.',
          caption: 'Seasonal flowers, a shared grin',
        },
        {
          src: '/storyline/213-ananya-paris-winter-selfie-tilted-close.jpg',
          alt: 'Very close tilted amateur mobile selfie of fictional Ananya in a charcoal turtleneck and camel winter coat; the phone is not visible.',
          caption: 'Too close, and a little crooked',
        },
        {
          src: '/storyline/214-ananya-paris-winter-selfie-tilted-tower.jpg',
          alt: 'Tilted walking mobile selfie of fictional Ananya in a black winter coat with the Eiffel Tower off-centre behind her; the phone is not visible.',
          caption: 'Caught mid-word in the wind',
        },
        {
          src: '/storyline/215-ananya-paris-winter-selfie-local-barista.jpg',
          alt: 'Tilted amateur mobile selfie of fictional Ananya in a camel winter coat laughing with a Parisian barista; the phone is not visible.',
          caption: 'A laugh over the espresso machine',
        },
        {
          src: '/storyline/216-ananya-paris-winter-selfie-tilted-seine.jpg',
          alt: 'Tilted amateur mobile selfie of fictional Ananya in an oatmeal winter coat by the Seine, hair across her face; the phone is not visible.',
          caption: 'Wind in her eyes beside the river',
        },
        {
          src: '/storyline/217-ananya-france-winter-selfie-louvre-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local art student at the Louvre Pyramid in Paris; the phone is not visible.',
          caption: 'A crooked snap at the pyramid',
        },
        {
          src: '/storyline/218-ananya-france-winter-selfie-arc-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a Parisian local at the Arc de Triomphe; the phone is not visible.',
          caption: 'Traffic and the arch, slightly off',
        },
        {
          src: '/storyline/219-ananya-france-winter-selfie-eiffel-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya laughing with a local on Champ de Mars, Eiffel Tower behind; the phone is not visible.',
          caption: 'A windy laugh under the tower',
        },
        {
          src: '/storyline/220-ananya-france-winter-selfie-notredame-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local skipper beside Notre-Dame; the phone is not visible.',
          caption: 'The cathedral from a river selfie',
        },
        {
          src: '/storyline/221-ananya-france-winter-selfie-sacrecoeur-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local street musician on the Sacré-Cœur steps; the phone is not visible.',
          caption: 'Accordion on the basilica steps',
        },
        {
          src: '/storyline/222-ananya-france-winter-selfie-versailles-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local palace guide at the gold gates of Versailles; the phone is not visible.',
          caption: 'Gold gates, a borrowed lanyard smile',
        },
        {
          src: '/storyline/223-ananya-france-winter-selfie-montstmichel-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local innkeeper in front of Mont Saint-Michel; the phone is not visible.',
          caption: 'Wind and the mount on the tide',
        },
        {
          src: '/storyline/224-ananya-france-winter-selfie-nice-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a Nice local on the Promenade des Anglais; the phone is not visible.',
          caption: 'A winter walk beside the pebbles',
        },
        {
          src: '/storyline/225-ananya-france-winter-selfie-strasbourg-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local market vendor and chestnuts at Strasbourg Cathedral; the phone is not visible.',
          caption: 'Chestnuts under the cathedral lights',
        },
        {
          src: '/storyline/226-ananya-france-winter-selfie-moulinrouge-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local outside the Moulin Rouge at night; the phone is not visible.',
          caption: 'Red neon, a late Pigalle snap',
        },
        {
          src: '/storyline/227-ananya-paris-winter-selfie-metro-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local commuter inside a Paris Métro car; the phone is not visible.',
          caption: 'Green lights between stations',
        },
        {
          src: '/storyline/228-ananya-paris-winter-selfie-busstation-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local at a rainy Paris bus station; the phone is not visible.',
          caption: 'A wet stop for the number 15',
        },
        {
          src: '/storyline/229-ananya-paris-winter-selfie-cafe-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local waiter at a Paris café; the phone is not visible.',
          caption: 'Espresso steam and a borrowed smile',
        },
        {
          src: '/storyline/230-ananya-paris-winter-selfie-trainstation-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local at Gare du Nord train station; the phone is not visible.',
          caption: 'Departure boards and a suitcase',
        },
        {
          src: '/storyline/232-ananya-paris-winter-selfie-church-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local in front of a Paris church, Église de la Madeleine; the phone is not visible.',
          caption: 'Columns and a parish volunteer',
        },
        {
          src: '/storyline/233-ananya-paris-winter-selfie-metroplatform-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local student on a Paris Métro platform; the phone is not visible.',
          caption: 'A train blur on the tiles',
        },
        {
          src: '/storyline/234-ananya-paris-winter-selfie-garedelyon-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local baker at Gare de Lyon train station; the phone is not visible.',
          caption: 'Clock tower and baguettes',
        },
        {
          src: '/storyline/235-ananya-paris-winter-selfie-cafeterrace-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local regular on a Paris café terrace; the phone is not visible.',
          caption: 'Heat lamp, two small coffees',
        },
        {
          src: '/storyline/236-ananya-paris-winter-selfie-saintsulpice-local.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a local in front of Saint-Sulpice church in Paris; the phone is not visible.',
          caption: 'Twin towers on a wet plaza',
        },
        {
          src: '/storyline/237-ananya-paris-nightflash-metro-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local commuter inside a Paris Métro car.',
          caption: 'Flash on the carriage floor',
        },
        {
          src: '/storyline/238-ananya-paris-nightflash-busstation-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in winter clothes with a local at a Paris bus station.',
          caption: 'Wet asphalt and a night bus',
        },
        {
          src: '/storyline/239-ananya-paris-nightflash-cafe-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local waiter at a Paris café.',
          caption: 'Flash by the espresso machine',
        },
        {
          src: '/storyline/240-ananya-paris-nightflash-trainstation-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in winter clothes with a local at Gare du Nord train station.',
          caption: 'A suitcase under the night roof',
        },
        {
          src: '/storyline/242-ananya-paris-nightflash-church-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local in front of a Paris church, Église de la Madeleine.',
          caption: 'Steps, columns, a hard flash',
        },
        {
          src: '/storyline/243-ananya-paris-nightflash-metroplatform-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in winter clothes with a local student on a Paris Métro platform.',
          caption: 'Yellow line, a night train',
        },
        {
          src: '/storyline/244-ananya-paris-nightflash-garedelyon-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local baker at Gare de Lyon train station.',
          caption: 'Clock tower after dark',
        },
        {
          src: '/storyline/245-ananya-paris-nightflash-cafeterrace-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in winter clothes with a local regular on a Paris café terrace.',
          caption: 'Heat lamp and a night table',
        },
        {
          src: '/storyline/246-ananya-paris-nightflash-saintsulpice-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local in front of Saint-Sulpice church in Paris.',
          caption: 'Wet plaza, two dark towers',
        },
        {
          src: '/storyline/247-ananya-paris-nightflash-metro-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local commuter inside a Paris Métro car.',
          caption: 'Green tubes, a wet carriage floor',
        },
        {
          src: '/storyline/249-ananya-paris-nightflash-cafe-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local waiter at a Paris café.',
          caption: 'Flash on the zinc bar',
        },
        {
          src: '/storyline/250-ananya-paris-nightflash-trainstation-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in winter clothes with a local at a Paris train station.',
          caption: 'Departure boards after dark',
        },
        {
          src: '/storyline/251-ananya-paris-nightflash-eiffel-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter puffer with a local in front of the Eiffel Tower.',
          caption: 'Puddles under the lit tower',
        },
        {
          src: '/storyline/252-ananya-paris-nightflash-church-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local in front of a Paris church, Saint-Eustache.',
          caption: 'Wet cobbles, a parish smile',
        },
        {
          src: '/storyline/253-ananya-paris-nightflash-metroplatform-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in winter clothes with a local student on a Paris Métro platform.',
          caption: 'Yellow line, an incoming train',
        },
        {
          src: '/storyline/254-ananya-paris-nightflash-garedelyon-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local baker at Gare de Lyon train station.',
          caption: 'Clock tower and baguettes',
        },
        {
          src: '/storyline/255-ananya-paris-nightflash-cafeterrace-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in winter clothes with a local regular on a Paris café terrace.',
          caption: 'Heat lamp, two winter coats',
        },
        {
          src: '/storyline/256-ananya-paris-nightflash-saintsulpice-full.jpg',
          alt: 'Tilted full-figure night flash mobile photo of fictional Ananya in a winter coat with a local in front of Saint-Sulpice church in Paris.',
          caption: 'Fountain spray, two dark towers',
        },
        {
          src: '/storyline/258-ananya-cdg-morning-checkin-full.jpg',
          alt: 'Tilted full-figure early-morning mobile photo of fictional Ananya in winter clothes with a local check-in agent at CDG Airport in Paris, holding a red Delsey Paris cabin trolley.',
          caption: 'Air France desks before the rush',
        },
        {
          src: '/storyline/266-ananya-cdg-morning-rerb-full.jpg',
          alt: 'Tilted full-figure early-morning mobile photo of fictional Ananya in a winter coat with a local commuter on the RER B platform at CDG Airport, holding a red Delsey Paris cabin trolley.',
          caption: 'A blue train into the city',
        },
        {
          src: '/storyline/268-ananya-af-biz-selfie-attendant.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a flight attendant and other passengers in an Air France business class cabin; the phone is not visible.',
          caption: 'A red scarf in the aisle',
        },
        {
          src: '/storyline/273-ananya-af-biz-selfie-blanket.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya under a blanket with other passengers in an Air France business class cabin; the phone is not visible.',
          caption: 'Grey wool after the lights dim',
        },
        {
          src: '/storyline/274-ananya-af-biz-selfie-aisle.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya with a passenger in the aisle of an Air France business class cabin; the phone is not visible.',
          caption: 'Overhead bins and a puffer',
        },
        {
          src: '/storyline/275-ananya-af-biz-selfie-laugh.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya laughing with another passenger in an Air France business class cabin; the phone is not visible.',
          caption: 'A borrowed laugh at cruise',
        },
        {
          src: '/storyline/276-ananya-af-biz-selfie-close.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya close to camera with other passengers in an Air France business class cabin; the phone is not visible.',
          caption: 'IFE glow on a winter scarf',
        },
        {
          src: '/storyline/279-ananya-paris-hotel-selfie-side-bed-tower.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in her dove-grey sleepwear lying on her side across the hotel bed in Paris, the lit Eiffel Tower visible through the window past the duvet; the phone is not visible.',
          caption: 'Lying down with the city still awake',
        },
        {
          src: '/storyline/280-ananya-paris-hotel-selfie-far-side-lamp.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in her dove-grey sleepwear on the far side of the bed beside a glowing hotel lamp in her Paris room, the window out of frame behind her; the phone is not visible.',
          caption: 'A lamp, a suitcase, a slower hour',
        },
        {
          src: '/storyline/281-ananya-paris-hotel-selfie-lying-pillows.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in her dove-grey sleepwear lying back among the pillows of her Paris hotel bed at an unflattering angle, hair fanned across the pillow; the phone is not visible.',
          caption: 'Bed hair and a hotel ceiling',
        },
        {
          src: '/storyline/282-ananya-paris-hotel-selfie-mirror.jpg',
          alt: 'Tilted amateur late-evening mobile mirror selfie of fictional Ananya in her dove-grey sleepwear standing barefoot in the wardrobe mirror of her Paris hotel room, cardigan on the chair behind her; the phone is not visible.',
          caption: 'The mirror in a rented room',
        },
        {
          src: '/storyline/283-ananya-paris-hotel-selfie-close-lamp.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in her dove-grey sleepwear sitting too close to the hotel lamp in her Paris room, chin and cheek softly out of focus; the phone is not visible.',
          caption: 'Too close to the lamp',
        },
        {
          src: '/storyline/284-ananya-paris-hotel-selfie-bathroom-doorway.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in her dove-grey sleepwear leaning on the bathroom doorway of her Paris hotel room, a folded towel behind her shoulder; the phone is not visible.',
          caption: 'Steam, towels and a tired smile',
        },
        {
          src: '/storyline/285-ananya-paris-hotel-selfie-desk-suitcase.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in her dove-grey sleepwear at the writing desk of her Paris hotel room, a paper cup of tea, her passport and an open suitcase nearby; the phone is not visible.',
          caption: 'Tea, passport, tomorrow’s plan',
        },
        {
          src: '/storyline/286-ananya-paris-hotel-selfie-floor-tower.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in her dove-grey sleepwear sitting on the floor against the hotel bed in Paris, the lit Eiffel Tower in the window above her; the phone is not visible.',
          caption: 'One last look before sleep',
        },
        {
          src: '/storyline/287-ananya-paris-hotel-towel-selfie-tilted-mirror.jpg',
          alt: 'Tilted amateur late-evening handheld mobile selfie of fictional Ananya in a white hotel towel with her wet hair twisted in a second towel, standing in the steam of her Paris hotel bathroom after her bath, water running down the shower glass; the phone is not visible.',
          caption: 'Steam on the mirror after the water',
        },
        {
          src: '/storyline/288-ananya-paris-hotel-towel-selfie-wet-hair-close.jpg',
          alt: 'Very close amateur late-evening mobile selfie of fictional Ananya wrapped in a white hotel towel after her shower, wet hair across her cheek and flash glare on her face at the Paris bathroom mirror; the phone is not visible.',
          caption: 'Too close, and still smiling',
        },
        {
          src: '/storyline/289-ananya-paris-hotel-towel-selfie-bathroom-doorway-tilted.jpg',
          alt: 'Tilted amateur late-evening mobile selfie of fictional Ananya in a white hotel towel after her bath, leaning on the bathroom doorway of her Paris hotel room with wet hair and bare damp shoulders, suitcase and bed lamp behind her; the phone is not visible.',
          caption: 'A crooked frame in the doorway',
        },
        {
          src: '/storyline/290-ananya-paris-hotel-towel-selfie-shower-stall-steam.jpg',
          alt: 'Amateur late-evening mobile selfie of fictional Ananya in a white hotel towel with a towel twisted on her wet hair inside the steamy shower cubicle of her Paris hotel bathroom after her bath; the phone is not visible.',
          caption: 'One more minute under the water',
        },
        {
          src: '/storyline/297-ananya-eiffel-winter-selfie-tilted-esplanade.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya in her black quilted puffer coat, cream beanie and maroon scarf on the Trocadéro esplanade with the lit Eiffel Tower behind her; the phone is not visible.',
          caption: 'A crooked frame with the tower behind her',
        },
        {
          src: '/storyline/298-ananya-eiffel-winter-selfie-under-tower-wide.jpg',
          alt: 'Wide tilted winter mobile selfie of fictional Ananya in the same black puffer coat and cream beanie directly under the lit Eiffel Tower at night, looking up past the camera; the phone is not visible.',
          caption: 'Standing right under the ironwork',
        },
        {
          src: '/storyline/299-ananya-eiffel-winter-glass-lift-climbing.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya in the same black puffer coat inside the glass Eiffel Tower lift climbing from the esplanade towards the second floor, Paris lights sliding away through the smudged glass; the phone is not visible.',
          caption: 'The glass lift going up',
        },
        {
          src: '/storyline/300-ananya-eiffel-winter-glass-lift-reflection.jpg',
          alt: 'Sloppy tilted winter mobile selfie of fictional Ananya in the same black puffer coat and maroon scarf doubled in the glass of the Eiffel Tower lift, the city lights far below; the phone is not visible.',
          caption: 'Half her, half the reflection',
        },
        {
          src: '/storyline/301-ananya-eiffel-winter-madame-brasserie-dinner-table.jpg',
          alt: 'Crooked low-light winter mobile photo of fictional Ananya at a table in the Madame Brasserie restaurant inside the Eiffel Tower, cream turtleneck under her black puffer coat with red wine and the lit ironwork behind her; the phone is not visible.',
          caption: 'Dinner above the city',
        },
        {
          src: '/storyline/302-ananya-eiffel-winter-madame-brasserie-toast-selfie.jpg',
          alt: 'Very close tilted winter mobile selfie of fictional Ananya at dinner in Madame Brasserie, cream turtleneck under the black puffer coat and a glass of red wine raised, the lit tower at the window behind her; the phone is not visible.',
          caption: 'A glass raised to the view',
        },
        {
          src: '/storyline/303-ananya-eiffel-winter-madame-brasserie-dessert-window.jpg',
          alt: 'Dark amateur winter mobile photo of fictional Ananya at her Madame Brasserie table in the same cream turtleneck, looking off towards the lit ironwork through the restaurant window with dessert and coffee on the table; the phone is not visible.',
          caption: 'Coffee, dessert, the lit ironwork',
        },
        {
          src: '/storyline/304-ananya-eiffel-winter-second-floor-view-selfie.jpg',
          alt: 'Tilted amateur winter mobile selfie of fictional Ananya in the same black puffer coat and cream beanie on the second-floor viewing deck of the Eiffel Tower at night, wind-blown and flushed above the lit city; the phone is not visible.',
          caption: 'The view from the second floor',
        },
        {
          src: '/storyline/307-ananya-paris-hotel-bathrobe-sink-face-cream.jpg',
          alt: 'Amateur late-evening mobile photo of fictional Ananya in a fluffy white hotel bathrobe with a towel on her wet hair, rubbing face cream into her cheek at the bathroom sink of her Paris hotel room; the phone is not visible.',
          caption: 'Cream, glass shelf, the last routine',
        },
        {
          src: '/storyline/308-ananya-paris-hotel-bathrobe-bed-tower-window.jpg',
          alt: 'Tilted amateur late-evening mobile photo of fictional Ananya in a fluffy white hotel bathrobe with a towel on her wet hair, laughing on the edge of the bed in her Paris hotel room with the lit Eiffel Tower in the window behind her; the phone is not visible.',
          caption: 'A bathrobe, a mug, the tower still lit',
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
          src: '/storyline/116-helen-james-parents-black-white-phone-candid.jpg',
          alt: 'AI-generated black-and-white candid mobile photo of fictional Helen and James laughing beside her parents at the wedding breakfast.',
          caption: 'Laughter at the family table',
        },
        {
          src: '/storyline/65-helen-london-wedding-portrait-low-angle.jpg',
          alt: 'AI-generated low-angle portrait of fictional bride Helen beneath the registry-office doorway, wearing her long-sleeved ivory dress.',
          caption: 'A low-angle view beneath the doorway',
        },
        {
          src: '/storyline/62-helen-london-wedding-portrait-wide-angle.jpg',
          alt: 'AI-generated wide-angle environmental portrait of fictional bride Helen alone on the London registry steps in her ivory wedding dress.',
          caption: 'A wide portrait on the registry steps',
        },
        {
          src: '/storyline/83-helen-james-wedding-mobile-macro-laughing-selfie.jpg',
          alt: 'AI-generated candid mobile portrait of fictional Helen laughing as James leans close to her for a wedding-day snapshot.',
          caption: 'A laugh caught at close range',
        },
        {
          src: '/storyline/20-helen-james-london-thames.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James walking beside the Thames in their wedding clothes, an imagined moment rather than a real photograph.',
          caption: 'A riverside walk imagined from their memories',
        },
        {
          src: '/storyline/57-helen-london-wedding-portrait-front.jpg',
          alt: 'AI-generated front-facing portrait of fictional bride Helen in her long-sleeved ivory wedding dress, holding her bouquet outside the London registry office.',
          caption: 'A front-facing portrait in the registry light',
        },
        {
          src: '/storyline/68-helen-london-wedding-mobile-macro-three-quarter.jpg',
          alt: 'AI-generated three-quarter smartphone portrait of fictional Helen turning back toward the camera in her long-sleeved ivory wedding dress.',
          caption: 'A three-quarter turn in the registry light',
        },
        {
          src: '/storyline/37-helen-james-london-confetti.jpg',
          alt: 'AI-generated companion illustration of fictional Helen and James sharing a confetti moment outside their London registry office.',
          caption: 'Confetti outside the registry steps',
        },
        {
          src: '/storyline/114-helen-james-black-white-registry-exit-wide.jpg',
          alt: 'AI-generated black-and-white wide mobile snapshot of fictional Helen and James leaving the registry office with her parents.',
          caption: 'The family leaves the registry together',
        },
        {
          src: '/storyline/51-helen-james-wedding-wide-thames.jpg',
          alt: 'AI-generated wide-angle companion illustration of fictional Helen and James walking beside the Thames in their original wedding outfits.',
          caption: 'A wider view of their riverside walk',
        },
        {
          src: '/storyline/110-helen-james-parents-wedding-breakfast-bw.jpg',
          alt: 'AI-generated black-and-white candid phone photo of fictional Helen and James raising a toast with Helen’s parents at their wedding breakfast.',
          caption: 'A monochrome toast with her parents',
        },
        {
          src: '/storyline/72-helen-london-wedding-mobile-macro-low-angle.jpg',
          alt: 'AI-generated low-angle smartphone portrait of fictional Helen in her ivory wedding dress, looking toward the London registry doorway.',
          caption: 'A low-angle look from the registry steps',
        },
        {
          src: '/storyline/52-helen-james-wedding-boutonniere.jpg',
          alt: 'AI-generated portrait-style companion illustration of fictional Helen straightening James’s white boutonniere during their wedding day.',
          caption: 'The little white boutonniere',
        },
        {
          src: '/storyline/103-helen-james-father-boutonniere-mobile-portrait.jpg',
          alt: 'AI-generated mobile portrait of fictional Helen and James as her father adjusts James’s white wedding boutonniere.',
          caption: 'A final touch before the family photo',
        },
        {
          src: '/storyline/113-helen-james-father-bw-mobile-wedding-moment.jpg',
          alt: 'AI-generated black-and-white smartphone portrait of fictional Helen’s father joining her hand with James’s before the ceremony.',
          caption: 'Her father’s gentle handover',
        },
        {
          src: '/storyline/56-helen-james-wedding-kiss-courtyard.jpg',
          alt: 'AI-generated romantic companion illustration of fictional Helen and James kissing in the registry garden in their wedding clothes.',
          caption: 'A kiss in the registry garden',
        },
        {
          src: '/storyline/50-helen-james-wedding-romantic-steps.jpg',
          alt: 'AI-generated romantic companion illustration of fictional Helen and James sharing a quiet moment on the registry-office steps after confetti.',
          caption: 'A quiet pause after the confetti',
        },
        {
          src: '/storyline/67-helen-london-wedding-mobile-macro-front.jpg',
          alt: 'AI-generated close smartphone portrait of fictional bride Helen in her ivory wedding dress, looking toward the camera with her white bouquet.',
          caption: 'A close, tilted look toward the camera',
        },
        {
          src: '/storyline/112-helen-james-black-white-mobile-close-portrait.jpg',
          alt: 'AI-generated black-and-white vertical mobile portrait of fictional Helen laughing with James beneath the registry-office doorway.',
          caption: 'A close portrait in the doorway',
        },
        {
          src: '/storyline/108-helen-mother-bride-black-white-phone-portrait.jpg',
          alt: 'AI-generated black-and-white smartphone portrait of fictional Helen sharing a quiet smile with her mother at the registry doorway.',
          caption: 'A whispered moment with her mother',
        },
        {
          src: '/storyline/109-helen-james-wedding-rings-bw-phone-macro.jpg',
          alt: 'AI-generated black-and-white mobile macro photo of fictional Helen and James’s wedding bands on their joined hands beside the bouquet.',
          caption: 'Their rings in a close phone-camera frame',
        },
        {
          src: '/storyline/93-helen-wedding-mobile-macro-mother-profile.jpg',
          alt: 'AI-generated close candid portrait of fictional Helen smiling beside her mother on the registry steps, wearing her ivory wedding dress.',
          caption: 'A portrait beside her mother',
        },
        {
          src: '/storyline/86-helen-james-wedding-mobile-macro-courtyard-embrace.jpg',
          alt: 'AI-generated intimate mobile portrait of fictional Helen with her eyes closed as James holds her in the registry courtyard.',
          caption: 'A quiet embrace after the ceremony',
        },
        {
          src: '/storyline/58-helen-london-wedding-portrait-three-quarter.jpg',
          alt: 'AI-generated three-quarter portrait of fictional bride Helen in her ivory wedding dress, turning toward the camera beside a London brick wall.',
          caption: 'A three-quarter turn toward the camera',
        },
        {
          src: '/storyline/54-helen-james-wedding-family-portrait.jpg',
          alt: 'AI-generated wide group companion illustration of fictional Helen and James with family outside the London registry office.',
          caption: 'The family picture, imagined in sharper focus',
        },
        {
          src: '/storyline/63-helen-london-wedding-portrait-soft-focus.jpg',
          alt: 'AI-generated soft-focus portrait of fictional bride Helen smiling down at her bouquet in the registry-office window light.',
          caption: 'A soft-focus pause with her bouquet',
        },
        {
          src: '/storyline/82-helen-james-wedding-mobile-macro-forehead-kiss.jpg',
          alt: 'AI-generated close portrait of fictional groom James kissing bride Helen on the forehead beside the London registry steps.',
          caption: 'A forehead kiss above the bouquet',
        },
        {
          src: '/storyline/104-helen-james-family-registry-wide-phone.jpg',
          alt: 'AI-generated wide-angle mobile snapshot of fictional Helen and James leaving the registry office arm in arm with her parents.',
          caption: 'Out through the registry doorway together',
        },
        {
          src: '/storyline/75-helen-london-wedding-mobile-macro-window.jpg',
          alt: 'AI-generated close mobile portrait of fictional Helen in her wedding dress, looking down beside the registry-office window.',
          caption: 'A close profile in soft window light',
        },
        {
          src: '/storyline/106-helen-james-parents-mobile-group-selfie.jpg',
          alt: 'AI-generated front-camera mobile selfie of fictional Helen and James with Helen’s parents just after their London registry wedding.',
          caption: 'The four of them in one quick selfie',
        },
        {
          src: '/storyline/73-helen-london-wedding-mobile-macro-laugh.jpg',
          alt: 'AI-generated candid close portrait of fictional bride Helen laughing on the registry steps in her ivory wedding dress.',
          caption: 'A laugh caught at a Dutch angle',
        },
        {
          src: '/storyline/97-helen-james-mobile-family-registry.jpg',
          alt: 'AI-generated wide-angle mobile snapshot of fictional British couple Helen and James with Helen’s parents outside their London registry office.',
          caption: 'A family snapshot outside the registry office',
        },
        {
          src: '/storyline/111-helen-james-registry-room-bw-wide-phone.jpg',
          alt: 'AI-generated black-and-white wide-angle mobile photo of fictional Helen and James holding the register as her parents look on.',
          caption: 'The register from a guest’s corner of the room',
        },
        {
          src: '/storyline/115-helen-james-wedding-details-bw-phone-macro.jpg',
          alt: 'AI-generated black-and-white mobile macro photo of fictional Helen’s ringed hand, ivory dress buttons and James’s white boutonniere.',
          caption: 'An ivory sleeve beside James’s boutonniere',
        },
        {
          src: '/storyline/95-helen-wedding-mobile-macro-courtyard-friends.jpg',
          alt: 'AI-generated candid mobile portrait of fictional Helen laughing in the courtyard with a friend softly blurred in the foreground.',
          caption: 'A candid from the courtyard',
        },
        {
          src: '/storyline/71-helen-london-wedding-mobile-macro-over-shoulder.jpg',
          alt: 'AI-generated over-the-shoulder portrait of fictional bride Helen glancing back at the camera in her ivory wedding dress.',
          caption: 'A glance back over her shoulder',
        },
        {
          src: '/storyline/90-helen-wedding-mobile-macro-bouquet-friend.jpg',
          alt: 'AI-generated close-up portrait of fictional Helen smiling down at her white bouquet while a companion adjusts its ribbon in the registry courtyard.',
          caption: 'The bouquet ribbon, straightened by a friend',
        },
        {
          src: '/storyline/99-helen-james-wedding-rings-mobile-macro.jpg',
          alt: 'AI-generated mobile macro-style photo of fictional Helen and James’s wedding bands and hands beside Helen’s white bouquet.',
          caption: 'Wedding bands beside the bouquet',
        },
        {
          src: '/storyline/66-helen-london-wedding-portrait-over-shoulder.jpg',
          alt: 'AI-generated over-the-shoulder portrait of fictional bride Helen turning to smile at the camera in her ivory wedding dress.',
          caption: 'A glance over her shoulder',
        },
        {
          src: '/storyline/101-helen-james-registry-room-mobile-wide-angle.jpg',
          alt: 'AI-generated wide-angle mobile photo of fictional Helen and James after signing the register, with her parents watching from the foreground.',
          caption: 'The signing seen from her parents’ seats',
        },
        {
          src: '/storyline/64-helen-london-wedding-portrait-thames.jpg',
          alt: 'AI-generated environmental portrait of fictional bride Helen by the Thames, turned toward the river in her original ivory wedding dress.',
          caption: 'A riverside bridal portrait',
        },
        {
          src: '/storyline/70-helen-london-wedding-mobile-macro-bouquet.jpg',
          alt: 'AI-generated macro-style smartphone portrait of fictional Helen smiling down at her white wedding bouquet in her ivory dress.',
          caption: 'A candid moment with her bouquet',
        },
        {
          src: '/storyline/48-helen-james-wedding-portrait.jpg',
          alt: 'AI-generated portrait-style companion illustration of fictional Helen and James in their original wedding outfits outside the registry office.',
          caption: 'An unposed portrait between the official shots',
        },
        {
          src: '/storyline/84-helen-james-wedding-mobile-macro-back-view.jpg',
          alt: 'AI-generated rear three-quarter smartphone portrait of fictional Helen facing James, with her wavy hair and ivory dress in the foreground.',
          caption: 'The view from just behind Helen',
        },
        {
          src: '/storyline/87-helen-wedding-mobile-macro-friends-laugh.jpg',
          alt: 'AI-generated close smartphone portrait of fictional Helen laughing in side profile with a friend softly out of focus beside her on the registry steps.',
          caption: 'A friend’s laugh just out of frame',
        },
        {
          src: '/storyline/59-helen-london-wedding-portrait-profile.jpg',
          alt: 'AI-generated profile portrait of fictional bride Helen by a registry-office window, looking down at her white bouquet in her ivory wedding dress.',
          caption: 'A quiet profile by the window',
        },
        {
          src: '/storyline/89-helen-wedding-mobile-macro-sister-whisper.jpg',
          alt: 'AI-generated close side-profile mobile portrait of fictional Helen laughing as a friend leans in to whisper outside the London registry office.',
          caption: 'A whisper shared on the steps',
        },
        {
          src: '/storyline/79-helen-james-wedding-mobile-macro-over-shoulder.jpg',
          alt: 'AI-generated over-the-shoulder wedding portrait of fictional Helen and James leaning together in their ivory dress and charcoal suit.',
          caption: 'A close look over her shoulder',
        },
        {
          src: '/storyline/80-helen-james-wedding-mobile-macro-high-angle.jpg',
          alt: 'AI-generated high-angle mobile portrait of fictional bride Helen resting against James and glancing up at him on their London wedding day.',
          caption: 'A soft glance from above',
        },
        {
          src: '/storyline/102-helen-james-mobile-couple-portrait.jpg',
          alt: 'AI-generated vertical mobile-camera portrait of fictional Helen laughing beside James under the registry-office doorway.',
          caption: 'A laugh beneath the registry doorway',
        },
        {
          src: '/storyline/49-helen-james-wedding-wide-registry.jpg',
          alt: 'AI-generated wide-angle companion illustration of fictional Helen and James in their wedding clothes inside a modest London registry room.',
          caption: 'The registry room seen from the back',
        },
        {
          src: '/storyline/88-helen-wedding-mobile-macro-mother-embrace.jpg',
          alt: 'AI-generated tilted candid portrait of fictional Helen embracing her mother in the registry office, her ivory dress and smiling profile in focus.',
          caption: 'A happy embrace with her mother',
        },
        {
          src: '/storyline/98-helen-mother-bride-mobile-portrait.jpg',
          alt: 'AI-generated vertical smartphone portrait of fictional Helen in her ivory wedding dress as her mother straightens her sleeve at the registry doorway.',
          caption: 'Her mother’s last-minute sleeve check',
        },
        {
          src: '/storyline/77-helen-james-wedding-mobile-macro-candid-laugh.jpg',
          alt: 'AI-generated close mobile portrait of fictional bride Helen laughing as groom James leans cheek-to-cheek with her outside the London registry office.',
          caption: 'A laugh between the registry steps',
        },
        {
          src: '/storyline/69-helen-london-wedding-mobile-macro-profile.jpg',
          alt: 'AI-generated close side-profile portrait of fictional Helen looking toward the registry-office street in her ivory wedding dress.',
          caption: 'A quiet side profile by the window',
        },
        {
          src: '/storyline/100-helen-james-parents-breakfast-mobile-candid.jpg',
          alt: 'AI-generated candid phone photo of fictional Helen and James sharing a small wedding-breakfast toast with Helen’s parents.',
          caption: 'A toast with her parents at the wedding breakfast',
        },
        {
          src: '/storyline/91-helen-wedding-mobile-macro-family-toast.jpg',
          alt: 'AI-generated candid side-profile portrait of fictional Helen laughing at the wedding breakfast as an older relative shares a teacup in soft focus.',
          caption: 'Tea and laughter at the wedding breakfast',
        },
        {
          src: '/storyline/55-helen-james-wedding-macro-register.jpg',
          alt: 'AI-generated macro companion illustration of fictional Helen and James’s ringed hands signing the registry in their wedding outfits.',
          caption: 'The final stroke beside their rings',
        },
        {
          src: '/storyline/96-helen-wedding-mobile-macro-laugh-over-shoulder.jpg',
          alt: 'AI-generated close side-profile portrait of fictional Helen laughing with a friend at the registry steps, seen from behind her shoulder.',
          caption: 'A laugh over her shoulder',
        },
        {
          src: '/storyline/74-helen-london-wedding-mobile-macro-back-view.jpg',
          alt: 'AI-generated rear three-quarter smartphone portrait of fictional Helen in her ivory wedding dress, turning her face slightly toward the camera.',
          caption: 'The dress from behind, her face turned aside',
        },
        {
          src: '/storyline/60-helen-london-wedding-portrait-laughing.jpg',
          alt: 'AI-generated candid portrait of fictional bride Helen laughing on the London registry steps in her ivory wedding dress.',
          caption: 'A laugh caught on the registry steps',
        },
        {
          src: '/storyline/19-helen-james-london-reception.jpg',
          alt: 'AI-generated illustration of fictional Helen and James sharing an imagined first dance at a small London wedding reception.',
          caption: 'The first dance their old album could not show',
        },
        {
          src: '/storyline/94-helen-wedding-mobile-macro-window-friend.jpg',
          alt: 'AI-generated over-the-shoulder profile portrait of fictional Helen smiling back toward a friend by the registry-office window.',
          caption: 'A smile back toward the window',
        },
        {
          src: '/storyline/85-helen-james-wedding-mobile-macro-thames-profile.jpg',
          alt: 'AI-generated close side-profile portrait of fictional Helen and James leaning toward each other beside the Thames in their wedding clothes.',
          caption: 'A profile by the Thames',
        },
        {
          src: '/storyline/92-helen-wedding-mobile-macro-back-view-friend.jpg',
          alt: 'AI-generated rear three-quarter mobile portrait of fictional Helen smiling over her shoulder at a friend in the registry courtyard.',
          caption: 'A glance back toward a friend',
        },
        {
          src: '/storyline/105-helen-james-bouquet-mobile-macro.jpg',
          alt: 'AI-generated close mobile macro photo of fictional Helen’s white bouquet between her ringed hand and James’s charcoal-suited hand.',
          caption: 'The bouquet between their hands',
        },
        {
          src: '/storyline/61-helen-london-wedding-portrait-monochrome.jpg',
          alt: 'AI-generated black-and-white portrait of fictional bride Helen beneath a stone registry-office arch, holding her wedding bouquet.',
          caption: 'A monochrome portrait under the stone arch',
        },
        {
          src: '/storyline/18-helen-james-london-register.jpg',
          alt: 'AI-generated illustration of fictional Helen and James signing a marriage register in an imagined London wedding moment, not an original photograph.',
          caption: 'A moment missing from the surviving prints',
        },
        {
          src: '/storyline/47-helen-james-wedding-macro-rings.jpg',
          alt: 'AI-generated macro companion illustration of fictional Helen and James with their wedding rings, ivory sleeve and charcoal suit cuff in focus.',
          caption: 'The rings, close to the moment',
        },
        {
          src: '/storyline/76-helen-london-wedding-mobile-macro-courtyard.jpg',
          alt: 'AI-generated candid smartphone portrait of fictional Helen turning back with her bouquet in the registry courtyard, wearing her ivory wedding dress.',
          caption: 'A tilted candid from the courtyard',
        },
        {
          src: '/storyline/107-helen-james-black-white-mobile-family-wide.jpg',
          alt: 'AI-generated black-and-white wide-angle mobile photo of fictional Helen and James with Helen’s parents on the London registry steps.',
          caption: 'A monochrome family portrait on the steps',
        },
        {
          src: '/storyline/53-helen-james-wedding-first-dance-bw.jpg',
          alt: 'AI-generated black-and-white companion illustration of fictional Helen and James slow-dancing in their original wedding attire.',
          caption: 'A slow dance in monochrome',
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
        'In this fictional example, Clara asks NeverBeen to imagine seventy-four casual mobile-style snapshots of the restaurant evening she missed. They are not photographs from that year, and they do not rewrite the pandemic; they give a shape to a memory she wished she could have made with her friends.',
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
          src: '/storyline/189-clara-vienna-posegroup-mobile-happy-window.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends hugging happily by the window for her camera at the imagined dinner.',
          caption: 'A happy hug by the window',
        },
        {
          src: '/storyline/170-clara-vienna-cake-mobile-portrait-plate.jpg',
          alt: 'AI-generated tilted mobile portrait of fictional Clara holding up a plate with a cake slice while friends cheer behind at the imagined dinner.',
          caption: 'She holds up the slice',
        },
        {
          src: '/storyline/132-clara-vienna-friends-mobile-cheek-laugh.jpg',
          alt: 'AI-generated tilted candid mobile snapshot of fictional Clara laughing cheek-to-cheek with a friend at the imagined birthday dinner.',
          caption: 'Foreheads almost touching',
        },
        {
          src: '/storyline/191-clara-vienna-posegroup-mobile-serious-archway.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends posing dramatic and serious at the archway at the imagined dinner.',
          caption: 'Drama at the archway',
        },
        {
          src: '/storyline/158-clara-vienna-dinner-mobile-macro-cake-slice.jpg',
          alt: 'AI-generated tilted mobile macro snapshot of a chocolate cake slice with raspberries and a fork, fictional Clara and friends blurred behind at the imagined dinner.',
          caption: 'One slice, still warm',
        },
        {
          src: '/storyline/187-clara-vienna-posegroup-mobile-funny-faces.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends pulling funny faces by the coat rack for her camera at the imagined dinner.',
          caption: 'Silly faces by the coats',
        },
        {
          src: '/storyline/131-clara-vienna-solo-mobile-awkward-crop.jpg',
          alt: 'AI-generated tightly cropped tilted mobile macro portrait of fictional Clara alone, half-smiling beside the blurred birthday cake at the imagined dinner.',
          caption: 'Half in the frame',
        },
        {
          src: '/storyline/152-clara-vienna-solo-mobile-candid-chin-hand.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara alone making a point with her hand near her chin at the imagined dinner.',
          caption: 'Making her point',
        },
        {
          src: '/storyline/151-clara-vienna-solo-mobile-candid-low-story.jpg',
          alt: 'AI-generated tilted low-angle candid mobile portrait of fictional Clara alone telling a story with her head tipped at the imagined dinner.',
          caption: 'The story from below',
        },
        {
          src: '/storyline/181-clara-vienna-standing-mobile-macro-doorway.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara standing at the restaurant doorway, turning with a surprised smile at the imagined dinner.',
          caption: 'Turning at the doorway',
        },
        {
          src: '/storyline/190-clara-vienna-posegroup-mobile-funny-photobomb.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends with a funny bunny-ears photobomb at the imagined dinner.',
          caption: 'Bunny ears behind them',
        },
        {
          src: '/storyline/165-clara-vienna-dinner-mobile-candid-share-bite.jpg',
          alt: 'AI-generated tilted candid mobile snapshot of fictional Clara clapping as friends share a bite of cake at the imagined dinner.',
          caption: 'One bite, shared',
        },
        {
          src: '/storyline/143-clara-vienna-girlfriends-mobile-embrace.jpg',
          alt: 'AI-generated tilted mobile snapshot of fictional Clara embraced and kissed on the cheek by her two female friends at the imagined dinner.',
          caption: 'A kiss on each side',
        },
        {
          src: '/storyline/179-clara-vienna-standing-mobile-macro-archway.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara standing by the wooden archway, leaning on it laughing at the imagined dinner.',
          caption: 'Leaning on the archway',
        },
        {
          src: '/storyline/142-clara-vienna-girlfriends-mobile-selfie.jpg',
          alt: 'AI-generated tilted mobile selfie of fictional Clara with her two female friends laughing around the birthday cake at the imagined dinner.',
          caption: 'Three of them, one selfie',
        },
        {
          src: '/storyline/139-clara-vienna-solo-mobile-macro-back-view.jpg',
          alt: 'AI-generated tilted rear mobile macro portrait of fictional Clara alone, hair and shoulder close with her smile turning back at the imagined dinner.',
          caption: 'Hair first, smile after',
        },
        {
          src: '/storyline/153-clara-vienna-solo-mobile-candid-lane-talk.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara alone talking to a friend on a cobbled Vienna lane after the imagined dinner.',
          caption: 'Talking on the lane',
        },
        {
          src: '/storyline/177-clara-vienna-standing-mobile-macro-window.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara standing by the restaurant window laughing at the imagined dinner.',
          caption: 'Laughing by the window',
        },
        {
          src: '/storyline/125-clara-vienna-birthday-laugh-mobile.jpg',
          alt: 'AI-generated candid mobile snapshot of fictional Clara laughing with her hand near her mouth as friends share a story at the imagined birthday dinner.',
          caption: 'A story that made the table laugh',
        },
        {
          src: '/storyline/167-clara-vienna-cake-mobile-macro-cut.jpg',
          alt: 'AI-generated tilted candid mobile macro snapshot of a knife cutting the chocolate birthday cake with fictional Clara and friends blurred behind at the imagined dinner.',
          caption: 'The knife goes in',
        },
        {
          src: '/storyline/144-clara-vienna-girlfriends-mobile-toast-macro.jpg',
          alt: 'AI-generated tilted mobile macro snapshot of fictional Clara and her two female friends clinking small glasses over the birthday cake at the imagined dinner.',
          caption: 'Three glasses over the cake',
        },
        {
          src: '/storyline/127-clara-vienna-solo-mobile-macro-front.jpg',
          alt: 'AI-generated tilted mobile macro portrait of fictional Clara alone, face close to the lens with soft focus and grain at the imagined Vienna dinner.',
          caption: 'Too close to miss',
        },
        {
          src: '/storyline/130-clara-vienna-solo-mobile-low-angle-laugh.jpg',
          alt: 'AI-generated tilted low-angle mobile portrait of fictional Clara alone laughing at the imagined Vienna restaurant dinner.',
          caption: 'A laugh from below',
        },
        {
          src: '/storyline/118-clara-vienna-birthday-portrait-mobile.jpg',
          alt: 'AI-generated mobile portrait of fictional Clara in her olive-green blouse smiling at the camera, the birthday cake blurred in front and her three friends behind at the imagined Vienna restaurant.',
          caption: 'The birthday girl in portrait mode',
        },
        {
          src: '/storyline/161-clara-vienna-dinner-mobile-macro-serving-hands.jpg',
          alt: 'AI-generated tilted mobile macro snapshot of hands passing a bowl of pasta across the table to fictional Clara and friends at the imagined dinner.',
          caption: 'Passing the pasta',
        },
        {
          src: '/storyline/128-clara-vienna-solo-mobile-macro-profile.jpg',
          alt: 'AI-generated tilted mobile macro portrait of fictional Clara alone in profile, smiling down at the birthday candles with a warm flare at the imagined dinner.',
          caption: 'A profile over the candles',
        },
        {
          src: '/storyline/174-clara-vienna-cake-mobile-wide-room.jpg',
          alt: 'AI-generated tilted wide-angle mobile snapshot of fictional Clara cutting the cake with friends watching in the restaurant room at the imagined dinner.',
          caption: 'The room watches her cut',
        },
        {
          src: '/storyline/140-clara-vienna-solo-mobile-macro-candle-glow.jpg',
          alt: 'AI-generated tilted mobile macro portrait of fictional Clara alone lit by candle glow with a soft flare at the imagined Vienna dinner.',
          caption: 'Lit by the candles',
        },
        {
          src: '/storyline/192-clara-vienna-posegroup-mobile-happy-jump.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends jumping and cheering in the hallway at the imagined dinner.',
          caption: 'Jumping down the hallway',
        },
        {
          src: '/storyline/133-clara-vienna-friends-mobile-huddle-crop.jpg',
          alt: 'AI-generated tilted mobile snapshot of fictional Clara half-cut at the frame edge while two friends huddle laughing at the imagined dinner.',
          caption: 'Half-cut but laughing',
        },
        {
          src: '/storyline/24-clara-vienna-toast.jpg',
          alt: 'AI-generated illustration of fictional Clara and three friends sharing a toast at an imagined Vienna restaurant birthday celebration.',
          caption: 'The toast they did not get to make',
        },
        {
          src: '/storyline/117-clara-vienna-birthday-cake-mobile-macro.jpg',
          alt: 'AI-generated mobile macro snapshot of fictional Clara’s chocolate birthday cake with five lit candles and raspberries, with Clara and three friends softly blurred behind at the imagined Vienna dinner.',
          caption: 'Five candles in close-up',
        },
        {
          src: '/storyline/184-clara-vienna-standing-mobile-portrait-hallway.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara standing in the restaurant hallway laughing at the imagined dinner.',
          caption: 'Laughing down the hallway',
        },
        {
          src: '/storyline/120-clara-vienna-friends-group-selfie-mobile.jpg',
          alt: 'AI-generated mobile group selfie of fictional Clara and three friends laughing around the birthday cake at the imagined Vienna dinner.',
          caption: 'A quick selfie between laughs',
        },
        {
          src: '/storyline/196-clara-vienna-posegroup-mobile-funny-toast.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends making goofy cheers faces over shots at the imagined dinner.',
          caption: 'Goofy cheers all round',
        },
        {
          src: '/storyline/147-clara-vienna-solo-mobile-candid-talking.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara alone caught mid-sentence talking to someone at the imagined Vienna dinner.',
          caption: 'Caught mid-sentence',
        },
        {
          src: '/storyline/195-clara-vienna-posegroup-mobile-happy-hug.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends squeezing into a happy hug at the doorway at the imagined dinner.',
          caption: 'Squeezed in the doorway',
        },
        {
          src: '/storyline/169-clara-vienna-cake-mobile-macro-candles-blow.jpg',
          alt: 'AI-generated tilted mobile macro snapshot of candles bending with smoke over the cake and fictional Clara and friends blurred behind at the imagined dinner.',
          caption: 'Flames bend, smoke curls',
        },
        {
          src: '/storyline/149-clara-vienna-solo-mobile-candid-profile-talk.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara alone in profile, laughing mid-word to someone off-frame at the imagined dinner.',
          caption: 'A laugh mid-word',
        },
        {
          src: '/storyline/178-clara-vienna-standing-mobile-portrait-coatrack.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara standing beside the coat rack at the imagined Vienna dinner.',
          caption: 'Waiting by the coats',
        },
        {
          src: '/storyline/168-clara-vienna-cake-mobile-macro-hands-knife.jpg',
          alt: 'AI-generated tilted mobile macro snapshot of many hands guiding the knife into the cake with fictional Clara laughing behind at the imagined dinner.',
          caption: 'All hands on the knife',
        },
        {
          src: '/storyline/185-clara-vienna-standing-mobile-macro-wineglass.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara standing, holding her wine glass near her smiling face at the imagined dinner.',
          caption: 'Wine glass, held high',
        },
        {
          src: '/storyline/121-clara-vienna-birthday-over-shoulder-mobile.jpg',
          alt: 'AI-generated candid mobile snapshot from behind fictional Clara toward her three friends laughing across the imagined birthday table.',
          caption: 'Seen over Clara’s shoulder',
        },
        {
          src: '/storyline/173-clara-vienna-cake-mobile-wide-cheer.jpg',
          alt: 'AI-generated tilted wide-angle mobile snapshot of fictional Clara and friends clapping around the birthday table at the imagined dinner.',
          caption: 'The whole table cheers',
        },
        {
          src: '/storyline/150-clara-vienna-solo-mobile-candid-across-table.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara alone telling a story across the table to a blurred listener at the imagined dinner.',
          caption: 'The story across the table',
        },
        {
          src: '/storyline/172-clara-vienna-cake-mobile-portrait-clap.jpg',
          alt: 'AI-generated tilted three-quarter mobile portrait of fictional Clara clapping with the glowing cake in front at the imagined dinner.',
          caption: 'Clapping over the glow',
        },
        {
          src: '/storyline/180-clara-vienna-standing-mobile-portrait-bar.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara standing at the bar with a wine glass at the imagined dinner.',
          caption: 'A glass at the bar',
        },
        {
          src: '/storyline/171-clara-vienna-cake-mobile-portrait-cheer.jpg',
          alt: 'AI-generated tilted mobile portrait of fictional Clara beaming beside the cake as friends cheer blurred behind at the imagined dinner.',
          caption: 'Beaming beside the cake',
        },
        {
          src: '/storyline/176-clara-vienna-cake-mobile-candid-first-slice.jpg',
          alt: 'AI-generated tilted candid mobile snapshot of fictional Clara lifting the first cake slice as friends applaud at the imagined dinner.',
          caption: 'Lifting the first slice',
        },
        {
          src: '/storyline/129-clara-vienna-solo-mobile-over-shoulder.jpg',
          alt: 'AI-generated tilted over-the-shoulder mobile portrait of fictional Clara alone turning back toward the camera at the imagined Vienna dinner.',
          caption: 'Caught turning back',
        },
        {
          src: '/storyline/166-clara-vienna-dinner-mobile-macro-after-coffee.jpg',
          alt: 'AI-generated tilted mobile macro snapshot of espresso cups and crumbs with fictional Clara and friends chatting blurred behind at the imagined dinner.',
          caption: 'Coffee after the candles',
        },
        {
          src: '/storyline/156-clara-vienna-solo-mobile-candid-window-talk.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara alone answering someone in soft window light at the imagined dinner.',
          caption: 'Answering in window light',
        },
        {
          src: '/storyline/124-clara-vienna-friends-portrait-mobile.jpg',
          alt: 'AI-generated mobile portrait of fictional Clara’s two friends leaning together laughing, with Clara and the birthday cake softly blurred behind at the imagined dinner.',
          caption: 'Two friends, one shared laugh',
        },
        {
          src: '/storyline/119-clara-vienna-birthday-wide-mobile.jpg',
          alt: 'AI-generated wide-angle mobile snapshot of fictional Clara and three friends around the birthday table with cake and wine glasses at the imagined Vienna restaurant dinner.',
          caption: 'The whole table in one wide frame',
        },
        {
          src: '/storyline/188-clara-vienna-posegroup-mobile-serious-bar.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends posing serious with crossed arms at the bar at the imagined dinner.',
          caption: 'Serious looks at the bar',
        },
        {
          src: '/storyline/141-clara-vienna-solo-mobile-macro-window.jpg',
          alt: 'AI-generated tilted mobile macro portrait of fictional Clara alone in side light, focus slipped onto her hair at the imagined dinner.',
          caption: 'Focus on the hair',
        },
        {
          src: '/storyline/163-clara-vienna-dinner-mobile-macro-dessert-clara.jpg',
          alt: 'AI-generated tilted mobile macro snapshot of the chocolate cake with candles and fictional Clara leaning in blurred behind at the imagined dinner.',
          caption: 'Dessert with Clara behind',
        },
        {
          src: '/storyline/175-clara-vienna-cake-mobile-wide-toast.jpg',
          alt: 'AI-generated tilted low wide-angle mobile snapshot of fictional Clara and friends raising glasses over the cake at the imagined dinner.',
          caption: 'Glasses high over the cake',
        },
        {
          src: '/storyline/182-clara-vienna-standing-mobile-portrait-table.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara standing by the birthday table looking back laughing at the imagined dinner.',
          caption: 'A look back at the table',
        },
        {
          src: '/storyline/135-clara-vienna-friends-mobile-street-walk.jpg',
          alt: 'AI-generated tilted mobile snapshot of fictional Clara and friends mid-step on a cobbled Vienna lane after the imagined dinner.',
          caption: 'Mid-step on the lane',
        },
        {
          src: '/storyline/126-clara-vienna-friends-night-portrait-mobile.jpg',
          alt: 'AI-generated mobile night portrait of fictional Clara huddled with three friends under a street lamp on a Vienna lane after the imagined dinner.',
          caption: 'Under the lamp after dinner',
        },
        {
          src: '/storyline/186-clara-vienna-standing-mobile-portrait-dessert.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara standing and laughing by the dessert counter at the imagined Vienna dinner.',
          caption: 'Choosing at the counter',
        },
        {
          src: '/storyline/134-clara-vienna-friends-mobile-toast-low.jpg',
          alt: 'AI-generated tilted low-angle mobile snapshot of fictional Clara and friends toasting behind a blurred wine glass at the imagined dinner.',
          caption: 'The toast behind the glass',
        },
        {
          src: '/storyline/22-clara-vienna-birthday-candles.jpg',
          alt: 'AI-generated imagined snapshot of fictional Clara blowing out candles at the birthday dinner she missed during COVID restrictions.',
          caption: 'A candlelit wish in the parallel version',
        },
        {
          src: '/storyline/194-clara-vienna-posegroup-mobile-serious-lineup.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends in a serious model lineup by the dessert counter at the imagined dinner.',
          caption: 'Models by the counter',
        },
        {
          src: '/storyline/123-clara-vienna-toast-hands-mobile-macro.jpg',
          alt: 'AI-generated mobile macro snapshot of fictional Clara and friends clinking small glasses over the birthday cake at the imagined Vienna dinner.',
          caption: 'Four glasses over the cake',
        },
        {
          src: '/storyline/193-clara-vienna-posegroup-mobile-funny-cakesteal.jpg',
          alt: 'AI-generated tilted candid mobile portrait of fictional Clara’s friends making funny sneaky faces stealing the cake at the imagined dinner.',
          caption: 'Sneaking the cake',
        },
        {
          src: '/storyline/164-clara-vienna-dinner-mobile-candid-pasta-laugh.jpg',
          alt: 'AI-generated tilted candid mobile snapshot of fictional Clara watching a friend twirl pasta and laugh at the imagined dinner.',
          caption: 'Pasta, twirled and laughed',
        },
        {
          src: '/storyline/160-clara-vienna-dinner-mobile-tilted-table-spread.jpg',
          alt: 'AI-generated tilted overhead mobile snapshot of the full dinner spread with fictional Clara and friends reaching for pasta, bread and cake at the imagined dinner.',
          caption: 'The whole spread, tilted',
        },
        {
          src: '/storyline/159-clara-vienna-dinner-mobile-candid-first-bite.jpg',
          alt: 'AI-generated tilted candid mobile snapshot of fictional Clara laughing with a forkful of cake halfway to her mouth at the imagined dinner.',
          caption: 'The first bite',
        },
        {
          src: '/storyline/155-clara-vienna-solo-mobile-candid-lean-cake.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara alone leaning over the birthday cake talking intently at the imagined dinner.',
          caption: 'Leaning in to tell it',
        },
        {
          src: '/storyline/183-clara-vienna-standing-mobile-macro-hair.jpg',
          alt: 'AI-generated tilted candid mobile macro portrait of fictional Clara standing and tucking her hair behind her ear at the imagined Vienna dinner.',
          caption: 'Tucking her hair back',
        },
        {
          src: '/storyline/146-clara-vienna-girlfriends-mobile-night-huddle.jpg',
          alt: 'AI-generated tilted mobile night portrait of fictional Clara huddled with her two female friends under a flaring lamp after the imagined dinner.',
          caption: 'Three under the lamp',
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

  protected readonly albums: StoryAlbum[] = [
    'london-wedding-revisited',
    'vienna-birthday-missed',
    'paris-solo-dream',
    'switzerland-honeymoon',
    'amazon-university-reunion',
    'italy-wedding-dream',
    'everest-solo-dream',
    'banaras-european-couple-dream',
    'norway-anniversary-dream',
  ].map((id, index) => {
    const album = this.albumCatalog.find((story) => story.id === id);
    if (!album) {
      throw new Error(`Missing storyline album: ${id}`);
    }

    return {
      ...album,
      number: String(index + 1).padStart(2, '0'),
      photos: this.shuffleAlbumPhotos(album.photos),
    };
  });

  /**
   * Keeps an album's cover frame in first place and shuffles every other frame
   * into a new random order each time the page is opened, so the wall never
   * repeats the same sequence twice.
   */
  private shuffleAlbumPhotos(photos: readonly StoryPhoto[]): StoryPhoto[] {
    const order = photos.slice();

    for (let i = order.length - 1; i > 1; i -= 1) {
      const j = 1 + Math.floor(Math.random() * i);
      [order[i], order[j]] = [order[j], order[i]];
    }

    return order;
  }

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

  protected expandAlbum(albumId: string): void {
    if (this.isAlbumExpanded(albumId)) return;
    this.toggleAlbum(albumId);
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
