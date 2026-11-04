import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

const API_HOST =
    typeof window !== 'undefined' ? window.location.hostname || '127.0.0.1' : '127.0.0.1';
const API_BASE = `http://${API_HOST}:8000`;

export interface Erabiltzailea{
    id?: number
    izena: string
    abizena: string
    login_email: string
    login_pasahitza: string
    rola: string
    aktiboa?: boolean
    erreserben_historikoa?: string
    erreserbak?: Erreserba[]
}

export interface KargaPostua{
    id: number
    egoera: string
    kargagunea_id: number
}

export interface KargaPostuaCreate{
    egoera: string
    kargagunea_id: number
}

export interface Kargagunea{
    id?: number
    izena: string
    helbidea: string
    irudia1: string
    irudia2: string
    irudia3: string
    egoera: string
    libres?: number
    karga_postuak?: KargaPostua[]
}

export interface Powerbank{
    id?: number
    karga_maila: number
    karga_postua_id: number
}

export interface Erreserba{
    id: number
    erabiltzailea_id: number,
    powerbank_id: number,
    hasiera_data_ordua: Date,
    amaiera_data_ordua: Date,
    egikaritze_data_ordua: Date,
    amaitze_data_ordua: Date,
    hasierako_karga_postua: number,
    bukaerako_karga_postua: number,
    egoera: string
}

export interface Register{
    izena: string
    login_email: string
    login_pasahitza: string
}

export interface Login{
    login_email: string
    login_pasahitza: string
}

@Injectable({ providedIn: 'root' })
export class Api {
    private apiErabiltzaileakGet = `${API_BASE}/erabiltzaileak`;
    private apiErabiltzaileakSortu = `${API_BASE}/erabiltzaileak`;
    private apiErabiltzaileakAldatu = `${API_BASE}/erabiltzaileak/{id}`;
    private apiErabiltzaileakEzabatu = `${API_BASE}/erabiltzaileak/{id}`;
    private apiErabiltzaileakRolak = `${API_BASE}/erabiltzaileak/{id}/rola`;
    private apiErabiltzaileakErreserbak = `${API_BASE}/erabiltzaileak/{id}/erreserbak`;

    private apiKargaguneakGet = `${API_BASE}/kargaguneak`;
    private apiKargaguneakSortu = `${API_BASE}/kargaguneak`;
    private apiKargaguneakAldatu = `${API_BASE}/kargaguneak/{id}`;
    private apiKargaguneakEzabatu = `${API_BASE}/kargaguneak/{id}`;
    private apiKargaguneakIrudiak = `${API_BASE}/kargaguneak/{id}/irudia`;

    private apiKargaPostuakGet = `${API_BASE}/kargapostuak`;
    private apiKargaPostuakSortu = `${API_BASE}/kargapostuak`;
    private apiKargaPostuakAldatu = `${API_BASE}/kargapostuak/{id}`;
    private apiKargaPostuakEzabatu = `${API_BASE}/kargapostuak/{id}`;

    private apiPowerbanksGet = `${API_BASE}/powerbanks`;
    private apiPowerbankSortu = `${API_BASE}/powerbanks`;
    private apiPowerbankAldatu = `${API_BASE}/powerbanks/{id}`;
    private apiPowerbankEzabatu = `${API_BASE}/powerbanks/{id}`;

    private apiErreserbakGet = `${API_BASE}/erreserbak`;
    private apiErreserbakEgoeraAldatu = `${API_BASE}/erreserbak/{id}/egoera`;
    private apiErreserbakItzuli = `${API_BASE}/erreserbak/{id}/itzuli`;

    private apiErregistratu = `${API_BASE}/login/register`;
    private apiLogin = `${API_BASE}/login`;
    private apiLogout = `${API_BASE}/login/logout`;
    private apiMe = `${API_BASE}/login/me`;

    constructor(private http: HttpClient){}

