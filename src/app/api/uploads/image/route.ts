// src/app/api/uploads/image/route.ts
import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs"; // ensure node runtime for Cloudinary SDK

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "icecream-inventory";
    const tag = (formData.get("tag") as string) || "asset";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          overwrite: true,
          resource_type: "image",
          tags: [tag],
          transformation: [
            // lightly constrain to prevent huge images; keep quality auto
            { fetch_format: "auto", quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(buffer);
    });

    return NextResponse.json(
      {
        public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
