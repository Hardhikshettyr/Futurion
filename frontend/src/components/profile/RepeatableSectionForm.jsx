import { useEffect, useMemo, useState } from "react";
import {
  SelectField,
  TagsField,
  TextareaField,
  TextField,
} from "./ProfileFields.jsx";
import { useStudentProfile } from "../../context/StudentProfileContext.jsx";
import { updateSection } from "../../services/profileApi.js";

const option = (value) => ({
  value,
  label: value
    ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Select an option",
});

const CONFIG = {
  education: {
    singular: "education record",
    blank: {
      institution: "", degree: "", academicDiscipline: "", specialization: "",
      educationLevel: "", startYear: null, graduationYear: null, currentStatus: "",
      gradingType: "", gradeValue: "", gradingScale: "", location: "",
      relevantCoursework: [], academicAchievements: [],
    },
    fields: [
      { key: "institution", label: "Institution", required: true },
      { key: "degree", label: "Degree" },
      { key: "academicDiscipline", label: "Academic discipline" },
      { key: "specialization", label: "Specialization" },
      { key: "educationLevel", label: "Education level" },
      { key: "startYear", label: "Start year", type: "year" },
      { key: "graduationYear", label: "Graduation / expected year", type: "year" },
      { key: "currentStatus", label: "Education status", type: "select", options: ["", "currently_studying", "completed", "paused", "discontinued"] },
      { key: "gradingType", label: "Grading type", type: "select", options: ["", "cgpa", "gpa", "percentage", "grade", "other", "not_applicable"] },
      { key: "gradeValue", label: "CGPA, percentage, or grade" },
      { key: "gradingScale", label: "Grading scale" },
      { key: "location", label: "Location" },
      { key: "relevantCoursework", label: "Relevant coursework", type: "tags" },
      { key: "academicAchievements", label: "Academic achievements", type: "tags" },
    ],
  },
  skills: {
    singular: "skill",
    blank: { name: "", category: "technical", proficiency: "beginner", evidenceStatus: "self_declared", description: "", associatedProject: "", associatedCertification: "" },
    fields: [
      { key: "name", label: "Skill name", required: true },
      { key: "category", label: "Category", type: "select", options: ["technical", "nontechnical", "transferable", "domain_specific"] },
      { key: "proficiency", label: "Proficiency", type: "select", options: ["beginner", "intermediate", "advanced", "expert"] },
      { key: "evidenceStatus", label: "Evidence", type: "select", options: ["self_declared", "currently_learning", "demonstrated"] },
      { key: "description", label: "Description", type: "textarea" },
      { key: "associatedProject", label: "Associated project" },
      { key: "associatedCertification", label: "Associated certification" },
    ],
  },
  projects: {
    singular: "project",
    blank: { title: "", description: "", category: "", role: "", technologies: [], startDate: "", endDate: "", ongoing: false, githubUrl: "", liveUrl: "", contributions: [], outcomes: [], imageUrl: "" },
    fields: [
      { key: "title", label: "Project title", required: true },
      { key: "category", label: "Category" },
      { key: "role", label: "Your role" },
      { key: "description", label: "Description", type: "textarea", wide: true },
      { key: "technologies", label: "Technologies / tools", type: "tags" },
      { key: "startDate", label: "Start date", type: "month" },
      { key: "endDate", label: "End date", type: "month" },
      { key: "ongoing", label: "Ongoing project", type: "checkbox" },
      { key: "githubUrl", label: "GitHub URL", type: "url" },
      { key: "liveUrl", label: "Live URL", type: "url" },
      { key: "contributions", label: "Contributions", type: "tags", wide: true },
      { key: "outcomes", label: "Outcomes and achievements", type: "tags", wide: true },
      { key: "imageUrl", label: "Project image URL", type: "url" },
    ],
  },
  experience: {
    singular: "experience",
    blank: { organization: "", position: "", experienceType: "internship", description: "", startDate: "", endDate: "", currentlyWorking: false, location: "", skillsUsed: [], responsibilities: [], achievements: [] },
    fields: [
      { key: "organization", label: "Organization", required: true },
      { key: "position", label: "Position", required: true },
      { key: "experienceType", label: "Experience type", type: "select", options: ["internship", "full_time", "part_time", "freelance", "volunteering", "research", "other"] },
      { key: "location", label: "Location" },
      { key: "description", label: "Description", type: "textarea", wide: true },
      { key: "startDate", label: "Start date", type: "month" },
      { key: "endDate", label: "End date", type: "month" },
      { key: "currentlyWorking", label: "Currently working here", type: "checkbox" },
      { key: "skillsUsed", label: "Skills used", type: "tags" },
      { key: "responsibilities", label: "Responsibilities", type: "tags", wide: true },
      { key: "achievements", label: "Achievements", type: "tags", wide: true },
    ],
  },
  certifications: {
    singular: "certification",
    blank: { name: "", issuer: "", issueDate: "", expiryDate: "", credentialId: "", verificationUrl: "", relatedSkills: [], certificateUrl: "" },
    fields: [
      { key: "name", label: "Certification name", required: true },
      { key: "issuer", label: "Issuer", required: true },
      { key: "issueDate", label: "Issue date", type: "month" },
      { key: "expiryDate", label: "Expiry date", type: "month" },
      { key: "credentialId", label: "Credential ID" },
      { key: "verificationUrl", label: "Verification URL", type: "url" },
      { key: "relatedSkills", label: "Related skills", type: "tags" },
      { key: "certificateUrl", label: "Certificate file URL", type: "url" },
    ],
  },
};

