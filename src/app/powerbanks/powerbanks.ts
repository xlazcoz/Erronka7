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
import { forkJoin } from 'rxjs';
import { Api, KargaPostua, Kargagunea, Powerbank } from '../services/api';

type PowerbankTaulan = Powerbank & {
  id: number;
  tokia_etiketa: string;
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

  private powerbankSortuDialog = viewChild<ElementRef<HTMLDialogElement>>('powerbankSortu');
  private powerbankAldatuDialog = viewChild<ElementRef<HTMLDialogElement>>('powerbankAldatu');

  powerbanks = signal<PowerbankTaulan[]>([]);
  postuak = signal<KargaPostua[]>([]);
  guneak = signal<Kargagunea[]>([]);
  totalItems = signal<number>(0);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);

  headers: PaginableTableHeader[] = [
    { property: 'id', title: 'ID', sortable: true, width: 80 },
    { property: 'karga_maila', title: 'Karga maila', sortable: true, width: 160 },
    { property: 'karga_postua_id', title: 'Takilla ID', sortable: true, width: 120 },
    { property: 'tokia_etiketa', title: 'Kokapena', sortable: true },
    {
      property: 'ekintzak',
      title: 'Ekintzak',
      onlyButtons: true,
      align: 'end',
      sticky: 'end',
      width: 130,
    },
  ];

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
    }).subscribe({
      next: ({ powerbanks, postuak, guneak }) => {
        this.postuak.set(postuak);
        this.guneak.set(guneak);

        const prestatuak = powerbanks.map((powerbank) => ({
          ...powerbank,
          id: powerbank.id ?? 0,
          tokia_etiketa: this.tokiaEtiketa(powerbank.karga_postua_id, postuak, guneak),
        }));

        this.powerbanks.set(prestatuak);
        this.totalItems.set(prestatuak.length);
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
