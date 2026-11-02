import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Api } from '../services/api';

@Component({
  imports: [],
  selector: 'app-kargaguneak',
  styleUrl: './kargaguneak.css',
  templateUrl: './kargaguneak.html',
})

export class Kargaguneak implements OnInit{
  private apiService = inject(Api);
  private cdr: ChangeDetectorRef;
  
  constructor(cdr1: ChangeDetectorRef) {
    this.cdr = cdr1;
  }

  kargaguneak: any;
  ngOnInit(): void {
      this.apiService.getErabiltzaileak(this.kargaguneak).subscribe({
          next: (data) => {
              console.log(data)
              this.kargaguneak = data;
              
              this.cdr.detectChanges();
          }, error: (err) => console.error('Errorea', err)
      })
  }
}
