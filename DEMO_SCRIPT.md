# Demo Video Script — TaskPlatform (5 Minutes)

---

## Section 1: Intro & Registration (0:00 – 0:45)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 0:00   | Browser opens, type URL, hit enter                          | "Welcome to TaskPlatform — a real-time collaborative Kanban task manager." |
| 0:08   | Landing page loads (if auth'ed, log out first)             | "Let's start by creating a new account."                                   |
| 0:15   | Click "Register" / navigate to `/register`                  |                                                                           |
| 0:20   | Fill form:                                                  | "Registration is quick. Enter your details and submit."                    |
|        |   - Email: `demo@test.com`                                  |                                                                           |
|        |   - Username: `demo`                                        |                                                                           |
|        |   - Password: `Demo@12345`                                  |                                                                           |
| 0:30   | Click "Create Account"                                      |                                                                           |
| 0:35   | Success toast appears, redirect to `/login`                 | "Note: we redirect to login after registration — no auto-login."           |
| 0:40   | Login page visible                                           | "Now let's log in with one of the seeded accounts."                        |

---

## Section 2: Login & Dashboard (0:45 – 1:30)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 0:45   | Enter credentials:                                          | "Logging in as Alice, an Admin user."                                      |
|        |   - Email: `alice@test.com`                                 |                                                                           |
|        |   - Password: `Alice@12345`                                 |                                                                           |
| 0:55   | Click "Sign In"                                              |                                                                           |
| 1:00   | Dashboard loads                                              | "The dashboard shows a welcome banner with your name and role badge."      |
| 1:05   | Mouse moves slowly across cards, hover effect visible        | "Each workspace is a gradient card with member count and role indicator."  |
| 1:10   | Point cursor to the role badge (Admin)                       | "Roles are color-coded: Admin in indigo, Manager in emerald, Member in amber, Guest in gray." |
| 1:20   | Point cursor to member count, project count                  | "You can see member and project counts at a glance."                       |
| 1:25   | Click on "Alice's Workspace" (or first workspace card)       | "Let's open a workspace to explore further."                               |

---

## Section 3: Workspace & RBAC (1:30 – 2:30)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 1:30   | Workspace page loads                                         | "Inside the workspace, we have breadcrumb navigation at the top."          |
| 1:35   | Point cursor to breadcrumb: Dashboard > Workspace Name       |                                                                           |
| 1:38   | Point to role badge next to workspace name                   | "My role is clearly shown next to the workspace name."                     |
| 1:42   | Point to stats: member count, project count                  |                                                                           |
| 1:45   | Move cursor over a project card (show hover effect)          | "Project cards have hover animations — elevation, color shift, border highlight." |
| 1:50   | Point to the delete (trash) icon on a project card           | "Since I'm Admin, I see the delete button on projects."                    |
| 1:55   | Click "New Project" button                                   | "Managers can also create projects. Members and guests cannot."            |
| 2:00   | Dialog opens, type "Sprint 25"                               |                                                                           |
| 2:05   | Click "Create Project"                                       |                                                                           |
| 2:10   | New project appears in the list                              | "The project appears immediately in the grid."                             |
| 2:15   | Click on "Sprint 25" project                                 | "Let's open this project to see the boards."                               |

---

## Section 4: Boards & Kanban (2:30 – 3:15)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 2:30   | Project page loads (empty state — no boards)                 | "An empty project shows a prompt to create your first board."              |
| 2:35   | Click "Create Board", type "To Do"                          | "Boards represent Kanban columns."                                        |
| 2:40   | Create another board "In Progress"                          |                                                                           |
| 2:45   | Create another board "Done"                                  |                                                                           |
| 2:50   | Point to breadcrumb: Dashboard > Workspace > Project         | "Breadcrumbs help navigate the hierarchy."                                 |
| 2:55   | Click "+" or "Add Task" on "To Do" board                    | "Let's add a task."                                                       |
| 3:00   | Fill task title: "Implement login page"                     | "Tasks have title, description, priority, assignee, tags, and due date."   |
| 3:05   | Set priority to "High", assign to a user                    |                                                                           |
| 3:08   | Click "Create Task"                                          |                                                                           |
| 3:10   | Task card appears on the board                               | "The task card shows on the board with a priority color indicator."        |
| 3:12   | Click on the task card                                       | "Clicking opens the Task Drawer for full details."                         |

---

## Section 5: Task Drawer & Comments (3:15 – 3:45)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 3:15   | Task Drawer slides in from right                             | "The drawer lets you edit all fields inline."                              |
| 3:20   | Edit title, change priority                                  | "Changes are saved automatically or via a save button."                    |
| 3:25   | Scroll to comments section                                   | "The comments section supports threaded discussions."                      |
| 3:28   | Type `@` in comment box, show @mention dropdown              | "Use @mentions to notify team members."                                    |
| 3:33   | Select a user from dropdown, type message, submit            |                                                                           |
| 3:38   | Comment appears in the list                                  | "Comments appear instantly with the author and timestamp."                  |
| 3:40   | Scroll to Activity Log                                       | "The activity log tracks all changes to the task."                         |
| 3:43   | Close the drawer                                              |                                                                           |

---

## Section 6: Drag & Drop + Real-Time (3:45 – 4:15)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 3:45   | Grab the "Implement login page" task card                   | "Drag and drop is powered by dnd-kit — smooth and accessible."             |
| 3:50   | Drag it from "To Do" to "In Progress"                       | "Changes are persisted immediately and broadcast via WebSocket."           |
| 3:55   | Release — card lands in new column                          |                                                                           |
| 4:00   | Switch to a second browser window, same board open           | "Real-time sync uses Socket.IO with Redis Pub/Sub."                        |
| 4:05   | Both windows show the task in "In Progress"                  | "Other users see updates instantly with no page refresh."                  |
| 4:08   | In window 2, point to notification bell showing a badge      | "Notifications are also pushed in real time."                              |

---

## Section 7: Notifications & Analytics (4:15 – 4:45)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 4:15   | Click Notification Bell                                      | "The bell shows unread notification count."                                |
| 4:18   | Dropdown shows recent notifications                          | "Due-soon alerts, task assignments, and mentions all appear here."         |
| 4:22   | Click "View All" → `/notifications` page                    | "The full notifications page lets you manage all alerts."                  |
| 4:27   | Click "Mark All as Read"                                     |                                                                           |
| 4:30   | Navigate to Analytics page                                   | "The analytics page provides workspace insights."                          |
| 4:33   | Point to Completion Trend (LineChart)                        | "A completion trend chart shows progress over time."                       |
| 4:37   | Point to Tasks by Priority (BarChart)                        | "Priority distribution is shown in a bar chart."                           |
| 4:40   | Point to workspace stats                                     | "Workspace-level stats show task counts and member activity."              |
| 4:43   | Navigate to `/settings/profile`                              | "Users can update their profile — name and avatar."                        |
| 4:45   | Quick edit on profile page, save                             |                                                                           |

---

## Section 8: Wrap Up (4:45 – 5:00)

| Time   | Visual / Action                                             | Narration                                                                 |
|--------|-------------------------------------------------------------|---------------------------------------------------------------------------|
| 4:50   | Cut to black or show a summary overlay                       | "To recap, TaskPlatform is a production-ready collaborative task manager." |
| 4:52   | Display bullet points (text overlay):                        | "It features:"                                                             |
|        |   - RBAC with 4 roles                                       | "   Role-based access control with Admin, Manager, Member, Guest"          |
|        |   - Real-time collaboration                                 | "   Real-time sync via WebSocket and Redis Pub/Sub"                        |
|        |   - Kanban with drag & drop                                 | "   Kanban boards with smooth drag and drop"                               |
|        |   - Analytics & notifications                               | "   Analytics dashboards and push notifications"                           |
|        |   - CI/CD + monitoring                                       | "   Full CI/CD pipeline with Prometheus and Grafana monitoring"            |
| 4:58   | Fade to end screen:                                          | "Thanks for watching."                                                     |
|        |   - Logo + "TaskPlatform"                                    |                                                                           |
|        |   - "github.com/your-org/task-platform"                     |                                                                           |

---

## Total: ~5 minutes (300 seconds)

| Section                     | Duration   |
|-----------------------------|------------|
| 1. Intro & Registration     | 0:00–0:45  |
| 2. Login & Dashboard        | 0:45–1:30  |
| 3. Workspace & RBAC         | 1:30–2:30  |
| 4. Boards & Kanban          | 2:30–3:15  |
| 5. Task Drawer & Comments   | 3:15–3:45  |
| 6. Drag & Drop + Real-Time  | 3:45–4:15  |
| 7. Notifications & Analytics| 4:15–4:45  |
| 8. Wrap Up                  | 4:45–5:00  |

---

## Setup Checklist Before Recording

- [ ] Run `docker compose up -d` — all 7 services running
- [ ] Database seeded (`npm run db:seed` in backend)
- [ ] Second browser window open, logged in as `bob` / `Bob@12345`
- [ ] At least one workspace with a few projects, boards, and tasks
- [ ] Notification bell has at least one unread notification
- [ ] Screen recording at 1920×1080, 30fps
- [ ] Microphone level checked — no background noise
- [ ] Browser zoom set to 100%
- [ ] Close all unnecessary tabs and applications

## Pro Tips

- **If you misspeak**: pause 2 seconds, then repeat the line. Edit it out in post.
- **If an API call fails**: don't panic. Say "let me refresh" and reload the page.
- **Cursor movement**: move slowly and deliberately. Fast cursor = disorienting video.
- **Cut between sections**: add a brief fade to black (0.5s) between major sections for polish.
