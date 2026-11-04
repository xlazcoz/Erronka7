import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  HubPaginableTableCellDirective,
  HubTableComponent,
  HubTranslationService,
  PaginableTableHeader,
  PaginableTableOrdination,
} from 'ng-hub-ui-paginable';
import { Api, Erreserba } from '../services/api';
import { AuthService } from '../services/auth';

@Component({
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HubTableComponent,
    HubPaginableTableCellDirective,
  ],
  providers: [HubTranslationService],
  selector: 'app-erreserben-taula',
  styleUrl: './erreserben-taula.css',
  templateUrl: './erreserben-taula.html',
})
export class ErreserbenTaula implements OnInit {
  private apiService = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  protected auth = inject(AuthService);

  erreserbak = signal<Erreserba[]>([]);
  totalItems = signal<number>(0);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);

  headers: PaginableTableHeader[] = [
    { property: 'id', title: 'ID', sortable: true, width: 70 },
    { property: 'erabiltzailea_id', title: 'Erabiltzailea', sortable: true, width: 120 },
    { property: 'powerbank_id', title: 'Powerbank', sortable: true, width: 110 },
    { property: 'hasiera_data_ordua', title: 'Hasiera', sortable: true },
    { property: 'amaiera_data_ordua', title: 'Amaiera', sortable: true },
    { property: 'egoera', title: 'Egoera', sortable: true, width: 120 },
    {
      property: 'ekintzak',
      title: 'Ekintzak',
      onlyButtons: true,
      align: 'end',
      sticky: 'end',
      width: 110,
    },
  ];

  ngOnInit(): void {
    this.kargatu();
  }

  kargatu(): void {
    this.isLoading.set(true);

    this.apiService.getErreserbak().subscribe({
      next: (data) => {
        this.erreserbak.set(data);
        this.totalItems.set(data.length);
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

  ezeztatu(erreserba: Erreserba): void {
    if (!window.confirm(`${erreserba.id}. erreserba ezeztatu nahi duzu?`)) {
      return;
    }

    this.apiService
      .aldatuErreserbenEgoera(erreserba.id, { egoera: 'ezeztatua' })
      .subscribe({
        next: () => {
          this.feedback.set({ mota: 'ok', testua: 'Erreserba ongi ezeztatu da.' });
          this.kargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  itzuli(erreserba: Erreserba): void {
    const balioa = window.prompt(
      'Itzultzeko karga postuaren ID-a:',
      String(erreserba.hasierako_karga_postua),
    );
    if (balioa === null) {
      return;
    }

    const kargaPostuaId = Number(balioa);
    if (!Number.isInteger(kargaPostuaId) || kargaPostuaId <= 0) {
      this.feedback.set({ mota: 'error', testua: 'Karga postuaren ID-a ez da zuzena.' });
      return;
    }

    this.apiService
      .itzuliErreserba(erreserba.id, { bukaerako_karga_postua: kargaPostuaId })
      .subscribe({
        next: () => {
          this.feedback.set({ mota: 'ok', testua: 'Powerbank-a ongi itzuli da.' });
          this.kargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  egoeraKlasa(egoera: string): string {
    switch (egoera?.toLowerCase()) {
      case 'aktiboa':
        return 'text-bg-success';
      case 'ezeztatua':
        return 'text-bg-danger';
      case 'amaitua':
        return 'text-bg-secondary';
      default:
        return 'text-bg-light';
    }
  }

  dataFormatua(data: string): string {
    if (!data) {
      return '-';
    }

    return new Date(data).toLocaleString('eu-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  itxiFeedback(): void {
    this.feedback.set(null);
  }

  private erakutsiErrorea(err: any): void {
    if (err?.status === 401) {
      this.feedback.set(null);
      return;
    }

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
