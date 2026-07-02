import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { addClient } from '../../../shared/firebase/firestore'
import { serverTimestamp } from 'firebase/firestore'

// Clienți importați din FGO KADO Excelsior — 27 Iunie 2026
const CLIENTI_IMPORT = [
  {
    tip: 'PJ', cui: '39249857',
    nume: 'FUNDATIA AREA A CULTULUI CRESTIN PENTICOSTAL',
    regCom: '', telefon: '', email: 'cimpoipaulmirel@gmail.com',
    platitorTVA: false,
    adresa: 'Str. Eftimie Murgu, NR.2/A, Bihor',
    banca: 'BANCA TRANSILVANIA', iban: 'RO16BTRLRONCRT0438444801',
    spatiu: '', agent: '',
    contacte: [],
    emailuri: [{ adresa: 'cimpoipaulmirel@gmail.com', trimiteMail: true }],
  },
  {
    tip: 'PJ', cui: '38279256',
    nume: 'RAIDO COM S.R.L.',
    regCom: 'J2017000997380', telefon: '0722430350', email: 'monicagrig@yahoo.com',
    platitorTVA: false,
    adresa: 'Str. General Magheru, NR.4, BL.V3, SC.A, ET.8, AP.26, Valcea',
    banca: '', iban: '', spatiu: '', agent: 'Ungureanu Ion',
    contacte: [{ nume: 'Monica Grigore', functie: '', telefon: '0722430350', whatsapp: '', trimiteMesaj: true }],
    emailuri: [{ adresa: 'monicagrig@yahoo.com', trimiteMail: true }],
  },
  {
    tip: 'PJ', cui: '46951950',
    nume: 'DELY SI DORY SHOP S.R.L.',
    regCom: 'J2022001171381', telefon: '0752626950', email: 'mariatudor097@gmail.com',
    platitorTVA: null,
    adresa: 'SAT ROBAIA COM. BERISLAVESTI, STR. MANTESTI, NR.2, Valcea',
    banca: '', iban: '', spatiu: '', agent: '',
    contacte: [{ nume: 'Toma Maria', functie: '', telefon: '0752626950', whatsapp: '', trimiteMesaj: true }],
    emailuri: [{ adresa: 'mariatudor097@gmail.com', trimiteMail: true }],
  },
  {
    tip: 'PJ', cui: '38619030',
    nume: 'DROGHERIA DIA NATUR S.R.L.',
    regCom: 'J38/1199/2017', telefon: '', email: 'diana29ungureanu@gmail.com',
    platitorTVA: false,
    adresa: 'Str. Calea lui Traian, NR.670, Valcea',
    banca: 'BANCA TRANSILVANIA', iban: 'RO08BTRLRONCRT0428031801',
    spatiu: '', agent: 'Ungureanu Ion',
    contacte: [{ nume: 'Ungureanu Elena Diana', functie: '', telefon: '', whatsapp: '', trimiteMesaj: false }],
    emailuri: [{ adresa: 'diana29ungureanu@gmail.com', trimiteMail: true }],
  },
  {
    tip: 'PJ', cui: '38845681',
    nume: 'DENIS SI IANIS S.R.L.',
    regCom: 'J2018000123382', telefon: '0745273503', email: 'floareadumitra2@gmail.com',
    platitorTVA: null,
    adresa: 'Str Valea Mamului, NR.13, Valcea',
    banca: '', iban: '', spatiu: '', agent: 'Ungureanu Ion',
    contacte: [{ nume: 'Floarea Dumitra', functie: '', telefon: '0745273503', whatsapp: '', trimiteMesaj: true }],
    emailuri: [{ adresa: 'floareadumitra2@gmail.com', trimiteMail: true }],
  },
  {
    tip: 'PJ', cui: '34959276',
    nume: 'CEMARBET S.R.L.',
    regCom: 'J2020005088234', telefon: '0723370874', email: 'office@getsbet.ro',
    platitorTVA: false,
    adresa: 'Bld. Pipera, NR.1/L, Ilfov',
    banca: '', iban: '', spatiu: '', agent: 'Ungureanu Ion',
    contacte: [{ nume: 'Catalina Iamandi', functie: '', telefon: '0723370874', whatsapp: '', trimiteMesaj: true }],
    emailuri: [{ adresa: 'office@getsbet.ro', trimiteMail: true }],
  },
]

export default function ImportClienti() {
  const navigate  = useNavigate()
  const toast     = useToast()
  const { isAdmin } = useAuth()

  const [progress,  setProgress]  = useState([])
  const [running,   setRunning]   = useState(false)
  const [done,      setDone]      = useState(false)

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat.</p>
    </div>
  )

  const handleImport = async () => {
    setRunning(true)
    setProgress([])
    let ok = 0

    for (const client of CLIENTI_IMPORT) {
      try {
        await addClient(client)
        setProgress(p => [...p, { nume: client.nume, status: 'ok' }])
        ok++
      } catch (err) {
        setProgress(p => [...p, { nume: client.nume, status: 'error', err: err.message }])
      }
      await new Promise(r => setTimeout(r, 300))
    }

    setRunning(false)
    setDone(true)
    toast(`Import finalizat: ${ok}/${CLIENTI_IMPORT.length} clienți adăugați!`)
  }

  return (
    <>
      <Topbar title="Import clienți" subtitle="Din FGO KADO Excelsior — 27 Iunie 2026">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clienti')}>← Înapoi la Clienți</button>
      </Topbar>

      <div className="content" style={{ maxWidth: 700 }}>
        <div className="alert alert-info" style={{ marginBottom: 20 }}>
          <i className="ti ti-info-circle" />
          <span>
            Această pagină importă <strong>6 clienți</strong> din exportul FGO KADO Excelsior.
            Folosește-o o singură dată — după import șterge pagina sau nu o mai accesa.
          </span>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Clienți de importat</div>
          </div>
          <table>
            <thead>
              <tr><th>Denumire</th><th>CUI</th><th>Email</th><th>TVA</th><th>Status</th></tr>
            </thead>
            <tbody>
              {CLIENTI_IMPORT.map((c, i) => {
                const prog = progress[i]
                return (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{c.nume}</td>
                    <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.cui}</td>
                    <td style={{ color: 'var(--slate)', fontSize: 11 }}>{c.email}</td>
                    <td>
                      {c.platitorTVA === true
                        ? <span className="badge badge-green">Platitor</span>
                        : c.platitorTVA === false
                          ? <span className="badge badge-amber">Neplatitor</span>
                          : <span className="badge badge-gray">Necunoscut</span>
                      }
                    </td>
                    <td>
                      {!prog && <span style={{ color: 'var(--slate)', fontSize: 12 }}>—</span>}
                      {prog?.status === 'ok' && <span className="badge badge-green"><i className="ti ti-check" /> Importat</span>}
                      {prog?.status === 'error' && <span className="badge badge-red" title={prog.err}><i className="ti ti-x" /> Eroare</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!done ? (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/clienti')}>Anulează</button>
            <button className="btn btn-primary" onClick={handleImport} disabled={running}>
              {running
                ? <><i className="ti ti-refresh" /> Se importă... ({progress.length}/{CLIENTI_IMPORT.length})</>
                : <><i className="ti ti-upload" /> Importă {CLIENTI_IMPORT.length} clienți</>
              }
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => navigate('/clienti')}>
              <i className="ti ti-users" /> Mergi la Clienți
            </button>
          </div>
        )}
      </div>
    </>
  )
}
