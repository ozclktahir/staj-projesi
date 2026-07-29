import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

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

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    const userId =
      (client.handshake.query.userId as string | undefined) ||
      (client.handshake.auth?.userId as string | undefined);
    const workspaceId =
      (client.handshake.query.workspaceId as string | undefined) ||
      (client.handshake.auth?.workspaceId as string | undefined);
    const token =
      (client.handshake.query.token as string | undefined) ||
      (client.handshake.auth?.token as string | undefined);

    if (token) {
      this.logger.debug(`Client ${client.id} connected with auth token`);
    }

    if (userId) {
      void client.join(this.userRoom(userId));
      this.logger.log(`Client ${client.id} joined room for user ${userId}`);
    } else {
      this.logger.warn(`Client ${client.id} connected without userId`);
    }

    if (workspaceId) {
      void client.join(this.workspaceRoom(workspaceId));
      this.logger.log(
        `Client ${client.id} joined workspace room ${workspaceId}`,
      );
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
    this.server.to(this.workspaceRoom(workspaceId)).emit(event, payload);
  }

  private userRoom(userId: string) {
    return `user_${userId}`;
  }

  private workspaceRoom(workspaceId: string) {
    return `workspace_${workspaceId}`;
  }
}
