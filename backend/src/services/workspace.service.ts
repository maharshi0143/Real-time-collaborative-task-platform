import { prisma } from '../utils/prisma';
import { v4 as uuidv4 } from 'uuid';
import { publishUserNotification } from './notification.service';

export class WorkspaceService {
  async create(name: string, slug: string, ownerId: string) {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (existing) {
      throw { statusCode: 409, code: 'CONFLICT', message: 'A workspace with this slug already exists.' };
    }

    const workspace = await prisma.workspace.create({
      data: { name, slug, ownerId },
    });

    await prisma.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: ownerId, role: 'admin' },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId: workspace.id,
        actorId: ownerId,
        action: 'member.invited',
        metadata: { userId: ownerId, role: 'admin' },
      },
    });

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ownerId: workspace.ownerId,
      memberCount: 1,
      createdAt: workspace.createdAt,
    };
  }

  async list(userId: string) {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      memberCount: m.workspace._count.members,
      createdAt: m.workspace.createdAt,
    }));
  }

  async getById(workspaceId: string, userId?: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId);
    const workspace = await prisma.workspace.findFirst({
      where: isUuid ? { id: workspaceId } : { slug: workspaceId },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    if (!workspace) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Workspace not found.' };

    let role: string | null = null;
    if (userId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
        select: { role: true },
      });
      role = membership?.role || null;
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      owner: workspace.owner,
      memberCount: workspace._count.members,
      role,
      createdAt: workspace.createdAt,
    };
  }

  async update(workspaceId: string, data: { name?: string; slug?: string }, actorId: string) {
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Workspace not found.' };

    if (data.slug && data.slug !== workspace.slug) {
      const existing = await prisma.workspace.findUnique({ where: { slug: data.slug } });
      if (existing) {
        throw { statusCode: 409, code: 'CONFLICT', message: 'A workspace with this slug already exists.' };
      }
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId,
        actorId,
        action: 'workspace.updated',
        metadata: { oldName: workspace.name, newName: updated.name },
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      memberCount: updated._count.members,
      createdAt: updated.createdAt,
    };
  }

  async delete(workspaceId: string) {
    await prisma.workspace.delete({ where: { id: workspaceId } });
  }

  async addMember(workspaceId: string, email: string, role: string, actorId: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'User with this email not found.' };
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (existing) {
      throw { statusCode: 409, code: 'CONFLICT', message: 'User is already a member of this workspace.' };
    }

    const member = await prisma.workspaceMember.create({
      data: { workspaceId, userId: user.id, role },
      include: { user: { select: { id: true, email: true, username: true } } },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId,
        actorId,
        action: 'member.invited',
        metadata: { userId: user.id, email, role },
      },
    });

    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'member_invited',
        title: 'You have been invited to a workspace',
        body: `You were added to the workspace as ${role}.`,
        link: `/workspaces/${workspaceId}`,
      },
    });

    await publishUserNotification(user.id, notification);

    return {
      userId: member.user.id,
      email: member.user.email,
      username: member.user.username,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  async listMembers(workspaceId: string) {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, email: true, username: true, avatarUrl: true, fullName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      username: m.user.username,
      fullName: m.user.fullName,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async updateMemberRole(workspaceId: string, userId: string, role: string, actorId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Member not found.' };

    const updated = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role },
      include: { user: { select: { id: true, email: true, username: true } } },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId,
        actorId,
        action: 'member.role_changed',
        metadata: { userId, oldRole: member.role, newRole: role },
      },
    });

    return {
      userId: updated.user.id,
      email: updated.user.email,
      username: updated.user.username,
      role: updated.role,
      joinedAt: updated.joinedAt,
    };
  }

  async removeMember(workspaceId: string, userId: string, actorId: string) {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'Member not found.' };

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    await prisma.activityLog.create({
      data: {
        workspaceId,
        actorId,
        action: 'member.removed',
        metadata: { userId, role: member.role },
      },
    });
  }
}

export const workspaceService = new WorkspaceService();
