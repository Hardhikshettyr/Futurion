import { apiRequest, uploadRequest } from "./apiClient.js";

function getStudentProfile() {
  return apiRequest("/student/profile");
}

function updatePersonal(values) {
  return apiRequest("/student/profile/personal", {
    body: values,
    method: "PATCH",
    requiresCsrf: true,
  });
}

function updateSection(section, values) {
  return apiRequest(`/student/profile/${section}`, {
    body: { [section]: values },
    method: "PUT",
    requiresCsrf: true,
  });
}

function updatePreferences(values) {
  return apiRequest("/student/profile/preferences", {
    body: values,
    method: "PATCH",
    requiresCsrf: true,
  });
}

function uploadProfilePhoto(file, onProgress) {
  const form = new FormData();
  form.append("photo", file);
  return uploadRequest("/student/profile/photo", form, onProgress);
}

function removeProfilePhoto() {
  return apiRequest("/student/profile/photo", {
    method: "DELETE",
    requiresCsrf: true,
  });
}

function uploadResume(file, onProgress) {
  const form = new FormData();
  form.append("resume", file);
  return uploadRequest("/student/profile/resume", form, onProgress);
}

function removeResume() {
  return apiRequest("/student/profile/resume", {
    method: "DELETE",
    requiresCsrf: true,
  });
}

function downloadPrivateFile(kind) {
  return apiRequest(`/student/profile/${kind}`, { responseType: "blob" });
}

function parseResume() {
  return apiRequest("/student/profile/resume/parse", {
    method: "POST",
    requiresCsrf: true,
  });
}

function importResumeSelection(data, selection) {
  return apiRequest("/student/profile/resume/import", {
    body: { data, selection },
    method: "POST",
    requiresCsrf: true,
  });
}

export {
  downloadPrivateFile,
  getStudentProfile,
  importResumeSelection,
  parseResume,
  removeProfilePhoto,
  removeResume,
  updatePersonal,
  updatePreferences,
  updateSection,
  uploadProfilePhoto,
  uploadResume,
};
