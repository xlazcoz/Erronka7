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
import { NgSelectModule } from '@ng-select/ng-select';
import {
  HubPaginableTableCellDirective,
  HubTableComponent,
  HubTranslationService,
  PaginableTableHeader,
  PaginableTableOrdination,
} from 'ng-hub-ui-paginable';
import { catchError, forkJoin, of } from 'rxjs';
import { Api, Erabiltzailea, Erreserba, Udalerria } from '../services/api';
import { rolaEtiketa } from '../services/auth';
import { filterOptions } from '../services/filter-options';

type ErabiltzaileaTaulan = Erabiltzailea & {
  aktiboa: boolean;
  erreserba_kopurua: number;
  udalerria_izena: string;
};

@Component({
  selector: 'app-taula',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, HubTableComponent, HubPaginableTableCellDirective],
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
  udalerriak = signal<Udalerria[]>([]);
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
  udalerriaHautatua: number | null = null;

  readonly rolak = ['user', 'udalerri_admin', 'admin'];

  headers: PaginableTableHeader[] = this.buildHeaders([]);

  rolaEtiketa(rola?: string | null): string {
    return rolaEtiketa(rola);
  }

  erabiltzaileaBerria: Erabiltzailea = {
    izena: '',
    abizena: '',
    login_email: '',
    login_pasahitza: '',
    rola: 'user',
    aktiboa: true,
    udalerria_id: null,
  };

  erabiltzaileaEditatzen: Erabiltzailea = {
    izena: '',
    abizena: '',
    login_email: '',
    login_pasahitza: '',
    rola: 'user',
    aktiboa: true,
    udalerria_id: null,
  };

  editatuId: number | null = null;

  ngOnInit(): void {
    this.kargatu();
  }

  kargatu(): void {
    this.isLoading.set(true);

    forkJoin({
      erabiltzaileak: this.apiService.getErabiltzaileak(),
      udalerriak: this.apiService.getUdalerriak().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ erabiltzaileak, udalerriak }) => {
        this.udalerriak.set(udalerriak);
        this.headers = this.buildHeaders(udalerriak);

        const prestatuak = erabiltzaileak.map((erabiltzailea) => {
          const udalerria = udalerriak.find(
            (item) => item.id === erabiltzailea.udalerria_id,
          );
          return {
            ...erabiltzailea,
            aktiboa: erabiltzailea.aktiboa ?? true,
            erreserba_kopurua: erabiltzailea.erreserbak?.length ?? 0,
            udalerria_izena: udalerria?.izena ?? '-',
          };
        });

        this.users.set(prestatuak);

        const hautatuaId = this.erabiltzaileHautatuaId();
        if (hautatuaId !== null) {
          const hautatua = prestatuak.find((erabiltzailea) => erabiltzailea.id === hautatuaId) ?? null;
          this.erabiltzaileaHautatua.set(hautatua);
          if (hautatua) {
            this.rolaHautatua = hautatua.rola;
            this.udalerriaHautatua = hautatua.udalerria_id ?? null;
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
    this.udalerriaHautatua = hautatua?.udalerria_id ?? null;
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

    if (this.rolaHautatua === 'udalerri_admin' && !this.udalerriaHautatua) {
      this.feedback.set({
        mota: 'error',
        testua: 'Udalerriko administratzailea udalerri bati lotuta egon behar da.',
      });
      return;
    }

    const udalerria_id =
      this.rolaHautatua === 'udalerri_admin' ? this.udalerriaHautatua : null;

    this.apiService
      .aldatuErabiltzaileak(hautatua.id, {
        rola: this.rolaHautatua,
        udalerria_id,
      })
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
      udalerria_id: null,
    };
    this.erabiltzaileaSortuDialog()?.nativeElement.showModal();
  }

  sortuErabiltzailea(): void {
    if (this.erabiltzaileaBerria.rola === 'udalerri_admin' && !this.erabiltzaileaBerria.udalerria_id) {
      this.feedback.set({
        mota: 'error',
        testua: 'Udalerriko administratzailea udalerri bati lotuta egon behar da.',
      });
      return;
    }

    const udalerria_id =
      this.erabiltzaileaBerria.rola === 'udalerri_admin'
        ? this.erabiltzaileaBerria.udalerria_id
        : null;

    this.apiService.sortuErabiltzaileak({
      ...this.erabiltzaileaBerria,
      udalerria_id,
    }).subscribe({
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
      udalerria_id: erabiltzailea.udalerria_id ?? null,
    };
    this.erabiltzaileaAldatuDialog()?.nativeElement.showModal();
  }

  aldatuErabiltzailea(): void {
    if (this.editatuId === null) {
      return;
    }

    if (this.erabiltzaileaEditatzen.rola === 'udalerri_admin' && !this.erabiltzaileaEditatzen.udalerria_id) {
      this.feedback.set({
        mota: 'error',
        testua: 'Udalerriko administratzailea udalerri bati lotuta egon behar da.',
      });
      return;
    }

    const udalerria_id =
      this.erabiltzaileaEditatzen.rola === 'udalerri_admin'
        ? this.erabiltzaileaEditatzen.udalerria_id
        : null;

    const datuak: Partial<Erabiltzailea> = {
      izena: this.erabiltzaileaEditatzen.izena,
      abizena: this.erabiltzaileaEditatzen.abizena,
      login_email: this.erabiltzaileaEditatzen.login_email,
      rola: this.erabiltzaileaEditatzen.rola,
      aktiboa: this.erabiltzaileaEditatzen.aktiboa,
      udalerria_id,
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
    if (rola === 'admin') {
      return 'text-bg-warning';
    }
    return rola === 'udalerri_admin' ? 'text-bg-primary' : 'text-bg-secondary';
  }

  itxiFeedback(): void {
    this.feedback.set(null);
  }

  private buildHeaders(udalerriak: Udalerria[]): PaginableTableHeader[] {
    return [
      { property: 'id', title: 'ID', sortable: true, width: 90 },
      {
        property: 'izena',
        title: 'Izena',
        sortable: true,
        width: 180,
        wrapping: 'nowrap',
        filter: { type: 'text', mode: 'row', placeholder: 'Izena...' },
      },
      {
        property: 'abizena',
        title: 'Abizena',
        sortable: true,
        width: 200,
        wrapping: 'nowrap',
      },
      {
        property: 'login_email',
        title: 'Emaila',
        sortable: true,
        width: 220,
        filter: { type: 'text', mode: 'row', placeholder: 'Emaila...' },
      },
      {
        property: 'rola',
        title: 'Rola',
        sortable: true,
        width: 200,
        filter: {
          type: 'dropdown',
          mode: 'row',
          options: this.rolak.map((rola) => ({ id: rola, name: rolaEtiketa(rola) })),
          placeholder: 'Rola',
        },
      },
      {
        property: 'udalerria_izena',
        title: 'Udalerria',
        sortable: true,
        width: 180,
        filter: {
          type: 'dropdown',
          mode: 'row',
          options: filterOptions(udalerriak.map((u) => u.izena)),
          placeholder: 'Udalerria',
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
