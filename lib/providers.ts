/**
 * Real delivery for OTPs. Only used when OTP_MODE=live / AADHAAR_MODE=live.
 * Until a provider is connected the app runs in demo mode and shows codes on screen.
 */

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  // Connect a TRAI DLT-registered SMS or WhatsApp provider here (e.g. MSG91, Gupshup,
  // Twilio Verify) and send: `${code} is your Kiddough verification code.` to +91{phone}.
  void phone;
  void code;
  throw new Error("SMS sending isn't set up yet. Ask the Kiddough team to switch OTP_MODE back to demo.");
}

export async function sendAadhaarOtp(aadhaar: string, code: string): Promise<void> {
  // Live Aadhaar e-KYC must go through a UIDAI-licensed partner (e.g. DigiLocker,
  // Surepass, Signzy). That partner sends the OTP to the Aadhaar-linked mobile and
  // verifies it; replace the demo flow in app/otp-actions.ts with their API calls.
  void aadhaar;
  void code;
  throw new Error("Aadhaar verification isn't connected yet. Ask the Kiddough team to switch AADHAAR_MODE back to demo.");
}
