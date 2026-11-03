import { Component, NgModule } from '@angular/core';
import { Api } from '../services/api';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  imports: [FormsModule, CommonModule],
  selector: 'app-powerbanks',
  styleUrl: './powerbanks.css',
  templateUrl: './powerbanks.html',
})
export class Powerbanks {
  powerbank = {
    id: 1,
    karga_maila: 0,
    egoera: "",
    karga_postua_id: 1
  }

  constructor(private apiService: Api){}

  sortuPowerbanka(){
    this.apiService.sortuPowerbank(this.powerbank).subscribe({
      next: (response) => {
        console.log("Gordeta", response)
      }, error: (err) => console.error('Errorea', err)
    })
  }

  powerbankTokiaAldatu(id: number){
    this.apiService.aldatuPowerbankTokia(id, this.powerbank).subscribe({
      next: (response) => {
        console.log("Aldatuta", response)
      }, error: (err) => console.error('Errorea', err)
    })
  }
}
