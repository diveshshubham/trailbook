import { NextResponse } from "next/server";

function isAllowedPresignedUrl(url: string) {
  try {
    const u = new URL(url);
    // Basic safety: only allow AWS S3 URLs (customize if needed)
    return u.hostname.includes("amazonaws.com");
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const uploadUrl = String(form.get("uploadUrl") || "");
    const file = form.get("file");
    const contentType = String(form.get("contentType") || "");

    if (!uploadUrl || !contentType) {
      return NextResponse.json(
        { success: false, message: "Missing uploadUrl/contentType" },
        { status: 400 }
      );
    }

    if (!isAllowedPresignedUrl(uploadUrl)) {
      return NextResponse.json(
        { success: false, message: "Invalid uploadUrl" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Missing file" },
        { status: 400 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: buf,
    });

    if (!putRes.ok) {
      const text = await putRes.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          message: `S3 upload failed: ${putRes.status} ${putRes.statusText}`,
          details: text,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: "Upload proxy failed" },
      { status: 500 }
    );
  }
}

