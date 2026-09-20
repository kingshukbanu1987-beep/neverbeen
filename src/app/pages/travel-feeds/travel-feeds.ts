import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DestinationFeed, FeedSourceReport, TrendingDestination } from '../../models/travel-feeds';
import { TravelFeeds } from '../../services/travel-feeds';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const SUGGESTIONS = ['Kyoto', 'Iceland', 'Maldives', 'Hanoi'];

interface FlightOption {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  from: string;
  to: string;
  fromCity: string;
  toCity: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  stopCities: string[];
  price: number;
  cabin: string;
  departureDate: string;
  returnDate?: string;
  logo: string;
  isDirect: boolean;
  baggage: string;
}

interface HotelOption {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  pricePerNight: number;
  totalPrice: number;
  nights: number;
  image: string;
  amenities: string[];
  freeCancellation: boolean;
  breakfastIncluded: boolean;
  type: string;
}

const AIRLINES = [
  { name: 'Emirates', code: 'EK', logo: '✈️' },
  { name: 'Qatar Airways', code: 'QR', logo: '🛫' },
  { name: 'Singapore Airlines', code: 'SQ', logo: '🌏' },
  { name: 'Turkish Airlines', code: 'TK', logo: '🇹🇷' },
  { name: 'Lufthansa', code: 'LH', logo: '🇩🇪' },
  { name: 'British Airways', code: 'BA', logo: '🇬🇧' },
  { name: 'Air France', code: 'AF', logo: '🇫🇷' },
  { name: 'Etihad Airways', code: 'EY', logo: '🇦🇪' },
];

const HOTEL_NAMES = [
  'Grand Plaza Resort',
  'Ocean View Retreat',
  'Urban Loft Hotel',
  'Heritage Palace',
  'Skyline Boutique',
  'Garden Oasis Inn',
  'Marina Bay Suites',
  'Mountain Lodge Escape',
];

