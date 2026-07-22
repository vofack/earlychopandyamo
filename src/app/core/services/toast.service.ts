import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  /** Clé de traduction — jamais un texte en dur, pour rester bilingue. */
  key: string;
  params?: Record<string, unknown>;
  kind: ToastKind;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private nextId = 0;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  success(key: string, params?: Record<string, unknown>): void {
    this.push(key, 'success', params);
  }

  error(key: string, params?: Record<string, unknown>): void {
    // Les erreurs restent affichées plus longtemps : elles demandent
    // souvent une action de l'utilisateur.
    this.push(key, 'error', params, 6000);
  }

  info(key: string, params?: Record<string, unknown>): void {
    this.push(key, 'info', params);
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private push(
    key: string,
    kind: ToastKind,
    params?: Record<string, unknown>,
    duration = 3500,
  ): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { id, key, params, kind }]);
    this.timers.set(
      id,
      setTimeout(() => this.dismiss(id), duration),
    );
  }
}
