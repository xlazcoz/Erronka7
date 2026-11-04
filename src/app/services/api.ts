import { HttpClient } from '@angular/common/http';
import { Injectable, Service } from '@angular/core';
import { Observable } from 'rxjs';

interface Erabiltzailea{
    izena: string
    abizena: string
    login_email: string
    login_pasahitza: string
    rola: string
    erreserben_historikoa: string
}

interface Kargagunea{
    izena: string
    helbidea: string
    irudia1: string
    irudia2: string
    irudia3: string
    egoera: string
}

interface Powerbank{
    karga_maila: number
    karga_postua_id: number
}

interface Erreserba{
    id: number
    erabiltzailea_id: number,
    powerbank_id: number,
    hasiera_data_ordua: Date,
    amaiera_data_ordua: Date,
    egikaritze_data_ordua: Date | null,
    amaitze_data_ordua: Date | null,
    hasierako_karga_postua: number,
    bukaerako_karga_postua: number | null,
    egoera: string
}

interface Register{
    izena: string
    login_email: string
    login_pasahitza: string
}

interface Login{
    login_email: string
    login_pasahitza: string
}

@Injectable({ providedIn: 'root' })
export class Api {
    private apiErabiltzaileakGet = "http://127.0.0.1:8000/erabiltzaileak";
    private apiErabiltzaileakSortu = "http://127.0.0.1:8000/erabiltzaileak";
    private apiErabiltzaileakAldatu = "http://127.0.0.1:8000/erabiltzaileak/{id}";
    private apiErabiltzaileakRolak = "http://127.0.0.1:8000/erabiltzaileak/{id}/rola";
    private apiErabiltzaileakErreserbak = "http://127.0.0.1:8000/erabiltzaileak/{id}/erreserben_historikoa";

    private apiKargaguneakSortu = "http://127.0.0.1:8000/kargaguneak";
    private apiKargaguneakAldatu = "http://127.0.0.1:8000/kargaguneak/{id}";
    private apiKargaguneakEzabatu = "http://127.0.0.1:8000/kargaguneak/{id}";
    private apiKargaguneakIrudiak = "http://127.0.0.1:8000/kargaguneak/{id}/irudia";

    private apiPowerbankSortu = "http://127.0.0.1:8000/powerbanks";
    private apiPowerbankTokiaAldatu= "http://127.0.0.1:8000/powerbanks/{id}";

    private apiErreserbakGet = "http://127.0.0.1:8000/erreserbak";
    private apiErreserbakEgoeraAldatu = "http://127.0.0.1:8000/erreserbak/{id}/egoera";

    private apiErregistratu = "http://127.0.0.1:8000/login/register"
    private apiLogin = "http://127.0.0.1:8000/login" 

    constructor(private http: HttpClient){}

    // ERABILTZAILEAK DEIAK
    getErabiltzaileak(): Observable<any>{
        const url = this.apiErabiltzaileakGet;
        return this.http.get(url);
    }

    sortuErabiltzaileak(erabiltzailea: Erabiltzailea): Observable<Erabiltzailea>{
        const url = this.apiErabiltzaileakSortu;
        return this.http.post<Erabiltzailea>(url, erabiltzailea);
    }

    aldatuErabiltzaileak(id: number, partialData: Partial<Erabiltzailea>): Observable<any>{
        const url = this.apiErabiltzaileakAldatu.replace('{id}', id.toString());
        return this.http.patch<Erabiltzailea>(url, partialData);
    }

    aldatuErabiltzaileakRolak(id: number, partialData: Partial<Erabiltzailea>): Observable<any>{
        const url = this.apiErabiltzaileakRolak.replace('{id}', id.toString());
        return this.http.patch<Erabiltzailea>(url, partialData);
    }

    getErabiltzaileakErreserbak(id: number): Observable<any>{
        const url = this.apiErabiltzaileakErreserbak.replace('{id}', id.toString());
        return this.http.get(url);
    }

    // KARGAGUNEAK DEIAK
    sortuKargaguneak(kargagunea: Kargagunea): Observable<Kargagunea>{
        const url = this.apiKargaguneakSortu;
        return this.http.post<Kargagunea>(url, kargagunea);
    }

    aldatuKargaguneak(id: number, partialData: Partial<Kargagunea>): Observable<Kargagunea>{
        const url = this.apiKargaguneakAldatu.replace('{id}', id.toString());
        return this.http.patch<Kargagunea>(url, partialData);
    }

    ezabatuKargaguneak(id: number): Observable<Kargagunea>{
        const url = this.apiKargaguneakEzabatu.replace('{id}', id.toString());
        return this.http.delete<Kargagunea>(url);
    }

    aldatuKargaguneakIrudia(id: number, partialData: Partial<Kargagunea>): Observable<Kargagunea>{
        const url = this.apiKargaguneakIrudiak.replace('{id}', id.toString());
        return this.http.patch<Kargagunea>(url, partialData);
    }

    // POWERBANK DEIAK
    sortuPowerbank(powerbank: Powerbank): Observable<Powerbank>{
        const url = this.apiPowerbankSortu;
        return this.http.post<Powerbank>(url, powerbank);
    }

    aldatuPowerbankTokia(id: number, partialData: Partial<Powerbank>): Observable<Powerbank>{
        const url = this.apiPowerbankTokiaAldatu.replace('{id}', id.toString());
        return this.http.patch<Powerbank>(url, partialData);
    }

    // ERRESERBAK DEIAK
    getErreserbak(): Observable<any>{
        const url = this.apiErreserbakGet;
        return this.http.get(url);
    }

    aldatuErreserbenEgoera(id: number, partialData: Partial<Erreserba>): Observable<Erreserba>{
        const url = this.apiErreserbakEgoeraAldatu.replace('{id}', id.toString());
        return this.http.patch<Erreserba>(url, partialData);
    }

    // ERREGISTRATU DEIA
    erregistratu(register: Register): Observable<Register>{
        const url = this.apiErregistratu;
        return this.http.post<Register>(url, register);
    }

    // LOGIN DEIA
    login(login: Login): Observable<Login>{
        const url = this.apiLogin;
        return this.http.post<Login>(url, login);
    }
}
