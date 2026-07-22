import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { environment } from '../../../../environments/environment';
import { NotificationService } from '../../../core/services/notification.service';
import { SettingsService } from '../../../core/services/settings.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly notifications = inject(NotificationService);
  readonly settings = inject(SettingsService);

  readonly restaurant = environment.restaurant;
  readonly year = new Date().getFullYear();

  readonly whatsappLink = computed(() => this.notifications.buildGeneralWhatsAppLink());

  /** Index 0-6 pour itérer sur la semaine dans le gabarit. */
  readonly weekDays = [0, 1, 2, 3, 4, 5, 6];

  readonly todayIndex = new Date().getDay();
}
