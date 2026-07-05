# ✒ InkDrop — MEAN Stack Blog Website

A beautifully designed, full-stack blog platform built with **MongoDB, Express.js, Angular, and Node.js**.

---

## 🖼 Design Theme

- **Style:** Dark editorial with warm gold accents
- **Fonts:** Playfair Display (headings) + DM Sans (body)
- **Colors:** `#0F0F0F` background · `#D4A853` gold accent · `#F5F0E8` text
- **Aesthetic:** Magazine-quality layout with hover animations, glassmorphism navbar, and smooth transitions

---

## 📁 Full Project Structure

```
blog-app/
│
├── 📦 backend/                       ← Node.js + Express + MongoDB
│   ├── server.js                     ← Main server entry point
│   ├── package.json
│   ├── .env.example                  ← Copy to .env and fill in values
│   │
│   ├── models/
│   │   ├── User.js                   ← User schema (bcrypt passwords, roles)
│   │   ├── Post.js                   ← Post schema (slug, views, likes, readTime)
│   │   ├── Comment.js                ← Comment schema
│   │   └── Category.js               ← Category schema (icon, color)
│   │
│   ├── routes/
│   │   ├── auth.js                   ← POST /register, /login, GET /me
│   │   ├── posts.js                  ← GET/POST/PUT/DELETE posts + like
│   │   ├── comments.js               ← GET/POST/DELETE comments
│   │   └── categories.js             ← GET/POST/DELETE categories
│   │
│   └── middleware/
│       └── auth.js                   ← JWT protect + adminOnly guards
│
└── 🅰️ frontend/                      ← Angular 16
    ├── angular.json
    ├── package.json
    ├── tsconfig.json
    │
    └── src/
        ├── index.html                ← Google Fonts included
        ├── main.ts
        ├── styles.css                ← 🎨 Global design system (500+ lines)
        │
        └── app/
            ├── app.module.ts         ← Root NgModule
            ├── app-routing.module.ts ← All routes defined
            ├── app.component.ts      ← Root component
            │
            ├── models/
            │   └── index.ts          ← TypeScript interfaces (User, Post, Comment...)
            │
            ├── services/
            │   ├── auth.service.ts   ← Login, register, JWT storage
            │   ├── post.service.ts   ← All HTTP API calls
            │   └── auth.interceptor.ts ← Auto-attach JWT to requests
            │
            ├── guards/
            │   ├── auth.guard.ts     ← Redirect to /login if not logged in
            │   └── admin.guard.ts    ← Redirect to / if not admin
            │
            └── components/
                ├── navbar/           ← Sticky blur navbar, mobile menu, user dropdown
                ├── footer/           ← 4-column footer with social links
                ├── home/             ← Hero, featured posts, categories, post grid, pagination
                ├── blog-post/        ← Full article, like button, comments
                ├── about/            ← Team section, values grid, mission
                ├── contact/          ← Form, FAQ accordion, info cards
                ├── login/            ← Login + register tabs with validation
                ├── admin/            ← Dashboard: post CRUD, category management
                └── category/         ← Posts filtered by category
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)
- Angular CLI: `npm install -g @angular/cli`

### 1. Start the Backend

```bash
cd blog-app/backend
npm install

# Set up environment
cp .env.example .env
# Edit .env and set:
#   MONGODB_URI=mongodb://localhost:27017/blogdb
#   JWT_SECRET=your_random_secret_here

npm run dev
# → Server running on http://localhost:5000
```

### 2. Start the Frontend

```bash
cd blog-app/frontend
npm install
ng serve
# → App running on http://localhost:4200
```

### 3. Create First Admin User

After registering via the UI, manually set your user as admin in MongoDB:

```javascript
// In MongoDB shell or Compass:
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "admin" } }
)
```

Then log in again — you'll see the ⚙ Dashboard link in the navbar.

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint              | Access  | Description           |
|--------|-----------------------|---------|-----------------------|
| POST   | /api/auth/register    | Public  | Register new user     |
| POST   | /api/auth/login       | Public  | Login + get JWT       |
| GET    | /api/auth/me          | Private | Get current user      |
| PUT    | /api/auth/profile     | Private | Update profile        |

### Posts
| Method | Endpoint                  | Access | Description                  |
|--------|---------------------------|--------|------------------------------|
| GET    | /api/posts                | Public | All published posts (paginated, searchable) |
| GET    | /api/posts/featured       | Public | Top 3 featured posts         |
| GET    | /api/posts/:slug          | Public | Single post (increments view)|
| POST   | /api/posts                | Admin  | Create post (with image)     |
| PUT    | /api/posts/:id            | Admin  | Update post                  |
| DELETE | /api/posts/:id            | Admin  | Delete post                  |
| POST   | /api/posts/:id/like       | User   | Toggle like                  |
| GET    | /api/posts/admin/all      | Admin  | All posts (including drafts) |

### Comments
| Method | Endpoint              | Access | Description        |
|--------|-----------------------|--------|--------------------|
| GET    | /api/comments/:postId | Public | Get post comments  |
| POST   | /api/comments         | User   | Add comment        |
| DELETE | /api/comments/:id     | User/Admin | Delete comment |

### Categories
| Method | Endpoint              | Access | Description          |
|--------|-----------------------|--------|----------------------|
| GET    | /api/categories       | Public | All categories       |
| POST   | /api/categories       | Admin  | Create category      |
| DELETE | /api/categories/:id   | Admin  | Delete category      |

---

## 🎨 Key Features

| Feature | Details |
|---------|---------|
| 🔐 Auth | JWT-based login/register with role management (admin/user) |
| 📝 CRUD Posts | Create, edit, delete, publish/draft with cover image upload |
| 💬 Comments | Add/delete comments on any post |
| ❤ Likes | Toggle like on posts (requires login) |
| 🔍 Search | Full-text search across title, content, tags |
| 🗂 Categories | Filter posts by category with color-coded chips |
| 📄 Pagination | Server-side pagination with page controls |
| 📱 Responsive | Fully mobile-friendly with collapsible nav |
| ⏱ Read Time | Auto-calculated from word count |
| 🖼 Image Upload | Multer-powered image upload for cover photos |

---

## 📦 Tech Stack

| Layer     | Technology        | Purpose                         |
|-----------|-------------------|---------------------------------|
| Frontend  | Angular 16        | SPA framework                   |
| Backend   | Node.js + Express | REST API server                 |
| Database  | MongoDB + Mongoose| Document database               |
| Auth      | JWT + bcryptjs    | Secure authentication           |
| Uploads   | Multer            | Image file uploads              |
| HTTP      | Angular HttpClient| API communication               |
| Forms     | Reactive Forms    | Form validation                 |
| Routing   | Angular Router    | Client-side navigation          |

---

## 💡 Tips for Beginners

1. **Start MongoDB** before running the backend (`mongod` in terminal)
2. **Check CORS** — backend allows `localhost:4200` by default
3. **Use MongoDB Compass** to view/edit your database visually
4. **Admin posts** can include HTML in the content field (e.g. `<h2>`, `<strong>`, `<blockquote>`)
5. **JWT expires** in 7 days — users need to re-login after that

---

Made with ❤ — MEAN Stack Blog by InkDrop
