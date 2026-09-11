# Orbit Database

พื้นที่สำหรับ database layer ที่ backend ใช้เป็น source of truth

```text
database/
├─ migrations/          # migration ที่รันตามลำดับและย้อนกลับได้
├─ seeds/               # ข้อมูล development/test เท่านั้น
└─ README.md
```

ฐานข้อมูลหลักที่แนะนำคือ PostgreSQL โดยตารางหลักประกอบด้วย `users`, `workspaces`, `workspace_members`, `projects`, `tasks`, `tags`, `task_tags`, `subtasks`, `comments`, `task_dependencies`, `task_status_history`, `activities`, `workspace_events`, `command_receipts` และ storage สำหรับ Yjs documents

กฎสำคัญ:

- ทุกตาราง tenant data ต้องผูกกับ workspace ผ่าน foreign key โดยตรงหรือผ่าน project/task
- ใช้ `deleted_at` สำหรับ logical delete ที่ต้อง audit/recover ได้
- การแก้ task และการเขียน history/activity/event ต้องอยู่ transaction เดียวกัน
- `workspace_events.seq` ต้องเรียงต่อเนื่องต่อ workspace เพื่อรองรับ replay
- ห้ามเก็บ password แบบ plain text และห้าม commit database credentials

ยังไม่มี migration จริงในขั้นนี้ เพราะยังไม่ได้เลือก ORM/driver และ database provider

