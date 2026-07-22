import { inject, Injectable, signal } from '@angular/core';
import { getDownloadURL, ref, Storage, uploadBytesResumable } from '@angular/fire/storage';
import { environment } from '../../../environments/environment';

/**
 * Téléversement des photos de plats — trois stratégies, une seule interface.
 *
 * Le composant admin appelle toujours `upload(file)` sans se soucier du mode.
 * Le mode est fixé dans `environment.imageUpload.mode` :
 *
 *  'cloudinary' → envoi direct navigateur → Cloudinary (gratuit, sans carte).
 *  'firebase'   → Firebase Storage (exige le plan Blaze).
 *  'url'        → aucun téléversement, l'admin colle une URL à la main.
 */
@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  private readonly storage = inject(Storage);

  private readonly config = environment.imageUpload;

  /** Progression 0-100 pendant un téléversement, `null` au repos. */
  private readonly _progress = signal<number | null>(null);
  readonly progress = this._progress.asReadonly();

  get mode(): 'cloudinary' | 'firebase' | 'url' {
    return this.config.mode;
  }

  /**
   * Le mode permet-il un vrai téléversement de fichier ?
   *
   * Pour Cloudinary, on vérifie aussi que la configuration a été renseignée :
   * sans cela, on afficherait un bouton d'upload qui échouerait à chaque fois.
   * Dans ce cas on retombe sur le champ URL, toujours fonctionnel.
   */
  get canUpload(): boolean {
    if (this.mode === 'firebase') return true;
    if (this.mode === 'cloudinary') return this.isCloudinaryConfigured();
    return false;
  }

  private isCloudinaryConfigured(): boolean {
    const c = this.config.cloudinary;
    return (
      !!c.cloudName && !c.cloudName.startsWith('À_REMPLIR') &&
      !!c.uploadPreset && !c.uploadPreset.startsWith('À_REMPLIR')
    );
  }

  /** Téléverse un fichier et renvoie son URL publique. */
  async upload(file: File): Promise<string> {
    if (this.mode === 'cloudinary') return this.uploadToCloudinary(file);
    if (this.mode === 'firebase') return this.uploadToFirebase(file);
    throw new Error(
      "Le mode 'url' n'accepte pas de téléversement. Collez une URL, ou passez " +
        "environment.imageUpload.mode à 'cloudinary'.",
    );
  }

  /**
   * Téléversement « unsigned » vers Cloudinary.
   *
   * Aucun secret n'est exposé : un preset unsigned autorise l'upload anonyme
   * vers un dossier dédié, sans clé API. C'est le mécanisme prévu par
   * Cloudinary pour les téléversements côté navigateur.
   *
   * On utilise XMLHttpRequest plutôt que fetch : seul XHR expose la
   * progression du téléversement, indispensable pour la barre de progression.
   */
  private uploadToCloudinary(file: File): Promise<string> {
    const { cloudName, uploadPreset } = this.config.cloudinary;
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    // Range les photos dans un dossier dédié plutôt qu'à la racine du compte.
    form.append('folder', 'earlychop-dishes');

    this._progress.set(0);

    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          this._progress.set(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        this._progress.set(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            // `secure_url` est le lien HTTPS définitif de l'image.
            res.secure_url ? resolve(res.secure_url) : reject(new Error('Réponse Cloudinary sans secure_url'));
          } catch {
            reject(new Error('Réponse Cloudinary illisible'));
          }
        } else {
          // Cause la plus fréquente : preset inexistant ou resté en « signed ».
          reject(new Error(`Cloudinary a répondu ${xhr.status}. Vérifiez que le preset existe et est « Unsigned ».`));
        }
      };

      xhr.onerror = () => {
        this._progress.set(null);
        reject(new Error('Échec réseau lors du téléversement vers Cloudinary.'));
      };

      xhr.send(form);
    });
  }

  private async uploadToFirebase(file: File): Promise<string> {
    // Nom unique : deux plats nommés « Poulet DG » ne doivent pas écraser
    // mutuellement leur photo.
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `dishes/${Date.now()}-${safeName}`;
    const task = uploadBytesResumable(ref(this.storage, path), file);

    this._progress.set(0);

    try {
      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snap) => this._progress.set(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve(),
        );
      });
      return await getDownloadURL(task.snapshot.ref);
    } finally {
      this._progress.set(null);
    }
  }

  /**
   * Validation légère d'une URL collée.
   *
   * On ne peut pas garantir depuis le navigateur qu'une URL pointe vers une
   * image sans la charger ; l'aperçu live du formulaire admin joue ce rôle de
   * vérification finale. On se contente ici d'écarter les fautes de frappe
   * évidentes et les schémas non sécurisés.
   */
  isPlausibleImageUrl(url: string): boolean {
    if (!url?.trim()) return false;
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  /** Image, et taille ≤ 5 Mo. */
  isAcceptableFile(file: File): boolean {
    return file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024;
  }
}
