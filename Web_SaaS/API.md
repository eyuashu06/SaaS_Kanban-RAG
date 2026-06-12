# API Documentation

This directory details all active REST API routes exposed by the Node.js Express server on port 3000.

---

## 🔑 Authentication Endpoints

### 1. Traditional Registration (`POST /api/auth/register`)
Renders enterprise credentials into secure user records with strict automated role mapping via email suffixes.

- **Request Payload**:
  ```json
  {
    "name": "Alex Admin",
    "email": "alex.admin@kanban.com",
    "password": "securePassword123"
  }
  ```
- **Response (Success 201)**:
  ```json
  {
    "message": "Registration successful",
    "user": {
      "id": "u_x2y8z9w",
      "name": "Alex Admin",
      "email": "alex.admin@kanban.com",
      "role": "Admin",
      "avatarUrl": "https://images.unsplash.com/photo-..."
    },
    "state": { ... }
  }
  ```

### 2. Traditional Login (`POST /api/auth/login`)
Validates password hashes using Bcrypt round checks.

- **Request Payload**:
  ```json
  {
    "email": "alex.admin@kanban.com",
    "password": "securePassword123"
  }
  ```
- **Response (Success 200)**:
  ```json
  {
    "message": "Login successful",
    "user": { ... },
    "state": { ... }
  }
  ```

### 3. Federated Google SSO Simulation (`POST /api/auth/google`)
Simulates third-party authentication with strict email role-mapping boundary filters.

- **Request Payload**:
  ```json
  {
    "name": "Jane User",
    "email": "jane.user@kanban.com",
    "avatarUrl": "https://..."
  }
  ```
- **Response (Success 200)**:
  ```json
  {
    "message": "Login successful",
    "user": { "role": "Member", ... },
    "state": { ... }
  }
  ```

---

## 📋 Kanban Board Endpoints

### 1. Create Board (`POST /api/boards`)
*Requires Admin or Member privileges.*
- **Request**: `{ "name": "Sprint 14", "description": "Bi-weekly sprint..." }`
- **Response (201)**: `{ "board": { ... }, "state": { ... } }`

### 2. Delete Board (`DELETE /api/boards/:id`)
*Strictly requires Admin role. Performs full cascading delete cascade on all child columns, tasks, comments, and action audits.*
- **Response (200)**: `{ "state": { ... } }`

### 3. Create Custom Columns (`POST /api/columns`)
- **Request**: `{ "boardId": "b1", "name": "Backlog" }`
- **Response (201)**: `{ "column": { ... }, "state": { ... } }`

### 4. Create Tasks (`POST /api/tasks`)
- **Request**: `{ "columnId": "c1", "title": "Upgrade DB", "priority": "high", "dueDate": "2026-06-15" }`
- **Response (201)**: `{ "task": { ... }, "state": { ... } }`

---

## 🔒 Administrative & Support Tools

### 1. Invite Team Member (`POST /api/users/invite`)
*Strictly restricted to Admin role.*
- **Request**:
  ```json
  {
    "name": "Sarah Smith",
    "email": "sarah.user@kanban.com",
    "role": "Member"
  }
  ```
- **Response (201)**: `{ "user": { ... }, "state": { ... } }`

### 2. Database System Reset (`POST /api/state/reset`)
- **Response (200)**: `{ "state": { ... } }`

---

## 🤖 RAG AI Assistant Integration

### 1. Query Assistant (`POST /api/chat`)
Executes the modern chunk retrieval sequence. If a client is on a Free Plan, a strict usage cap is applied (3 queries Max).
- **Request**:
  ```json
  {
    "query": "Who has the heaviest work burden currently?"
  }
  ```
- **Response (200)**:
  ```json
  {
    "text": "Based on current task allocations of the Acme Project:\n- **Alice Chen** has 4 tasks...\n- **Bob Johnson** has 2 tasks...",
    "sources": [
      "User workloads indicators",
      "Google Gemini API (gemini-3.5-flash)"
    ]
  }
  ```
