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
import { Api, Erabiltzailea, Erreserba } from '../services/api';

type ErabiltzaileaTaulan = Erabiltzailea & {
  aktiboa: boolean;
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
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);

  erabiltzaileHautatuaId = signal<number | null>(null);
  erabiltzaileaHautatua = signal<ErabiltzaileaTaulan | null>(null);
  erreserbak = signal<Erreserba[]>([]);
  erreserbakKargatzen = signal<boolean>(false);
  rolaHautatua = 'user';

  readonly rolak = ['user', 'admin'];

  headers: PaginableTableHeader[] = [
    { property: 'id', title: 'ID', sortable: true, width: 90 },
    {
      property: 'izena',
      title: 'Izena',
      sortable: true,
      filter: { type: 'text', mode: 'row', placeholder: 'Izena...' },
    },
    { property: 'abizena', title: 'Abizena', sortable: true },
    {
      property: 'login_email',
      title: 'Emaila',
      sortable: true,
      filter: { type: 'text', mode: 'row', placeholder: 'Emaila...' },
    },
    {
      property: 'rola',
      title: 'Rola',
      sortable: true,
      width: 150,
      filter: {
        type: 'dropdown',
        mode: 'menu',
        options: ['user', 'admin'],
        placeholder: 'Rola',
      },
    },
    {
      property: 'aktiboa',
      title: 'Egoera',
      sortable: true,
      align: 'center',
      width: 120,
      filter: {
        type: 'boolean',
        mode: 'row',
        trueLabel: 'Aktiboa',
        falseLabel: 'Ez aktiboa',
      },
    },
    {
      property: 'erreserba_kopurua',
      title: 'Erreserbak',
      sortable: true,
      align: 'center',
      width: 140,
    },
    {
      property: 'ekintzak',
      title: 'Ekintzak',
      onlyButtons: true,
      align: 'end',
      sticky: 'end',
      width: 150,
    },
  ];

  erabiltzaileaBerria: Erabiltzailea = {
    izena: '',
    abizena: '',
    login_email: '',
    login_pasahitza: '',
    rola: 'user',
    aktiboa: true,
  };

  erabiltzaileaEditatzen: Erabiltzailea = {
    izena: '',
    abizena: '',
    login_email: '',
    login_pasahitza: '',
    rola: 'user',
    aktiboa: true,
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
          aktiboa: erabiltzailea.aktiboa ?? true,
          erreserba_kopurua: erabiltzailea.erreserbak?.length ?? 0,
        }));

        this.users.set(prestatuak);

        const hautatuaId = this.erabiltzaileHautatuaId();
        if (hautatuaId !== null) {
          const hautatua = prestatuak.find((erabiltzailea) => erabiltzailea.id === hautatuaId) ?? null;
          this.erabiltzaileaHautatua.set(hautatua);
          if (hautatua) {
            this.rolaHautatua = hautatua.rola;
          }
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

  erabiltzaileaAukeratu(id: number | string | null): void {
    const zenbakia = id === null || id === '' ? null : Number(id);
    this.erabiltzaileHautatuaId.set(zenbakia);

    if (zenbakia === null) {
      this.erabiltzaileaHautatua.set(null);
      this.erreserbak.set([]);
      return;
    }

    const hautatua = this.users().find((erabiltzailea) => erabiltzailea.id === zenbakia) ?? null;
    this.erabiltzaileaHautatua.set(hautatua);
    this.rolaHautatua = hautatua?.rola ?? 'user';
    this.kargatuErabiltzailearenErreserbak(zenbakia);
  }

  kargatuErabiltzailearenErreserbak(id: number): void {
    this.erreserbakKargatzen.set(true);
    this.apiService.getErabiltzaileakErreserbak(id).subscribe({
      next: (data) => {
        this.erreserbak.set(data);
        this.erreserbakKargatzen.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.erreserbakKargatzen.set(false);
        this.erakutsiErrorea(err);
        this.cdr.detectChanges();
      },
    });
  }

  gordeRola(): void {
    const hautatua = this.erabiltzaileaHautatua();
    if (!hautatua?.id) {
      return;
    }

    this.apiService
      .aldatuErabiltzaileakRolak(hautatua.id, { rola: this.rolaHautatua })
      .subscribe({
        next: () => {
          this.feedback.set({ mota: 'ok', testua: 'Erabiltzailearen rola aldatu da.' });
          this.kargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  aldatuAktiboa(erabiltzailea: ErabiltzaileaTaulan): void {
    if (erabiltzailea.id === undefined) {
      return;
    }

    this.apiService
      .aldatuErabiltzaileak(erabiltzailea.id, { aktiboa: !erabiltzailea.aktiboa })
      .subscribe({
        next: () => {
          this.feedback.set({
            mota: 'ok',
            testua: erabiltzailea.aktiboa
              ? 'Erabiltzailea desaktibatu da.'
              : 'Erabiltzailea aktibatu da.',
          });
          this.kargatu();
        },
        error: (err) => {
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
      aktiboa: true,
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
      aktiboa: erabiltzailea.aktiboa,
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
      aktiboa: this.erabiltzaileaEditatzen.aktiboa,
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
        if (this.erabiltzaileHautatuaId() === erabiltzailea.id) {
          this.erabiltzaileaAukeratu(null);
        }
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
