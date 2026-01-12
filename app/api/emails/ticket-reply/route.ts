import { NextRequest, NextResponse } from "next/server";
import { sendTicketReplyEmail } from "@/lib/email/tickets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, ticketSubject, ticketId, replyMessage, isAdminReply, userName } = body;

    if (!to || !ticketSubject || !ticketId || !replyMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    await sendTicketReplyEmail({
      to,
      ticketSubject,
      ticketId,
      replyMessage,
      isAdminReply: isAdminReply ?? false,
      userName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending ticket reply email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to send email", details: errorMessage },
      { status: 500 },
    );
  }
}

