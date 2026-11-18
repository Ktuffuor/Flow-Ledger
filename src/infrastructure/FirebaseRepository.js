import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  addDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { DEFAULT_CATEGORIES } from "../domain/entities.js";

export class FirebaseRepository {
  constructor(config) {
    const app = initializeApp(config);
    this.auth = getAuth(app);
    try {
      this.db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      this.db = getFirestore(app);
    }
    this.user = null;
  }

  onAuthChange(callback) {
    return onAuthStateChanged(this.auth, (user) => {
      this.user = user;
      callback(user);
    });
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
  }

  async signOutUser() {
    await signOut(this.auth);
  }

  subscribe(onData) {
    if (!this.user) return () => {};
    const uid = this.user.uid;
    let latestState = {
      transactions: [],
      categories: structuredClone(DEFAULT_CATEGORIES),
      currency: "GHS"
    };

    const prefsRef = doc(this.db, "users", uid, "settings", "preferences");
    const unsubPrefs = onSnapshot(prefsRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.categories?.length) latestState.categories = d.categories;
        if (d.currency) latestState.currency = d.currency;
      } else {
        setDoc(prefsRef, {
          categories: latestState.categories,
          currency: latestState.currency
        });
      }
      onData({ ...latestState });
    });

    const txCol = collection(this.db, "users", uid, "transactions");
    const q = query(txCol, orderBy("date", "desc"));
    const unsubTx = onSnapshot(q, (snapshot) => {
      latestState.transactions = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      onData({ ...latestState });
    });

    return () => {
      unsubPrefs();
      unsubTx();
    };
  }

  async addTransaction(tx) {
    if (!this.user) return;
    const txCol = collection(this.db, "users", this.user.uid, "transactions");
    await addDoc(txCol, tx);
  }

  async deleteTransaction(id) {
    if (!this.user) return;
    await deleteDoc(doc(this.db, "users", this.user.uid, "transactions", id));
  }

  async savePreferences({ categories, currency }) {
    if (!this.user) return;
    const prefsRef = doc(this.db, "users", this.user.uid, "settings", "preferences");
    await setDoc(prefsRef, { categories, currency }, { merge: true });
  }

  async importBackup({ transactions, categories, currency }) {
    if (!this.user) return;
    if (categories || currency) {
      await this.savePreferences({
        categories: categories || DEFAULT_CATEGORIES,
        currency: currency || "GHS"
      });
    }
    const txCol = collection(this.db, "users", this.user.uid, "transactions");
    for (let i = 0; i < transactions.length; i += 400) {
      const batch = writeBatch(this.db);
      transactions.slice(i, i + 400).forEach((t) => {
        const ref = doc(txCol);
        batch.set(ref, t);
      });
      await batch.commit();
    }
  }
}