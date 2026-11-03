import { Component } from '@angular/core';
import { Api } from '../services/api';

@Component({
  imports: [],
  selector: 'app-erregistratu',
  styleUrl: './erregistratu.css',
  templateUrl: './erregistratu.html',
})
export class Erregistratu {
  register = {
    izena: "",
    login_email: "",
    login_pasahitza: ""
  }
  
  constructor(private apiService: Api){}
  
  erregistratuErab(){
    this.apiService.erregistratu(this.register).subscribe({
      next: (response) => {
        console.log("Erregistratuta", response)
      }, error: (err) => console.error('Errorea', err)
    })
  }
}
