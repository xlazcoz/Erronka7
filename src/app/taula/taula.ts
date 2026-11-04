import { ChangeDetectorRef, Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HubTableComponent, PaginableTableOrdination, PaginableActionButton, HubTranslationService } from 'ng-hub-ui-paginable';
import { Api } from '../services/api';

@Component({
  selector: 'app-taula',
  standalone: true,
  imports: [HubTableComponent, FormsModule],
  providers: [HubTranslationService],
  templateUrl: './taula.html',
})
export class Taula implements OnInit{
  users = signal<any[]>([]);
  totalItems = signal<number>(0);
  isLoading = signal<boolean>(false);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  searchTerm = signal<string>('');
  ordination = signal<PaginableTableOrdination | undefined>(undefined);
  // selectedUsers = signal<any[]>([]);
  selectedUsers = signal<any | null>(null);

  headers = [
    { property: 'id', title: 'ID', sortable: true },
    { property: 'izena', title: 'Izena', sortable: true },
    { property: 'abizena', title: 'Abizena', sortable: true },
    { property: 'login_email', title: 'Email', sortable: true },
    { property: 'rola', title: 'Rola', sortable: true },
    { property: 'erreserbak', title: 'Erreserbak', sortable: true }
  ];

  private mockDatabase = this.generateMockData(50);

  private apiService = inject(Api);
  private cdr: ChangeDetectorRef;
  
  constructor(cdr1: ChangeDetectorRef) {
    this.cdr = cdr1;
  }
  
  erabiltzaileak: any;
  ngOnInit(): void {
      this.isLoading.set(true);
      this.apiService.getErabiltzaileak().subscribe({
          next: (data) => {
              console.log(data)
              this.users.set(data)
              this.totalItems.set(data.length)
              this.cdr.detectChanges();
              this.isLoading.set(false);
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

  erabiltzailea = {
    izena: "",
    abizena: "",
    login_email: "",
    login_pasahitza: "",
    rola: "",
    erreserben_historikoa: ""
  }

  sortuErabiltzailea(){
    this.apiService.sortuErabiltzaileak(this.erabiltzailea).subscribe({
      next: (response) => {
        console.log("Sortuta", response)
      }, error: (err) => console.error('Errorea', err)
    })
  }

  erabiltzaileaID: number = 0;
  erabiltzaileaEditatu(dialog: HTMLDialogElement) {
    const erab = this.selectedUsers();
    if (!erab) {
      alert('Erabiltzaile bat hautatu');
      return;
    }

    this.erabiltzaileaID = erab.id;

    this.erabiltzailea = {
      izena: erab.izena,
      abizena: erab.abizena,
      login_email: erab.login_email,
      login_pasahitza: '',
      rola: erab.rola,
      erreserben_historikoa: erab.erreserben_historikoa
    };
    dialog.showModal();
  }

  aldatuErabiltzailea(id: number){
    this.apiService.aldatuErabiltzaileak(id, this.erabiltzailea).subscribe({
      next: (response) => {
        console.log("Aldatuta", response)
        this.apiService.getErabiltzaileak().subscribe(data => {
          this.users.set(data);
          this.selectedUsers.set([]);
        });
      }, error: (err) => console.error('Errorea', err)
    })
  }
}