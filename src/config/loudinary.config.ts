// src/config/cloudinary.config.ts
import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryConfig = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    return cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dorcrv8hh',
      api_key: process.env.CLOUDINARY_API_KEY || '545541252719384',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'mRSd2sdns56vFEDx_jGrdRe9nTE',
    });
  },
};