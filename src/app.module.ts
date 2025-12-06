import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Modules
import { AuthModule } from './auth/auth.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { ComplaintCategoriesModule } from './complaint-categories/complaint-categories.module';
import { ComplaintLogsModule } from './complaint-logs/complaint-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RatingsModule } from './ratings/ratings.module';
import { UserModule } from './users/users.module';

@Module({
  imports: [
    // ================ Configuration Module ================
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),

    // ================ Static Files (الصور والملفات) ================
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // المجلد داخل المشروع
      serveRoot: '/uploads', // الرابط الخارجي للوصول
    }),

    // ================ Rate Limiting (اختياري) ================
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // ================ MongoDB Connection ================
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
        autoIndex: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
      }),
      inject: [ConfigService],
    }),

    // ================ Application Modules ================
    AuthModule,
    UserModule,
    ComplaintsModule,
    ComplaintCategoriesModule,
    ComplaintLogsModule,
    NotificationsModule,
    RatingsModule,
  ],
})
export class AppModule {}
