import { AttendanceRecord } from '../../../types';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export function exportRecordsToExcel(records: AttendanceRecord[], customFilename?: string) {
  if (!records || records.length === 0) {
    toast.error('Tidak ada data absensi untuk di-export.');
    return;
  }

  const now = new Date();
  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const filename = customFilename || `Data_Absensi_${months[now.getMonth()]}_${now.getFullYear()}.xlsx`;

  const headers = ['ID', 'Nama Lengkap', 'Posisi', 'Absensi', 'Timestamps', 'Status Sync'];
  const workbook = XLSX.utils.book_new();

  // Group records by userType
  const groupedRecords: Record<string, AttendanceRecord[]> = {};
  records.forEach(rec => {
    let type = rec.userType || 'Lainnya';
    if (type === 'Staff/ Guru') type = 'Staff Guru'; // Remove slashes which are invalid in Excel sheet names
    
    const sheetName = type.substring(0, 31); // Excel sheet names max 31 chars
    if (!groupedRecords[sheetName]) {
      groupedRecords[sheetName] = [];
    }
    groupedRecords[sheetName].push(rec);
  });

  // Create a sheet for each group
  Object.entries(groupedRecords).forEach(([sheetName, sheetRecords]) => {
    const rows = sheetRecords.map((rec) => [
      rec.userId,
      rec.userName || '-',
      rec.position || '-',
      rec.mode,
      rec.time + ' ' + rec.date,
      rec.syncStatus
    ]);
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });
  
  XLSX.writeFile(workbook, filename);
}

