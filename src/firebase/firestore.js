import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

// ── CLIENȚI ────────────────────────────────────────────────────
export const getClienti = async () => {
  const snap = await getDocs(collection(db, 'clienti'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getClient = async (id) => {
  const snap = await getDoc(doc(db, 'clienti', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const addClient = async (data) => {
  return await addDoc(collection(db, 'clienti'), {
    ...data,
    createdAt: serverTimestamp()
  })
}

export const updateClient = async (id, data) => {
  await updateDoc(doc(db, 'clienti', id), data)
}

export const deleteClient = async (id) => {
  await deleteDoc(doc(db, 'clienti', id))
}

// ── EMAILURI TRIMISE ───────────────────────────────────────────
export const getEmailuriClient = async (clientId) => {
  const q = query(
    collection(db, 'emailuri'),
    where('clientId', '==', clientId),
    orderBy('trimisLa', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const saveEmail = async (emailData) => {
  return await addDoc(collection(db, 'emailuri'), {
    ...emailData,
    trimisLa: serverTimestamp()
  })
}

// ── NOTE CONVERSAȚIE ───────────────────────────────────────────
export const getNoteClient = async (clientId) => {
  const q = query(
    collection(db, 'note'),
    where('clientId', '==', clientId),
    orderBy('creatLa', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addNota = async (clientId, text, autor) => {
  return await addDoc(collection(db, 'note'), {
    clientId,
    text,
    autor,
    creatLa: serverTimestamp()
  })
}

// ── CONFIGURARE FGO ────────────────────────────────────────────
export const getConfig = async () => {
  const snap = await getDoc(doc(db, 'config', 'fgo'))
  return snap.exists() ? snap.data() : {}
}

export const saveConfig = async (data) => {
  await updateDoc(doc(db, 'config', 'fgo'), data).catch(async () => {
    // doc doesn't exist yet — create it
    const { setDoc } = await import("firebase/firestore")
    await setDoc(doc(db, 'config', 'fgo'), data)
  })
}
