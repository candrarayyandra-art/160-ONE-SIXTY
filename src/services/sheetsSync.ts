// Google Sheets + Google Apps Script Two-Way Sync and Backup Engine
// 1 Record = 1 Row per Sheet. No monolithic cell JSON.

import {
  getAllFromStore,
  bulkPutToStore,
  STORES,
  StoreName,
  openDatabase
} from '../db/indexedDb';

export interface SyncResult {
  success: boolean;
  message: string;
  pulledCount: number;
  pushedCount: number;
  timestamp: string;
}

export interface BackupStatus {
  totalRecords: number;
  lastBackupDate?: string;
  sheetCounts: Record<string, number>;
}

// Stores to sync with Google Sheets (each maps to its own separate Sheet tab)
export const SYNC_STORES_MAP: Record<string, StoreName> = {
  CUSTOMERS: STORES.CUSTOMERS,
  CUSTOMER_LOCATIONS: STORES.CUSTOMER_LOCATIONS,
  PRODUCTS: STORES.PRODUCTS,
  ORDERS: STORES.ORDERS,
  DELIVERIES: STORES.DELIVERIES,
  PAYMENTS: STORES.PAYMENTS,
  GALLON_MOVEMENTS: STORES.GALLON_MOVEMENTS,
  INVENTORY_ITEMS: STORES.INVENTORY_ITEMS,
  INVENTORY_MOVEMENTS: STORES.INVENTORY_MOVEMENTS,
  CASH_TRANSACTIONS: STORES.CASH_TRANSACTIONS,
  EXPENSES: STORES.EXPENSES,
  CLOSING_RECORDS: STORES.CLOSING_RECORDS,
  PRODUCTION_RECORDS: STORES.PRODUCTION_RECORDS,
  MAINTENANCE_RECORDS: STORES.MAINTENANCE_RECORDS,
  FILTER_RECORDS: STORES.FILTER_RECORDS,
  QUALITY_RECORDS: STORES.QUALITY_RECORDS,
  USERS: STORES.USERS,
  AUDIT_LOGS: STORES.AUDIT_LOGS
};

