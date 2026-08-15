import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SupabaseService } from '../supabase/supabase.service';

interface SocketData {
  userId: string;
  workspaceId?: string;
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  @WebSocketServer()
  server: Server;

  /**
   * Mobil "Aktif Üyeler" için canlı presence (workspaceId -> userId -> açık
   * bağlantı sayısı; aynı kullanıcı birden fazla sekme/cihazdan bağlanabilir).
   * Web bu KPI'yı Supabase Realtime Presence ile ayrı bir kanaldan alıyor
   * (bkz. use-workspace-presence.ts); mobil zaten bu gateway'e bağlı olduğu
   * için buradan yayınlamak yeni bir bağımlılık eklemeden gerçek-zamanlı bir
   * karşılık veriyor. Tek instance varsayımıyla bellek-içi tutuluyor (Render
   * free-tier'da zaten tek instance).
   */
  private presenceByWorkspace = new Map<string, Map<string, number>>();

  /**
   * ÖNEMLİ (15 Ağustos 2026 — bulundu ve düzeltildi): eskiden `userId`/
   * `workspaceId` handshake'ten OLDUĞU GİBİ güveniliyordu, `token` hiç
   * doğrulanmıyordu — herhangi bir istemci başkasının userId'sini iddia
   * ederek onun bildirim odasına (`user_${userId}`) katılabilir veya
   * üyesi olmadığı bir workspace'in odasına girip task/activity/presence
   * event'lerini dinleyebilirdi. Artık token Supabase'e doğrulatılıyor ve
   * gerçek kullanıcı kimliği kullanılıyor; workspace odasına yalnızca o
   * workspace'in gerçek üyesiyse katılıyor.
   */
  async handleConnection(client: Socket) {
    const token =
      (client.handshake.query.token as string | undefined) ||
      (client.handshake.auth?.token as string | undefined);
    const claimedWorkspaceId =
      (client.handshake.query.workspaceId as string | undefined) ||
      (client.handshake.auth?.workspaceId as string | undefined);

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token — rejecting`);
      client.disconnect(true);
      return;
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .auth.getUser(token);

    if (error || !data?.user) {
      this.logger.warn(`Client ${client.id} invalid token — rejecting`);
      client.disconnect(true);
      return;
    }

    const userId = data.user.id;
    void client.join(this.userRoom(userId));
    this.logger.log(`Client ${client.id} joined room for user ${userId}`);

    const socketData: SocketData = { userId };

    if (claimedWorkspaceId) {
      const isMember = await this.isWorkspaceMember(
        claimedWorkspaceId,
        userId,
        token,
      );
      if (isMember) {
        socketData.workspaceId = claimedWorkspaceId;
        void client.join(this.workspaceRoom(claimedWorkspaceId));
        this.logger.log(
          `Client ${client.id} joined workspace room ${claimedWorkspaceId}`,
        );
        this.trackPresence(claimedWorkspaceId, userId, 1);
        this.broadcastPresence(claimedWorkspaceId);
      } else {
        this.logger.warn(
          `Client ${client.id} (user ${userId}) is not a member of workspace ${claimedWorkspaceId} — room join denied`,
        );
      }
    }

    client.data = socketData;
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const socketData = client.data as SocketData | undefined;
    if (socketData?.workspaceId && socketData.userId) {
      this.trackPresence(socketData.workspaceId, socketData.userId, -1);
      this.broadcastPresence(socketData.workspaceId);
    }
  }

  @SubscribeMessage('leave_workspace')
  handleLeaveWorkspace(
    client: Socket,
    payload: { workspaceId?: string } | string,
  ) {
    const workspaceId =
      typeof payload === 'string' ? payload : payload?.workspaceId;
    if (!workspaceId) return;
    void client.leave(this.workspaceRoom(workspaceId));
    this.logger.log(`Client ${client.id} left workspace room ${workspaceId}`);

    const socketData = client.data as SocketData | undefined;
    if (socketData?.userId && socketData.workspaceId === workspaceId) {
      this.trackPresence(workspaceId, socketData.userId, -1);
      this.broadcastPresence(workspaceId);
      socketData.workspaceId = undefined;
    }
  }

  /** Kullanıcının token'ıyla RLS-scoped istemci — kendi üyeliğini doğrular. */
  private async isWorkspaceMember(
    workspaceId: string,
    userId: string,
    accessToken: string,
  ): Promise<boolean> {
    try {
      const client = this.supabaseService.createUserClient(accessToken);
      const [{ data: workspace }, { data: membership }] = await Promise.all([
        client
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .maybeSingle(),
        client
          .from('workspace_members')
          .select('user_id')
          .eq('workspace_id', workspaceId)
          .eq('user_id', userId)
          .maybeSingle(),
      ]);
      return workspace?.owner_id === userId || Boolean(membership);
    } catch (error) {
      this.logger.warn(`isWorkspaceMember check failed: ${error}`);
      return false;
    }
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
    this.server.to(this.workspaceRoom(workspaceId)).emit(event, payload);
  }

  private trackPresence(workspaceId: string, userId: string, delta: number) {
    let byUser = this.presenceByWorkspace.get(workspaceId);
    if (!byUser) {
      byUser = new Map();
      this.presenceByWorkspace.set(workspaceId, byUser);
    }
    const next = (byUser.get(userId) ?? 0) + delta;
    if (next <= 0) {
      byUser.delete(userId);
    } else {
      byUser.set(userId, next);
    }
    if (byUser.size === 0) {
      this.presenceByWorkspace.delete(workspaceId);
    }
  }

  private broadcastPresence(workspaceId: string) {
    const byUser = this.presenceByWorkspace.get(workspaceId);
    const onlineUserIds = byUser ? [...byUser.keys()] : [];
    this.server.to(this.workspaceRoom(workspaceId)).emit('presence_updated', {
      workspaceId,
      onlineUserIds,
    });
  }

  private userRoom(userId: string) {
    return `user_${userId}`;
  }

  private workspaceRoom(workspaceId: string) {
    return `workspace_${workspaceId}`;
  }
}
