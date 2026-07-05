# Changed Files — Author Role + User Management

## What Changed
- Added `author` role (between admin and user)
- Admin dashboard now has a Users tab to manage all accounts
- Authors get their own dashboard (My Dashboard) to manage their own posts and comments

## Files to Replace

### BACKEND — copy into `blog-app/backend/`
| File | Change |
|------|--------|
| `models/User.js` | Added `author` to role enum, added `isActive` field |
| `middleware/auth.js` | Added `authorOrAdmin`, `canManagePost`, `canManageComment` |
| `routes/auth.js` | Added user management endpoints (list, role change, status, delete) |
| `routes/posts.js` | Author can create/edit/delete own posts; new `/my-posts` endpoint |
| `routes/comments.js` | Author can hide/delete comments on own posts; new hide endpoint |
| `seed.js` | Seeds admin + author + user accounts |

### FRONTEND — copy into `blog-app/frontend/src/app/`
| File | Change |
|------|--------|
| `models/index.ts` | Added `author` to User role type, added `isActive` |
| `services/auth.service.ts` | Added `isAuthor`, `isAuthorOrAdmin`, user management API calls |
| `services/post.service.ts` | Added `getMyPosts()`, `getAllCommentsByPost()`, `toggleHideComment()` |
| `guards/author.guard.ts` | **NEW FILE** — allows author or admin to access dashboard |
| `app-routing.module.ts` | Dashboard route now uses `AuthorGuard` instead of `AdminGuard` |
| `app.module.ts` | Registered `RoleFilterPipe` |
| `pipes/role-filter.pipe.ts` | **NEW FILE** — counts users by role for summary chips |
| `components/navbar/navbar.component.html` | Dashboard link visible to authors too; role badge in dropdown |
| `components/navbar/navbar.component.ts` | Updated dropdown toggle logic |
| `components/navbar/navbar.component.css` | Added role colour classes |
| `components/admin/admin.component.ts` | Full rewrite — author-aware + Users tab logic |
| `components/admin/admin.component.html` | Full rewrite — Users tab with role editor |
| `components/admin/admin.component.css` | Full rewrite — users table, role badges, summary chips |

## After Replacing Files

Re-seed the database to get the new author account:
```bash
cd blog-app/backend
node seed.js
```

New login credentials:
| Role | Email | Password |
|------|-------|----------|
| 👑 Admin | admin@inkdrop.com | admin123 |
| ✍ Author | author@inkdrop.com | author123 |
| 👤 User | user@inkdrop.com | user123 |
