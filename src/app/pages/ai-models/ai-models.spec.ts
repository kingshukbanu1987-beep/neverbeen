import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AiModelsPage } from './ai-models';

describe('AiModelsPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiModelsPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders a finished, helpful empty state before model portraits are uploaded', () => {
    const fixture = TestBed.createComponent(AiModelsPage);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('h1')?.textContent).toContain('NeverBeen AI Models');
    expect(element.querySelector('.empty-studio h3')?.textContent).toContain('coming into focus');
    expect(element.querySelector('.empty-visual')).toBeTruthy();
    expect(element.querySelector('.model-grid')).toBeNull();
  });
});
