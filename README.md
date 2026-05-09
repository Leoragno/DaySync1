# DaySync Workspace

Questa app è progettata per funzionare autonomamente su Android tramite Firebase. Per garantire che l'app non dipenda dal computer o dal prompt di Expo sempre aperto, è necessario generare una **Production Build** (un file APK standalone).

## Sviluppo vs Produzione

*   **Sviluppo (npx expo start)**: Richiede che il prompt sia aperto sul PC. Utile solo mentre scrivi il codice.
*   **Produzione (APK Standalone)**: L'app viene installata sul telefono, si collega direttamente a Firebase Cloud e funziona per sempre senza bisogno del computer.

## Come rendere l'app autonoma (Creare l'APK)

Per ottenere l'app che "va da sola":

1.  **Installa EAS CLI**:
    ```bash
    npm install -g eas-cli
    ```
2.  **Accedi a Expo**:
    ```bash
    eas login
    ```
3.  **Crea l'APK**:
    Dalla cartella `frontend`, esegui:
    ```bash
    eas build --profile preview --platform android
    ```
    *   Scegli `preview` per avere un file `.apk` scaricabile.
    *   Una volta finito, installa l'APK sul tuo telefono.
    *   **Ora puoi chiudere il prompt sul PC**: l'app sul telefono continuerà a funzionare collegandosi a Firebase.

## Note sui Workflow
I workflow di GitHub Actions sono stati configurati per supportare la build automatica e il deploy su Firebase Hosting.
