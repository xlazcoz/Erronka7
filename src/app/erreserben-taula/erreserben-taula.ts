
import { ChangeDetectorRef, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HubTableComponent, PaginableTableOrdination, PaginableActionButton, HubTranslationService } from 'ng-hub-ui-paginable';
import { Api } from '../services/api';

@Component({
  imports: [HubTableComponent, FormsModule],
  providers: [HubTranslationService],
  selector: 'app-erreserben-taula',
  standalone: true,
  styleUrl: './erreserben-taula.css',
  template: `
    <hub-table
      [data]="users()"
      [headers]="headers"
      [selectable]="true"
      [(ngModel)]="selectedUsers">
      [totalItems]="totalItems()"
      [(page)]="currentPage"
      [(perPage)]="perPage"
      [loading]="isLoading()"
      [searchable]="true"
      [(searchTerm)]="searchTerm"
      [(ordination)]="ordination">
    </hub-table>
  `
})

export class ErreserbenTaula {
  users = signal<any[]>([]);
  totalItems = signal<number>(0);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  selectedUsers = signal<any[]>([]);

  headers = [
    { property: 'id', title: 'ID', sortable: true },
    { property: 'erabiltzailea_id', title: 'Erabiltzailea ID', sortable: true },
    { property: 'powerbank_id', title: 'Powerbank ID', sortable: true },
    { property: 'hasiera_data_ordua', title: 'Hasiera data ordua', sortable: true },
    { property: 'amaiera_data_ordua', title: 'Amaiera data ordua', sortable: true },
    { property: 'egikaritze_data_ordua', title: 'Egikaritze data ordua', sortable: true },
    { property: 'amaitze_data_ordua', title: 'Amaitze data ordua', sortable: true },
    { property: 'hasierako_karga_postua', title: 'Hasierako karga postua', sortable: true },
    { property: 'bukaerako_karga_postua', title: 'Bukaerako karga postua', sortable: true },
    { property: 'egoera', title: 'Egoera', sortable: true }
  ];
  private mockDatabase = this.generateMockData(50);

  private apiService = inject(Api);
  private cdr: ChangeDetectorRef;
  
  constructor(cdr1: ChangeDetectorRef) {
    this.cdr = cdr1;
  }
  
  
    erreserbak: any;
    ngOnInit(): void {
        this.isLoading.set(true);
        this.apiService.getErreserbak().subscribe({
            next: (data) => {
                console.log(data)
                this.users.set(data)
                this.totalItems.set(data.length)
                this.cdr.detectChanges();
            }, error: (err) => console.error('Errorea', err)
        })
    }

  private loadServerData(page: number, perPage: number, search: string, sort: PaginableTableOrdination | undefined): void {
    this.isLoading.set(true);

    setTimeout(() => {
      let filteredData = [...this.mockDatabase];

      if (search) {
        const searchLower = search.toLowerCase();
        filteredData = filteredData.filter(
          (user) =>
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.role.toLowerCase().includes(searchLower)
        );
      }

      if (sort?.property) {
        filteredData.sort((a, b) => {
          const aVal = a[sort.property];
          const bVal = b[sort.property];
          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return sort.direction === 'ASC' ? comparison : -comparison;
        });
      }

      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedData = filteredData.slice(startIndex, endIndex);

      this.totalItems.set(filteredData.length);
      this.users.set(paginatedData);
      this.isLoading.set(false);
    }, 500);
  }

  private generateMockData(count: number): any[] {
    // const names = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
    const names = [this.erreserbak];
    const surnames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson'];
    const roles = ['Admin', 'Editor', 'User', 'Moderator'];
    const statuses = ['Active', 'Inactive', 'Pending'];

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `${names[i % names.length]} ${surnames[i % surnames.length]}`,
      email: `user${i + 1}@example.com`,
      role: roles[i % roles.length],
      status: statuses[i % statuses.length],
    }));
  }
}
