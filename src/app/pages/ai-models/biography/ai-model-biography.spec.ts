import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AiModelBiography, AiModelProfile, aiModelProfiles } from '../ai-model-data';
import { AiModelBiographyPage } from './ai-model-biography';

const sampleBiography: AiModelBiography = {
  version: 1,
  fictional: true,
  generatedAt: '2026-10-11T00:00:00.000Z',
  title: 'In the Multiverse of NeverBeen, imagine if I am really there',
  name: 'Test Studio Model',
  signature: 'Test Studio Model',
  generalInformation: {
    fullName: 'Test Studio Model',
    born: 'A fictional quarter, George Town, Malaysia',
    relationshipStatus: 'Single',
    universe: 'NeverBeen Multiverse',
  },
  summary: 'A fictional profile for the biography page component tests.',
  earlyLife: ['The early life in this test is fictional and intentionally brief.'],
  educationalBackground: [
    {
      period: 'September 2018 – June 2022',
      qualification: 'Bachelor of Arts in Visual Communication',
      institution: 'Aurora College (fictional)',
      location: 'George Town, Malaysia',
      description: 'A fictional education entry used to exercise the timeline layout.',
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
    children: [],
    privacyNote: 'Every detail in this biography is fictional.',
  },
  hobbies: ['Street sketching'],
  interests: ['Independent magazines'],
  passions: ['Accessible arts education'],
  ambitions: ['Support new artists.'],
  finalNotes: ['This story is fictional.'],
  quotes: [{ text: 'A fictional quote.', by: 'Test Studio Model' }],
  memories: [
    {
      id: 'test-memory',
      fileName: '01-test-memory.jpg',
      period: 'School years',
      caption: 'A fictional memory',
      alt: 'An imagined school memory',
      src: '',
      fictional: true,
    },
  ],
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

  it('renders the fictional biography, required sections, memory frame and signature', async () => {
    const model = addTestModel(sampleBiography);
    try {
      const harness = await RouterTestingHarness.create(`/ai-models/${model.slug}/biography`);
      const element = harness.routeNativeElement as HTMLElement;

      expect(element.querySelector('.biography-hero h1')?.textContent).toContain(
        'In the Multiverse of NeverBeen, imagine if I am really there',
      );
      expect(element.querySelector('.general-panel')?.textContent).toContain('fictional profile');
      for (const title of [
        'Early Life',
        'Educational Background',
        'Career',
        'Achievements',
        'Personal Life',
        'Hobbies and Interests',
        'Final Notes',
      ]) {
        expect(element.textContent).toContain(title);
      }
      expect(element.querySelector('.memory-pending')).not.toBeNull();
      expect(element.querySelector('.signature')?.textContent).toContain('Test Studio Model');
      expect(element.querySelector('.footer-disclaimer')?.textContent).toContain(
        'completely fictional',
      );
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
      expect(element.querySelector('.footer-disclaimer')?.textContent).toContain(
        'completely fictional',
      );
      expect(element.querySelector('#memory-title')).toBeNull();
    } finally {
      removeTestModel(model);
    }
  });
});
