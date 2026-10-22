import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  AI_MODELS_DIRECTORY_MEMORY_KEY,
  AiModelsDirectoryMemory,
  AiModelsDirectoryMemoryService,
} from './ai-models-directory-memory.service';

@Component({ selector: 'app-directory-memory-test-page', template: '' })
class DirectoryMemoryTestPage {}

const POSITION: AiModelsDirectoryMemory = {
  scrollY: 2430,
  search: 'iran',
  sort: 'price-desc',
  availability: 'available',
};

function storedValue(): string | null {
  return window.sessionStorage.getItem(AI_MODELS_DIRECTORY_MEMORY_KEY);
}

describe('AiModelsDirectoryMemoryService', () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'ai-models', component: DirectoryMemoryTestPage },
          { path: 'ai-models/:slug', component: DirectoryMemoryTestPage },
          { path: 'ai-models/:slug/biography', component: DirectoryMemoryTestPage },
          { path: 'ai-models-archive', component: DirectoryMemoryTestPage },
          { path: 'home', component: DirectoryMemoryTestPage },
        ]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('remembers the directory position for the round trip to a model profile', () => {
    const memory = TestBed.inject(AiModelsDirectoryMemoryService);

    memory.remember(POSITION);

    expect(memory.recall()).toEqual(POSITION);
    expect(storedValue()).not.toBeNull();
  });

  it('keeps the position while the visitor stays on the directory and its model pages', async () => {
    const memory = TestBed.inject(AiModelsDirectoryMemoryService);
    const router = TestBed.inject(Router);
    memory.remember(POSITION);

    await router.navigateByUrl('/ai-models/sereenah-noorzai');
    expect(memory.recall()).toEqual(POSITION);

    await router.navigateByUrl('/ai-models/sereenah-noorzai/biography?chapter=one');
    expect(memory.recall()).toEqual(POSITION);

    await router.navigateByUrl('/ai-models');
    expect(memory.recall()).toEqual(POSITION);
  });

  it('drops the position as soon as the visitor lands anywhere else on the site', async () => {
    const memory = TestBed.inject(AiModelsDirectoryMemoryService);
    const router = TestBed.inject(Router);
    memory.remember(POSITION);

    await router.navigateByUrl('/home');

    expect(memory.recall()).toBeNull();
    expect(storedValue()).toBeNull();
  });

  it('does not mistake a lookalike path for the directory', async () => {
    const memory = TestBed.inject(AiModelsDirectoryMemoryService);
    const router = TestBed.inject(Router);
    memory.remember(POSITION);

    await router.navigateByUrl('/ai-models-archive');

    expect(memory.recall()).toBeNull();
  });

  it('throws away a stored value that is not a directory position', () => {
    window.sessionStorage.setItem(AI_MODELS_DIRECTORY_MEMORY_KEY, '{"scrollY":-4,"search":7}');
    const memory = TestBed.inject(AiModelsDirectoryMemoryService);

    expect(memory.recall()).toBeNull();
    expect(storedValue()).toBeNull();
  });

  it('keeps working when the tab refuses to store anything', () => {
    const memory = TestBed.inject(AiModelsDirectoryMemoryService);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => memory.remember(POSITION)).not.toThrow();
    expect(memory.recall()).toBeNull();
    expect(() => memory.clear()).not.toThrow();
  });
});
