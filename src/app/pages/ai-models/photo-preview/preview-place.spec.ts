import { parsePreviewPlace } from './preview-place';

describe('parsePreviewPlace', () => {
  it('splits a "City, Country" location into the plate and adds the country code', () => {
    expect(parsePreviewPlace('Shiraz, Iran')).toEqual({
      city: 'Shiraz',
      country: 'Iran',
      code: 'IR',
      label: 'Shiraz, Iran',
    });
  });

  it('keeps a city that carries a second word and a country of its own', () => {
    expect(parsePreviewPlace('Kuwait City, Kuwait')).toEqual({
      city: 'Kuwait City',
      country: 'Kuwait',
      code: 'KW',
      label: 'Kuwait City, Kuwait',
    });
  });

  it('reads the country as the last part when the location has three', () => {
    expect(parsePreviewPlace('Cork, Munster, Ireland')).toEqual({
      city: 'Cork',
      country: 'Ireland',
      code: 'IE',
      label: 'Cork, Ireland',
    });
  });

  it('drops the biography tail that follows a middle dot', () => {
    expect(parsePreviewPlace('Shiraz, Iran · remote and on location')).toEqual({
      city: 'Shiraz',
      country: 'Iran',
      code: 'IR',
      label: 'Shiraz, Iran',
    });
  });

  it('recognises every country the directory currently names', () => {
    const locations = [
      'Abu Dhabi, United Arab Emirates',
      'Alexandria, Egypt',
      'Amman, Jordan',
      'Baghdad, Iraq',
      'Baku, Azerbaijan',
      'Beirut, Lebanon',
      'Bogotá, Colombia',
      'Buenos Aires, Argentina',
      'Cairo, Egypt',
      'Casablanca, Morocco',
      'Cork, Ireland',
      'Damascus, Syria',
      'Darjeeling, India',
      'Doha, Qatar',
      'Dubai, United Arab Emirates',
      'Dublin, Ireland',
      'Erbil, Iraq',
      'Galway, Ireland',
      'Homs, Syria',
      'Isfahan, Iran',
      'Istanbul, Türkiye',
      'Jeddah, Saudi Arabia',
      'Kolkata, India',
      'Kuala Lumpur, Malaysia',
      'Kuwait City, Kuwait',
      'Limerick, Ireland',
      'London, United Kingdom',
      'Manchester, United Kingdom',
      'Mashhad, Iran',
      'Montevideo, Uruguay',
      'Muscat, Oman',
      'Riyadh, Saudi Arabia',
      'Sarajevo, Bosnia and Herzegovina',
      'Shantiniketan, India',
      'Shiraz, Iran',
      'Srinagar, India',
      'Tabriz, Iran',
      'Tbilisi, Georgia',
      'Tehran, Iran',
      'Tripoli, Lebanon',
      'Yazd, Iran',
    ];
    const withoutCode = locations.filter((location) => !parsePreviewPlace(location)?.code);
    expect(withoutCode).toEqual([]);
  });

  it('leaves the code empty for a country the directory does not know', () => {
    expect(parsePreviewPlace('Shiraz, Persia')?.code).toBe('');
  });

  it('shows the city alone when the location names no country', () => {
    expect(parsePreviewPlace('Shiraz')).toEqual({
      city: 'Shiraz',
      country: '',
      code: '',
      label: 'Shiraz',
    });
  });

  it('holds no plate for an empty or blank location', () => {
    expect(parsePreviewPlace('')).toBeNull();
    expect(parsePreviewPlace('   ')).toBeNull();
    expect(parsePreviewPlace(' , ')).toBeNull();
  });
});
