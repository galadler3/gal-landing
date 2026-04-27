# 🎵 הגדרת מאגר השירים — Apps Script

מדריך הקמה חד-פעמי, כ-5 דקות.

## 1. צור Google Sheet חדש
- היכנס ל-https://sheets.google.com
- צור גיליון חדש בשם `Gagler 30 - Songs`

## 2. הדבק את הסקריפט
- בתוך הגיליון: **תוספים → Apps Script** (Extensions → Apps Script)
- מחק את כל הקוד שהופיע (המתודה `myFunction`)
- העתק את כל התוכן של `apps-script.gs` והדבק
- שמור (Ctrl/Cmd+S), קרא לפרויקט `Gagler Songs API`

## 3. Deploy כ-Web App
- לחץ **Deploy → New deployment**
- בצד שמאל-עליון לחץ על גלגל השיניים ⚙️ → בחר **Web app**
- בטופס:
  - **Description**: `v1`
  - **Execute as**: `Me`
  - **Who has access**: `Anyone`
- לחץ **Deploy**
- בפעם הראשונה Google יבקש הרשאות → **Allow** (זה הסקריפט שלך, בטוח)
- העתק את ה-**Web app URL** שיופיע (נראה כמו `https://script.google.com/macros/s/AKfy.../exec`)

## 4. חבר את ה-URL לדף
- פתח `index.html`
- חפש את השורה:
  ```js
  var SONGS_URL = ""; // ← הדבק כאן את ה-Web App URL
  ```
- הדבק את ה-URL בין המרכאות
- שמור

## 5. בדיקה
- פתח את הדף, מלא RSVP עם שיר אחד, לחץ "אישור הגעה"
- חזור ל-Google Sheet — תופיע שורה ב-`submissions` וב-`aggregated`
- רענן את הדף → השיר אמור להופיע ברשימה הציבורית

## Updates
אם תשנה את `apps-script.gs`:
- **Deploy → Manage deployments**
- ליד ה-deployment הקיים, ⏏️ לחץ על "ערוך" (העיפרון), שנה Version ל-"New version", **Deploy**
- ה-URL נשאר אותו דבר

## תקלות נפוצות
- **CORS error** בקונסול → ה-deployment לא ב-`Anyone` access. תקן וחזור על Deploy.
- **`SONGS_URL is empty`** → לא הדבקת את ה-URL בקוד.
- **השיר לא מופיע ברשימה** → רענן, או בדוק את ה-Sheet — אולי נשמר אבל ה-fetch נכשל.
