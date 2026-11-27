import { MediaItem, AdSettings } from '../types';
import { INITIAL_MEDIA_ITEMS } from '../data/mockData';
import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot
} from 'firebase/firestore';

export const EGYTURK_MEDIA_STORAGE_KEY = 'egyturk_media_catalog_v1';
const MY_LIST_STORAGE_KEY = 'egyturk_user_watchlist';
const ADMIN_AUTH_KEY = 'egyturk_admin_session';
const ADS_STORAGE_KEY = 'egyturk_ad_settings';

export const ADMIN_CREDENTIALS = {
  username: 'egyturk',
  password: 'mi0155176@'
};

const EGYTURK_MEDIA_COLLECTION = 'egyturk_media_items';
const EGYTURK_SETTINGS_COLLECTION = 'egyturk_site_settings';
const EGYTURK_CATALOG_META_DOC = 'catalog_meta';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function logFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

let isInitializingCloud = false;
let initPromise: Promise<MediaItem[]> | null = null;

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, EGYTURK_SETTINGS_COLLECTION, EGYTURK_CATALOG_META_DOC));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Firestore client is offline. Please check your Firebase configuration.');
    }
  }
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => (typeof item === 'object' && item !== null ? sanitizeForFirestore(item) : item)) as any;
  }
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value === undefined) continue;
      if (value !== null && typeof value === 'object') {
        result[key] = sanitizeForFirestore(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }
  return data;
}

async function markCatalogSeeded(): Promise<void> {
  try {
    await setDoc(
      doc(db, EGYTURK_SETTINGS_COLLECTION, EGYTURK_CATALOG_META_DOC),
      { seeded: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (err) {
    logFirestoreError(err, OperationType.WRITE, `${EGYTURK_SETTINGS_COLLECTION}/${EGYTURK_CATALOG_META_DOC}`);
  }
}

export async function saveSingleMediaItemToCloud(item: MediaItem): Promise<void> {
  if (!item || !item.id) {
    throw new Error('العمل المطلوب حفظه غير صالح أو يفتقد لمعرف ID.');
  }

  const normalizedItem: MediaItem = {
    ...item,
    createdAt: item.createdAt || new Date().toISOString()
  };

  const cleanItem = sanitizeForFirestore(normalizedItem);
  const path = `${EGYTURK_MEDIA_COLLECTION}/${item.id}`;
  const docRef = doc(db, EGYTURK_MEDIA_COLLECTION, item.id);

  try {
    await setDoc(docRef, cleanItem);
    await markCatalogSeeded();
  } catch (err) {
    logFirestoreError(err, OperationType.WRITE, path);
    throw err;
  }

  try {
    const current = getStoredMediaItems();
    const idx = current.findIndex(i => i.id === item.id);
    let updated: MediaItem[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = cleanItem;
    } else {
      updated = [cleanItem, ...current];
    }
    localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Local storage cache update warning:', err);
  }
}

export async function deleteMediaItemFromCloud(itemId: string): Promise<void> {
  if (!itemId) {
    throw new Error('معرف العمل غير صالح.');
  }

  const path = `${EGYTURK_MEDIA_COLLECTION}/${itemId}`;
  const docRef = doc(db, EGYTURK_MEDIA_COLLECTION, itemId);

  try {
    await markCatalogSeeded();
    await deleteDoc(docRef);
  } catch (err) {
    logFirestoreError(err, OperationType.DELETE, path);
    throw err;
  }

  try {
    const current = getStoredMediaItems();
    const updated = current.filter(i => i.id !== itemId);
    localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Local storage cache delete warning:', err);
  }
}

function normalizeMediaItem(data: any): MediaItem | null {
  if (!data || !data.id || !data.title) return null;
  return {
    ...data,
    genres: Array.isArray(data.genres) && data.genres.length > 0 ? data.genres : ['دراما تركية'],
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    servers: Array.isArray(data.servers) ? data.servers : [],
    seasons: Array.isArray(data.seasons) ? data.seasons : [],
    views: typeof data.views === 'number' ? data.views : 0,
    rating: typeof data.rating === 'number' ? data.rating : 8.5,
    releaseYear: typeof data.releaseYear === 'number' ? data.releaseYear : 2025,
    categoryId: data.categoryId || 'turkish_drama',
    type: data.type === 'series' ? 'series' : 'movie'
  };
}

function sortMediaItems(items: MediaItem[]): MediaItem[] {
  return [...items].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}

export async function fetchGlobalMediaCatalog(): Promise<MediaItem[]> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    isInitializingCloud = true;
    try {
      const colRef = collection(db, EGYTURK_MEDIA_COLLECTION);
      let snapshot;
      try {
        snapshot = await getDocsFromServer(colRef);
      } catch {
        snapshot = await getDocs(colRef);
      }

      if (!snapshot.empty) {
        const items: MediaItem[] = [];
        snapshot.forEach(docSnap => {
          const item = normalizeMediaItem({ id: docSnap.id, ...docSnap.data() });
          if (item) {
            items.push(item);
          }
        });
        const sorted = sortMediaItems(items);
        localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(sorted));
        await markCatalogSeeded();
        return sorted;
      }

      let alreadySeeded = false;
      try {
        const metaSnap = await getDoc(doc(db, EGYTURK_SETTINGS_COLLECTION, EGYTURK_CATALOG_META_DOC));
        alreadySeeded = metaSnap.exists() && Boolean(metaSnap.data()?.seeded);
      } catch (metaErr) {
        logFirestoreError(metaErr, OperationType.GET, `${EGYTURK_SETTINGS_COLLECTION}/${EGYTURK_CATALOG_META_DOC}`);
      }

      if (alreadySeeded) {
        localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify([]));
        return [];
      }

      for (const item of INITIAL_MEDIA_ITEMS) {
        if (item && item.id) {
          const clean = sanitizeForFirestore(item);
          await setDoc(doc(db, EGYTURK_MEDIA_COLLECTION, item.id), clean);
        }
      }
      await markCatalogSeeded();
      localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(INITIAL_MEDIA_ITEMS));
      return INITIAL_MEDIA_ITEMS;
    } catch (err) {
      logFirestoreError(err, OperationType.LIST, EGYTURK_MEDIA_COLLECTION);
      return getStoredMediaItems();
    } finally {
      isInitializingCloud = false;
      initPromise = null;
    }
  })();

  return initPromise;
}

