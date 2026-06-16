# 🏆 ScoreKeeper Web

[![HTML5](https://img.shields.io/badge/HTML-5-orange.svg?style=flat-square)](https://developer.mozilla.org/en-US/docs/Glossary/HTML5)
[![CSS3](https://img.shields.io/badge/CSS-3-blue.svg?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript Vanilla](https://img.shields.io/badge/JS-Vanilla-yellow.svg?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vercel Static](https://img.shields.io/badge/Deploy-Vercel-black.svg?style=flat-square)](https://vercel.com/)

**ScoreKeeper Web** è un calcolatore di punteggi premium (Single Page Application) ottimizzato per i classici giochi di carte italiani (Scopa, Briscola, Bisca, Ciccopaolo, Scala 40) e giochi da tavolo in genere. Realizzato in **HTML5, CSS3 e JavaScript Vanilla**, è progettato con un'estetica scura moderna, animazioni fluide e una UX mobile-first adatta sia per smartphone che per desktop.

Tutti i dati sono gestiti in locale nel browser tramite **`localStorage`**: nessun database esterno, nessun backend, nessuna chiamata API server-side. Il progetto è pronto per essere deployato direttamente su **Vercel** come sito statico.

---

> [!IMPORTANT]
> ### 🧮 Calcolatore Primiera Integrato
> L'applicazione include un calcolatore interattivo di Primiera integrato:
> - **Selezione Visiva dei Semi:** Scegli le carte migliori per Denari (🪙), Coppe (🏆), Spade (⚔️) e Bastoni (🪵).
> - **Vincolo di Unicità:** Impedisce a due giocatori di selezionare la stessa carta per un seme, rispecchiando le regole reali.
> - **Punti Primiera Reali:** Punteggi calcolati con pesi tradizionali (7 = 21, 6 = 18, Asso = 16, 5 = 15, 4 = 14, 3 = 13, 2 = 12, Figure = 10).
> - **Applicazione Diretta:** Il vincitore calcolato viene applicato con un click direttamente nel modale del round di *Scopa* o *Ciccopaolo*.

---

## ✨ Caratteristiche principali

- **📱 Design Premium Dark Mode:** Estetica minimal ispirata all'interfaccia iOS, con palette colori personalizzata (sfondo nero assoluto, schede grigio grafite, bordi ultra-sottili e accenti colorati dedicati per ogni gioco).
- **⚡ Feedback Aptico Emulato:** Sfrutta le API di vibrazione del browser (`navigator.vibrate`) per generare vibrazioni tattili distinte su incrementi/decrementi, round vinti o chiusure di partita (su dispositivi Android/Chrome compatibili).
- **🔄 Persistenza della Sessione:** Lo stato di tutti i giochi attivi e la lista dei giocatori vengono salvati in tempo reale nel `localStorage`. Puoi ricaricare la pagina o riaprire il browser senza perdere la partita in corso.
- **👥 Gestione Giocatori:** Un registro locale per aggiungere, selezionare o rimuovere i giocatori, integrato direttamente nelle schermate di setup dei giochi.

---

## 🃏 Giochi Supportati e Logica di Calcolo

| Gioco | Regole e Logica di Calcolo |
| :--- | :--- |
| **Scopa** | Partita a 11, 21 o target personalizzato. Tracciamento di Carte, Primiera (con calcolatore), Settebello, Denari, Scope effettuate e punti Napola. |
| **Briscola** | Match singolo o alla meglio di 3/5. Ripartizione dei 120 punti totali della smazzata tramite slider interattivo. Assegnazione automatica del Segno a chi supera i 60 punti. |
| **Bisca** | Gioco a eliminazione diretta. Setup vite iniziale (3, 5, 7, 10 o custom). I giocatori sballano a 0 vite (strikethrough visivo) con opzione di "Riattiva". Vince l'ultimo sopravvissuto. |
| **Ciccopaolo** | Variante Scopa a 2 o 3 giocatori. Match "Botta secca" o "Alla meglio di 3" con target smazzata a 21 o 31. Gestione partizioni e reset automatico a fine smazzata con incremento dei match vinti. |
| **Scala 40** | Eliminazione al superamento del target (es. 101/201). Gestione "Chiusura" (0pt) e "Non Aperto" (100pt). Calcolatore interattivo carte rimaste (Jolly a 25pt, Assi a 11pt, Figure a 10pt, somma numerici). Rientro del giocatore sballato allineato al punteggio attivo più alto. |
| **Punti (Standard)** | Tracciatore generico round-by-round per qualsiasi gioco da tavolo. Gestione punteggio parziale, vincitore del round con note e classifica finale basata su round vinti e punteggio totale. |

---

## 🛠 Tech Stack

- **Struttura:** HTML5 Semantico
- **Stile (CSS):** CSS3 Vanilla con Variabili CSS Custom, Flexbox/Grid e animazioni `@keyframes`.
- **Logica (JS):** ES6 Vanilla JavaScript (Single Page Application basata su pannelli dinamici).
- **Icone:** [Lucide Icons](https://lucide.dev/) caricate via CDN.
- **Font:** Google Fonts (Inter & Outfit).

---

## 🚀 Come Eseguire in Locale

Il progetto non richiede compilazione o installazione di dipendenze (come Node.js o npm) per l'esecuzione.

1. Scarica o clona il repository.
2. Apri il file `index.html` direttamente in un qualsiasi browser web.
3. *Opzionale:* Se vuoi testare la persistenza delle sessioni o simulare al meglio il comportamento mobile, esegui un server locale leggero (ad esempio tramite Python o Node):
   ```bash
   python3 -m http.server 8000
   ```
   E naviga su `http://localhost:8000`.

---

## 📦 Come Effettuare il Deploy su Vercel

Il progetto è nativamente compatibile con Vercel come sito statico.

### Opzione 1: Vercel CLI (Terminale)
1. Installa Vercel CLI globalmente (se non lo hai già):
   ```bash
   npm install -g vercel
   ```
2. Nella directory principale del progetto esegui:
   ```bash
   vercel
   ```
3. Segui le istruzioni a schermo per completare il deploy.

### Opzione 2: Integrazione GitHub/GitLab
1. Carica il progetto in un repository Git (assicurandoti che i file `index.html`, `style.css` e `app.js` si trovino nella root).
2. Accedi alla dashboard di Vercel e clicca su **Add New Project**.
3. Importa il tuo repository.
4. Lascia la **Root Directory** impostata sulla root del repository `./` e clicca su **Deploy**.
