import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  HubPaginableTableCellDirective,
  HubTableComponent,
  HubTranslationService,
  PaginableTableHeader,
  PaginableTableOrdination,
} from 'ng-hub-ui-paginable';
import { catchError, forkJoin, of } from 'rxjs';
import { Api, Kargagunea, KargaPostua, Udalerria } from '../services/api';
import { AuthService } from '../services/auth';
import { filterOptions } from '../services/filter-options';

type KargaguneaTaulan = Kargagunea & {
  egoera_etiketa: string;
  karga_postuak_kopurua: number;
  udalerria_izena: string;
};

@Component({
  imports: [FormsModule, CommonModule, HubTableComponent, HubPaginableTableCellDirective],
  providers: [HubTranslationService],
  selector: 'app-kargaguneak',
  styleUrl: './kargaguneak.css',
  templateUrl: './kargaguneak.html',
})
export class Kargaguneak implements OnInit {
  private apiService = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  protected auth = inject(AuthService);

  private kargaguneaSortuDialog = viewChild<ElementRef<HTMLDialogElement>>('kargaguneaSortu');
  private kargaguneaAldatuDialog = viewChild<ElementRef<HTMLDialogElement>>('kargaguneaAldatu');
  private kargaguneaIrudiakDialog = viewChild<ElementRef<HTMLDialogElement>>('kargaguneaIrudiak');
  private kargaguneaTakillakDialog = viewChild<ElementRef<HTMLDialogElement>>('kargaguneaTakillak');

  readonly egoerak = ['Erabilgarri', 'Mantentze-lanetan', 'Zerbitzutik kanpo'];
  readonly postuEgoerak = ['hutsa', 'kargatuta', 'kargatzen'];

