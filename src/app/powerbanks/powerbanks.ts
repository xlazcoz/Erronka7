import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HubPaginableTableCellDirective,
  HubTableComponent,
  HubTranslationService,
  PaginableTableHeader,
  PaginableTableOrdination,
} from 'ng-hub-ui-paginable';
import { catchError, forkJoin, of } from 'rxjs';
import { Api, KargaPostua, Kargagunea, Powerbank, Udalerria } from '../services/api';
import { AuthService } from '../services/auth';
import { filterOptions } from '../services/filter-options';

type PowerbankTaulan = Powerbank & {
  id: number;
  tokia_etiketa: string;
  udalerria_izena: string;
};

@Component({
  imports: [FormsModule, CommonModule, HubTableComponent, HubPaginableTableCellDirective],
  providers: [HubTranslationService],
  selector: 'app-powerbanks',
  styleUrl: './powerbanks.css',
  templateUrl: './powerbanks.html',
})
export class Powerbanks implements OnInit {
  private apiService = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);

  private powerbankSortuDialog = viewChild<ElementRef<HTMLDialogElement>>('powerbankSortu');
  private powerbankAldatuDialog = viewChild<ElementRef<HTMLDialogElement>>('powerbankAldatu');

  powerbanks = signal<PowerbankTaulan[]>([]);
  postuak = signal<KargaPostua[]>([]);
  guneak = signal<Kargagunea[]>([]);
  udalerriak = signal<Udalerria[]>([]);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);

  headers: PaginableTableHeader[] = this.buildHeaders([]);

  powerbankBerria = {
    karga_maila: 100,
    karga_postua_id: 0,
  };

  powerbankEditatzen: Powerbank = {
    karga_maila: 100,
    karga_postua_id: 0,
  };

  editatuId: number | null = null;

  ngOnInit(): void {
    this.kargatu();
  }

  kargatu(): void {
    this.isLoading.set(true);

    forkJoin({
      powerbanks: this.apiService.getPowerbanks(),
      postuak: this.apiService.getKargaPostuak(),
      guneak: this.apiService.getKargaguneak(),
      udalerriak: this.apiService.getUdalerriak().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ powerbanks, postuak, guneak, udalerriak }) => {
        let guneakIkusteko = guneak;
        let postuakIkusteko = postuak;
        let powerbanksIkusteko = powerbanks;

        if (!this.auth.isSuperadmin()) {
          const udalerriaId = this.auth.udalerriaId();
          guneakIkusteko = guneak.filter(
            (gunea) => gunea.udalerria_id === udalerriaId,
          );
          const guneIds = new Set(guneakIkusteko.map((gunea) => gunea.id));
          postuakIkusteko = postuak.filter((postua) =>
            guneIds.has(postua.kargagunea_id),
          );
          const postuIds = new Set(postuakIkusteko.map((postua) => postua.id));
          powerbanksIkusteko = powerbanks.filter((powerbank) =>
            postuIds.has(powerbank.karga_postua_id),
          );
        }

        this.postuak.set(postuakIkusteko);
        this.guneak.set(guneakIkusteko);
        this.udalerriak.set(udalerriak);
        this.headers = this.buildHeaders(udalerriak);

        const prestatuak = powerbanksIkusteko.map((powerbank) => ({
          ...powerbank,
          id: powerbank.id ?? 0,
          tokia_etiketa: this.tokiaEtiketa(
            powerbank.karga_postua_id,
            postuakIkusteko,
            guneakIkusteko,
          ),
          udalerria_izena: this.udalerriaIzena(
            powerbank.karga_postua_id,
            postuakIkusteko,
            guneakIkusteko,
            udalerriak,
          ),
        }));

        this.powerbanks.set(prestatuak);
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
    this.powerbankBerria = {
      karga_maila: 100,
      karga_postua_id: this.postuak()[0]?.id ?? 0,
    };
    this.powerbankSortuDialog()?.nativeElement.showModal();
  }

  sortuPowerbanka(): void {
    this.apiService.sortuPowerbank(this.powerbankBerria).subscribe({
      next: () => {
        this.powerbankSortuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Powerbank-a ongi sortu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irekiAldaketa(powerbank: PowerbankTaulan): void {
    this.editatuId = powerbank.id;
    this.powerbankEditatzen = {
      karga_maila: powerbank.karga_maila,
      karga_postua_id: powerbank.karga_postua_id,
    };
    this.powerbankAldatuDialog()?.nativeElement.showModal();
  }

  gordeAldaketa(): void {
    if (this.editatuId === null) {
      return;
    }

    this.apiService.aldatuPowerbank(this.editatuId, this.powerbankEditatzen).subscribe({
      next: () => {
        this.powerbankAldatuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Powerbank-a ongi aldatu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  ezabatuPowerbanka(powerbank: PowerbankTaulan): void {
    if (!window.confirm(`Ziur zaude ${powerbank.id}. powerbank-a ezabatu nahi duzula?`)) {
      return;
    }

    this.apiService.ezabatuPowerbank(powerbank.id).subscribe({
      next: () => {
        this.feedback.set({ mota: 'ok', testua: 'Powerbank-a ongi ezabatu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  kargaMailaKlasa(kargaMaila: number): string {
    if (kargaMaila >= 70) {
      return 'text-bg-success';
    }
    if (kargaMaila >= 30) {
      return 'text-bg-warning';
    }
    return 'text-bg-danger';
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
      { property: 'karga_maila', title: 'Karga maila', sortable: true, width: 170 },
      { property: 'karga_postua_id', title: 'Karga postua ID', sortable: true, width: 130 },
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
      { property: 'tokia_etiketa', title: 'Kokapena', sortable: true },
      {
        property: 'ekintzak',
        title: 'Ekintzak',
        onlyButtons: true,
        align: 'end',
        sticky: 'end',
        width: 140,
      },
    ];
  }

  udalerriaIzena(
    kargaPostuaId: number,
    postuak: KargaPostua[],
    guneak: Kargagunea[],
    udalerriak: Udalerria[],
  ): string {
    const postua = postuak.find((item) => item.id === kargaPostuaId);
    const gunea = postua
      ? guneak.find((item) => item.id === postua.kargagunea_id)
      : undefined;
    const udalerria = gunea
      ? udalerriak.find((item) => item.id === gunea.udalerria_id)
      : undefined;
    return udalerria?.izena ?? '-';
  }

  tokiaEtiketa(
    kargaPostuaId: number,
    postuak: KargaPostua[],
    guneak: Kargagunea[],
  ): string {
    const postua = postuak.find((item) => item.id === kargaPostuaId);
    if (!postua) {
      return `Takilla #${kargaPostuaId}`;
    }

    const gunea = guneak.find((item) => item.id === postua.kargagunea_id);
    return gunea
      ? `${gunea.izena} · Takilla #${postua.id}`
      : `Takilla #${postua.id}`;
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