function serializableRecords(records, fields) {
  return records.map((record) =>
    Object.fromEntries(fields.map((field) => [field.key, record[field.key]])),
  );
}

function RepeatableSectionForm({ onDirtyChange, section }) {
  const { profile, setProfile } = useStudentProfile();
  const config = CONFIG[section];
  const original = useMemo(() => profile[section] || [], [profile, section]);
  const [records, setRecords] = useState(original);
  const [status, setStatus] = useState({ error: "", message: "", saving: false });

  useEffect(() => setRecords(original), [original]);
  useEffect(() => {
    const dirty = JSON.stringify(serializableRecords(records, config.fields)) !==
      JSON.stringify(serializableRecords(original, config.fields));
    onDirtyChange(dirty);
  }, [config.fields, onDirtyChange, original, records]);

  function change(index, key, value) {
    setRecords((current) =>
      current.map((record, recordIndex) =>
        recordIndex === index ? { ...record, [key]: value } : record,
      ),
    );
    setStatus({ error: "", message: "", saving: false });
  }

  async function save(event) {
    event.preventDefault();
    const missing = records.findIndex((record) =>
      config.fields.some((field) => field.required && !String(record[field.key] || "").trim()),
    );
    if (missing >= 0) {
      return setStatus({ error: `${config.singular} ${missing + 1} is missing a required field.`, message: "", saving: false });
    }
    setStatus({ error: "", message: "", saving: true });
    try {
      const result = await updateSection(
        section,
        serializableRecords(records, config.fields),
      );
      setProfile(result.profile);
      setStatus({ error: "", message: `${config.singular[0].toUpperCase()}${config.singular.slice(1)} information saved.`, saving: false });
      onDirtyChange(false);
    } catch (error) {
      setStatus({ error: error.message, message: "", saving: false });
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {status.error && <div role="alert" className="profile-alert profile-alert-error">{status.error}</div>}
      {status.message && <div role="status" className="profile-alert profile-alert-success">{status.message}</div>}
      {records.length === 0 && (
        <div className="border border-dashed border-[#b9c9c2] bg-[#f7f8f4] p-7 text-center">
          <p className="font-serif text-2xl text-[#244b47]">No {section} yet.</p>
          <p className="mt-2 text-sm text-[#6d7e7a]">Add only information that accurately represents your experience.</p>
        </div>
      )}
      {records.map((record, index) => (
        <fieldset key={record.id || index} className="profile-record-card">
          <legend className="px-2 font-serif text-xl text-[#214743]">
            {config.singular[0].toUpperCase() + config.singular.slice(1)} {index + 1}
          </legend>
          <button type="button" onClick={() => setRecords((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="float-right -mt-8 text-xs font-bold text-[#a34c3a] underline underline-offset-4">Remove</button>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {config.fields.map((field) => {
              const id = `${section}-${index}-${field.key}`;
              const common = {
                id,
                label: field.label,
                value: record[field.key] ?? "",
              };
              if (field.type === "tags") {
                return <div key={field.key} className={field.wide ? "md:col-span-2" : ""}><TagsField {...common} onChange={(value) => change(index, field.key, value)} /></div>;
              }
              if (field.type === "textarea") {
                return <div key={field.key} className={field.wide ? "md:col-span-2" : ""}><TextareaField {...common} onChange={(event) => change(index, field.key, event.target.value)} /></div>;
              }
              if (field.type === "select") {
                return <SelectField key={field.key} {...common} options={field.options.map(option)} onChange={(event) => change(index, field.key, event.target.value)} />;
              }
              if (field.type === "checkbox") {
                return <label key={field.key} className="flex items-center gap-3 self-end border border-[#d4ddd6] bg-[#f8f9f5] px-4 py-3 text-sm font-bold text-[#365753]"><input type="checkbox" checked={Boolean(record[field.key])} onChange={(event) => change(index, field.key, event.target.checked)} className="size-4 accent-[#e9794a]" />{field.label}</label>;
              }
              return (
                <TextField
                  key={field.key}
                  {...common}
                  type={field.type === "year" ? "number" : field.type || "text"}
                  min={field.type === "year" ? 1950 : undefined}
                  max={field.type === "year" ? 2100 : undefined}
                  onChange={(event) => change(index, field.key, field.type === "year" ? (event.target.value ? Number(event.target.value) : null) : event.target.value)}
                />
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setRecords((current) => [...current, structuredClone(config.blank)])} className="secondary-button">+ Add {config.singular}</button>
        <button type="submit" disabled={status.saving} className="primary-button">{status.saving ? "Saving…" : "Save section"}</button>
        <button type="button" onClick={() => setRecords(original)} className="text-sm font-bold text-[#5e7470] underline underline-offset-4">Cancel changes</button>
      </div>
    </form>
  );
}

export default RepeatableSectionForm;
