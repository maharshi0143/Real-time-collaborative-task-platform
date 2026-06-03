import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log('Seed skipped — data already exists.');
    return;
  }

  const hash = (pw: string) => bcrypt.hashSync(pw, 12);

  const aliceId = '00000000-0000-0000-0000-000000000001';
  const bobId = '00000000-0000-0000-0000-000000000002';
  const charlieId = '00000000-0000-0000-0000-000000000003';
  const workspaceId = '00000000-0000-0000-0000-000000000010';
  const projectId = '00000000-0000-0000-0000-000000000020';
  const boardIds = [
    '00000000-0000-0000-0000-000000000031',
    '00000000-0000-0000-0000-000000000032',
    '00000000-0000-0000-0000-000000000033',
    '00000000-0000-0000-0000-000000000034',
  ];
  const taskIds = [
    '00000000-0000-0000-0000-000000000041',
    '00000000-0000-0000-0000-000000000042',
    '00000000-0000-0000-0000-000000000043',
    '00000000-0000-0000-0000-000000000044',
    '00000000-0000-0000-0000-000000000045',
    '00000000-0000-0000-0000-000000000046',
    '00000000-0000-0000-0000-000000000047',
    '00000000-0000-0000-0000-000000000048',
    '00000000-0000-0000-0000-000000000049',
    '00000000-0000-0000-0000-000000000050',
  ];

  await prisma.user.createMany({
    data: [
      { id: aliceId, email: 'alice@example.com', username: 'alice', passwordHash: hash('Alice@12345'), isVerified: true },
      { id: bobId, email: 'bob@example.com', username: 'bob', passwordHash: hash('Bob@12345'), isVerified: true },
      { id: charlieId, email: 'charlie@example.com', username: 'charlie', passwordHash: hash('Charlie@12345'), isVerified: true },
    ],
  });

  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: 'Test Workspace',
      slug: 'test-workspace',
      ownerId: aliceId,
    },
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId, userId: aliceId, role: 'admin' },
      { workspaceId, userId: bobId, role: 'manager' },
      { workspaceId, userId: charlieId, role: 'member' },
    ],
  });

  await prisma.project.create({
    data: {
      id: projectId,
      workspaceId,
      name: 'Test Project',
      description: 'A sample project for testing',
      createdBy: aliceId,
    },
  });

  await prisma.board.createMany({
    data: [
      { id: boardIds[0], projectId, name: 'To Do', position: 0 },
      { id: boardIds[1], projectId, name: 'In Progress', position: 1 },
      { id: boardIds[2], projectId, name: 'In Review', position: 2 },
      { id: boardIds[3], projectId, name: 'Done', position: 3 },
    ],
  });

  await prisma.task.createMany({
    data: [
      { id: taskIds[0], boardId: boardIds[0], title: 'Design landing page mockup', description: 'Create Figma mockups for the landing page', assigneeId: bobId, createdBy: aliceId, priority: 'high', status: 'todo', position: 65536.0, tags: ['design', 'frontend'] },
      { id: taskIds[1], boardId: boardIds[0], title: 'Set up CI/CD pipeline', description: 'Configure GitHub Actions for automated deployment', assigneeId: charlieId, createdBy: aliceId, priority: 'critical', status: 'todo', position: 131072.0, tags: ['devops'] },
      { id: taskIds[2], boardId: boardIds[0], title: 'Write API documentation', description: 'Document all REST endpoints with examples', createdBy: aliceId, priority: 'low', status: 'todo', position: 196608.0, tags: ['docs'] },
      { id: taskIds[3], boardId: boardIds[1], title: 'Implement user authentication', description: 'Build login and registration with JWT', assigneeId: bobId, createdBy: aliceId, priority: 'critical', status: 'in_progress', position: 65536.0, tags: ['backend', 'auth'] },
      { id: taskIds[4], boardId: boardIds[1], title: 'Create database schema', description: 'Design and create all required tables', assigneeId: charlieId, createdBy: aliceId, priority: 'high', status: 'in_progress', position: 131072.0, tags: ['backend', 'database'] },
      { id: taskIds[5], boardId: boardIds[1], title: 'Set up WebSocket server', description: 'Initialize Socket.IO server with Redis adapter', assigneeId: bobId, createdBy: aliceId, priority: 'high', status: 'in_progress', position: 196608.0, tags: ['backend', 'realtime'] },
      { id: taskIds[6], boardId: boardIds[2], title: 'Review PR #42', description: 'Code review for the drag-and-drop implementation', assigneeId: aliceId, createdBy: bobId, priority: 'medium', status: 'in_review', position: 65536.0, tags: ['frontend'] },
      { id: taskIds[7], boardId: boardIds[2], title: 'Test analytics queries', description: 'Verify completion rate and trend calculations', assigneeId: charlieId, createdBy: bobId, priority: 'medium', status: 'in_review', position: 131072.0, tags: ['testing', 'analytics'] },
      { id: taskIds[8], boardId: boardIds[3], title: 'Initialize project repository', description: 'Set up monorepo structure with all configs', assigneeId: bobId, createdBy: aliceId, priority: 'high', status: 'done', position: 65536.0, tags: ['setup'] },
      { id: taskIds[9], boardId: boardIds[3], title: 'Configure ESLint and Prettier', description: 'Set up code quality tools across the project', assigneeId: charlieId, createdBy: aliceId, priority: 'low', status: 'done', position: 131072.0, tags: ['setup', 'tooling'] },
    ],
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
