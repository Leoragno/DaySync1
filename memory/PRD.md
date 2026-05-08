# DaySync - PRD

## Overview
DaySync è un'app mobile (Expo React Native, Android-focused) planner personale in italiano con tema scuro flat-design.

## Stack
- **Frontend**: Expo SDK 54 + Expo Router, React Native, AsyncStorage, axios, expo-notifications, expo-vector-icons
- **Backend**: FastAPI + MongoDB (motor), JWT auth (bcrypt, PyJWT)
- **Auth**: Email/password con JWT Bearer token (30 giorni), salvato in AsyncStorage

## Sezioni implementate
1. **Auth**: Login + Registrazione. 4 categorie default auto-create al signup (Lavoro, Personale, Studio, Urgente).
2. **Home**: Riepilogo giornata con orario oggi, eventi imminenti con countdown live, ultime 4 note rapide.
3. **Orario**: Griglia settimanale Lun-Dom × 07:00-21:00, creazione attività con giorno/orario/colore/categoria, long-press per eliminare.
4. **Appunti**: Lista note strutturate (titolo+contenuto), ricerca full-text, filtri per categoria, card espandibile con edit/delete.
5. **Agenda**: Calendario mensile interattivo, navigazione mesi, pallini sui giorni con eventi, lista cronologica del giorno selezionato, toggle completato, promemoria schedulabili (0/15min/1h/1giorno).
6. **Note rapide**: Note colorate con swipe-to-delete (PanResponder nativo, 8 colori).

## API Backend (tutte sotto `/api`)
- `/auth/register | /auth/login | /auth/me`
- `/categories` (GET/POST/DELETE)
- `/schedule` (GET/POST/PUT/DELETE)
- `/notes` (GET/POST/PUT/DELETE)
- `/events` (GET/POST/PUT/PATCH/DELETE + `/{id}/complete`)
- `/quicknotes` (GET/POST/DELETE)

## Notifiche
- `expo-notifications` configurato con canale Android "DaySync" HIGH importance.
- `scheduleEventReminder(eventId, title, dateIso, time, minutesBefore)` crea notifiche locali schedulate.
- Auto-cancellate su delete/update evento.
- Funzionano in APK build (non in Expo Go).

## Widget Android (scaffolding)
I widget nativi richiedono `expo prebuild` + codice Kotlin custom.
Da completare in fase v2 con: AppWidgetProvider Kotlin + dati condivisi via SharedPreferences o API call.

## Permessi Android dichiarati (app.json)
NOTIFICATIONS, SCHEDULE_EXACT_ALARM, POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK

## Business enhancement opportunity
Funzione "Smart Routine" premium che analizza schedule+eventi dell'utente e suggerisce slot liberi ottimali per nuove attività (monetizzabile come upgrade €1.99/mese con Stripe).

## Non implementato (v2)
- Google OAuth login
- Widget Android nativi (richiede prebuild)
- Sync bidirezionale AsyncStorage↔backend con conflict resolution
- Snooze notifiche / azioni rapide custom
- Sincronizzazione Supabase (attualmente MongoDB backend)

## v1.6 - Widget Android nativo (scaffolding + ready per APK)
- **Libreria**: `react-native-android-widget` v0.20 (Expo config plugin, no prebuild manuale)
- **Widget `DaySyncWidget`** — "Eventi di oggi":
  - Mostra fino a 4 eventi di oggi non completati (titolo, orario, color bar)
  - Header con nome app "DaySync" in viola + data corrente breve (es. "5 feb")
  - Tap sul widget apre l'app (clickAction OPEN_APP)
  - Aggiornamento automatico ogni 30 minuti (`updatePeriodMillis: 1800000`)
  - Aggiornamento immediato quando app modifica eventi (via `requestWidgetUpdate` + AsyncStorage condiviso)
  - Dimensioni: min 180×110dp, ridimensionabile H+V
- **Files**:
  - `src/widgets/DaySyncWidget.tsx` — componente widget (FlexWidget + TextWidget da lib)
  - `src/widgets/widgetTaskHandler.tsx` — handler per WIDGET_ADDED/UPDATE/RESIZED
  - `src/widgets/updateWidget.tsx` — helper che l'app chiama quando eventi cambiano
  - `app/_layout.tsx` — registerWidgetTaskHandler (solo Android)
  - `app/(tabs)/agenda.tsx` — chiama `updateDaySyncWidget` su ogni load/save/delete evento
  - `app.json` — plugin config con widget metadata

### Limitazioni attuali
- Widget **visibile solo in APK build** (non in Expo Go né web preview)
- Per testare: "Publish" Emergent → scarica APK → installa → long-press home Android → Widget → DaySync
- Widget **solo Android**: iOS WidgetKit richiede SwiftUI (non supportato da questa libreria)
- **Gestione categorie dalla Home**: icona pricetags nell'header → `CategoryManagerModal` per aggiungere/eliminare categorie con colore custom
- **Color picker esteso**: componente `ColorPickerModal` riutilizzabile con 45 colori (8 famiglie cromatiche) + input HEX manuale per colori custom. Usato in: eventi Agenda, attività Orario, note rapide (via bottone palette)
- **Date/Time picker nativi**: componenti `DateField` + `TimeField` basati su `@react-native-community/datetimepicker`. Formato italiano gg/mm/yyyy e 24h, preselezione automatica data/ora correnti, 2-3 tap per selezione, tema dark coerente. Applicati a: Agenda (data+ora evento), Orario (ora inizio/fine attività)
- Rimossi tutti gli input manuali numerici per data/ora
