import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';

interface AdminLink {
  path: string;
  key: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly orders = inject(OrderService);
  readonly language = inject(LanguageService);

  readonly navOpen = signal(false);

  readonly links: AdminLink[] = [
    { path: 'dashboard', key: 'dashboard', icon: '📊' },
    { path: 'orders', key: 'orders', icon: '🧾' },
    { path: 'menu', key: 'menu', icon: '🍲' },
    { path: 'customers', key: 'customers', icon: '👥' },
    { path: 'stats', key: 'stats', icon: '📈' },
    { path: 'settings', key: 'settings', icon: '⚙️' },
  ];

  async logout(): Promise<void> {
    await this.auth.signOut();
    this.toast.info('toast.loggedOut');
    await this.router.navigate(['/admin/login']);
  }
}