export const GAS_CODE_SNIPPET = `/**
 * Google Apps Script untuk Sistem Absensi Online dengan QR Code
 * Spreadsheet: Otomatis menggunakan Spreadsheet aktif tempat script ini dibuat,
 * atau buat Sheet bernama "Absensi" jika belum ada.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000); // Mencegah race-condition saat scan bersamaan

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action || "attendance";
    var data = contents.data || contents; // Backward compatibility

    if (action === "register") {
      var type = data.type; // "Siswa" or "Staff/ Guru"
      if (!type) type = "Lainnya";
      
      var targetSheet = doc.getSheetByName(type);
      if (!targetSheet) {
        targetSheet = doc.insertSheet(type);
        targetSheet.appendRow(["ID", "Nama Lengkap", "Posisi"]);
        targetSheet.getRange("A1:C1").setFontWeight("bold").setBackground("#3B82F6").setFontColor("#FFFFFF");
        targetSheet.setFrozenRows(1);
      }
      
      // Cek apakah ID sudah ada
      var idList = targetSheet.getRange("A:A").getValues().flat().map(function(id) { return String(id).trim(); });
      if (idList.indexOf(String(data.userId).trim()) > -1) {
        return ContentService.createTextOutput(JSON.stringify({ 
          "result": "error", 
          "error": "ID " + data.userId + " sudah terdaftar di database " + type 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      targetSheet.appendRow([data.userId, data.name || "-", data.position || "-"]);
      return ContentService.createTextOutput(JSON.stringify({ 
        "result": "success", 
        "message": "Data berhasil didaftarkan ke sheet " + type 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "attendance") {
      var userId = data.userId || "UNKNOWN";
      
      // VALIDASI ID DAN AMBIL DATA (NAMA, POSISI)
      var isFound = false;
      var foundName = "";
      var foundPosition = "";
      var foundType = "Lainnya";
      var siswaSheet = doc.getSheetByName("Siswa");
      var staffSheet = doc.getSheetByName("Staff/ Guru");
      var targetUserId = String(userId).trim();
      
      if (siswaSheet) {
        var siswaData = siswaSheet.getDataRange().getValues();
        for (var i = 1; i < siswaData.length; i++) {
          if (String(siswaData[i][0]).trim() === targetUserId) {
            isFound = true;
            foundName = siswaData[i][1] || "";
            foundPosition = siswaData[i][2] || "";
            foundType = "Siswa";
            break;
          }
        }
      }
      
      if (!isFound && staffSheet) {
        var staffData = staffSheet.getDataRange().getValues();
        for (var j = 1; j < staffData.length; j++) {
          if (String(staffData[j][0]).trim() === targetUserId) {
            isFound = true;
            foundName = staffData[j][1] || "";
            foundPosition = staffData[j][2] || "";
            foundType = "Staff";
            break;
          }
        }
      }
      
      if (!isFound && userId !== "UNKNOWN") {
         return ContentService.createTextOutput(JSON.stringify({ 
           "result": "error", 
           "error": "ID_NOT_FOUND" 
         })).setMimeType(ContentService.MimeType.JSON);
      }

      // Menentukan nama sheet berdasarkan Tipe, Bulan, dan Tahun
      var dateObj = data.date ? new Date(data.date) : new Date();
      var months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      var monthName = months[dateObj.getMonth()];
      var year = dateObj.getFullYear();
      var sheetName = "Absensi " + foundType + " - " + monthName + " " + year;
      
      var sheet = doc.getSheetByName(sheetName);

      // Jika sheet absensi bulan ini belum ada, buat baru dan tambahkan header
      if (!sheet) {
        sheet = doc.insertSheet(sheetName);
        sheet.appendRow(["ID", "Nama Lengkap", "Posisi", "Absensi (Masuk/Keluar)", "Timestamps"]);
        sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#10B981").setFontColor("#FFFFFF");
        sheet.setFrozenRows(1);
      }
      
      var userName = (isFound && foundName) ? foundName : (data.userName || "-");
      var position = (isFound && foundPosition) ? foundPosition : (data.position || "-");
      var mode = data.mode || "MASUK";
      var timestampStr = (data.date || "") + " " + (data.time || "");
      if (!timestampStr.trim()) {
        timestampStr = new Date().toLocaleString("id-ID");
      }

      // Menulis baris baru ke Google Sheet
      sheet.appendRow([userId, userName, position, mode, timestampStr]);

      // Mengembalikan respon JSON ke React App
      return ContentService
        .createTextOutput(JSON.stringify({ 
          "result": "success", 
          "message": "Data absensi berhasil dicatat di sheet " + sheetName + "!",
          "userData": {
            "name": userName,
            "position": position,
            "type": foundType
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        "result": "error", 
        "error": error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "getLogs") {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var allSheets = doc.getSheets();
    var logs = [];
    
    // Cari semua sheet yang depannya "Absensi "
    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var sheetName = sheet.getName();
      
      if (sheetName.indexOf("Absensi ") === 0 && sheetName.indexOf(" - ") > -1) {
        var userType = sheetName.substring(8, sheetName.indexOf(" - ")); // "Siswa" atau "Staff"
        var data = sheet.getDataRange().getValues();
        
        // Mulai dari i=1 (skip header)
        for (var i = 1; i < data.length; i++) {
          var row = data[i];
          if (!row[0]) continue;
          
          var timestampStr = row[4] ? String(row[4]) : "";
          var dateStr = "";
          var timeStr = "";
          if (timestampStr) {
             var parts = timestampStr.split(" ");
             if (parts.length >= 2) {
                dateStr = parts[0];
                timeStr = parts[1];
             }
          }
          
          logs.push({
            id: "GAS-" + s + "-" + i,
            userId: String(row[0]),
            userName: String(row[1]),
            position: String(row[2]),
            mode: String(row[3]) || "MASUK",
            date: dateStr,
            time: timeStr,
            timestamp: 0,
            syncStatus: "SYNCED",
            userType: userType
          });
        }
      }
    }
    
    // Urutkan logs, yang terbaru di atas (sementara pakai ID / index karena timestamp mungkin format lokal)
    logs.reverse();
    
    return ContentService
      .createTextOutput(JSON.stringify({ 
        "result": "success", 
        "data": logs
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Handler default (status server)
  return ContentService
    .createTextOutput(JSON.stringify({ 
      "status": "online", 
      "service": "API Absensi Online QR Code",
      "timestamp": new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
`
