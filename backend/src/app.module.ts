import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SupabaseModule } from './supabase/supabase.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { TaskModule } from './task/task.module';
import { ProjectModule } from './project/project.module';
import { CommentModule } from './comment/comment.module';
import { FileModule } from './file/file.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { HealthModule } from './health/health.module';
import { ProgressReportModule } from './progress-report/progress-report.module';
import { NoteModule } from './note/note.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';
import { InvitationModule } from './invitation/invitation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const url =
          process.env.REDIS_URL ||
          (process.env.REDIS_HOST
            ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
            : 'redis://127.0.0.1:6379');

        try {
          const store = await redisStore({
            url,
            socket: {
              connectTimeout: 2000,
              reconnectStrategy: false,
            },
          });
          return { store };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `Redis unavailable (${url}): ${message}. Falling back to in-memory cache.`,
          );
          return { ttl: 60_000 };
        }
      },
    }),
    SupabaseModule,
    AuthModule,
    WorkspaceModule,
    TaskModule,
    ProjectModule,
    CommentModule,
    FileModule,
    ActivityLogModule,
    HealthModule,
    ProgressReportModule,
    NoteModule,
    DashboardModule,
    NotificationModule,
    AdminModule,
    InvitationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
