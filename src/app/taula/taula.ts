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
import { Api, Erabiltzailea } from '../services/api';

type ErabiltzaileaTaulan = Erabiltzailea & {
  erreserba_kopurua: number;
};

@Component({
  selector: 'app-taula',
  standalone: true,
  imports: [CommonModule, FormsModule, HubTableComponent, HubPaginableTableCellDirective],
  providers: [HubTranslationService],
  templateUrl: './taula.html',
})
export class Taula implements OnInit {
  private apiService = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  private erabiltzaileaSortuDialog =
    viewChild<ElementRef<HTMLDialogElement>>('erabiltzaileaSortu');
  private erabiltzaileaAldatuDialog =
    viewChild<ElementRef<HTMLDialogElement>>('erabiltzaileaAldatu');

  users = signal<ErabiltzaileaTaulan[]>([]);
  totalItems = signal<number>(0);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);

  readonly rolak = ['user', 'admin'];

  headers: PaginableTableHeader[] = [
    { property: 'id', title: 'ID', sortable: true, width: 70 },
    { property: 'izena', title: 'Izena', sortable: true },
    { property: 'abizena', title: 'Abizena', sortable: true },
    { property: 'login_email', title: 'Emaila', sortable: true },
    { property: 'rola', title: 'Rola', sortable: true, width: 110 },
    {
      property: 'erreserba_kopurua',
      title: 'Erreserbak',
      sortable: true,
      align: 'center',
      width: 120,
    },
    {
      property: 'ekintzak',
      title: 'Ekintzak',
      onlyButtons: true,
      align: 'end',
      sticky: 'end',
      width: 100,
    },
  ];

  erabiltzaileaBerria: Erabiltzailea = {
    izena: '',
    abizena: '',
    login_email: '',
    login_pasahitza: '',
    rola: 'user',
  };

  erabiltzaileaEditatzen: Erabiltzailea = {
    izena: '',
    abizena: '',
    login_email: '',
    login_pasahitza: '',
    rola: 'user',
  };

  editatuId: number | null = null;

  ngOnInit(): void {
    this.kargatu();
  }

  kargatu(): void {
    this.isLoading.set(true);

    this.apiService.getErabiltzaileak().subscribe({
      next: (data) => {
        const prestatuak = data.map((erabiltzailea) => ({
          ...erabiltzailea,
          erreserba_kopurua: erabiltzailea.erreserbak?.length ?? 0,
        }));

        this.users.set(prestatuak);
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
    this.erabiltzaileaBerria = {
      izena: '',
      abizena: '',
      login_email: '',
      login_pasahitza: '',
      rola: 'user',
    };
    this.erabiltzaileaSortuDialog()?.nativeElement.showModal();
  }

  sortuErabiltzailea(): void {
    this.apiService.sortuErabiltzaileak(this.erabiltzaileaBerria).subscribe({
      next: () => {
        this.erabiltzaileaSortuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Erabiltzailea ongi sortu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  irekiAldaketa(erabiltzailea: ErabiltzaileaTaulan): void {
    this.editatuId = erabiltzailea.id ?? null;
    this.erabiltzaileaEditatzen = {
      izena: erabiltzailea.izena,
      abizena: erabiltzailea.abizena,
      login_email: erabiltzailea.login_email,
      login_pasahitza: '',
      rola: erabiltzailea.rola,
    };
    this.erabiltzaileaAldatuDialog()?.nativeElement.showModal();
  }

  aldatuErabiltzailea(): void {
    if (this.editatuId === null) {
      return;
    }

    const datuak: Partial<Erabiltzailea> = {
      izena: this.erabiltzaileaEditatzen.izena,
      abizena: this.erabiltzaileaEditatzen.abizena,
      login_email: this.erabiltzaileaEditatzen.login_email,
      rola: this.erabiltzaileaEditatzen.rola,
    };

    if (this.erabiltzaileaEditatzen.login_pasahitza) {
      datuak.login_pasahitza = this.erabiltzaileaEditatzen.login_pasahitza;
    }

    this.apiService.aldatuErabiltzaileak(this.editatuId, datuak).subscribe({
      next: () => {
        this.erabiltzaileaAldatuDialog()?.nativeElement.close();
        this.feedback.set({ mota: 'ok', testua: 'Erabiltzailea ongi aldatu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  ezabatuErabiltzailea(erabiltzailea: ErabiltzaileaTaulan): void {
    if (erabiltzailea.id === undefined) {
      return;
    }

    if (!window.confirm(`Ziur zaude "${erabiltzailea.login_email}" ezabatu nahi duzula?`)) {
      return;
    }

    this.apiService.ezabatuErabiltzailea(erabiltzailea.id).subscribe({
      next: () => {
        this.feedback.set({ mota: 'ok', testua: 'Erabiltzailea ongi ezabatu da.' });
        this.kargatu();
      },
      error: (err) => {
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  rolaKlasa(rola: string): string {
    return rola === 'admin' ? 'text-bg-primary' : 'text-bg-secondary';
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
