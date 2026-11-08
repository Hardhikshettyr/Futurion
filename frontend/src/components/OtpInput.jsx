import { useRef } from "react";

const OTP_LENGTH = 6;

function OtpInput({ value, onChange, disabled = false, hasError = false }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] || "");

  function updateDigit(index, rawValue) {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    onChange(nextDigits.join(""));

    if (digit && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handleKeyDown(index, event) {
    if (event.key === "Backspace" && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  function handlePaste(event) {
    const pastedOtp = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pastedOtp) return;
    event.preventDefault();
    onChange(pastedOtp);
    inputsRef.current[Math.min(pastedOtp.length, OTP_LENGTH) - 1]?.focus();
  }

  return (
    <div className={`grid grid-cols-6 gap-2 sm:gap-3 ${hasError ? "otp-shake" : ""}`} onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          value={digit}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={`Verification digit ${index + 1}`}
          className={`aspect-square min-w-0 border bg-white text-center font-mono text-2xl font-bold text-[#173f3c] outline-none transition sm:text-3xl ${
            hasError
              ? "border-[#bd5b46]"
              : "border-[#cbd5ce] focus:border-[#e9794a] focus:ring-4 focus:ring-[#e9794a]/10"
          } disabled:cursor-not-allowed disabled:bg-[#eef0eb]`}
        />
      ))}
    </div>
  );
}

export default OtpInput;
