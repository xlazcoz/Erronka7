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
import { Api, Udalerria } from '../services/api';

type UdalerriaTaulan = Udalerria & {
  kargagune_kopurua: number;
};

@Component({
  imports: [CommonModule, FormsModule, HubTableComponent, HubPaginableTableCellDirective],
  providers: [HubTranslationService],
  selector: 'app-udalerriak',
  styleUrl: './udalerriak.css',
  templateUrl: './udalerriak.html',
})
export class Udalerriak implements OnInit {
  private apiService = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  private udalerriaSortuDialog = viewChild<ElementRef<HTMLDialogElement>>('udalerriaSortu');
  private udalerriaAldatuDialog = viewChild<ElementRef<HTMLDialogElement>>('udalerriaAldatu');

  udalerriak = signal<UdalerriaTaulan[]>([]);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);

  headers: PaginableTableHeader[] = [
    { property: 'id', title: 'ID', sortable: true, width: 90 },
    {
      property: 'izena',
      title: 'Izena',
      sortable: true,
      filter: { type: 'text', mode: 'row', placeholder: 'Udalerria...' },
    },
    {
      property: 'kargagune_kopurua',
      title: 'Kargaguneak',
      sortable: true,
      align: 'center',
      width: 150,
    },
    { property: 'aktiboa', title: 'Egoera', sortable: true, align: 'center', width: 130 },
    {
      property: 'ekintzak',
      title: 'Ekintzak',
      onlyButtons: true,
      align: 'end',
      sticky: 'end',
      width: 120,
    },
  ];

  udalerriaBerria: Udalerria = { izena: '', aktiboa: true };
  udalerriaEditatzen: Udalerria = { izena: '', aktiboa: true };
  editatuId: number | null = null;

  ngOnInit(): void {
    this.kargatu();
  }

  kargatu(): void {
    this.isLoading.set(true);
    this.apiService.getUdalerriak().subscribe({
      next: (data) => {
        this.udalerriak.set(
          data.map((udalerria) => ({
            ...udalerria,
            kargagune_kopurua: udalerria.kargagune_kopurua ?? 0,
          })),
        );
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
    this.udalerriaBerria = { izena: '', aktiboa: true };
    this.udalerriaSortuDialog()?.nativeElement.showModal();
  }

  sortuUdalerria(): void {
    this.apiService.sortuUdalerria(this.udalerriaBerria).subscribe({
      next: () => {
        this.udalerriaSortuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Udalerria ongi sortu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irekiAldaketa(udalerria: UdalerriaTaulan): void {
    this.editatuId = udalerria.id ?? null;
    this.udalerriaEditatzen = {
      izena: udalerria.izena,
      aktiboa: udalerria.aktiboa,
    };
    this.udalerriaAldatuDialog()?.nativeElement.showModal();
  }

  gordeAldaketa(): void {
    if (this.editatuId === null) {
      return;
    }

    this.apiService.aldatuUdalerria(this.editatuId, this.udalerriaEditatzen).subscribe({
      next: () => {
        this.udalerriaAldatuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Udalerria ongi aldatu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  aldatuAktiboa(udalerria: UdalerriaTaulan): void {
    if (udalerria.id === undefined) {
      return;
    }

    if (
      udalerria.aktiboa &&
      !window.confirm(`Ziur zaude "${udalerria.izena}" udalerria desaktibatu nahi duzula?`)
    ) {
      return;
    }

    this.apiService
      .aldatuUdalerria(udalerria.id, { aktiboa: !udalerria.aktiboa })
      .subscribe({
        next: () => {
          this.feedback.set({
            mota: 'ok',
            testua: udalerria.aktiboa
              ? 'Udalerria desaktibatu da.'
              : 'Udalerria aktibatu da.',
          });
          this.kargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  itxiFeedback(): void {
    this.feedback.set(null);
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
