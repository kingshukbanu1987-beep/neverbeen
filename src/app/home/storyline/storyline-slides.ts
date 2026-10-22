export interface StorylineSlide {
  /** Anchor id on /storyline-of-parallel-universe. */
  id: string;
  /** Two-digit story number ("01" .. "09"). */
  number: string;
  /** Destination place name. */
  place: string;
  /** People in the story. */
  people: string;
  /** Story headline. */
  title: string;
  /** Deck / summary of the story. */
  deck: string;
  /** Quote from the story. */
  quote: string;
  /** Public URL of the lead photograph for the story. */
  src: string;
  /** Accessible description of the lead photograph. */
  alt: string;
  /** Pill tag displayed above the headline. */
  tag: string;
}

export const storylineSlides: StorylineSlide[] = [
  {
    id: 'london-wedding-revisited',
    number: '01',
    place: 'London, United Kingdom',
    people: 'Helen & James · a British couple',
    title: 'The wedding album with a few pages left blank',
    deck: 'Old photographs preserve their London registry-office wedding; they want companion images for the moments the camera missed.',
    quote:
      '“We still have the ring, the certificate and that rainy morning. We just wanted a few more frames for the album.”',
    src: '/storyline/17-helen-james-london-registry.jpg',
    alt: 'Helen and James on the steps of a London town hall after their registry wedding, holding a small bouquet on a soft overcast morning.',
    tag: 'Story 01 · London, United Kingdom · Helen & James',
  },
  {
    id: 'vienna-birthday-missed',
    number: '02',
    place: 'Vienna, Austria',
    people: 'Clara · a birthday dinner with friends',
    title: 'The birthday dinner she never got to share',
    deck: 'COVID restrictions kept her twenty-fifth birthday off the restaurant calendar; the wish to celebrate with friends stayed.',
    quote:
      '“Turning twenty-five happened in a quiet flat. In my head, the table in Vienna is still waiting for us.”',
    src: '/storyline/21-clara-vienna-birthday-dinner.jpg',
    alt: 'Clara and four close friends raising a birthday toast around a candlelit dinner table in a classic Viennese restaurant.',
    tag: 'Story 02 · Vienna, Austria · Clara',
  },
  {
    id: 'paris-solo-dream',
    number: '03',
    place: 'Paris, France',
    people: 'Ananya · a solo-travel dream',
    title: 'A Paris trip that never found its season',
    deck: 'She did not stop wanting to go. The practical pieces simply never lined up at once.',
    quote: '“Paris was never an extravagance in my head. It was just a week that never arrived.”',
    src: '/storyline/02-ananya-paris-seine.jpg',
    alt: 'Ananya in a camel coat holding a notebook along the Seine with the Eiffel Tower in soft morning mist.',
    tag: 'Story 03 · Paris, France · Ananya',
  },
  {
    id: 'switzerland-honeymoon',
    number: '04',
    place: 'Switzerland',
    people: 'Lotte & Bram · a Dutch couple',
    title: 'The honeymoon that kept getting postponed',
    deck: 'They had the dream, the invitation and the same dates circled. Work kept taking those dates back.',
    quote:
      '“We did not fall out of love with the idea. We only ran out of weeks that belonged to both of us.”',
    src: '/storyline/01-lotte-bram-lake-brienz.jpg',
    alt: 'Lotte and Bram standing close on a wooden pier above turquoise Lake Brienz with Swiss alpine peaks behind them.',
    tag: 'Story 04 · Switzerland · Lotte & Bram',
  },
  {
    id: 'amazon-university-reunion',
    number: '05',
    place: 'Amazon Rainforest',
    people: 'Five old friends · 3 men & 2 women',
    title: 'The expedition that became a promise after graduation',
    deck: 'They planned it over a campus map. Then life scattered five calendars across five cities.',
    quote: '“Every reunion ends with the same sentence: next time, we actually go to the river.”',
    src: '/storyline/09-five-friends-amazon-river.jpg',
    alt: 'Five university friends — three men and two women — in a wooden expedition boat on a misty Amazon river bend at sunrise.',
    tag: 'Story 05 · Amazon Rainforest · Five old friends',
  },
  {
    id: 'italy-wedding-dream',
    number: '06',
    place: 'Tuscany, Italy',
    people: 'Meera & Arjun · an Indian couple',
    title: 'The Tuscany wedding that never took place',
    deck: 'They imagined a destination wedding together. An accident ended that shared future before the ceremony could happen.',
    quote: '“The place still existed in my mind because we had spoken about it so carefully.”',
    src: '/storyline/13-meera-arjun-tuscany-courtyard.jpg',
    alt: 'Meera and Arjun standing together in a sunlit Tuscan stone courtyard framed by cypress trees in late-afternoon gold.',
    tag: 'Story 06 · Tuscany, Italy · Meera & Arjun',
  },
  {
    id: 'everest-solo-dream',
    number: '07',
    place: 'Everest Region, Nepal',
    people: 'Elisabeth · a European solo-trek dream',
    title: 'The mountain she carried through a working life',
    deck: 'She always pictured the Everest trail. Work pressure kept turning the leave she planned into another year.',
    quote:
      '“You tell yourself the mountains will wait. They do; your calendar is the part that changes.”',
    src: '/storyline/25-elisabeth-everest-trail.jpg',
    alt: 'Elisabeth on a stone trail in the Khumbu valley with prayer flags and snow-covered Himalayan peaks behind her.',
    tag: 'Story 07 · Everest Region, Nepal · Elisabeth',
  },
  {
    id: 'banaras-european-couple-dream',
    number: '08',
    place: 'Benaras (Varanasi), India',
    people: 'Ingrid & Peter · an older European couple',
    title: 'The Benaras visit that stayed on their map',
    deck: 'They longed to explore Varanasi. Health complications and repeated visa refusals kept the journey from happening.',
    quote: '“Some places stay with you even when the paperwork and the body say no.”',
    src: '/storyline/29-ingrid-peter-varanasi-riverfront.jpg',
    alt: 'Ingrid and Peter sitting together in a wooden rowboat on the Ganges at dawn with the sandstone ghats of Benaras glowing behind them.',
    tag: 'Story 08 · Benaras (Varanasi), India · Ingrid & Peter',
  },
  {
    id: 'norway-anniversary-dream',
    number: '09',
    place: 'Norway',
    people: 'Asha & Ravi · an Indian couple planning their 50th anniversary',
    title: 'The Norway anniversary they planned for years',
    deck: 'Asha and Ravi hoped to celebrate their 50th wedding anniversary in Norway. Her recent hospitalization has put the trip on hold.',
    quote:
      '“Fifty years is already the journey. Norway was the view we wanted to stand in together.”',
    src: '/storyline/33-asha-ravi-norway-fjord.jpg',
    alt: 'Asha and Ravi standing arm in arm at a quiet wooden viewpoint above a calm Norwegian fjord in soft evening light.',
    tag: 'Story 09 · Norway · Asha & Ravi',
  },
];
