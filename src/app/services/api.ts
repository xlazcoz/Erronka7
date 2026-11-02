import { HttpClient } from '@angular/common/http';
import { Injectable, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Erabiltzaileak } from '../erabiltzaileak/erabiltzaileak';

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
    egoera: string
    takilla_id: number
}

interface Erreserba{
    egoera: string
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

    constructor(private http: HttpClient){}

    // ERABILTZAILEAK DEIAK
    erabiltzaileak: string = this.apiErabiltzaileakGet;
    getErabiltzaileak(erabiltzaileak: any): Observable<any>{
        const url = this.apiErabiltzaileakGet;
        return this.http.get(url);
    }

    erabiltzaileakSortu: string = this.apiErabiltzaileakSortu;
    sortuErabiltzaileak(erabiltzailea: Erabiltzailea): Observable<Erabiltzailea>{
        const url = this.apiErabiltzaileakSortu;
        return this.http.post<Erabiltzailea>(url, erabiltzailea);
    }

    idAldatuErab: string = this.apiErabiltzaileakAldatu;
    aldatuErabiltzaileak(idAldatuErab: number, partialData: Partial<Erabiltzailea>): Observable<any>{
        const url = this.apiErabiltzaileakAldatu.replace('{id}', idAldatuErab.toString());
        return this.http.patch<Erabiltzailea>(`${url}/${idAldatuErab}`, partialData);
    }

    idRolErab: string = this.apiErabiltzaileakRolak;
    aldatuErabiltzaileakRolak(idRolErab: number, partialData: Partial<Erabiltzailea>): Observable<any>{
        const url = this.apiErabiltzaileakRolak.replace('{id}', idRolErab.toString());
        return this.http.patch<Erabiltzailea>(`${url}/${idRolErab}`, partialData);
    }

    idErreserbaErab: string = this.apiErabiltzaileakErreserbak;
    getErabiltzaileakErreserbak(idErreserbaErab: number): Observable<any>{
        const url = this.apiErabiltzaileakErreserbak.replace('{id}', idErreserbaErab.toString());
        return this.http.get(url);
    }

    // KARGAGUNEAK DEIAK
    kargaguneakSortu: string = this.apiKargaguneakSortu;
    sortuKargaguneak(kargagunea: Kargagunea): Observable<Kargagunea>{
        const url = this.apiKargaguneakSortu;
        return this.http.post<Kargagunea>(url, kargagunea);
    }

    idAldatuKarg: string = this.apiKargaguneakAldatu;
    aldatuKargaguneak(idAldatuKarg: number, partialData: Partial<Kargagunea>): Observable<Kargagunea>{
        const url = this.apiKargaguneakAldatu.replace('{id}', idAldatuKarg.toString());
        return this.http.patch<Kargagunea>(`${url}/${idAldatuKarg}`, partialData);
    }

    idEzabatuKarg: string = this.apiKargaguneakEzabatu;
    EzabatuKargaguneak(idEzabatuKarg: number): Observable<Kargagunea>{
        const url = this.apiKargaguneakEzabatu.replace('{id}', idEzabatuKarg.toString());
        return this.http.delete<Kargagunea>(`${url}/${idEzabatuKarg}`);
    }

    idIrudiaKarg: string = this.apiKargaguneakIrudiak;
    aldatuKargaguneakIrudia(idIrudiaKarg: number, partialData: Partial<Kargagunea>): Observable<Kargagunea>{
        const url = this.apiKargaguneakIrudiak.replace('{id}', idIrudiaKarg.toString());
        return this.http.patch<Kargagunea>(`${url}/${idIrudiaKarg}`, partialData);
    }

    // POWERBANK DEIAK
    powerbankSortu: string = this.apiPowerbankSortu;
    sortuPowerbank(powerbank: Powerbank): Observable<Powerbank>{
        const url = this.apiPowerbankSortu;
        return this.http.post<Powerbank>(url, powerbank);
    }

    idAldatuPowerpankTokia: string = this.apiPowerbankTokiaAldatu;
    aldatuPowerbankTokia(idAldatuPowerpankTokia: number, partialData: Partial<Powerbank>): Observable<Powerbank>{
        const url = this.apiPowerbankTokiaAldatu.replace('{id}', idAldatuPowerpankTokia.toString());
        return this.http.patch<Powerbank>(`${url}/${idAldatuPowerpankTokia}`, partialData);
    }

    // ERRESERBAK DEIAK
    erreserbak: string = this.apiErreserbakGet;
    getErreserbak(): Observable<any>{
        const url = this.apiErreserbakGet;
        return this.http.get(url);
    }

    idAldatuEgoeraErres: string = this.apiErreserbakEgoeraAldatu;
    aldatuErreserbenEgoera(idAldatuEgoeraErres: number, partialData: Partial<Erreserba>): Observable<Erreserba>{
        const url = this.apiErreserbakEgoeraAldatu.replace('{id}', idAldatuEgoeraErres.toString());
        return this.http.patch<Erreserba>(`${url}/${idAldatuEgoeraErres}`, partialData);
    }
}
