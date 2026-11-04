import { Component } from '@angular/core';
import { Api } from '../services/api';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
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
        console.log("Erregistratuta", response);
        alert("Erregistratuta");
      }, error: (err) => {
        console.error('Errorea', err)
         if (err.status == 409) {
          alert("Emaila erregistratuta dago, saioa hasi behar duzu");
        }
      }
    })
  }
}
