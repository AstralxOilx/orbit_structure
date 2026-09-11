# Orbit Backend (Go)

Backend service ของ Orbit เขียนด้วย Go แยกจาก UI และ browser-only state ใน root ซึ่งปัจจุบันยังเป็น Next.js frontend demo

## โครงสร้าง

```text
backend/
├─ cmd/api/              # entrypoint ของ HTTP service
├─ internal/
│  ├─ api/                # transport contracts และ adapters
│  ├─ application/        # use cases, command handlers, authorization
│  ├─ domain/             # entity, value object, business rules
│  ├─ httpapi/            # HTTP routes และ middleware
│  ├─ config/             # environment/configuration
│  └─ infrastructure/    # PostgreSQL, repository, queue, event bus, Yjs
├─ go.mod
└─ .env.example
```

## กติกาการ import

- `api` เรียก `application` ไม่เรียก database โดยตรง
- `application` เรียก `domain` และ ports/repositories
- `infrastructure` เป็นที่เดียวที่รู้จัก PostgreSQL, secret และ external services
- ทุก request ต้อง validate input, ตรวจ session และตรวจ workspace permission
- mutation ต้องใช้ transaction, `expectedRevision` และ idempotency receipt
- response ส่งเฉพาะ DTO ที่ client ต้องใช้ ห้ามส่ง database row ที่มีข้อมูลลับกลับไปตรง ๆ

## สถานะปัจจุบัน

เริ่มต้น service มี `GET /healthz` และ `GET /readyz` แล้ว รันด้วย:

```bash
go run ./cmd/api
```

จากนั้นตรวจ `http://localhost:8080/healthz`

การเชื่อม PostgreSQL, authentication, task API และ Yjs persistence จะเพิ่มในชั้น `application`/`infrastructure` ต่อไป การทำงานของ frontend ปัจจุบันยังใช้ `localStorage` ตามที่อธิบายใน [flow document](../docs/app-and-database-flow.th.md)
