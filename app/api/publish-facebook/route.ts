import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let message: unknown;
    let image: File | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      message = formData.get("message");
      const imageValue = formData.get("image");
      image = imageValue instanceof File ? imageValue : undefined;
    } else {
      ({ message } = await request.json());
    }

    const cleanMessage = typeof message === "string" ? message.trim() : "";
    const pageId = process.env.FB_PAGE_ID;
    const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;

    if (!cleanMessage) {
      return NextResponse.json({ error: "Post content is required." }, { status: 400 });
    }

    if (!pageId || !pageAccessToken) {
      return NextResponse.json({ error: "Facebook page credentials are not configured." }, { status: 500 });
    }

    const endpoint = image ? "photos" : "feed";
    const facebookUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/${endpoint}`;
    const facebookRequest = image ? new FormData() : undefined;

    if (facebookRequest && image) {
      facebookRequest.append("message", cleanMessage);
      facebookRequest.append("source", image, image.name || "upload.jpg");
      facebookRequest.append("access_token", pageAccessToken);
    }

    const facebookResponse = await fetch(facebookUrl, image ? {
      method: "POST",
      body: facebookRequest,
    } : {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: cleanMessage, access_token: pageAccessToken }),
    });
    const facebookData = await facebookResponse.json();

    if (!facebookResponse.ok || facebookData.error) {
      const facebookCode = facebookData.error?.code;
      const facebookError = facebookData.error?.message || "Facebook rejected the post.";
      const error = facebookCode === 100 || facebookCode === 200
        ? "Facebook rejected this request because the Page Access Token is missing pages_manage_posts or pages_read_engagement permission."
        : facebookError;
      return NextResponse.json({ error, facebookCode }, { status: facebookResponse.status || 502 });
    }

    return NextResponse.json({ success: true, postId: facebookData.id });
  } catch (error) {
    console.error("Facebook publish failed", error);
    return NextResponse.json({ error: "The post could not be published to Facebook." }, { status: 500 });
  }
}
