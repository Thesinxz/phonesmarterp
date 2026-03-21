import { NextRequest, NextResponse } from "next/server";
import { lookupTAC, validateIMEILuhn } from "@/utils/tac-lookup";

export async function GET(
  request: NextRequest,
  { params }: { params: { imei: string } }
) {
  const { imei } = params;

  if (!imei || !validateIMEILuhn(imei)) {
    return NextResponse.json(
      { error: "IMEI inválido" },
      { status: 400 }
    );
  }

  const serial = request.nextUrl.searchParams.get('serial') || undefined;

  try {
    const info = await lookupTAC(imei, serial);
    return NextResponse.json(info, {
      headers: {
        // Cache 24h no CDN — o TAC de um IMEI nunca muda
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error("Erro ao consultar TAC:", error);
    return NextResponse.json(
      { error: "Erro ao consultar TAC" },
      { status: 500 }
    );
  }
}
