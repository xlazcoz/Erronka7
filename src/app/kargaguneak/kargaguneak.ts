import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Api } from '../services/api';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  imports: [FormsModule, CommonModule],
  selector: 'app-kargaguneak',
  styleUrl: './kargaguneak.css',
  templateUrl: './kargaguneak.html',
})

export class Kargaguneak{
  kargagunea = {
    izena: "",
    helbidea: "",
    irudia1: "",
    irudia2: "",
    irudia3: "",
    egoera: ""
  }

  constructor(private apiService: Api){}

  sortuKargagunea(){
    this.apiService.sortuKargaguneak(this.kargagunea).subscribe({
      next: (response) => {
        console.log("Gordeta", response)
      }, error: (err) => console.error('Errorea', err.error)
      })
    }
}
