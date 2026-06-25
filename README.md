# Imobiliare Admin

Aplicație web pentru gestionarea facturilor de chirie și utilități, cu integrare FGO, EmailJS și Firebase.

## Stack

- **React + Vite** — frontend
- **Firebase Auth** — autentificare utilizatori (2-5 persoane)
- **Firestore** — stocare clienți, emailuri trimise, note conversații
- **EmailJS** — trimitere emailuri din `kado.excelsior@yahoo.com`
- **FGO API** — emitere facturi + listare facturi furnizori
- **Netlify** — hosting + deploy automat din GitHub

## Funcționalități

- **Dashboard** — situație generală: de încasat, încasat, furnizori neachitați
- **Clienți** — gestionare chiriași cu date contact, WhatsApp, email, telefon
- **Conversație per client** — istoric emailuri trimise + note interne
- **Emite factură** — chirie / utilități / mixt, cu prefill date client, trimitere FGO + email automat
- **Facturi emise** — listare cu filtre, sincronizare din FGO
- **Facturi furnizori** — import din FGO/SPV ANAF

## Setup local

```bash
cp .env.example .env
# Completează valorile în .env
npm install
npm run dev
```

## Variabile de mediu

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# EmailJS
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_FACTURA=
VITE_EMAILJS_TEMPLATE_MESAJ=
VITE_EMAILJS_PUBLIC_KEY=

# FGO
VITE_FGO_TOKEN=
VITE_FGO_CIF=
VITE_FGO_SERIE=FC
VITE_FGO_ENV=test   # sau prod
```

## Deploy Netlify

1. Push pe GitHub
2. Netlify → Add new site → Import from GitHub
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Adaugă variabilele de mediu în Site configuration → Environment variables
6. Deploy!

## Firebase setup

1. Creează proiect la console.firebase.google.com
2. Activează Authentication → Email/Password
3. Adaugă utilizatorii manual din consolă Firebase
4. Activează Firestore Database
5. Reguli Firestore (în consolă):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{doc=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## EmailJS setup

1. Cont gratuit la emailjs.com (200 emailuri/lună)
2. Adaugă Service → Yahoo Mail cu `kado.excelsior@yahoo.com`
3. Creează template `template_factura` cu variabilele:
   - `{{to_email}}`, `{{to_name}}`, `{{nr_factura}}`, `{{suma}}`, `{{scadenta}}`, `{{observatii}}`
4. Creează template `template_mesaj` cu variabilele:
   - `{{to_email}}`, `{{to_name}}`, `{{subiect}}`, `{{mesaj}}`
5. Copiază Service ID, Template IDs și Public Key în .env

## FGO API

- Token: FGO → Setări → Utilizatori → Adaugă user API
- Documentație: https://api.fgo.ro/v1/testing.html
- Test: https://api-testuat.fgo.ro/v1
- Producție: https://api.fgo.ro/v1
