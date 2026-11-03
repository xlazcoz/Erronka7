import { Component } from '@angular/core';
import { Api } from '../services/api';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-saioa-hasi',
  styleUrl: './saioa-hasi.css',
  templateUrl: './saioa-hasi.html',
})
export class SaioaHasi {
  login = {
    login_email: "",
    login_pasahitza: ""
  }

  constructor(private apiService: Api){}
  
  saioaHasi(){
    this.apiService.login(this.login).subscribe({
      next: (response) => {
        console.log("Saioa hasita", response);
        alert("Saioa hasita");
      }, error: (err) => {
        console.error('Errorea', err);
        if (err.status == 401) {
          alert('Email edo pasahitza okerra da');
        } else {
          alert('Errorea');
        }
      }
    })
  }
}