export const subscribeToGlobalMediaCatalog = (
  onUpdate: (items: MediaItem[]) => void,
  onStatusChange?: (status: 'connected' | 'connecting' | 'error', errorMsg?: string) => void
) => {
  try {
    onStatusChange?.('connecting');
    const colRef = collection(db, EGYTURK_MEDIA_COLLECTION);
    return onSnapshot(colRef, async (snapshot) => {
      onStatusChange?.('connected');
      const cloudItems: MediaItem[] = [];
      snapshot.forEach((docSnap) => {
        const item = normalizeMediaItem({ id: docSnap.id, ...docSnap.data() });
        if (item) {
          cloudItems.push(item);
        }
      });

      if (cloudItems.length === 0) {
        if (isInitializingCloud) {
          return;
        }
        try {
          const metaSnap = await getDoc(doc(db, EGYTURK_SETTINGS_COLLECTION, EGYTURK_CATALOG_META_DOC));
          const alreadySeeded = metaSnap.exists() && Boolean(metaSnap.data()?.seeded);
          if (!alreadySeeded) {
            return;
          }
        } catch {
          return;
        }
      }

      const sorted = sortMediaItems(cloudItems);
      try {
        localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(sorted));
      } catch {
        // ignore quota warnings
      }
      onUpdate(sorted);
    }, (error) => {
      logFirestoreError(error, OperationType.LIST, EGYTURK_MEDIA_COLLECTION);
      onStatusChange?.('error', error.message);
    });
  } catch (err: any) {
    logFirestoreError(err, OperationType.LIST, EGYTURK_MEDIA_COLLECTION);
    onStatusChange?.('error', err?.message);
    return () => {};
  }
};

export const seedCloudCatalogWithDefaults = async () => {
  try {
    const existingSnap = await getDocs(collection(db, EGYTURK_MEDIA_COLLECTION));
    const defaultIds = new Set(INITIAL_MEDIA_ITEMS.map(i => i.id));
    for (const docSnap of existingSnap.docs) {
      if (!defaultIds.has(docSnap.id)) {
        await deleteDoc(doc(db, EGYTURK_MEDIA_COLLECTION, docSnap.id));
      }
    }
    for (const item of INITIAL_MEDIA_ITEMS) {
      if (item && item.id) {
        const clean = sanitizeForFirestore(item);
        await setDoc(doc(db, EGYTURK_MEDIA_COLLECTION, item.id), clean);
      }
    }
    await markCatalogSeeded();
  } catch (e) {
    logFirestoreError(e, OperationType.WRITE, EGYTURK_MEDIA_COLLECTION);
    throw e;
  }
};

