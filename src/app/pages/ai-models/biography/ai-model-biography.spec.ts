import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AiModelBiography, AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiModelBiographyPage } from './ai-model-biography';

const storyMemoryIds = [
  'childhood-home',
  'neighbourhood',
  'school-days',
  'school-project',
  'college',
  'first-workplace',
  'first-editorial',
  'friends',
  'family-now',
  'present-day',
];

const sampleBiography: AiModelBiography = {
  version: 1,
  fictional: true,
  generatedAt: '2026-10-11T00:00:00.000Z',
  title: 'In the Multiverse of NeverBeen',
  name: 'Test Studio Model',
  signature: 'Test Studio Model',
  signatureStyle: 'Handwritten-style blue ballpoint signature on white paper; fictional facsimile.',
  signatureImage: '/test/signature.jpg',
  birthDetails: {
    date: '4 March 2000',
    time: '09:42',
    timeZone: 'Asia/Kuala_Lumpur',
    facility: 'NeverBeen House of Birth',
    neighborhood: 'Fictional quarter',
    city: 'George Town',
    country: 'Malaysia',
    note: 'A fully fictional place and time.',
  },
  generalInformation: {
    fullName: 'Test Studio Model',
    born: '4 March 2000',
    birthTime: '09:42 (Asia/Kuala_Lumpur)',
    birthplace: 'NeverBeen House of Birth (fictional), Fictional quarter, George Town, Malaysia',
    relationshipStatus: 'Single',
    education: 'Bachelor of Arts in Visual Communication',
    universe: 'NeverBeen Multiverse',
  },
  summary: 'A fictional profile for the biography page component tests.',
  earlyLife: [
    'The early life in this test is fictional and intentionally brief.',
    'A fictional childhood-home memory follows.',
    'A fictional neighbourhood memory comes next.',
    'Fictional school-age memories close the early-life section.',
  ],
  educationalBackground: [
    {
      period: 'September 2018 – June 2022',
      qualification: 'Bachelor of Arts in Visual Communication',
      institution: 'Aurora College (fictional)',
      location: 'George Town, Malaysia',
      description: 'A fictional degree entry used to exercise the education timeline.',
    },
  ],
  career: [
    {
      period: 'January 2023 – Present',
      role: 'Independent model',
      organization: 'NeverBeen Multiverse',
      location: 'George Town, Malaysia',
      employmentType: 'Independent · fictional',
      description: 'A fictional role used to verify the career section.',
    },
  ],
  achievements: ['Built a fictional creative portfolio.'],
  personalLife: {
    relationshipStatus: 'Single',
    relationshipType: 'Single (fictional storyline)',
    narrative: 'This fictional character is single in the test story.',
    partner: null,
    parents: [
      { name: 'Mira Test', relationship: 'Mother', note: 'Fictional family member.' },
      { name: 'Rafi Test', relationship: 'Father', note: 'Fictional family member.' },
    ],
    siblings: [
      { name: 'Nadia Test', relationship: 'Sister', age: '24', note: 'Fictional family member.' },
    ],
    formerSpouses: [],
    children: [],
    privacyNote: 'Every detail in this biography is fictional.',
  },
  hobbies: ['Street sketching'],
  interests: ['Independent magazines'],
  passions: ['Accessible arts education'],
  ambitions: ['Support new artists.'],
  finalNotes: ['This story is fictional.'],
  quotes: [{ text: 'A fictional quote.', by: 'Test Studio Model' }],
  memories: storyMemoryIds.map((id, index) => ({
    id,
    fileName: `${String(index + 1).padStart(2, '0')}-${id}.jpg`,
    period: `Fictional memory ${index + 1}`,
    timestamp: '4 March 2026 · 09:42 Asia/Kuala_Lumpur',
    cameraStamp: '',
    caption: `A fictional ${id.replaceAll('-', ' ')} memory`,
    alt: `An imagined ${id.replaceAll('-', ' ')} scene`,
    src: '',
    fictional: true,
  })),
  fictionalNotice: 'This fictional biography exists only in the NeverBeen Multiverse.',
};

function addTestModel(biography: AiModelBiography | null): AiModelProfile {
  const model: AiModelProfile = {
    ...aiModelProfiles[0],
    slug: 'biography-test-model',
    name: 'Test Studio Model',
    biography,
  };
  aiModelProfiles.push(model);
  return model;
}

