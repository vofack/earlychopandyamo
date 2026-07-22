import { Routes } from '@angular/router';
import { accountGuard } from './core/guards/account.guard';
import { adminGuard } from './core/guards/admin.guard';

/**
 * Tout est chargé paresseusement : un client qui commande ne télécharge
 * jamais le code de l'espace admin, et inversement.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'menu',
    loadComponent: () => import('./features/menu/menu.component').then((m) => m.MenuComponent),
  },
  {
    path: 'checkout',
    loadComponent: () =>
      import('./features/checkout/checkout.component').then((m) => m.CheckoutComponent),
  },
  {
    // Suivi client. L'identifiant Firestore (20 caractères aléatoires) fait
    // office de secret : le lien n'est deviné par personne, et les commandes
    // ne sont pas listables publiquement (voir firestore.rules).
    path: 'suivi/:id',
    loadComponent: () =>
      import('./features/order-tracking/order-tracking.component').then(
        (m) => m.OrderTrackingComponent,
      ),
  },
  {
    // Espace compte client (parrainage, points, mes commandes). Réservé aux
    // utilisateurs connectés — n'importe quel client Google.
    path: 'compte',
    canActivate: [accountGuard],
    loadComponent: () =>
      import('./features/account/account.component').then((m) => m.AccountComponent),
  },

  // ── Espace restaurant ────────────────────────────────────────────────
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/admin-login/admin-login.component').then(
        (m) => m.AdminLoginComponent,
      ),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/admin-dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/admin-orders/admin-orders.component').then(
            (m) => m.AdminOrdersComponent,
          ),
      },
      {
        path: 'menu',
        loadComponent: () =>
          import('./features/admin/admin-menu/admin-menu.component').then(
            (m) => m.AdminMenuComponent,
          ),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/admin/admin-customers/admin-customers.component').then(
            (m) => m.AdminCustomersComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/admin/admin-settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent,
          ),
      },
      {
        path: 'stats',
        loadComponent: () =>
          import('./features/admin/admin-stats/admin-stats.component').then(
            (m) => m.AdminStatsComponent,
          ),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
