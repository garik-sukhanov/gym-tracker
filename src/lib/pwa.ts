// Просим браузер не вычищать наше хранилище (IndexedDB) при нехватке места.
// На iOS поддержка частичная — вызов безопасен и просто вернёт false.
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted) {
      if (await navigator.storage.persisted()) return true
    }
    if (navigator.storage?.persist) return await navigator.storage.persist()
  } catch {
    // нет поддержки — ничего страшного, данные всё равно переживают обновления
  }
  return false
}

export interface StorageInfo {
  persisted: boolean
  usageMb: number | null
}

export async function storageInfo(): Promise<StorageInfo> {
  let persisted = false
  let usageMb: number | null = null
  try {
    if (navigator.storage?.persisted) persisted = await navigator.storage.persisted()
    if (navigator.storage?.estimate) {
      const e = await navigator.storage.estimate()
      if (e.usage != null) usageMb = Math.round((e.usage / 1048576) * 10) / 10
    }
  } catch {
    // игнорируем
  }
  return { persisted, usageMb }
}

// Принудительная проверка обновления service worker. Данные при этом не трогаются.
export async function checkForUpdate(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    await reg?.update()
  } catch {
    // офлайн или нет SW — просто перезагрузимся на актуальный кеш
  }
}
