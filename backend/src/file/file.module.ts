import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { FileController } from './file.controller';
import { FileService } from './file.service';

@Module({
  imports: [SupabaseModule],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