    // ERABILTZAILEAK DEIAK
    getErabiltzaileak(): Observable<Erabiltzailea[]>{
        const url = this.apiErabiltzaileakGet;
        return this.http.get<Erabiltzailea[]>(url);
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

    getErabiltzaileakErreserbak(id: number): Observable<Erreserba[]>{
        const url = this.apiErabiltzaileakErreserbak.replace('{id}', id.toString());
        return this.http.get<Erreserba[]>(url);
    }

    ezabatuErabiltzailea(id: number): Observable<Erabiltzailea>{
        const url = this.apiErabiltzaileakEzabatu.replace('{id}', id.toString());
        return this.http.delete<Erabiltzailea>(url);
    }

    // KARGAGUNEAK DEIAK
    getKargaguneak(): Observable<Kargagunea[]>{
        return this.http.get<Kargagunea[]>(this.apiKargaguneakGet);
    }

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

    igoKargaguneaIrudia(id: number, file: File): Observable<{ irudia: string }>{
        const url = `${this.apiKargaguneakGet}/${id}/irudia/upload`;
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<{ irudia: string }>(url, formData);
    }

    getKargaguneaErabilgarritasuna(
        id: number,
        hasiera: string,
        amaiera: string,
    ): Observable<KargaPostua[]>{
        return this.http.get<KargaPostua[]>(`${this.apiKargaguneakGet}/${id}/erabilgarritasuna`, {
            params: {
                hasiera_data_ordua: hasiera,
                amaiera_data_ordua: amaiera,
            },
        });
    }

    // KARGA POSTUAK DEIAK
    getKargaPostuak(): Observable<KargaPostua[]>{
        return this.http.get<KargaPostua[]>(this.apiKargaPostuakGet);
    }

    sortuKargaPostua(kargaPostua: KargaPostuaCreate): Observable<KargaPostua>{
        return this.http.post<KargaPostua>(this.apiKargaPostuakSortu, kargaPostua);
    }

    aldatuKargaPostua(id: number, partialData: Partial<KargaPostua>): Observable<KargaPostua>{
        const url = this.apiKargaPostuakAldatu.replace('{id}', id.toString());
        return this.http.patch<KargaPostua>(url, partialData);
    }

    ezabatuKargaPostua(id: number): Observable<KargaPostua>{
        const url = this.apiKargaPostuakEzabatu.replace('{id}', id.toString());
        return this.http.delete<KargaPostua>(url);
    }

    // POWERBANK DEIAK
    getPowerbanks(): Observable<Powerbank[]>{
        return this.http.get<Powerbank[]>(this.apiPowerbanksGet);
    }

    sortuPowerbank(powerbank: Powerbank): Observable<Powerbank>{
        const url = this.apiPowerbankSortu;
        return this.http.post<Powerbank>(url, powerbank);
    }

    aldatuPowerbank(id: number, partialData: Partial<Powerbank>): Observable<Powerbank>{
        const url = this.apiPowerbankAldatu.replace('{id}', id.toString());
        return this.http.patch<Powerbank>(url, partialData);
    }

    aldatuPowerbankTokia(id: number, partialData: Partial<Powerbank>): Observable<Powerbank>{
        return this.aldatuPowerbank(id, partialData);
    }

    ezabatuPowerbank(id: number): Observable<Powerbank>{
        const url = this.apiPowerbankEzabatu.replace('{id}', id.toString());
        return this.http.delete<Powerbank>(url);
    }

    // ERRESERBAK DEIAK
    getErreserbak(): Observable<Erreserba[]>{
        const url = this.apiErreserbakGet;
        return this.http.get<Erreserba[]>(url);
    }

    aldatuErreserbenEgoera(id: number, partialData: Partial<Erreserba>): Observable<Erreserba>{
        const url = this.apiErreserbakEgoeraAldatu.replace('{id}', id.toString());
        return this.http.patch<Erreserba>(url, partialData);
    }

    itzuliErreserba(
        id: number,
        partialData: { bukaerako_karga_postua: number; amaitze_data_ordua?: string },
    ): Observable<Erreserba>{
        const url = this.apiErreserbakItzuli.replace('{id}', id.toString());
        return this.http.patch<Erreserba>(url, {
            ...partialData,
            amaitze_data_ordua: partialData.amaitze_data_ordua ?? new Date().toISOString(),
            egoera: 'amaitua',
        });
    }

    // ERREGISTRATU DEIA
    erregistratu(register: Register): Observable<any>{
        const url = this.apiErregistratu;
        return this.http.post(url, register);
    }

    // LOGIN DEIA
    login(login: Login): Observable<any>{
        const url = this.apiLogin;
        return this.http.post(url, login);
    }

    logout(): Observable<any>{
        return this.http.post(this.apiLogout, {});
    }

    getMe(): Observable<Erabiltzailea>{
        return this.http.get<Erabiltzailea>(this.apiMe);
    }
}