  kargaguneak = signal<KargaguneaTaulan[]>([]);
  udalerriak = signal<Udalerria[]>([]);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);

  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);
  irudiaIgotzen = signal<number | null>(null);

  headers: PaginableTableHeader[] = this.buildHeaders([]);

  kargaguneaBerria: Kargagunea = this.kargaguneHutsa();
  kargaguneaEditatzen: Kargagunea = this.kargaguneHutsa();
  kargaguneaHautatua: KargaguneaTaulan | null = null;
  editatuId: number | null = null;

  kargaPostuaBerria = { egoera: 'hutsa' };

  ngOnInit(): void {
    this.kargaguneakKargatu();
  }

  kargaguneakKargatu(): void {
    this.isLoading.set(true);
    const udalerriaId = this.auth.isSuperadmin()
      ? undefined
      : this.auth.udalerriaId() ?? undefined;

    forkJoin({
      kargaguneak: this.apiService.getKargaguneak(udalerriaId, true),
      udalerriak: this.apiService.getUdalerriak().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ kargaguneak, udalerriak }) => {
        this.udalerriak.set(udalerriak);
        this.headers = this.buildHeaders(udalerriak);

        const prestatuak = kargaguneak.map((kargagunea) =>
          this.taularakoPrestatu(kargagunea, udalerriak),
        );
        this.kargaguneak.set(prestatuak);

        if (this.kargaguneaHautatua) {
          this.kargaguneaHautatua =
            prestatuak.find((kargagunea) => kargagunea.id === this.kargaguneaHautatua?.id) ?? null;
        }

        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irekiSortu(): void {
    this.kargaguneaBerria = this.kargaguneHutsa();
    if (!this.kargaguneaBerria.udalerria_id) {
      this.kargaguneaBerria.udalerria_id = this.udalerriak().find(
        (udalerria) => udalerria.aktiboa,
      )?.id;
    }
    this.kargaguneaSortuDialog()?.nativeElement.showModal();
  }

  sortuKargagunea(): void {
    this.apiService.sortuKargaguneak(this.kargaguneaBerria).subscribe({
      next: () => {
        this.kargaguneaSortuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Kargagunea ongi sortu da.' });
        this.kargaguneakKargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irekiAldaketa(kargagunea: KargaguneaTaulan): void {
    this.editatuId = kargagunea.id ?? null;
    this.kargaguneaEditatzen = {
      izena: kargagunea.izena,
      helbidea: kargagunea.helbidea,
      irudia1: kargagunea.irudia1,
      irudia2: kargagunea.irudia2,
      irudia3: kargagunea.irudia3,
      egoera: this.egoeraNormalizatu(kargagunea.egoera),
      udalerria_id: kargagunea.udalerria_id,
      latitud: kargagunea.latitud ?? null,
      longitud: kargagunea.longitud ?? null,
    };
    this.kargaguneaAldatuDialog()?.nativeElement.showModal();
  }

  gordeAldaketa(): void {
    if (this.editatuId === null) {
      return;
    }

    const datuak = {
      izena: this.kargaguneaEditatzen.izena,
      helbidea: this.kargaguneaEditatzen.helbidea,
      egoera: this.kargaguneaEditatzen.egoera,
      udalerria_id: this.kargaguneaEditatzen.udalerria_id,
      latitud: this.kargaguneaEditatzen.latitud,
      longitud: this.kargaguneaEditatzen.longitud,
    };

    this.apiService.aldatuKargaguneak(this.editatuId, datuak).subscribe({
      next: () => {
        this.kargaguneaAldatuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Kargagunearen datuak ongi aldatu dira.' });
        this.kargaguneakKargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irekiIrudiak(kargagunea: KargaguneaTaulan): void {
    this.editatuId = kargagunea.id ?? null;
    this.kargaguneaEditatzen = {
      izena: kargagunea.izena,
      helbidea: kargagunea.helbidea,
      irudia1: kargagunea.irudia1,
      irudia2: kargagunea.irudia2,
      irudia3: kargagunea.irudia3,
      egoera: this.egoeraNormalizatu(kargagunea.egoera),
    };
    this.kargaguneaIrudiakDialog()?.nativeElement.showModal();
  }

  igoIrudia(event: Event, posizio: 1 | 2 | 3): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file || this.editatuId === null) {
      return;
    }

    this.irudiaIgotzen.set(posizio);
    this.apiService.igoKargaguneaIrudia(this.editatuId, file).subscribe({
      next: ({ irudia }) => {
        if (posizio === 1) {
          this.kargaguneaEditatzen.irudia1 = irudia;
        } else if (posizio === 2) {
          this.kargaguneaEditatzen.irudia2 = irudia;
        } else {
          this.kargaguneaEditatzen.irudia3 = irudia;
        }
        this.irudiaIgotzen.set(null);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.irudiaIgotzen.set(null);
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  desaktibatuKargagunea(): void {
    if (this.editatuId === null) {
      return;
    }

    this.apiService
      .aldatuKargaguneak(this.editatuId, { egoera: 'Zerbitzutik kanpo' })
      .subscribe({
        next: () => {
          this.kargaguneaAldatuDialog()?.nativeElement.close();
          this.feedback.set({ mota: 'ok', testua: 'Kargagunea desaktibatu da.' });
          this.kargaguneakKargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  qrUrl(kargaPostua: KargaPostua): string {
    const edukia = `kargagunea:${this.kargaguneaHautatua?.id ?? ''};posta:${kargaPostua.id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(edukia)}`;
  }

  aldatuPostuEgoera(kargaPostua: KargaPostua, egoera: string): void {
    this.apiService.aldatuKargaPostua(kargaPostua.id, { egoera }).subscribe({
      next: () => {
        this.feedback.set({ mota: 'ok', testua: 'Karga postuaren egoera aldatu da.' });
        this.kargaguneakKargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  gordeIrudiak(): void {
    if (this.editatuId === null) {
      return;
    }

    const irudiak = {
      irudia1: this.kargaguneaEditatzen.irudia1,
      irudia2: this.kargaguneaEditatzen.irudia2,
      irudia3: this.kargaguneaEditatzen.irudia3,
    };

    this.apiService.aldatuKargaguneak(this.editatuId, irudiak).subscribe({
      next: () => {
        this.kargaguneaIrudiakDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Kargagunearen irudiak ongi aldatu dira.' });
        this.kargaguneakKargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  ezabatuKargagunea(kargagunea: KargaguneaTaulan): void {
    if (kargagunea.id === undefined) {
      return;
    }

    if (!window.confirm(`Ziur zaude "${kargagunea.izena}" kargagunea ezabatu nahi duzula?`)) {
      return;
    }

    this.apiService.ezabatuKargaguneak(kargagunea.id).subscribe({
      next: () => {
        this.feedback.set({ mota: 'ok', testua: 'Kargagunea ongi ezabatu da.' });
        this.kargaguneakKargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irekiTakillak(kargagunea: KargaguneaTaulan): void {
    this.kargaguneaHautatua = kargagunea;
    this.kargaPostuaBerria = { egoera: 'hutsa' };
    this.kargaguneaTakillakDialog()?.nativeElement.showModal();
  }

  sortuKargaPostua(): void {
    if (!this.kargaguneaHautatua?.id) {
      return;
    }

    this.apiService
      .sortuKargaPostua({
        egoera: this.kargaPostuaBerria.egoera,
        kargagunea_id: this.kargaguneaHautatua.id,
      })
      .subscribe({
        next: () => {
          this.feedback.set({ mota: 'ok', testua: 'Karga postua ongi sortu da.' });
          this.kargaPostuaBerria = { egoera: 'hutsa' };
          this.kargaguneakKargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  ezabatuKargaPostua(kargaPostua: KargaPostua): void {
    if (!window.confirm('Karga postua ezabatu nahi duzu?')) {
      return;
    }

    this.apiService.ezabatuKargaPostua(kargaPostua.id).subscribe({
      next: () => {
        this.feedback.set({ mota: 'ok', testua: 'Karga postua ongi ezabatu da.' });
        this.kargaguneakKargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irudiBaliozkoa(irudia?: string): boolean {
    return !!irudia && (/^https?:\/\//i.test(irudia) || irudia.startsWith('data:image'));
  }

  postuKlasa(egoera: string): string {
    switch (egoera?.toLowerCase()) {
      case 'kargatuta':
        return 'text-bg-success';
      case 'kargatzen':
        return 'text-bg-warning';
      default:
        return 'text-bg-secondary';
    }
  }

  itxiFeedback(): void {
    this.feedback.set(null);
  }

  private buildHeaders(udalerriak: Udalerria[]): PaginableTableHeader[] {
    const udalerriAukerak = this.auth.isSuperadmin()
      ? udalerriak
      : udalerriak.filter((udalerria) => udalerria.id === this.auth.udalerriaId());

    return [
      { property: 'id', title: 'ID', sortable: true, width: 90 },
      { property: 'izena', title: 'Izena', sortable: true, width: 180, },
      { property: 'helbidea', title: 'Helbidea', sortable: true, width: 180 },
      {
        property: 'udalerria_izena',
        title: 'Udalerria',
        sortable: true,
        width: 180,
        filter: {
          type: 'dropdown',
          mode: 'row',
          options: filterOptions(udalerriAukerak.map((udalerria) => udalerria.izena)),
          placeholder: 'Udalerria',
        },
      },
      { property: 'egoera_etiketa', title: 'Egoera', sortable: true, width: 180 },
      { property: 'libres', title: 'Powerbank libreak', sortable: true, align: 'center', width: 170 },
      {
        property: 'karga_postuak_kopurua',
        title: 'Karga postuak',
        sortable: true,
        align: 'center',
        width: 155,
      },
      { property: 'irudiak', title: 'Irudiak', align: 'center', width: 190 },
      {
        property: 'ekintzak',
        title: 'Ekintzak',
        onlyButtons: true,
        align: 'end',
        sticky: 'end',
        width: 190,
      },
    ];
  }

  private taularakoPrestatu(
    kargagunea: Kargagunea,
    udalerriak: Udalerria[],
  ): KargaguneaTaulan {
    const udalerria = udalerriak.find((item) => item.id === kargagunea.udalerria_id);
    return {
      ...kargagunea,
      egoera_etiketa: this.egoeraNormalizatu(kargagunea.egoera),
      karga_postuak_kopurua: kargagunea.karga_postuak?.length ?? 0,
      udalerria_izena: udalerria?.izena ?? '-',
    };
  }

  private kargaguneHutsa(): Kargagunea {
    return {
      izena: '',
      helbidea: '',
      irudia1: '',
      irudia2: '',
      irudia3: '',
      egoera: 'Erabilgarri',
      udalerria_id: this.auth.udalerriaId() ?? undefined,
      latitud: null,
      longitud: null,
    };
  }

  private egoeraNormalizatu(egoera: string): string {
    const normalizatuak: Record<string, string> = {
      erabilgarri: 'Erabilgarri',
      'mantentze-lanetan': 'Mantentze-lanetan',
      'zerbitzutik kanpo': 'Zerbitzutik kanpo',
    };

    return normalizatuak[egoera?.toLowerCase()] ?? egoera;
  }

  private erakutsiErrorea(err: any): void {
    const detail = err?.error?.detail;
    let testua = 'Errorea gertatu da. Saiatu berriro.';

    if (typeof detail === 'string') {
      testua = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      testua = detail.map((errorea: any) => errorea.msg ?? errorea).join(', ');
    }

    this.feedback.set({ mota: 'error', testua });
  }
}
