import { ChangeDetectorRef, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HubTableComponent, PaginableTableOrdination, PaginableActionButton, HubTranslationService } from 'ng-hub-ui-paginable';
import { Api } from '../services/api';

@Component({
  selector: 'app-taula',
  standalone: true,
  imports: [HubTableComponent, FormsModule],
  providers: [HubTranslationService],
  template: `
    <hub-table
      [data]="users()"
      [headers]="headers"
      [selectable]="true"
      [batchActions]="batchActions"
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
export class Taula implements OnInit{
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
    { property: 'izena', title: 'Izena', sortable: true },
    { property: 'abizena', title: 'Abizena', sortable: true },
    { property: 'login_email', title: 'Email', sortable: true },
    { property: 'rola', title: 'Rola', sortable: true },
    { property: 'erreserbak', title: 'Erreserbak', sortable: true }
  ];
  batchActions: PaginableActionButton[] = [
    {
      icon: '',
      title: 'Sortu',
      classlist: 'btn btn-success',
      handler: (items: readonly any[]) => this.deactivateSelected(items)
    },
    {
      icon: '',
      title: 'Aldatu',
      classlist: 'btn btn-warning',
      handler: (items: readonly any[]) => this.deactivateSelected(items)
    },
    {
      icon: 'bi bi-check-circle',
      title: 'Aktibatu',
      tooltip: 'Activate selected users',
      classlist: 'btn btn-primary',
      handler: (items: readonly any[]) => this.activateSelected(items)
    },
    {
      icon: 'bi bi-x-circle',
      title: 'Desaktibatu',
      classlist: 'btn btn-secondary',
      handler: (items: readonly any[]) => this.deactivateSelected(items)
    },
    // {
    //   icon: 'bi bi-trash',
    //   title: 'Delete',
    //   classlist: 'btn btn-danger',
    //   handler: (items: readonly any[]) => this.deleteSelected(items)
    // },
    
  ];

  activateSelected(items: readonly any[]): void {
    items.forEach(user => user.status = 'Active');
    this.selectedUsers.set([]);
  }

  deactivateSelected(items: readonly any[]): void {
    items.forEach(user => user.status = 'Inactive');
    this.selectedUsers.set([]);
  }

//   deleteSelected(items: readonly any[]): void {
//     const selectedIds = items.map(u => u.id);
//     this.mockDatabase = this.mockDatabase.filter(u => !selectedIds.includes(u.id));
//     this.users.update(currentUsers => currentUsers.filter(u => !selectedIds.includes(u.id)));
//     this.selectedUsers.set([]);
//   }

  private mockDatabase = this.generateMockData(50);

  private apiService = inject(Api);
  private cdr: ChangeDetectorRef;
  
  constructor(cdr1: ChangeDetectorRef) {
    this.cdr = cdr1;
    effect(() => {
      const page = this.currentPage();
      const perPage = this.perPage();
      const search = this.searchTerm();
      const sort = this.ordination();
      this.loadServerData(page, perPage, search, sort);
    });
  }
  
  
    erabiltzaileak: any;
    ngOnInit(): void {
        // throw new Error('Method not implemented.');
        
        this.apiService.getErabiltzaileak(this.erabiltzaileak).subscribe({
            next: (data) => {
                console.log(data)
                this.erabiltzaileak = data;
                
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
    const names = [this.erabiltzaileak];
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