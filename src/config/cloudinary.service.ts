// src/config/cloudinary.service.ts
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dorcrv8hh',
      api_key: process.env.CLOUDINARY_API_KEY || '545541252719384',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'mRSd2sdns56vFEDx_jGrdRe9nTE',
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'complaints',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else if (result) {
              resolve(result);
            } else {
              reject(new Error('Upload failed'));
            }
          },
        )
        .end(file.buffer);
    });
  }

  async uploadImages(
    files: Express.Multer.File[],
    folder: string = 'complaints',
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteImage(publicId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  // استخراج public_id من URL
  extractPublicId(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const folder = parts[parts.length - 2];
    const publicId = `${folder}/${filename.split('.')[0]}`;
    return publicId;
  }
}