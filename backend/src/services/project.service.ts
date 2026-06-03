import { prisma } from '../utils/prisma';

export class ProjectService {
  async create(workspaceId: string, name: string, description: string | null | undefined, createdBy: string) {
    const project = await prisma.project.create({
      data: { workspaceId, name, description: description || null, createdBy },
    });

    const boardNames = ['To Do', 'In Progress', 'In Review', 'Done'];
    const boards = await Promise.all(
      boardNames.map((boardName, index) =>
        prisma.board.create({
          data: { projectId: project.id, name: boardName, position: index },
        })
      )
    );

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      createdBy: { id: createdBy, username: '' },
      boards: boards.map((b) => ({
        id: b.id,
        name: b.name,
        position: b.position,
      })),
      createdAt: project.createdAt,
    };
  }

  async list(workspaceId: string) {
    const projects = await prisma.project.findMany({
      where: { workspaceId },
      include: {
        creator: { select: { id: true, username: true } },
        _count: { select: { boards: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      name: p.name,
      description: p.description,
      createdBy: p.creator ? { id: p.creator.id, username: p.creator.username } : null,
      boardCount: p._count.boards,
      createdAt: p.createdAt,
    }));
  }

  async getById(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        creator: { select: { id: true, username: true } },
        boards: { orderBy: { position: 'asc' } },
      },
    });
    if (!project) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Project not found.' };

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description,
      createdBy: project.creator || null,
      boards: project.boards.map((b) => ({
        id: b.id,
        name: b.name,
        position: b.position,
      })),
      createdAt: project.createdAt,
    };
  }

  async update(projectId: string, data: { name?: string; description?: string | null }) {
    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    });
    return project;
  }

  async delete(projectId: string) {
    await prisma.project.delete({ where: { id: projectId } });
  }

  async createBoard(projectId: string, name: string, position?: number) {
    const maxPos = await prisma.board.aggregate({
      where: { projectId },
      _max: { position: true },
    });
    const board = await prisma.board.create({
      data: { projectId, name, position: position ?? (maxPos._max.position ?? -1) + 1 },
    });
    return board;
  }

  async listBoards(projectId: string) {
    return prisma.board.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
    });
  }

  async updateBoard(boardId: string, data: { name?: string; position?: number }) {
    return prisma.board.update({ where: { id: boardId }, data });
  }

  async deleteBoard(boardId: string) {
    await prisma.board.delete({ where: { id: boardId } });
  }
}

export const projectService = new ProjectService();