function removeTestModel(model: AiModelProfile): void {
  const index = aiModelProfiles.indexOf(model);
  if (index >= 0) aiModelProfiles.splice(index, 1);
}

describe('AiModelBiographyPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelBiographyPage],
      providers: [
        provideRouter([{ path: 'ai-models/:slug/biography', component: AiModelBiographyPage }]),
      ],
    }).compileComponents();
  });

  it('renders a fictional biography with a paired portrait and signature, birth details, family, and ten story photos', async () => {
    const model = addTestModel(sampleBiography);
    try {
      const harness = await RouterTestingHarness.create(`/ai-models/${model.slug}/biography`);
      const element = harness.routeNativeElement as HTMLElement;

      expect(element.querySelector('.article-heading h1')?.textContent).toContain(
        'Test Studio Model',
      );
      expect(element.querySelector('.article-subtitle')?.textContent).toBe(
        'In the Multiverse of NeverBeen',
      );
      const infobox = element.querySelector('.infobox');
      expect(infobox?.textContent).toContain('Fictional quarter');
      expect(infobox?.textContent).toContain('4 March 2000');
      expect(infobox?.textContent).toContain('09:42 (Asia/Kuala_Lumpur)');
      expect(infobox?.textContent).toContain('George Town, Malaysia');
      expect(infobox?.querySelector('.infobox-portrait img')).not.toBeNull();
      expect(
        infobox?.querySelector('.infobox-signature .signature-image')?.getAttribute('alt'),
      ).toContain('blue ballpoint');
      expect(element.querySelector('.lead-summary')?.textContent).toContain('fictional profile');
      const educationSection = element.querySelector('#education');
      expect(educationSection?.querySelectorAll('.education-entry').length).toBe(1);
      expect(educationSection?.textContent).toContain('Bachelor of Arts in Visual Communication');
      expect(educationSection?.textContent).not.toMatch(/high school|master|mba|phd/i);
      for (const title of [
        'Early life',
        'Education',
        'Career',
        'Achievements',
        'Personal life',
        'Family',
        'Interests and ambitions',
        'Final notes',
      ]) {
        expect(element.textContent).toContain(title);
      }
      expect(element.querySelectorAll('.wiki-section#early-life .story-photo').length).toBe(4);
      expect(element.querySelectorAll('.wiki-section#education .story-photo').length).toBe(1);
      expect(element.querySelectorAll('.wiki-section#career .story-photo').length).toBe(3);
      expect(element.querySelectorAll('.wiki-section#personal-life .story-photo').length).toBe(2);
      expect(element.querySelectorAll('.wiki-section#final-notes .story-photo').length).toBe(0);
      expect(element.querySelectorAll('.story-photo').length).toBe(10);
      expect(element.querySelector('#memories')).toBeNull();
      expect(element.querySelector('.memory-pending')).not.toBeNull();
      const familyRoster = element.querySelector('#family');
      expect(familyRoster?.textContent).toContain('Mira Test');
      expect(familyRoster?.textContent).toContain('Rafi Test');
      expect(familyRoster?.textContent).toContain('Nadia Test');
      expect(element.querySelector('.story-photo figcaption')?.textContent).toContain(
        '4 March 2026 · 09:42 Asia/Kuala_Lumpur',
      );
      expect(element.querySelector<HTMLImageElement>('.signature-image')?.src).toContain(
        '/test/signature.jpg',
      );
      expect(element.querySelector('.signature-image')?.getAttribute('alt')).toContain(
        'blue ballpoint',
      );
      expect(element.querySelector('.footer-disclaimer')?.textContent).toContain('fictional');
    } finally {
      removeTestModel(model);
    }
  });

  it('shows Biography not Available when the model has no biography', async () => {
    const model = addTestModel(null);
    try {
      const harness = await RouterTestingHarness.create(`/ai-models/${model.slug}/biography`);
      const element = harness.routeNativeElement as HTMLElement;

      expect(element.querySelector('#unavailable-title')?.textContent).toContain(
        'Biography not Available',
      );
      expect(element.querySelector('.unavailable-back')?.getAttribute('href')).toBe(
        `/ai-models/${model.slug}`,
      );
      expect(element.querySelector('.footer-disclaimer')?.textContent).toContain('fictional');
      expect(element.querySelector('#memories')).toBeNull();
    } finally {
      removeTestModel(model);
    }
  });
});
