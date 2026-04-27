/**
 * גגלר 30 — שרת הצעות שירים
 *
 * Deploy: Extensions → Apps Script → Deploy → New Deployment
 *   - Type: Web app
 *   - Execute as: Me
 *   - Who has access: Anyone
 * אחרי deploy: העתק את ה-Web app URL לתוך index.html (משתנה SONGS_URL)
 *
 * המקור הוא Google Sheet עם 2 גליונות:
 *   - "submissions": כל הצעה (timestamp, phone, name, song_raw, song_normalized)
 *   - "aggregated": שיר → counter (display_name, normalized, count)
 *
 * השרת מנרמל שירים, מונע כפילויות per-טלפון, וסוגר הצעות אחרי DEADLINE.
 */

// ===== CONFIG =====
var DEADLINE_ISO = '2026-06-05T23:59:59+03:00'; // יום לפני האירוע
var MAX_SONGS_PER_PERSON = 3;
var SHEET_SUBMISSIONS = 'submissions';
var SHEET_AGGREGATED = 'aggregated';

// ===== Helpers =====
function normalizeSong(s){
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')        // niqqud
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')      // remove punct
    .replace(/\s+/g, ' ')
    .trim();
}

function isClosed(){
  return new Date().getTime() >= new Date(DEADLINE_ISO).getTime();
}

function getOrCreateSheet(name, headers){
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh){
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

function jsonResponse(obj){
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(obj, callback){
  return ContentService
    .createTextOutput(callback + '(' + JSON.stringify(obj) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ===== GET: return aggregated list, sorted desc by count =====
function doGet(e){
  var sh = getOrCreateSheet(SHEET_AGGREGATED, ['display_name','normalized','count']);
  var data = sh.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < data.length; i++){
    var r = data[i];
    if (!r[1]) continue;
    rows.push({ name: r[0], normalized: r[1], count: Number(r[2]) || 0 });
  }
  rows.sort(function(a,b){ return b.count - a.count; });

  var payload = {
    ok: true,
    closed: isClosed(),
    deadline: DEADLINE_ISO,
    total_submissions: rows.reduce(function(s,r){ return s + r.count; }, 0),
    songs: rows
  };

  var callback = e && e.parameter && e.parameter.callback;
  if (callback) return jsonpResponse(payload, callback);
  return jsonResponse(payload);
}

// ===== POST: { phone, name, songs: [..] } =====
function doPost(e){
  try {
    if (isClosed()){
      return jsonResponse({ ok:false, reason:'closed' });
    }

    // Support both FormData (e.parameter.payload) and raw JSON body (e.postData.contents)
    var body = {};
    if (e && e.parameter && e.parameter.payload){
      body = JSON.parse(e.parameter.payload);
    } else if (e && e.postData && e.postData.contents){
      body = JSON.parse(e.postData.contents);
    }

    var phone = String(body.phone || '').replace(/[^\d+]/g, '').trim();
    var name = String(body.name || '').trim();
    var songs = Array.isArray(body.songs) ? body.songs : [];

    if (!phone || !name){
      return jsonResponse({ ok:false, reason:'missing_fields' });
    }

    songs = songs
      .map(function(s){ return String(s || '').trim(); })
      .filter(function(s){ return s.length > 0 && s.length < 200; })
      .slice(0, MAX_SONGS_PER_PERSON);

    var subSh = getOrCreateSheet(SHEET_SUBMISSIONS,
      ['timestamp','phone','name','song_raw','song_normalized']);
    var aggSh = getOrCreateSheet(SHEET_AGGREGATED,
      ['display_name','normalized','count']);

    // Existing submissions for dedup per (phone, normalized)
    var subData = subSh.getDataRange().getValues();
    var seenByThisPhone = {};
    for (var i = 1; i < subData.length; i++){
      if (String(subData[i][1]) === phone){
        seenByThisPhone[subData[i][4]] = true;
      }
    }

    // Aggregated map
    var aggData = aggSh.getDataRange().getValues();
    var aggIndex = {}; // normalized -> { row, count, displayName }
    for (var j = 1; j < aggData.length; j++){
      aggIndex[aggData[j][1]] = { row: j+1, count: Number(aggData[j][2])||0, displayName: aggData[j][0] };
    }

    var added = 0;
    var ts = new Date();
    for (var k = 0; k < songs.length; k++){
      var raw = songs[k];
      var norm = normalizeSong(raw);
      if (!norm) continue;
      if (seenByThisPhone[norm]) continue; // skip duplicate per-person
      seenByThisPhone[norm] = true;

      subSh.appendRow([ts, phone, name, raw, norm]);

      if (aggIndex[norm]){
        var entry = aggIndex[norm];
        aggSh.getRange(entry.row, 3).setValue(entry.count + 1);
        entry.count += 1;
      } else {
        aggSh.appendRow([raw, norm, 1]);
        aggIndex[norm] = { row: aggSh.getLastRow(), count: 1, displayName: raw };
      }
      added++;
    }

    return jsonResponse({ ok:true, added: added });
  } catch(err){
    return jsonResponse({ ok:false, reason:'server_error', error: String(err) });
  }
}
