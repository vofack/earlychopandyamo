import { ChangeDetectionStrategy, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService, LoginError } from '../../../core/services/auth.service';
import { SeoService } from '../../../core/services/seo.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly sendingReset = signal(false);
  readonly error = signal<LoginError | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    // Un administrateur déjà connecté qui atterrit ici est renvoyé
    // directement vers l'espace admin. On attend `resolved` : sans cela, la
    // redirection se déclencherait sur le `null` initial de Firebase.
    effect(() => {
      if (this.auth.resolved() && this.auth.isLoggedIn()) {
        this.router.navigateByUrl(this.returnUrl());
      }
    });
  }

  ngOnInit(): void {
    this.seo.set('admin.login.title');
    this.seo.noIndex();
  }

  private returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') ?? '/admin/dashboard';
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();

    try {
      await this.auth.signIn(email, password);
      await this.router.navigateByUrl(this.returnUrl());
    } catch (err) {
      this.error.set(this.auth.mapError(err));
    } finally {
      this.submitting.set(false);
    }
  }

  /**
   * Envoie un courriel de réinitialisation à l'adresse saisie.
   *
   * On répond toujours par un message positif, même si l'adresse est inconnue :
   * confirmer « ce compte n'existe pas » révélerait quels courriels sont admin
   * (énumération de comptes). L'utilisateur légitime reçoit son courriel.
   */
  async forgotPassword(): Promise<void> {
    const email = this.form.controls.email.value.trim();
    if (!email || this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.toast.error('admin.login.resetNeedEmail');
      return;
    }

    this.sendingReset.set(true);
    try {
      await this.auth.sendPasswordReset(email);
    } catch (err) {
      // On journalise mais on n'expose rien de plus à l'écran.
      console.error('[admin-login] envoi réinitialisation', err);
    } finally {
      this.sendingReset.set(false);
      this.toast.success('admin.login.resetSent');
    }
  }

  /** Clé de traduction du message d'erreur courant. */
  errorKey(): string {
    switch (this.error()) {
      case 'invalid':
        return 'admin.login.errorInvalid';
      case 'tooMany':
        return 'admin.login.errorTooMany';
      default:
        return 'common.error';
    }
  }
}