@Component({
  selector: 'app-travel-feeds',
  imports: [CommonModule, DecimalPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './travel-feeds.html',
  styleUrl: './travel-feeds.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelFeedsPage implements OnInit, OnDestroy {
  private readonly feeds = inject(TravelFeeds);
  private readonly fb = inject(FormBuilder);

  protected readonly suggestions = SUGGESTIONS;

  protected readonly trendsState = signal<LoadState>('loading');
  protected readonly trending = signal<TrendingDestination[]>([]);
  protected readonly autoRefreshCountdown = signal(30);
  protected readonly trendingPage = signal(1);
  protected readonly trendingTotalPages = signal(4);
  protected readonly trendingRange = signal('1-3 of 12');

  private trendingOffset = 0;
  private readonly trendingPageSize = 3;
  private readonly trendingTotalSeeds = 12;
  private autoRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private isFirstTrendingLoad = true;

  protected readonly searchState = signal<LoadState>('idle');
  protected readonly result = signal<DestinationFeed | null>(null);
  protected readonly searchedTerm = signal('');

  protected readonly hasKeyedFeeds = this.feeds.hasKeyedFeeds;

  protected readonly form = this.fb.nonNullable.group({
    destination: ['', [Validators.required, Validators.minLength(2)]],
  });

  // Flight search
  protected readonly flightForm = this.fb.nonNullable.group({
    from: ['London', [Validators.required, Validators.minLength(2)]],
    to: ['Tokyo', [Validators.required, Validators.minLength(2)]],
    departDate: [this.defaultDate(7), [Validators.required]],
    returnDate: [this.defaultDate(14)],
    passengers: [1, [Validators.required, Validators.min(1), Validators.max(9)]],
    tripType: ['round-trip' as 'one-way' | 'round-trip'],
    cabinClass: ['economy' as 'economy' | 'premium' | 'business' | 'first'],
  });

  protected readonly flightState = signal<LoadState>('idle');
  protected readonly flightResults = signal<FlightOption[]>([]);
  protected readonly flightSearched = signal(false);

  // Hotel search
  protected readonly hotelForm = this.fb.nonNullable.group({
    destination: ['Kyoto', [Validators.required, Validators.minLength(2)]],
    checkIn: [this.defaultDate(7), [Validators.required]],
    checkOut: [this.defaultDate(10), [Validators.required]],
    guests: [2, [Validators.required, Validators.min(1), Validators.max(10)]],
    rooms: [1, [Validators.required, Validators.min(1), Validators.max(5)]],
  });

  protected readonly hotelState = signal<LoadState>('idle');
  protected readonly hotelResults = signal<HotelOption[]>([]);
  protected readonly hotelSearched = signal(false);

  // Modals - short page, compact UI
  protected readonly showFlightModal = signal(false);
  protected readonly showHotelModal = signal(false);

  protected readonly liveSources = computed(
    () => this.result()?.sources.filter((source) => source.status === 'live') ?? [],
  );
  protected readonly offlineSources = computed(
    () => this.result()?.sources.filter((source) => source.status !== 'live') ?? [],
  );

  constructor() {
    void this.loadTrending(false);
  }

  ngOnInit(): void {
    this.startAutoRefresh();
    void this.searchFlights(false);
    void this.searchHotels(false);
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshCountdown.set(30);

    this.countdownInterval = setInterval(() => {
      const current = this.autoRefreshCountdown();
      if (current <= 1) {
        this.autoRefreshCountdown.set(30);
      } else {
        this.autoRefreshCountdown.set(current - 1);
      }
    }, 1000);

    this.autoRefreshInterval = setInterval(() => {
      if (this.searchState() === 'idle') {
        void this.loadTrending(true);
      }
    }, 30000);
  }

  private stopAutoRefresh(): void {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private defaultDate(offsetDays: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  protected async loadTrending(advance = true): Promise<void> {
    if (advance && !this.isFirstTrendingLoad) {
      this.trendingOffset = (this.trendingOffset + this.trendingPageSize) % this.trendingTotalSeeds;
    }
    this.isFirstTrendingLoad = false;

    this.trendsState.set('loading');
    try {
      const board = await this.feeds.trending(this.trendingOffset, this.trendingPageSize);
      const filtered = board.filter((entry) => entry.trend || entry.photo);
      this.trending.set(filtered);
      this.trendsState.set(filtered.length ? 'ready' : 'error');

      const page = Math.floor(this.trendingOffset / this.trendingPageSize) + 1;
      const totalPages = Math.ceil(this.trendingTotalSeeds / this.trendingPageSize);
      this.trendingPage.set(page);
      this.trendingTotalPages.set(totalPages);
      const start = this.trendingOffset + 1;
      const end = Math.min(this.trendingOffset + this.trendingPageSize, this.trendingTotalSeeds);
      this.trendingRange.set(`${start}-${end} of ${this.trendingTotalSeeds}`);

      if (advance) {
        this.autoRefreshCountdown.set(30);
      }
    } catch {
      this.trendsState.set('error');
    }
  }

  protected async search(term?: string): Promise<void> {
    const value = (term ?? this.form.controls.destination.value).trim();
    if (value.length < 2) {
      this.form.controls.destination.markAsTouched();
      return;
    }

    this.form.controls.destination.setValue(value);
    this.searchedTerm.set(value);
    this.result.set(null);
    this.searchState.set('loading');

    try {
      const feed = await this.feeds.destinationFeed(value);
      this.result.set(feed);
      this.searchState.set('ready');
    } catch {
      this.searchState.set('error');
    }
  }

  protected clear(): void {
    this.form.reset({ destination: '' });
    this.result.set(null);
    this.searchedTerm.set('');
    this.searchState.set('idle');
    // Reset trending offset and restart auto-refresh when returning to idle
    this.trendingOffset = 0;
    this.isFirstTrendingLoad = true;
    void this.loadTrending(false);
    this.startAutoRefresh();
  }

  protected sourceBadgeClass(source: FeedSourceReport): string {
    return `badge badge-${source.status}`;
  }

  protected views(value: number): string {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
  }

  protected sparkPath(values: number[]): string {
    if (values.length < 2) {
      return 'M0 28 L100 28';
    }
    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 26 - ((value - min) / span) * 24;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  protected sparkArea(values: number[]): string {
    const line = this.sparkPath(values);
    return `${line} L100 28 L0 28 Z`;
  }

  // ────────────────────────────────────────────────
  // Flight search (Skyscanner-like)
  // ────────────────────────────────────────────────
  protected async searchFlights(isUserSearch = true): Promise<void> {
    if (isUserSearch && this.flightForm.invalid) {
      this.flightForm.markAllAsTouched();
      return;
    }

    this.flightState.set('loading');
    this.flightSearched.set(true);

    // Simulate network delay for realistic UX
    await new Promise((r) => setTimeout(r, isUserSearch ? 650 : 300));

    const { from, to, departDate, returnDate, passengers, cabinClass, tripType } =
      this.flightForm.getRawValue();

    const results = this.generateFlightResults(
      from,
      to,
      departDate,
      returnDate,
      passengers,
      cabinClass,
      tripType,
    );
    this.flightResults.set(results);
    this.flightState.set('ready');
  }

  private generateFlightResults(
    from: string,
    to: string,
    departDate: string,
    returnDate: string,
    passengers: number,
    cabinClass: string,
    tripType: string,
  ): FlightOption[] {
    const fromCity = from.trim() || 'London';
    const toCity = to.trim() || 'Tokyo';
    const fromCode = fromCity.slice(0, 3).toUpperCase();
    const toCode = toCity.slice(0, 3).toUpperCase();

    const cabinMultiplier =
      cabinClass === 'first' ? 4.5 : cabinClass === 'business' ? 2.8 : cabinClass === 'premium' ? 1.6 : 1;

    const basePrice = 180 + Math.abs(fromCity.length - toCity.length) * 22 + Math.random() * 120;

    const times = [
      { dep: '06:15', arr: '11:40', dur: '8h 25m' },
      { dep: '09:30', arr: '15:05', dur: '8h 35m' },
      { dep: '13:20', arr: '19:45', dur: '9h 25m' },
      { dep: '16:45', arr: '22:10', dur: '8h 25m' },
      { dep: '20:10', arr: '07:30+1', dur: '14h 20m' },
      { dep: '11:05', arr: '16:50', dur: '8h 45m' },
    ];

    return times.map((t, i) => {
      const airline = AIRLINES[i % AIRLINES.length];
      const stops = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;
      const price = Math.round((basePrice + i * 34 + stops * 45) * cabinMultiplier * passengers);
      return {
        id: `fl-${i}`,
        airline: airline.name,
        airlineCode: airline.code,
        flightNumber: `${airline.code}${100 + i * 7}`,
        from: fromCode,
        to: toCode,
        fromCity,
        toCity,
        departure: t.dep,
        arrival: t.arr,
        duration: t.dur,
        stops,
        stopCities: stops === 0 ? [] : stops === 1 ? ['Dubai'] : ['Istanbul', 'Doha'],
        price,
        cabin: cabinClass,
        departureDate: departDate,
        returnDate: tripType === 'round-trip' ? returnDate : undefined,
        logo: airline.logo,
        isDirect: stops === 0,
        baggage: cabinClass === 'economy' ? '1 x 23kg' : '2 x 32kg',
      };
    });
  }

  protected swapFlightLocations(): void {
    const from = this.flightForm.controls.from.value;
    const to = this.flightForm.controls.to.value;
    this.flightForm.controls.from.setValue(to);
    this.flightForm.controls.to.setValue(from);
  }

  protected clearFlightSearch(): void {
    this.flightForm.reset({
      from: 'London',
      to: 'Tokyo',
      departDate: this.defaultDate(7),
      returnDate: this.defaultDate(14),
      passengers: 1,
      tripType: 'round-trip',
      cabinClass: 'economy',
    });
    this.flightResults.set([]);
    this.flightSearched.set(false);
    this.flightState.set('idle');
  }

  // ────────────────────────────────────────────────
  // Hotel search (Skyscanner-like)
  // ────────────────────────────────────────────────
  protected async searchHotels(isUserSearch = true): Promise<void> {
    if (isUserSearch && this.hotelForm.invalid) {
      this.hotelForm.markAllAsTouched();
      return;
    }

    this.hotelState.set('loading');
    this.hotelSearched.set(true);

    await new Promise((r) => setTimeout(r, isUserSearch ? 700 : 350));

    const { destination, checkIn, checkOut, guests, rooms } = this.hotelForm.getRawValue();
    const results = this.generateHotelResults(destination, checkIn, checkOut, guests, rooms);
    this.hotelResults.set(results);
    this.hotelState.set('ready');
  }

  private generateHotelResults(
    destination: string,
    checkIn: string,
    checkOut: string,
    guests: number,
    rooms: number,
  ): HotelOption[] {
    const dest = destination.trim() || 'Kyoto';
    const nights = this.calculateNights(checkIn, checkOut);

    const types = ['Resort', 'Boutique Hotel', 'Luxury Hotel', 'City Hotel', 'Ryokan', 'Villa'];
    const amenitiesPool = [
      ['Free WiFi', 'Pool', 'Spa'],
      ['Free WiFi', 'Breakfast', 'Gym'],
      ['Free WiFi', 'Restaurant', 'Bar'],
      ['Free WiFi', 'Parking', 'Room Service'],
      ['Free WiFi', 'Pool', 'Airport Shuttle'],
      ['Free WiFi', 'Spa', 'Gym', 'Restaurant'],
    ];

    return HOTEL_NAMES.map((name, i) => {
      const rating = 3.8 + Math.random() * 1.2;
      const reviews = 120 + Math.floor(Math.random() * 2100);
      const basePerNight = 75 + i * 22 + Math.random() * 60 + guests * 15 + rooms * 20;
      const pricePerNight = Math.round(basePerNight);
      const totalPrice = pricePerNight * nights * rooms;
      return {
        id: `ht-${i}`,
        name: `${name} ${dest}`,
        location: `${dest} · ${0.3 + i * 0.4} km from centre`,
        rating: Math.round(rating * 10) / 10,
        reviews,
        pricePerNight,
        totalPrice: Math.round(totalPrice),
        nights,
        image: `https://picsum.photos/seed/hotel${i}${dest}/400/260`,
        amenities: amenitiesPool[i % amenitiesPool.length],
        freeCancellation: i % 2 === 0,
        breakfastIncluded: i % 3 !== 0,
        type: types[i % types.length],
      };
    });
  }

  private calculateNights(checkIn: string, checkOut: string): number {
    try {
      const a = new Date(checkIn);
      const b = new Date(checkOut);
      const diff = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 3;
    } catch {
      return 3;
    }
  }

  protected clearHotelSearch(): void {
    this.hotelForm.reset({
      destination: 'Kyoto',
      checkIn: this.defaultDate(7),
      checkOut: this.defaultDate(10),
      guests: 2,
      rooms: 1,
    });
    this.hotelResults.set([]);
    this.hotelSearched.set(false);
    this.hotelState.set('idle');
  }

  protected openFlightModal(): void {
    this.showFlightModal.set(true);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  protected closeFlightModal(): void {
    this.showFlightModal.set(false);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  protected openHotelModal(): void {
    this.showHotelModal.set(true);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  protected closeHotelModal(): void {
    this.showHotelModal.set(false);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  protected onModalBackdropClick(event: MouseEvent, type: 'flight' | 'hotel'): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      if (type === 'flight') this.closeFlightModal();
      else this.closeHotelModal();
    }
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    }).format(price);
  }
}