export const getStoredMediaItems = (): MediaItem[] => {
  try {
    const raw = localStorage.getItem(EGYTURK_MEDIA_STORAGE_KEY);
    if (raw === null) {
      return INITIAL_MEDIA_ITEMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return INITIAL_MEDIA_ITEMS;
  } catch {
    return INITIAL_MEDIA_ITEMS;
  }
};

export const saveMediaItems = async (items: MediaItem[]): Promise<void> => {
  try {
    localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(items));

    const existingSnap = await getDocs(collection(db, EGYTURK_MEDIA_COLLECTION));
    const nextIds = new Set(items.map(i => i.id));

    for (const docSnap of existingSnap.docs) {
      if (!nextIds.has(docSnap.id)) {
        await deleteDoc(doc(db, EGYTURK_MEDIA_COLLECTION, docSnap.id));
      }
    }

    for (const item of items) {
      if (item && item.id) {
        const clean = sanitizeForFirestore(item);
        await setDoc(doc(db, EGYTURK_MEDIA_COLLECTION, item.id), clean);
      }
    }
    await markCatalogSeeded();
  } catch (err) {
    logFirestoreError(err, OperationType.WRITE, EGYTURK_MEDIA_COLLECTION);
    throw err;
  }
};

export const recordMediaView = (mediaId: string): MediaItem[] => {
  const current = getStoredMediaItems();
  const updated = current.map(item => {
    if (item.id === mediaId) {
      const newViews = (item.views || 0) + 1;
      const updatedItem = { ...item, views: newViews };
      updateDoc(doc(db, EGYTURK_MEDIA_COLLECTION, mediaId), { views: increment(1) }).catch(() => {});
      return updatedItem;
    }
    return item;
  });
  try {
    localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
};

export const incrementMediaViews = recordMediaView;

export const resetMediaCatalogToDefault = async (): Promise<MediaItem[]> => {
  localStorage.setItem(EGYTURK_MEDIA_STORAGE_KEY, JSON.stringify(INITIAL_MEDIA_ITEMS));
  await seedCloudCatalogWithDefaults();
  return INITIAL_MEDIA_ITEMS;
};

export const getMyListIds = (): string[] => {
  try {
    const raw = localStorage.getItem(MY_LIST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const toggleMyList = (id: string): string[] => {
  const current = getMyListIds();
  const exists = current.includes(id);
  const updated = exists ? current.filter(x => x !== id) : [...current, id];
  try {
    localStorage.setItem(MY_LIST_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving watchlist:', err);
  }
  return updated;
};

export const isInMyList = (id: string): boolean => {
  return getMyListIds().includes(id);
};

export const isAdminLoggedIn = (): boolean => {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
};

export const verifyAdminLogin = (user: string, pass: string): boolean => {
  const cleanUser = user.trim().toLowerCase();
  const matchesUser =
    cleanUser === 'egyturk' ||
    cleanUser === 'egy turk' ||
    cleanUser === 'admin egyturk';
  const matchesPass = pass === ADMIN_CREDENTIALS.password;

  if (matchesUser && matchesPass) {
    try {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    } catch {
      // ignore
    }
    return true;
  }
  return false;
};

export const logoutAdmin = (): void => {
  try {
    localStorage.removeItem(ADMIN_AUTH_KEY);
  } catch {
    // ignore
  }
};

export const DEFAULT_AD_SETTINGS: AdSettings = {
  isEnabled: false,
  headerScript: '',
  playerBannerHtml: '',
  homeBannerHtml: ''
};

export const getStoredAdSettings = (): AdSettings => {
  try {
    const raw = localStorage.getItem(ADS_STORAGE_KEY);
    if (!raw) return DEFAULT_AD_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      isEnabled: Boolean(parsed && parsed.isEnabled),
      headerScript: String((parsed && parsed.headerScript) || ''),
      playerBannerHtml: String((parsed && parsed.playerBannerHtml) || ''),
      homeBannerHtml: String((parsed && parsed.homeBannerHtml) || '')
    };
  } catch {
    return DEFAULT_AD_SETTINGS;
  }
};

export const subscribeToAdSettings = (onUpdate: (settings: AdSettings) => void) => {
  try {
    const docRef = doc(db, EGYTURK_SETTINGS_COLLECTION, 'ads');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AdSettings;
        const formatted: AdSettings = {
          isEnabled: Boolean(data?.isEnabled),
          headerScript: String(data?.headerScript || ''),
          playerBannerHtml: String(data?.playerBannerHtml || ''),
          homeBannerHtml: String(data?.homeBannerHtml || '')
        };
        localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(formatted));
        onUpdate(formatted);
      }
    }, (err) => {
      logFirestoreError(err, OperationType.GET, `${EGYTURK_SETTINGS_COLLECTION}/ads`);
    });
  } catch {
    return () => {};
  }
};

export const saveAdSettings = async (settings: AdSettings): Promise<void> => {
  try {
    const clean = sanitizeForFirestore(settings);
    localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(clean));
    await setDoc(doc(db, EGYTURK_SETTINGS_COLLECTION, 'ads'), clean, { merge: true });
  } catch (err) {
    logFirestoreError(err, OperationType.WRITE, `${EGYTURK_SETTINGS_COLLECTION}/ads`);
    throw err;
  }
};
