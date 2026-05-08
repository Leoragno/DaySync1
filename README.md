# DaySync Workspace

Questa app è ora **Local-First** e autonoma. Non richiede più un server locale per funzionare, poiché utilizza `AsyncStorage` per la persistenza dei dati e l'autenticazione.

## Sviluppo e Build

### 1. Sviluppo locale
Per avviare l'app in modalità sviluppo:
```bash
cd frontend
npm install
npx expo start
```

### 2. Generazione APK Standalone (Android)
Per creare un APK che funzioni autonomamente sul dispositivo senza dipendere dal server di sviluppo Metro:

**Requisiti**: Avere `eas-cli` installato (`npm install -g eas-cli`) e un account Expo.

1.  **Configurazione build locale (opzionale se non si usa il cloud Expo)**:
    ```bash
    eas build --profile preview --platform android --local
    ```
    *Nota: La build locale richiede Android Studio e Java configurati.*

2.  **Build via Expo Cloud (più semplice)**:
    ```bash
    eas build --profile preview --platform android
    ```
    Dopo il completamento, scarica l'APK dal link fornito da Expo e installalo sul dispositivo.

### 3. Widget Android
I widget sono inclusi nell'APK e si aggiornano automaticamente ogni 30 minuti o ogni volta che i dati vengono modificati all'interno dell'app. Funzionano solo nell'APK installato, non in Expo Go.

## Note sulla migrazione
L'app è stata migrata da un'architettura basata su Firebase/Python Backend a una soluzione locale basata su `AsyncStorage`. Tutti i dati salvati sono memorizzati esclusivamente sul dispositivo dell'utente.
