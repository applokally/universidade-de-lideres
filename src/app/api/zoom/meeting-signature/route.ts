import crypto from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SignatureRequestBody = {
  meetingNumber?: string;
  role?: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload: Record<string, string | number>, secret: string) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${message}.${signature}`;
}

export async function POST(request: Request) {
  let body: SignatureRequestBody = {};

  try {
    body = (await request.json()) as SignatureRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const meetingNumber = String(body.meetingNumber ?? "")
    .replace(/\s+/g, "")
    .trim();

  const role = Number(body.role ?? 0);

  if (!meetingNumber) {
    return NextResponse.json(
      { error: "Número da reunião Zoom não informado." },
      { status: 400 }
    );
  }

  if (![0, 1].includes(role)) {
    return NextResponse.json(
      { error: "Role Zoom inválido." },
      { status: 400 }
    );
  }

  const clientId =
    process.env.NEXT_PUBLIC_ZOOM_MEETING_SDK_CLIENT_ID ||
    process.env.ZOOM_MEETING_SDK_CLIENT_ID ||
    "";

  const clientSecret =
    process.env.ZOOM_MEETING_SDK_CLIENT_SECRET ||
    process.env.ZOOM_MEETING_SDK_CLIENT_SECRET ||
    "";

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Credenciais do Zoom Meeting SDK não configuradas no ambiente.",
      },
      { status: 500 }
    );
  }

  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;

  const payload = {
    appKey: clientId,
    sdkKey: clientId,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp,
  };

  const signature = signJwt(payload, clientSecret);

  return NextResponse.json({
    signature,
    clientId,
  });
}
