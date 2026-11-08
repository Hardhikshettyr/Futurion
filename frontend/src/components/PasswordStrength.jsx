function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "Not entered" };

  const checks = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong"];

  return { score, label: labels[score] };
}

function PasswordStrength({ password }) {
  const { score, label } = getPasswordStrength(password);

  return (
    <div className="mt-3" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`h-1 transition-colors ${segment <= score ? "bg-[#e9794a]" : "bg-[#d9dfd8]"}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-[#718180]">
        <span>Password strength</span>
        <span className="font-semibold text-[#405e5e]">{label}</span>
      </div>
    </div>
  );
}

export default PasswordStrength;
