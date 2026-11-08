function AlignmentMeter({ label, value, unknownLabel = "Unknown" }) {
  const known = value !== null && value !== undefined;
  const safe = known ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className="decision-meter">
      <div><span>{label}</span><strong>{known ? `${safe}%` : unknownLabel}</strong></div>
      <div className="decision-meter-track" aria-label={`${label}: ${known ? `${safe}%` : unknownLabel}`}>
        <span style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

export default AlignmentMeter;
