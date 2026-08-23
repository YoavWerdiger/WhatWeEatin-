# What We Eatin' - MVP Backend

שרת MVP אמיתי לאפליקציית החלטה קבוצתית על אוכל, כולל:
- יצירת סשן
- הצטרפות עם לינק/מזהה
- Swipe/Vote
- התאמה בקונצנזוס מלא
- Auto-pick כשנמאס להחליט
- אינטגרציה ל-Google Places (עם fallback לדאטה מקומי לפיתוח)

## Tech Stack
- Node.js + TypeScript
- Fastify
- Zod ולידציה
- Vitest לבדיקות
- PostgreSQL schema (ב-`db/schema.sql`)

## התקנה והרצה

```bash
npm install
cp .env.example .env
npm run dev
```

ברירת מחדל: `http://localhost:3000`

Health:
```bash
curl http://localhost:3000/health
```

## API עיקרי (MVP)

### 1) Login מלא (MVP stub)
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider":"google",
    "providerUserId":"user-1",
    "displayName":"Yoav",
    "email":"yoav@example.com"
  }'
```

### 2) יצירת Session
```bash
curl -X POST http://localhost:3000/v1/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "hostUserId":"google:user-1",
    "locationLat":32.0853,
    "locationLng":34.7818,
    "radiusKm":5,
    "budgetLevel":2,
    "cuisinePreferences":["pizza","sushi"]
  }'
```

### 3) הצטרפות לסשן
```bash
curl -X POST http://localhost:3000/v1/sessions/<SESSION_ID>/join \
  -H "Content-Type: application/json" \
  -d '{"userId":"google:user-2"}'
```

### 4) קבלת מועמדים
```bash
curl http://localhost:3000/v1/sessions/<SESSION_ID>/candidates
```

### 5) הצבעה (Swipe)
```bash
curl -X POST http://localhost:3000/v1/sessions/<SESSION_ID>/votes \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"google:user-1",
    "restaurantId":"<RESTAURANT_ID>",
    "vote":"right_want"
  }'
```

ערכי `vote`:
- `left_no` = שמאלה
- `right_want` = ימינה
- `up_must` = סופר לייק
- `neutral` = נייטרלי

### 6) מאץ' נוכחי
```bash
curl http://localhost:3000/v1/sessions/<SESSION_ID>/match
```

### 7) Just pick for us
```bash
curl -X POST http://localhost:3000/v1/sessions/<SESSION_ID>/auto-pick
```

## בדיקות
```bash
npm test
```

## מבנה פרויקט
```text
src/
  app.ts
  server.ts
  config/env.ts
  domain/types.ts
  routes/
    authRoutes.ts
    sessionRoutes.ts
  services/
    googlePlacesService.ts
    matchingEngine.ts
    sessionService.ts
  store/inMemoryStore.ts
db/schema.sql
test/session.e2e.test.ts
```

## הערות פרודקשן
- כרגע ה-persistence בזיכרון (למהירות MVP). הסכמה המלאה ב-`db/schema.sql`.
- Login endpoint הוא MVP stub; בפרודקשן צריך אימות token אמיתי מול Apple/Google/Phone.
- Google Places פעיל כשיש `GOOGLE_PLACES_API_KEY`, אחרת fallback לדאטה mock לפיתוח.

## Mobile App (Expo) - Design Optimized MVP UI

נוסף פרויקט מובייל תחת `mobile/` עם UX מעוצב לזרימת:
- Home
- Create Session
- Swipe Decision
- Match Result

### מה שודרג בעיצוב
- שפת מותג מהירה ו"חברית" עם טון מעט ציני
- צבעוניות ממוקדת: Orange/Red + שחור/לבן + ירוק להצלחה
- רכיבי UI עקביים: כפתורים, chips, card, timer bar
- הפחתת friction: בחירות מהירות, טיימר בולט, CTA ברורים
- אלמנט חברתי: Picky meter בזמן אמת

### הרצת המובייל (iOS Simulator על Mac)
```bash
# טרמינל 1 — Backend
npm install
npm run dev

# טרמינל 2 — Expo
cd mobile
npm install
cp .env.example .env   # כבר מוגדר ל-localhost:3000 ל-iOS Simulator
npm run dev            # או: npm run start -- --clear
```

ב-Expo לחץ `i` לפתיחת iOS Simulator.

#### ערכי EXPO_PUBLIC_API_URL
- iOS Simulator: `http://localhost:3000`
- Android Emulator: `http://10.0.2.2:3000`
- טלפון פיזי: `http://<IP-של-המק>:3000`

### בדיקת TypeScript במובייל
```bash
cd mobile
npm run typecheck
```