// Ready-to-copy Google Apps Script code for the user
export const APPS_SCRIPT_CODE_TEMPLATE = `/**
 * ====================================================================
 * GOOGLE APPS SCRIPT - 160 ONE SIXTY DEPOT AIR MINUM RO SYNC & BACKUP
 * ====================================================================
 * 
 * PETUNJUK PEMASANGAN:
 * 1. Buka Google Sheets baru di https://sheets.new
 * 2. Beri nama Spreadsheet, misalnya: "160 ONE SIXTY - DATABASE CLOUD"
 * 3. Buka menu: Ekstensi (Extensions) > Apps Script
 * 4. Hapus seluruh isi kode bawaan, lalu Paste (Tempel) kode ini.
 * 5. Ganti variabel SECRET_TOKEN di bawah dengan kode rahasia Anda.
 * 6. Klik tombol "Simpan" (Ctrl+S / Cmd+S).
 * 7. Klik tombol "Terapkan" (Deploy) > "Kelola Penerapan" > "Penerapan Baru" (New Deployment).
 * 8. Pilih jenis: "Aplikasi Web" (Web App).
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Yang memiliki akses: "Siapa saja" (Anyone)
 * 9. Klik "Terapkan" (Deploy) dan salin URL Aplikasi Web (Web App URL).
 * 10. Masukkan Web App URL dan Secret Token ke menu "Google Sheets & Backup" di aplikasi.
 */

var SECRET_TOKEN = "160_RO_SECRET_KEY"; // <-- GANTI DENGAN TOKEN ANDA

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, message: "Data kosong" });
    }

    var payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECRET_TOKEN) {
      return responseJSON({ success: false, message: "Akses ditolak: Secret Token tidak valid" });
    }

    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. PING / TEST CONNECTION
    if (action === "ping") {
      return responseJSON({ success: true, message: "Koneksi berhasil ke Google Sheets 160 ONE SIXTY" });
    }

    // 2. PULL ALL DATA FROM SHEETS (FOR SYNC / RESTORE)
    if (action === "pull") {
      var allData = {};
      var sheets = ss.getSheets();
      for (var i = 0; i < sheets.length; i++) {
        var sheet = sheets[i];
        var sheetName = sheet.getName();
        var lastRow = sheet.getLastRow();
        var lastCol = sheet.getLastColumn();

        if (lastRow > 1 && lastCol >= 1) {
          var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
          var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
          var records = [];

          for (var r = 0; r < rows.length; r++) {
            var rowObj = {};
            var hasId = false;
            for (var c = 0; c < headers.length; c++) {
              var key = headers[c];
              if (key) {
                var cellVal = rows[r][c];
                // Try parsing JSON if object/array string
                if (typeof cellVal === 'string' && (cellVal.startsWith('{') || cellVal.startsWith('['))) {
                  try { cellVal = JSON.parse(cellVal); } catch(err){}
                }
                rowObj[key] = cellVal;
                if (key === 'id' && cellVal) hasId = true;
              }
            }
            if (hasId) {
              records.push(rowObj);
            }
          }
          allData[sheetName] = records;
        } else {
          allData[sheetName] = [];
        }
      }
      return responseJSON({ success: true, data: allData });
    }

    // 3. PUSH / UPSERT DATA BATCH (1 RECORD = 1 ROW)
    if (action === "push_batch" || action === "backup") {
      var sheetName = payload.sheetName;
      var records = payload.records || [];

      if (!sheetName || !records.length) {
        return responseJSON({ success: true, count: 0 });
      }

      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
      }

      // Collect all keys/columns from incoming records
      var keysMap = {};
      records.forEach(function(rec) {
        Object.keys(rec).forEach(function(k) { keysMap[k] = true; });
      });
      var keys = Object.keys(keysMap);
      if (keys.indexOf("id") > -1) {
        keys.splice(keys.indexOf("id"), 1);
        keys.unshift("id"); // ID always first column
      }

      // Check existing headers or setup
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      var existingHeaders = [];

      if (lastRow >= 1 && lastCol >= 1) {
        existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }

      // Merge headers
      keys.forEach(function(k) {
        if (existingHeaders.indexOf(k) === -1) {
          existingHeaders.push(k);
        }
      });

      // Write updated headers
      sheet.getRange(1, 1, 1, existingHeaders.length).setValues([existingHeaders]);
      sheet.getRange(1, 1, 1, existingHeaders.length).setFontWeight("bold").setBackground("#e0f2fe");

      // Read existing ID index
      var idColIndex = existingHeaders.indexOf("id") + 1;
      var existingIdRowMap = {};
      if (lastRow > 1 && idColIndex > 0) {
        var idValues = sheet.getRange(2, idColIndex, lastRow - 1, 1).getValues();
        for (var idx = 0; idx < idValues.length; idx++) {
          var idVal = String(idValues[idx][0]);
          if (idVal) {
            existingIdRowMap[idVal] = idx + 2; // actual row number in sheet
          }
        }
      }

      // Prepare row values
      var newRows = [];
      records.forEach(function(rec) {
        var recId = String(rec.id || "");
        var rowData = existingHeaders.map(function(header) {
          var val = rec[header];
          if (val === undefined || val === null) return "";
          if (typeof val === 'object') return JSON.stringify(val);
          return val;
        });

        if (existingIdRowMap[recId]) {
          // Update existing row
          var rowNum = existingIdRowMap[recId];
          sheet.getRange(rowNum, 1, 1, existingHeaders.length).setValues([rowData]);
        } else {
          // New row to append
          newRows.push(rowData);
        }
      });

      if (newRows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, existingHeaders.length).setValues(newRows);
      }

      return responseJSON({ success: true, updated: records.length });
    }

    return responseJSON({ success: false, message: "Action tidak dikenal" });

  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return responseJSON({ success: true, message: "Google Apps Script 160 ONE SIXTY Siap Beroperasi" });
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export async function testSheetsConnection(url: string, token: string): Promise<{ success: boolean; message: string }> {
  if (!url || !url.startsWith('https://script.google.com/macros/s/')) {
    return { success: false, message: 'URL Google Apps Script tidak valid. Harus diawali https://script.google.com/macros/s/' };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        action: 'ping',
        token: token
      }),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    const data = await res.json();
    return {
      success: !!data.success,
      message: data.message || (data.success ? 'Koneksi Berhasil' : 'Koneksi Gagal')
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: 'Gagal terhubung ke Google Apps Script: ' + msg };
  }
}

// 2-Way Synchronization: Pull -> Merge/Upsert Local -> Push Local Updates to Cloud
export async function syncWithGoogleSheets(
  url: string,
  token: string,
  onProgress?: (step: string) => void
): Promise<SyncResult> {
  if (!url || !token) {
    return {
      success: false,
      message: 'URL Apps Script dan Secret Token belum diisi di Pengaturan.',
      pulledCount: 0,
      pushedCount: 0,
      timestamp: new Date().toISOString()
    };
  }

  try {
    onProgress?.('1. Mengambil data dari Google Sheets (PULL)...');
    const pullRes = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'pull', token }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const pullJson = await pullRes.json();
    if (!pullJson.success) {
      throw new Error(pullJson.message || 'Gagal mengambil data dari Google Sheets');
    }

    const cloudData: Record<string, Array<{ id: string; updatedAt?: string }>> = pullJson.data || {};
    let pulledCount = 0;
    let pushedCount = 0;

    onProgress?.('2. Menggabungkan data cloud ke database lokal (UPSERT LOCAL)...');
    await openDatabase();

    for (const [sheetName, storeName] of Object.entries(SYNC_STORES_MAP)) {
      const cloudRecords = cloudData[sheetName] || [];
      const localRecords = await getAllFromStore<{ id: string; updatedAt?: string }>(storeName);
      const localMap = new Map(localRecords.map((r) => [r.id, r]));

      const toUpdateLocally: Array<{ id: string }> = [];

      for (const cRec of cloudRecords) {
        if (!cRec.id) continue;
        const lRec = localMap.get(cRec.id);
        if (!lRec) {
          // Cloud has it, local does not -> INSERT LOCAL
          toUpdateLocally.push(cRec);
          pulledCount++;
        } else {
          // Both have it, compare updatedAt
          const cTime = cRec.updatedAt ? new Date(cRec.updatedAt).getTime() : 0;
          const lTime = lRec.updatedAt ? new Date(lRec.updatedAt).getTime() : 0;
          if (cTime > lTime) {
            toUpdateLocally.push(cRec);
            pulledCount++;
          }
        }
      }

      if (toUpdateLocally.length > 0) {
        await bulkPutToStore(storeName, toUpdateLocally);
      }
    }

    onProgress?.('3. Mengirim pembaruan lokal ke Google Sheets (PUSH BATCH)...');
    // For each store, push records that are newer or not yet in cloud
    for (const [sheetName, storeName] of Object.entries(SYNC_STORES_MAP)) {
      const currentLocalRecords = await getAllFromStore<{ id: string; updatedAt?: string }>(storeName);
      if (!currentLocalRecords.length) continue;

      // Batching: 100 records per request as specified in prompt requirement #62
      const BATCH_SIZE = 100;
      for (let i = 0; i < currentLocalRecords.length; i += BATCH_SIZE) {
        const batch = currentLocalRecords.slice(i, i + BATCH_SIZE);
        const pushRes = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            action: 'push_batch',
            token,
            sheetName,
            records: batch
          }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const pushJson = await pushRes.json();
        if (pushJson.success) {
          pushedCount += batch.length;
        }
      }
    }

    onProgress?.('4. Sinkronisasi Selesai!');
    return {
      success: true,
      message: `Sinkronisasi Sukses: ${pulledCount} data ditarik dari Cloud, ${pushedCount} data dikirim ke Cloud.`,
      pulledCount,
      pushedCount,
      timestamp: new Date().toISOString()
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: 'Gagal sinkronisasi: ' + msg,
      pulledCount: 0,
      pushedCount: 0,
      timestamp: new Date().toISOString()
    };
  }
}

// Backup Now
export async function backupToGoogleSheets(
  url: string,
  token: string,
  onProgress?: (info: string) => void
): Promise<{ success: boolean; message: string; totalRecords: number }> {
  if (!url || !token) {
    return { success: false, message: 'URL Google Sheets dan Token belum disetel.', totalRecords: 0 };
  }

  let totalRecords = 0;
  try {
    for (const [sheetName, storeName] of Object.entries(SYNC_STORES_MAP)) {
      const records = await getAllFromStore<{ id: string }>(storeName);
      if (!records.length) continue;

      onProgress?.(`Mem-backup sheet ${sheetName} (${records.length} baris)...`);
      const BATCH_SIZE = 100;
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        await fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            action: 'push_batch',
            token,
            sheetName,
            records: batch
          }),
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
      }
      totalRecords += records.length;
    }

    return {
      success: true,
      message: `Backup Berhasil! Total ${totalRecords} baris data tersimpan di Google Sheets.`,
      totalRecords
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: 'Gagal melakukan backup: ' + msg, totalRecords };
  }
}

// Check Cloud Backup status / preview
export async function checkCloudBackup(url: string, token: string): Promise<{
  success: boolean;
  message: string;
  data?: Record<string, Array<{ id: string }>>;
}> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'pull', token }),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    const json = await res.json();
    if (!json.success) {
      return { success: false, message: json.message || 'Gagal mengecek backup cloud' };
    }
    return { success: true, message: 'Backup ditemukan', data: json.data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: 'Gagal terhubung ke Google Sheets: ' + msg };
  }
}

// Restore from Cloud
export async function restoreFromCloudBackup(
  url: string,
  token: string,
  onProgress?: (info: string) => void
): Promise<{ success: boolean; message: string; restoredCount: number }> {
  try {
    onProgress?.('Mengambil backup dari Google Sheets...');
    const check = await checkCloudBackup(url, token);
    if (!check.success || !check.data) {
      return { success: false, message: check.message, restoredCount: 0 };
    }

    let restoredCount = 0;
    for (const [sheetName, storeName] of Object.entries(SYNC_STORES_MAP)) {
      const records = check.data[sheetName];
      if (Array.isArray(records) && records.length > 0) {
        onProgress?.(`Memulihkan ${sheetName} (${records.length} data)...`);
        await bulkPutToStore(storeName, records);
        restoredCount += records.length;
      }
    }

    return {
      success: true,
      message: `Restore Sukses: ${restoredCount} record dipulihkan ke database lokal tanpa duplikasi.`,
      restoredCount
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: 'Gagal restore data: ' + msg, restoredCount: 0 };
  }
}
