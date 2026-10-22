import { doc, type Firestore } from 'firebase/firestore';

export function refDesdePath(db: Firestore, path: string) {
  const partes = path.split('/');
  const [primero, segundo, ...resto] = partes;
  return doc(db, primero, segundo, ...resto);
}
