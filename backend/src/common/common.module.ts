// src/common/common.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseService } from './supabase.service.js';

@Module({
  // imports: [ConfigModule],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class CommonModule {}
