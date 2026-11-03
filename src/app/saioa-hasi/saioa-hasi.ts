import { Component } from '@angular/core';
import { Api } from '../services/api';

@Component({
  imports: [],
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
        console.log("Saioa hasita", response)
      }, error: (err) => console.error('Errorea', err)
    })
  }
}
