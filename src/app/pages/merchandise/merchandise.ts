import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommunityService } from '../../services/community.service';
import { rememberCommunityReturnPath } from '../../shared/community-return-path';
import { MerchandiseCatalogService } from './merchandise-catalog.service';
import {
  AddressField,
  CheckoutAddress,
  INDIA_STATES,
  MerchandiseCartItem,
  MerchandiseCartLine,
  MerchandiseProduct,
  addWorkingDays,
  formatIndiaRupees,
  merchandisePaymentBreakdown,
  validateIndiaCheckout,
} from './merchandise-data';

const CART_KEY = 'neverbeen_merchandise_cart_v1';
const DEFAULT_ADDRESS: CheckoutAddress = {
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
};

type ShopView = 'shop' | 'cart' | 'checkout' | 'payment';
type SortOption = 'featured' | 'price-low' | 'price-high' | 'rating' | 'newest';

@Component({
  selector: 'app-merchandise',
  imports: [RouterLink],
  templateUrl: './merchandise.html',
  styleUrl: './merchandise.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Merchandise {
  private readonly community = inject(CommunityService);
  private readonly catalogue = inject(MerchandiseCatalogService);

  protected readonly view = signal<ShopView>('shop');
  protected readonly categories = this.catalogue.categories;
  protected readonly products = this.catalogue.products;
  protected readonly loading = this.catalogue.loading;
  protected readonly catalogueError = this.catalogue.error;
  protected readonly states = INDIA_STATES;
  protected readonly currentCategory = signal('all');
  protected readonly search = signal('');
  protected readonly audience = signal('All');
  protected readonly sort = signal<SortOption>('featured');
  protected readonly maximumPrice = signal(3500);
  protected readonly minimumRating = signal(0);
  protected readonly quickView = signal<MerchandiseProduct | null>(null);
  protected readonly zoomed = signal(false);
  protected readonly selectedSize = signal('');
  protected readonly selectedColor = signal('');
  protected readonly signInGate = signal(false);
  protected readonly cart = signal<MerchandiseCartItem[]>(this.readCart());
  protected readonly toast = signal('');
  protected readonly addressTouched = signal(false);
  protected readonly paymentMethod = signal<'gpay' | 'phonepe'>('gpay');
  protected readonly paymentNotice = signal('');
  protected readonly address = signal<CheckoutAddress>({ ...DEFAULT_ADDRESS });

  protected readonly signedIn = computed(
    () => this.community.isAuthenticated() && !this.community.guestBrowsing(),
  );
  protected readonly member = computed(() => this.community.currentUser());
  protected readonly memberName = computed(() => {
    const member = this.member();
    return (
      member?.fullName?.trim() ||
      [member?.firstName, member?.lastName].filter(Boolean).join(' ').trim()
    );
  });
  protected readonly memberEmail = computed(
    () => this.member()?.email?.trim() || this.member()?.verifiedEmail?.trim() || '',
  );
  protected readonly cartLines = computed<MerchandiseCartLine[]>(() => {
    const byId = new Map(this.products().map((product) => [product.id, product]));
    return this.cart()
      .map((item) => {
        const product = byId.get(item.productId);
        return product ? { ...item, product, lineTotal: product.price * item.quantity } : null;
      })
      .filter((line): line is MerchandiseCartLine => line !== null);
  });
  protected readonly cartCount = computed(() =>
    this.cartLines().reduce((n, line) => n + line.quantity, 0),
  );
  protected readonly subtotal = computed(() =>
    this.cartLines().reduce((sum, line) => sum + line.lineTotal, 0),
  );
  protected readonly charges = computed(() => merchandisePaymentBreakdown(this.subtotal()));
  protected readonly visibleProducts = computed(() => {
    const search = this.search().trim().toLocaleLowerCase();
    const category = this.currentCategory();
    const audience = this.audience();
    const maxPrice = this.maximumPrice();
    const minRating = this.minimumRating();
    const matching = this.products().filter((product) => {
      const matchesCategory = category === 'all' || product.category.slug === category;
      const matchesAudience =
        audience === 'All' || product.audience.toLocaleLowerCase() === audience.toLocaleLowerCase();
      const searchable =
        `${product.name} ${product.description} ${product.category.title} ${product.audience} ${product.material}`.toLocaleLowerCase();
      return (
        matchesCategory &&
        matchesAudience &&
        product.price <= maxPrice &&
        product.rating >= minRating &&
        (!search || searchable.includes(search))
      );
    });
    switch (this.sort()) {
      case 'price-low':
        return matching.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
      case 'price-high':
        return matching.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name));
      case 'rating':
        return matching.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
      case 'newest':
        return matching.sort((a, b) => b.id.localeCompare(a.id));
      default:
        return matching.sort((a, b) => {
          const badge = Number(!!b.badge) - Number(!!a.badge);
          return badge || b.rating - a.rating || b.reviews - a.reviews;
        });
    }
  });
  protected readonly validationErrors = computed(() =>
    validateIndiaCheckout(this.memberName(), this.memberEmail(), this.address()),
  );
  protected readonly addressIsValid = computed(
    () => Object.keys(this.validationErrors()).length === 0,
  );
  protected readonly estimatedDelivery = formatDeliveryDate(addWorkingDays(new Date(), 15));
  protected readonly deliveryLabel = '15 working days';
  protected readonly currentYear = new Date().getFullYear();

  constructor() {
    void this.catalogue.load();
  }

  protected money(amount: number): string {
    return formatIndiaRupees(amount);
  }

  protected categoryCount(slug: string): number {
    return this.products().filter((product) => product.category.slug === slug).length;
  }

  protected setCategory(value: string): void {
    this.currentCategory.set(value);
  }

  protected setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected setAudience(value: string): void {
    this.audience.set(value);
  }

  protected setAudienceFromEvent(event: Event): void {
    this.setAudience((event.target as HTMLSelectElement).value);
  }

  protected setSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortOption);
  }

  protected setMaximumPrice(event: Event): void {
    this.maximumPrice.set(Number((event.target as HTMLInputElement).value));
  }

  protected setMinimumRating(event: Event): void {
    this.minimumRating.set(Number((event.target as HTMLSelectElement).value));
  }

  protected openProduct(product: MerchandiseProduct): void {
    this.quickView.set(product);
    this.selectedSize.set(product.sizes[0] ?? 'One size');
    this.selectedColor.set(product.colors[0] ?? '');
    this.zoomed.set(false);
  }

  protected closeProduct(): void {
    this.quickView.set(null);
    this.zoomed.set(false);
  }

  protected chooseSize(size: string): void {
    this.selectedSize.set(size);
  }

  protected chooseColor(color: string): void {
    this.selectedColor.set(color);
  }

  protected addCurrentProduct(): void {
    const product = this.quickView();
    if (!product) return;
    this.addToCart(product, this.selectedSize(), this.selectedColor());
  }

  private addToCart(product: MerchandiseProduct, size: string, color: string): void {
    if (!this.signedIn()) {
      this.signInGate.set(true);
      return;
    }
    const item: MerchandiseCartItem = {
      productId: product.id,
      quantity: 1,
      size: size || product.sizes[0] || 'One size',
      color: color || product.colors[0] || '',
    };
    this.cart.update((items) => {
      const existing = items.find(
        (current) =>
          current.productId === item.productId &&
          current.size === item.size &&
          current.color === item.color,
      );
      if (existing) {
        return items.map((current) =>
          current === existing
            ? { ...current, quantity: Math.min(10, current.quantity + 1) }
            : current,
        );
      }
      return [...items, item];
    });
    this.persistCart();
    this.quickView.set(null);
    this.showToast(`${product.name} added to your bag`);
  }

  protected openCart(): void {
    this.view.set('cart');
    this.scrollToTop();
  }

  protected continueShopping(): void {
    this.view.set('shop');
    this.scrollToTop();
  }

  protected changeQuantity(line: MerchandiseCartLine, delta: number): void {
    this.cart.update((items) =>
      items
        .map((item) => {
          if (
            item.productId !== line.productId ||
            item.size !== line.size ||
            item.color !== line.color
          )
            return item;
          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0 && item.quantity <= 10),
    );
    this.persistCart();
  }

  protected removeLine(line: MerchandiseCartLine): void {
    this.cart.update((items) =>
      items.filter(
        (item) =>
          item.productId !== line.productId || item.size !== line.size || item.color !== line.color,
      ),
    );
    this.persistCart();
  }

  protected beginCheckout(): void {
    if (!this.cartLines().length) return;
    if (!this.signedIn()) {
      this.signInGate.set(true);
      return;
    }
    this.addressTouched.set(false);
    this.address.set({ ...DEFAULT_ADDRESS });
    this.view.set('checkout');
    this.scrollToTop();
  }

  protected onAddressInput(field: keyof CheckoutAddress, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    this.address.update((address) => ({ ...address, [field]: target.value }));
  }

  protected addressError(field: AddressField): string {
    return this.addressTouched() ? (this.validationErrors()[field] ?? '') : '';
  }

  protected continueToPayment(): void {
    this.addressTouched.set(true);
    if (!this.signedIn()) {
      this.signInGate.set(true);
      return;
    }
    if (!this.addressIsValid()) return;
    this.paymentNotice.set('');
    this.view.set('payment');
    this.scrollToTop();
  }

  protected selectPayment(method: 'gpay' | 'phonepe'): void {
    this.paymentMethod.set(method);
    this.paymentNotice.set('');
  }

  protected paymentSetupNotice(): void {
    const method = this.paymentMethod() === 'gpay' ? 'Google Pay' : 'PhonePe';
    this.paymentNotice.set(
      `${method} is selected. Payments are not live yet, so no payment was started and no money has been taken. NeverBeen needs a verified merchant account and server-side order confirmation before checkout can collect payment.`,
    );
  }

  protected backToCart(): void {
    this.view.set('cart');
    this.scrollToTop();
  }

  protected closeSignInGate(): void {
    this.signInGate.set(false);
  }

  protected rememberSignInReturn(): void {
    rememberCommunityReturnPath('/merchandise');
  }

  protected productDiscount(product: MerchandiseProduct): number {
    if (!product.compareAtPrice || product.compareAtPrice <= product.price) return 0;
    return Math.round((1 - product.price / product.compareAtPrice) * 100);
  }

  protected swatch(color: string): string {
    const value = color.toLocaleLowerCase();
    if (value.includes('navy')) return '#123b68';
    if (value.includes('graphite') || value.includes('black')) return '#3a3f45';
    if (value.includes('ivory') || value.includes('cream') || value.includes('natural'))
      return '#f0e7d8';
    if (value === 'steel' || value.includes('steel /')) return '#c9ced6';
    if (value.includes('blue')) return '#a9bdd3';
    if (value.includes('pink') || value.includes('blush') || value.includes('rose'))
      return '#f1c7d2';
    if (value.includes('mint')) return '#b7d5c1';
    if (value.includes('sage')) return '#93a68b';
    if (value.includes('tan') || value.includes('copper') || value.includes('brass'))
      return '#b8784a';
    if (value.includes('sand')) return '#dbcbb4';
    if (value.includes('lilac') || value.includes('purple')) return '#b8acd9';
    return '#d8dbe0';
  }

  protected scrollToCollection(): void {
    if (typeof document === 'undefined') return;
    document
      .getElementById('shop-products')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected clearFilters(): void {
    this.currentCategory.set('all');
    this.search.set('');
    this.audience.set('All');
    this.sort.set('featured');
    this.maximumPrice.set(3500);
    this.minimumRating.set(0);
  }

  protected retryLoad(): void {
    void this.catalogue.load();
  }

  private cartStorageKey(): string {
    const member = this.community.currentUser();
    const memberKey = member?.uniqueId || (member ? String(member.id) : 'guest');
    return `${CART_KEY}_${memberKey}`;
  }

  private readCart(): MerchandiseCartItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const parsed = JSON.parse(localStorage.getItem(this.cartStorageKey()) ?? '[]') as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is MerchandiseCartItem =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as MerchandiseCartItem).productId === 'string' &&
          Number.isInteger((item as MerchandiseCartItem).quantity) &&
          (item as MerchandiseCartItem).quantity > 0 &&
          typeof (item as MerchandiseCartItem).size === 'string' &&
          typeof (item as MerchandiseCartItem).color === 'string',
      );
    } catch {
      return [];
    }
  }

  private persistCart(): void {
    try {
      localStorage.setItem(this.cartStorageKey(), JSON.stringify(this.cart()));
    } catch {
      // Keep the in-memory bag usable when storage is blocked or full.
    }
  }

  private showToast(message: string): void {
    this.toast.set(message);
    setTimeout(() => {
      if (this.toast() === message) this.toast.set('');
    }, 2800);
  }

  private scrollToTop(): void {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function formatDeliveryDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
