# โครงสร้าง Repository หลังแยก Frontend และ Backend

โครงสร้าง repository แยก Next.js frontend, Go backend และ database boundary ออกจากกันดังนี้

```text
orbit_structure/
├─ frontend/            # Frontend: Next.js application และ package.json ของตัวเอง
│  ├─ app/               # routes และ pages
│  ├─ features/          # business UI ตาม feature
│  ├─ shared/            # UI, theme, i18n และ client utilities
│  ├─ public/            # static assets
│  └─ tsconfig.json
├─ backend/             # Go backend: cmd, internal, go.mod และ database/
├─ docs/                # Architecture และ product documentation
└─ tests/               # Frontend domain และ E2E tests
```

## การรัน Frontend

Frontend และ backend มี `package.json`/`go.mod` แยกกัน สามารถรันและ deploy แยกกันได้ โดย frontend ใช้ `npm run dev` จาก `frontend/` และ backend ใช้ `go run ./cmd/api` จาก `backend/`

เมื่อระบบโตและต้องแชร์ contract ระหว่าง Go กับ TypeScript ให้เพิ่ม package contract ที่เป็น OpenAPI/JSON Schema หรือ code generation แทนการ import source ข้ามภาษา:

```text
apps/web/              # ย้าย app, features, shared, public และ Next config มาที่นี่
apps/api/              # ย้าย backend/ ไปเป็น Go service ที่รันได้จริง (ถ้าต้องการ)
packages/contracts/    # Zod schemas และ API DTO ที่ web/api ใช้ร่วมกัน
packages/db/           # schema, migrations และ database client
```

ระหว่างนี้ห้าม import `backend/` หรือ database client เข้า Client Component และห้ามให้ frontend เขียน PostgreSQL โดยตรง ให้ผ่าน API contract เท่านั้น
