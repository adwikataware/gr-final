import { NextRequest, NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const BUCKET = process.env.GCS_BUCKET_NAME || "gr-connect-prod.appspot.com";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const uid = formData.get("uid") as string;

    if (!file || !uid) {
      return NextResponse.json({ error: "Missing file or uid" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `avatars/${uid}.${ext}`;

    const bucket = storage.bucket(BUCKET);
    const fileRef = bucket.file(filename);

    await fileRef.save(buffer, {
      metadata: { contentType: file.type },
      public: true,
    });

    const url = `https://storage.googleapis.com/${BUCKET}/${filename}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
