import { NextRequest, NextResponse } from "next/server";
import { sendTicketStatusChangeEmail } from "@/lib/email/tickets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, ticketSubject, ticketId, status, userName } = body;

    if (!to || !ticketSubject || !ticketId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Email sending is non-blocking - errors are logged but don't break the flow
    await sendTicketStatusChangeEmail({
      to,
      ticketSubject,
      ticketId,
      status,
      userName,
    });

    // Always return success - email failures are logged but don't affect the response
    return NextResponse.json({ success: true });
  } catch (error) {
    // This catch is for unexpected errors (e.g., JSON parsing, etc.)
    console.error("Unexpected error in ticket status email route:", error);
    // Still return success to not break the application flow
    return NextResponse.json({ success: true });
  }
}

