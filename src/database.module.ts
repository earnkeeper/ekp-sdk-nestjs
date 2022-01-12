import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: ['dist/**/**.entity{.ts,.js}'],
      synchronize: true,
      autoLoadEntities: true,
      ssl: process.env.DATABASE_SSL !== 'disable',
      extra:
        process.env.DATABASE_SSL !== 'disable'
          ? {
              ssl: {
                rejectUnauthorized: false,
              },
            }
          : undefined,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
