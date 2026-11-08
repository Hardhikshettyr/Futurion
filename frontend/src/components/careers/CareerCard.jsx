import { Link } from "react-router-dom";

function CareerCard({ career, fit, saved = false, onSave, compact = false, selectedForComparison = false, onCompare }) {
  return (
    <article className={`career-card ${compact ? "career-card-compact" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="career-kicker">{career.categoryLabel || career.careerCategory?.replaceAll("_", " ")}</p>
          <h3 className="mt-2 font-serif text-2xl leading-tight text-[#173f3c]">{career.title}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-[.1em] text-[#6b817c]">{career.industry}</p>
        </div>
        {fit?.score !== null && fit?.score !== undefined && <span className="career-fit" title="Profile alignment, not eligibility">{fit.score}%<small>fit</small></span>}
      </div>
      {!compact && <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#617571]">{career.shortDescription}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {(career.essentialSkills || []).slice(0, compact ? 2 : 4).map((item) => <span key={item.skill.id} className="career-chip">{item.skill.name}</span>)}
      </div>
      {fit?.recommendationReasons?.[0] && !compact && <p className="mt-4 border-l-2 border-[#e9794a] pl-3 text-xs leading-5 text-[#506b66]">{fit.recommendationReasons[0]}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#dce3dc] pt-4">
        <Link to={`/dashboard/careers/${career.id}`} className="text-sm font-extrabold text-[#174b47] underline decoration-[#e9794a] decoration-2 underline-offset-4">Explore career</Link>
        {onSave && <button type="button" onClick={() => onSave(career, saved)} className="ml-auto text-xs font-bold text-[#536e69] hover:text-[#bf5838]">{saved ? "Saved ✓" : "Save +"}</button>}
      </div>
      {saved && onCompare && <label className="mt-3 flex items-center gap-2 text-xs font-bold text-[#536e69]"><input type="checkbox" checked={selectedForComparison} onChange={(event) => onCompare(career, event.target.checked)} /> Select for comparison</label>}
    </article>
  );
}

export default CareerCard;
