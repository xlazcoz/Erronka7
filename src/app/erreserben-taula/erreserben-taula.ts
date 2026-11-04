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
import { RouterLink } from '@angular/router';
import {
  HubPaginableTableCellDirective,
  HubTableComponent,
  HubTranslationService,
  PaginableTableHeader,
  PaginableTableOrdination,
} from 'ng-hub-ui-paginable';
import { catchError, forkJoin, of } from 'rxjs';
import { Api, Erabiltzailea, Erreserba, KargaPostua, Kargagunea, Udalerria } from '../services/api';
import { AuthService } from '../services/auth';
import { filterOptions } from '../services/filter-options';

type ErreserbaTaulan = Erreserba & {
  erabiltzailea_izena: string;
  kargagunea_izena: string;
  udalerria_izena: string;
};

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

  private ezeztatuDialog = viewChild<ElementRef<HTMLDialogElement>>('erreserbaEzeztatu');
  private itzuliDialog = viewChild<ElementRef<HTMLDialogElement>>('erreserbaItzuli');

  erreserbak = signal<ErreserbaTaulan[]>([]);
  postuak = signal<KargaPostua[]>([]);
  guneak = signal<Kargagunea[]>([]);
  udalerriak = signal<Udalerria[]>([]);
  erreserbaEzeztatzeko: ErreserbaTaulan | null = null;
  erreserbaItzultzeko: ErreserbaTaulan | null = null;
  itzuliPostuaId: number | null = null;
  itzuliDataOrdua = '';
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  feedback = signal<{ mota: 'ok' | 'error'; testua: string } | null>(null);

  headers: PaginableTableHeader[] = this.buildHeaders([]);

  ngOnInit(): void {
    this.kargatu();
  }

  kargatu(): void {
    this.isLoading.set(true);

    forkJoin({
      erreserbak: this.apiService.getErreserbak(),
      erabiltzaileak: (
        this.auth.isSuperadmin()
          ? this.apiService.getErabiltzaileak()
          : of([] as Erabiltzailea[])
      ).pipe(catchError(() => of([] as Erabiltzailea[]))),
      postuak: this.apiService.getKargaPostuak(),
      guneak: this.apiService.getKargaguneak(),
      udalerriak: this.apiService.getUdalerriak().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ erreserbak, erabiltzaileak, postuak, guneak, udalerriak }) => {
        const prestatuak = erreserbak.map((erreserba) =>
          this.erreserbaPrestatu(erreserba, erabiltzaileak, postuak, guneak, udalerriak),
        );

        this.postuak.set(postuak);
        this.guneak.set(guneak);
        this.udalerriak.set(udalerriak);
        this.headers = this.buildHeaders(prestatuak);
        this.erreserbak.set(prestatuak);
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

  irekiEzeztatzea(erreserba: ErreserbaTaulan): void {
    this.feedback.set(null);
    this.erreserbaEzeztatzeko = erreserba;
    this.ezeztatuDialog()?.nativeElement.showModal();
  }

  ezeztatu(): void {
    const erreserba = this.erreserbaEzeztatzeko;
    if (!erreserba) {
      return;
    }

    this.apiService
      .aldatuErreserbenEgoera(erreserba.id, { egoera: 'ezeztatua' })
      .subscribe({
        next: () => {
          this.ezeztatuDialog()?.nativeElement.close();
          this.erreserbaEzeztatzeko = null;
          this.feedback.set({ mota: 'ok', testua: 'Erreserba ongi ezeztatu da.' });
          this.kargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  irekiItzultzea(erreserba: ErreserbaTaulan): void {
    this.feedback.set(null);
    this.erreserbaItzultzeko = erreserba;
    this.itzuliPostuaId = erreserba.hasierako_karga_postua;
    this.itzuliDataOrdua = this.dataOrduaInput(erreserba.amaiera_data_ordua);
    this.itzuliDialog()?.nativeElement.showModal();
  }

  itzuli(): void {
    const erreserba = this.erreserbaItzultzeko;
    if (!erreserba || !this.itzuliPostuaId) {
      this.feedback.set({ mota: 'error', testua: 'Aukeratu bukaerako karga postu bat.' });
      return;
    }

    const amaiera = this.itzuliDataOrdua
      ? new Date(this.itzuliDataOrdua).toISOString()
      : new Date().toISOString();

    this.apiService
      .itzuliErreserba(erreserba.id, {
        bukaerako_karga_postua: this.itzuliPostuaId,
        amaitze_data_ordua: amaiera,
      })
      .subscribe({
        next: () => {
          this.itzuliDialog()?.nativeElement.close();
          this.erreserbaItzultzeko = null;
          this.feedback.set({ mota: 'ok', testua: 'Powerbank-a ongi itzuli da.' });
          this.kargatu();
        },
        error: (err) => {
          this.erakutsiErrorea(err);
          this.cdr.detectChanges();
        },
      });
  }

  kargaPostuEtiketa(kargaPostua: KargaPostua): string {
    const gunea = this.guneak().find((item) => item.id === kargaPostua.kargagunea_id);
    return gunea
      ? `${gunea.izena} · #${kargaPostua.id} (${kargaPostua.egoera})`
      : `#${kargaPostua.id} (${kargaPostua.egoera})`;
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

  private dataOrduaInput(data: string | Date): string {
    const dataObj = new Date(data);
    if (Number.isNaN(dataObj.getTime())) {
      return '';
    }

    const lokala = new Date(dataObj.getTime() - dataObj.getTimezoneOffset() * 60000);
    return lokala.toISOString().slice(0, 16);
  }

  dataFormatua(data: string | Date): string {
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

  private erreserbaPrestatu(
    erreserba: Erreserba,
    erabiltzaileak: Erabiltzailea[],
    postuak: KargaPostua[],
    guneak: Kargagunea[],
    udalerriak: Udalerria[],
  ): ErreserbaTaulan {
    const erabiltzailea = erabiltzaileak.find(
      (item) => item.id === erreserba.erabiltzailea_id,
    );
    const postua = postuak.find((item) => item.id === erreserba.hasierako_karga_postua);
    const gunea = postua ? guneak.find((item) => item.id === postua.kargagunea_id) : undefined;
    const udalerria = gunea
      ? udalerriak.find((item) => item.id === gunea.udalerria_id)
      : undefined;

    return {
      ...erreserba,
      erabiltzailea_izena: erabiltzailea?.login_email ?? `#${erreserba.erabiltzailea_id}`,
      kargagunea_izena: gunea?.izena ?? '-',
      udalerria_izena: udalerria?.izena ?? '-',
    };
  }

  private buildHeaders(prestatuak: ErreserbaTaulan[]): PaginableTableHeader[] {
    const erabiltzaileAukerak = filterOptions(
      prestatuak.map((erreserba) => erreserba.erabiltzailea_izena),
    );
    const guneAukerak = filterOptions(
      prestatuak.map((erreserba) => erreserba.kargagunea_izena),
    );
    const udalerriAukerak = filterOptions(
      prestatuak.map((erreserba) => erreserba.udalerria_izena),
    );
    const egoeraAukerak = filterOptions(['aktiboa', 'ezeztatua', 'amaitua']);

    return [
      { property: 'id', title: 'ID', sortable: true, width: 90 },
      {
        property: 'erabiltzailea_izena',
        title: 'Erabiltzailea',
        sortable: true,
        width: 230,
        wrapping: 'nowrap',
        filter: {
          type: 'dropdown',
          mode: 'row',
          options: erabiltzaileAukerak,
          placeholder: 'Erabiltzailea',
        },
      },
      {
        property: 'kargagunea_izena',
        title: 'Kargagunea',
        sortable: true,
        width: 220,
        wrapping: 'nowrap',
        filter: {
          type: 'dropdown',
          mode: 'row',
          options: guneAukerak,
          placeholder: 'Kargagunea',
        },
      },
      {
        property: 'udalerria_izena',
        title: 'Udalerria',
        sortable: true,
        width: 180,
        wrapping: 'nowrap',
        filter: {
          type: 'dropdown',
          mode: 'row',
          options: udalerriAukerak,
          placeholder: 'Udalerria',
        },
      },
      {
        property: 'powerbank_id',
        title: 'Powerbank',
        sortable: true,
        width: 140,
        wrapping: 'nowrap',
        filter: { type: 'text', mode: 'row', placeholder: 'Powerbank ID' },
      },
      {
        property: 'hasiera_data_ordua',
        title: 'Hasiera',
        sortable: true,
        width: 180,
        filter: { type: 'date-range', mode: 'row', placeholder: 'Data tartea' },
      },
      { property: 'amaiera_data_ordua', title: 'Amaiera', sortable: true, width: 180, },
      {
        property: 'egoera',
        title: 'Egoera',
        sortable: true,
        width: 180,
        wrapping: 'nowrap',
        filter: {
          type: 'dropdown',
          mode: 'row',
          options: egoeraAukerak,
          placeholder: 'Egoera',
        },
      },
      {
        property: 'ekintzak',
        title: 'Ekintzak',
        onlyButtons: true,
        align: 'end',
        sticky: 'end',
        width: 120,
      },
    ];
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
