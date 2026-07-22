import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { CartService } from '../../core/services/cart.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import {
  Order,
  OrderInput,
  PAYMENT_METHODS,
  PaymentMethod,
  shortOrderId,
} from '../../shared/models/order.model';
import { LocalizedPipe } from '../../shared/pipes/localized.pipe';

/**
 * Indicatifs régionaux du Québec. Un numéro hors de cette liste est presque
 * toujours une faute de frappe ou un client hors zone de livraison.
 */
const QC_PHONE =
  /^(\+?1[\s.-]?)?\(?(418|438|450|468|514|579|581|819|873)\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

/** Format canadien : lettre-chiffre-lettre espace chiffre-lettre-chiffre. */
const CA_POSTAL = /^[A-Za-z]\d[A-Za-z][\s-]?\d[A-Za-z]\d$/;

@Component({
  selector: 'app-checkout',
  imports: [
    ReactiveFormsModule,
    CurrencyPipe,
    TranslatePipe,
    RouterLink,
    LocalizedPipe,
    EmptyStateComponent,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(NotificationService);
  private readonly seo = inject(SeoService);
  private readonly auth = inject(AuthService);
  private readonly account = inject(AccountService);

  readonly cart = inject(CartService);
  readonly settings = inject(SettingsService);
  readonly language = inject(LanguageService);

  readonly paymentMethods = PAYMENT_METHODS;
  readonly deliveryEstimate = environment.deliveryEstimate;

  readonly submitting = signal(false);
  readonly submitFailed = signal(false);

  /** Case « utiliser mon repas gratuit » cochée par le client. */
  readonly useFreeMeal = signal(false);

  // ── Programme de fidélité au checkout ──────────────────────────────────

  /** Commandes du client connecté, pour les gardes anti-double-usage. */
  private readonly myOrders = toSignal(
    toObservable(computed(() => this.auth.user()?.uid ?? null)).pipe(
      switchMap((uid) => (uid ? this.orders.watchUserOrders(uid) : of([] as Order[]))),
    ),
    { initialValue: [] as Order[] },
  );

  private readonly referralOn = computed(() => this.settings.settings().referral.enabled);

  /**
   * Avantage filleul : réservé à la TOUTE PREMIÈRE commande d'un client venu
   * par un lien de parrainage. Le garde `myOrders().length === 0` empêche de
   * le récolter deux fois en enchaînant deux commandes avant livraison.
   */
  readonly welcomePerkEligible = computed(() => {
    const p = this.account.profile();
    return (
      this.referralOn() && !!p && !!p.referredBy && !p.welcomePerkUsed && this.myOrders().length === 0
    );
  });

  /** Un repas gratuit déjà « réservé » sur une commande non encore livrée. */
  private readonly hasPendingFreeMeal = computed(() =>
    this.myOrders().some((o) => o.freeMealApplied && o.status !== 'delivered'),
  );

  readonly freeMealEligible = computed(
    () => this.referralOn() && this.account.freeMeals() >= 1 && !this.hasPendingFreeMeal(),
  );

  private readonly welcomeDiscount = computed(() =>
    this.welcomePerkEligible() ? this.settings.settings().referral.welcomePerkAmount : 0,
  );

  /** Le repas gratuit est-il effectivement appliqué (case cochée + éligible) ? */
  readonly freeMealDiscountActive = computed(
    () => this.useFreeMeal() && this.freeMealEligible(),
  );

  private readonly freeMealDiscount = computed(() =>
    this.freeMealDiscountActive() ? this.settings.settings().referral.freeMealCredit : 0,
  );

  /** Réduction totale, plafonnée au montant de la commande (jamais négatif). */
  readonly discount = computed(() =>
    Math.min(this.cart.total(), this.welcomeDiscount() + this.freeMealDiscount()),
  );

  readonly finalTotal = computed(() => Math.max(0, this.cart.total() - this.discount()));

  /** Empêche le préremplissage d'écraser une saisie déjà commencée. */
  private prefilled = false;

  constructor() {
    // Préremplit nom et courriel depuis le profil Google dès qu'il arrive,
    // sans écraser ce que le client aurait déjà tapé.
    effect(() => {
      const p = this.account.profile();
      if (!p || this.prefilled) return;
      if (!this.form.controls.clientName.value && p.displayName) {
        this.form.controls.clientName.setValue(p.displayName);
      }
      if (!this.form.controls.email.value && p.email) {
        this.form.controls.email.setValue(p.email);
      }
      this.prefilled = true;
    });
  }

  /** Commande créée — bascule l'écran en mode succès. */
  readonly placedOrder = signal<Order | null>(null);
  /** `false` si le courriel de confirmation n'a pas pu partir. */
  readonly emailDelivered = signal(true);

  readonly form = this.fb.nonNullable.group({
    clientName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(QC_PHONE)]],
    address: ['', [Validators.required, Validators.minLength(8)]],
    // Enveloppé dans une lambda : les propriétés de classe sont initialisées
    // dans l'ordre de déclaration, et `zoneValidator` est défini plus bas.
    // Une référence directe vaudrait `undefined` ici.
    postalCode: [
      '',
      [Validators.required, Validators.pattern(CA_POSTAL), (c: AbstractControl) => this.zoneValidator(c)],
    ],
    // Union complète : le <select> peut légitimement produire n'importe
    // laquelle des valeurs de PAYMENT_METHODS.
    paymentMethod: ['cash' as PaymentMethod, [Validators.required]],
    notes: [''],
  });

  readonly canSubmit = computed(
    () => !this.cart.isEmpty() && this.settings.isOpenNow() && !this.submitting(),
  );

  readonly whatsappLink = computed(() => {
    const order = this.placedOrder();
    return order ? this.notifications.buildWhatsAppLink(order) : '';
  });

  readonly shortId = computed(() => {
    const order = this.placedOrder();
    return order ? shortOrderId(order.id) : '';
  });

  ngOnInit(): void {
    this.seo.set('checkout.title');
    // Un tunnel de commande n'a aucune raison d'être indexé.
    this.seo.noIndex();
  }

  /**
   * Vérifie que le code postal est dans la zone desservie.
   *
   * Ne se prononce pas si le format est déjà invalide : c'est le rôle du
   * validateur de motif, et cumuler les deux erreurs brouillerait le message.
   */
  private zoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value as string;
    if (!value || !CA_POSTAL.test(value)) return null;
    return this.settings.isPostalCodeInZone(value) ? null : { outOfZone: true };
  }

  /** Un champ n'affiche son erreur qu'une fois touché ou le formulaire soumis. */
  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  errorKey(field: string): string | null {
    const control = this.form.get(field);
    if (!control?.errors) return null;

    const map: Record<string, Record<string, string>> = {
      clientName: { required: 'nameRequired', minlength: 'nameMin' },
      email: { required: 'emailRequired', email: 'emailInvalid' },
      phone: { required: 'phoneRequired', pattern: 'phoneInvalid' },
      address: { required: 'addressRequired', minlength: 'addressMin' },
      postalCode: {
        required: 'postalRequired',
        pattern: 'postalInvalid',
        outOfZone: 'postalOutOfZone',
      },
      paymentMethod: { required: 'paymentRequired' },
    };

    const first = Object.keys(control.errors)[0];
    return map[field]?.[first] ? `checkout.errors.${map[field][first]}` : 'common.error';
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      // Marque tout le formulaire pour révéler d'un coup les champs fautifs,
      // plutôt que de laisser l'utilisateur les découvrir un par un.
      this.form.markAllAsTouched();
      document.querySelector('.is-invalid')?.scrollIntoView({ block: 'center' });
      return;
    }

    if (!this.canSubmit()) return;

    this.submitting.set(true);
    this.submitFailed.set(false);

    const value = this.form.getRawValue();
    // On fige l'éligibilité au moment de la soumission (les computed peuvent
    // changer si un flux temps réel émet entre-temps).
    const useFreeMeal = this.useFreeMeal() && this.freeMealEligible();
    const welcomePerk = this.welcomePerkEligible();

    const input: OrderInput = {
      clientName: value.clientName.trim(),
      email: value.email.trim().toLowerCase(),
      phone: value.phone.trim(),
      address: value.address.trim(),
      postalCode: value.postalCode.trim().toUpperCase(),
      items: this.cart.items(),
      subtotal: this.cart.subtotal(),
      deliveryFee: this.settings.deliveryFee(),
      total: this.finalTotal(),
      paymentMethod: value.paymentMethod,
      notes: value.notes.trim(),
      status: 'new',
      lang: this.language.current(),
      statusHistory: [],
      // Lien avec le compte (null pour un invité). Les règles Firestore
      // vérifient que ce userId est bien celui de l'auteur authentifié.
      userId: this.auth.user()?.uid ?? null,
      discount: this.discount(),
      freeMealApplied: useFreeMeal,
      welcomePerkApplied: welcomePerk,
    };

    try {
      // ÉTAPE 1 — persister. Si cela échoue, on s'arrête : rien n'est promis
      // au client et le panier reste intact pour qu'il puisse réessayer.
      const id = await this.orders.createOrder(input);
      const order: Order = { ...input, id };

      // ÉTAPE 2 — notifier. Volontairement APRÈS, et sans jamais lever :
      // la commande est déjà enregistrée, un quota EmailJS dépassé ne doit
      // pas faire croire au client que sa commande a échoué.
      const emailOk = await this.notifications.notifyNewOrder(order);
      this.emailDelivered.set(emailOk);

      this.placedOrder.set(order);
      this.cart.clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('[checkout] enregistrement de la commande échoué', error);
      this.submitFailed.set(true);
    } finally {
      this.submitting.set(false);
    }
  }
}
