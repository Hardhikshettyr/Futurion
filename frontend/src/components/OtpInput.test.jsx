import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import OtpInput from "./OtpInput.jsx";

describe("OtpInput", () => {
  test("moves focus forward and accepts only a numeric digit", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "a1" } });

    expect(onChange).toHaveBeenCalledWith("1");
    expect(document.activeElement).toBe(inputs[1]);
  });

  test("accepts a complete pasted OTP", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);

    fireEvent.paste(screen.getAllByRole("textbox")[0], {
      clipboardData: { getData: () => "12 34-56" },
    });

    expect(onChange).toHaveBeenCalledWith("123456");
  });

  test("moves focus backward on backspace from an empty field", () => {
    render(<OtpInput value="1" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    inputs[1].focus();
    fireEvent.keyDown(inputs[1], { key: "Backspace" });
    expect(document.activeElement).toBe(inputs[0]);
  });
});
