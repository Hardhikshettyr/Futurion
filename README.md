# Futurion

Futurion is a personalized career and education intelligence platform with
independent React/Vite and Express/MongoDB applications.

## Prerequisites

- Node.js 20.19+ (or 22.12+)
- npm
- MongoDB connection string
- Brevo SMTP credentials and a verified sender for account email

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:5173` by default.

Optional frontend configuration:

```bash
cp .env.example .env
```

`VITE_API_URL` defaults to `http://localhost:5000/api`.

## Backend

Create a local environment file before development:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend is available at `http://localhost:5000` by default. Verify it with:

```bash
curl http://localhost:5000/api/health
```

Set `MONGODB_URI` in `backend/.env` before starting the backend. The server
connects to MongoDB before it begins accepting HTTP requests and exits with a
clear configuration error when the URI is missing.

## Backend configuration

Configure these values in `backend/.env`:

```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb-connection-string
CLIENT_URL=http://localhost:5173

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=your-brevo-smtp-login
SMTP_PASS=your-brevo-smtp-key
EMAIL_FROM=Futurion <your-verified-sender@example.com>

OTP_HASH_SECRET=a-random-secret-with-at-least-32-characters
PASSWORD_RESET_OTP_SECRET=a-different-random-secret-with-at-least-32-characters
JWT_ACCESS_SECRET=another-random-secret-with-at-least-32-characters
JWT_REFRESH_SECRET=another-different-random-secret-with-at-least-32-characters
CSRF_SECRET=another-different-random-secret-with-at-least-32-characters

GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=a-model-supported-by-your-key
GEMINI_TIMEOUT_MS=60000
LOCAL_STORAGE_PATH=/absolute/path/to/private-futurion-storage
```

Generate every secret independently; for example, run `openssl rand -hex 32`
once per value. Never reuse database, SMTP, OTP, JWT, or CSRF credentials. The
server refuses to start if an authentication secret is missing or shorter than
32 characters. See `backend/.env.example` for expiry and cookie options.

### Cookie and deployment settings

Authentication uses short-lived access JWTs and rotating refresh JWTs in
`HttpOnly` cookies. The browser never stores or receives these tokens through
JavaScript. A separate signed, session-bound CSRF token is submitted through
the `X-CSRF-Token` header on state-changing authenticated requests.

- Local same-site development: leave `COOKIE_SAME_SITE=lax` and use HTTP.
- Production: use HTTPS and `NODE_ENV=production`; cookies automatically gain
  the `Secure` attribute.
- Cross-site frontend/API deployment: set `COOKIE_SAME_SITE=none` only in
  production, configure the exact HTTPS frontend origin in `CLIENT_URL`, and
  confirm that the deployment supports credentialed CORS and third-party
  cookies. Multiple trusted origins may be comma-separated.
- Set `COOKIE_DOMAIN` only when deliberate subdomain sharing is required. A
  blank value creates safer host-only cookies.

Changing a password revokes other sessions and rotates the current session.
Resetting a forgotten password revokes every session. Refresh tokens are
stored in MongoDB only as HMAC hashes, rotate after use, and revoke the session
when reuse is detected outside the narrow concurrent-request window.

## Authentication API

All paths below are relative to `/api/auth`. Responses use a consistent
`success` flag and safe user/session data; password hashes and JWTs are never
returned.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/register` | Create a student account |
| POST | `/verify-email` | Verify the registration OTP |
| POST | `/resend-verification` | Issue a replacement verification OTP |
| POST | `/login` | Start a cookie-backed session |
| GET | `/csrf` | Bootstrap the signed CSRF token for an active session |
| POST | `/refresh` | Rotate the refresh token and renew access |
| POST | `/logout` | Revoke the current session |
| GET | `/me` | Return the authenticated user |
| POST | `/forgot-password` | Send a reset OTP with an enumeration-safe response |
| POST | `/reset-password` | Consume the OTP, update the password, revoke sessions |
| PATCH | `/change-password` | Change the password while authenticated |
| GET | `/sessions` | List active devices for the current user |
| DELETE | `/sessions/:sessionId` | Revoke one session owned by the current user |
| POST | `/logout-all` | Revoke every session for the current user |

The login, registration, verification, recovery, and sensitive-action routes
are rate limited. Unsafe requests also enforce the configured trusted `Origin`.
`src/middleware/authorize.js` provides role-based middleware. Skill-library
administration is restricted to the existing `admin` role.

## Frontend authentication flow

The browser routes are `/register`, `/verify-email`, `/login`,
`/forgot-password`, `/reset-password`, `/dashboard`, and
`/settings/security`. The dashboard and security settings are protected and
restore an existing session on page load. The centralized API client sends
credentials, performs a single coordinated refresh after an access-token 401,
retries the request once, and prevents refresh loops.

Only the email address needed to continue verification/reset is placed in
`sessionStorage`; passwords, OTPs, CSRF tokens, and JWTs are not persisted in
browser storage.

## Unified student profile

Authenticated students can open `/profile` for the profile overview and
`/profile/edit` for the sectioned editor. The `StudentProfile` collection is
kept separate from authentication identity and has a unique `userId` reference
to `User`. First access creates the profile through an atomic upsert, with the
unique database index preventing concurrent duplicates.

Profile updates use controlled fields rather than mass assignment. Repeated
sections use full-array replacement; the frontend always sends the complete
current section when saving, so other profile sections are left untouched.

Profile API paths are relative to `/api/student`:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/profile` | Initialize and return the owned profile |
| PATCH | `/profile/personal` | Update personal information and synchronize `User.name` |
| PUT | `/profile/education` | Replace education records |
| PUT | `/profile/skills` | Replace skill records |
| PUT | `/profile/projects` | Replace project records |
| PUT | `/profile/experience` | Replace experience records |
| PUT | `/profile/certifications` | Replace certification records |
| PATCH | `/profile/preferences` | Update career preferences |
| GET/POST/DELETE | `/profile/photo` | Privately read, replace, or remove the profile photo |
| GET/POST/DELETE | `/profile/resume` | Privately download, replace, or remove the resume |
| POST | `/profile/resume/parse` | Produce a review-only Gemini extraction |
| POST | `/profile/resume/import` | Save only explicitly selected reviewed information |

Every route requires an authenticated, verified, active student session.
Mutation routes also require the signed CSRF token and a trusted request
origin. User IDs and roles are always derived from the authenticated session.

### Profile completeness

Completeness is calculated by the backend and is deliberately not a career
readiness score. Empty values, common placeholders, and meaningless duplicate
records are ignored.

| Section | Weight |
| --- | ---: |
| Personal information | 20% |
| Education | 15% |
| Skills | 15% |
| Projects | 15% |
| Experience | 10% |
| Certifications | 5% |
| Career preferences | 10% |
| Resume | 10% |

The response includes the overall percentage, section percentages, missing
fields, and actionable suggestions. It is recalculated for every returned
profile after an update.

### Private file storage

The default development adapter stores files beneath
`backend/storage/private`, which is ignored by Git and never mounted as a
public Express directory. Set `LOCAL_STORAGE_PATH` to an absolute private
directory to use a persistent volume. Production deployments with ephemeral
filesystems should replace the small `storageService` adapter with a private
object-storage implementation while preserving its save/read/delete contract.

- Photos: JPG, PNG, or WebP, maximum 3 MB.
- Resumes: PDF, DOC, or DOCX, maximum 8 MB.
- MIME type, extension, and file signature must agree.
- Stored paths and names are generated by the server.
- Resume downloads and photo reads enforce profile ownership.
- Replacements remove the previous private object after the database update.

### Gemini resume intelligence

Futurion uses the official `@google/genai` SDK only from the backend. Both
`GEMINI_API_KEY` and `GEMINI_MODEL` must be configured for parsing to become
available. There is intentionally no hardcoded model fallback: select a model
currently supported by the configured Google AI Studio key. The timeout is
controlled by `GEMINI_TIMEOUT_MS`.

AI document understanding currently accepts an uploaded PDF. DOC and DOCX
files remain fully supported for private upload/download, but must be replaced
with a PDF before AI parsing. Profile editing and all file management continue
to work when Gemini is missing or unavailable.

The parser sends the PDF inline because Futurion's 8 MB limit is suitable for
temporary single-request processing. It requests JSON-schema structured
output, then independently validates the response with Zod. Uploaded document
text is explicitly treated as untrusted data; it receives no tools, secrets,
environment values, authentication context, or authority to change the task.

Parsing never updates the profile. The browser first presents an editable
multi-section review with selections and conflict indicators. Only
`/profile/resume/import` can persist selected reviewed information. Imported AI
skills are always `self_declared`, never `verified`, and existing repeated
records are preserved rather than silently overwritten.

## Skill intelligence and competency mapping

Authenticated students can open `/dashboard/skills` to browse the canonical
library, track proficiency and learning status, connect owned profile evidence,
inspect curated dependencies, compare competency requirements, and review
deterministic recommendations. Platform admins use `/admin/skills` to manage
library entries, status, aliases, categories, prerequisites, and related skills.

`Skill` is the source of truth for skill identity and curated relationships.
`StudentSkill` is the source of truth for a student's progress and evidence,
with a unique `(userId, skillId)` index preventing duplicates. A derived
embedded projection is maintained in `StudentProfile.skills` so Module 1 and
its completeness calculation remain compatible.

### Library seed and legacy migration

Seed the 47-entry multi-discipline starter library safely:

```bash
cd backend
npm run skills:seed
```

The seed is idempotent, validates the complete graph before connecting, and
authoritatively corrects the relationships for curated seed entries. It
supports essential or recommended prerequisites, minimum prerequisite
proficiency, and target-level applicability. It does not read or overwrite
student skill data. Preview and apply the legacy
profile migration separately:

```bash
npm run skills:migrate:dry
npm run skills:migrate
```

Migration matches normalized names and aliases, inserts only missing
`StudentSkill` records, preserves proficiency/descriptions/evidence status,
and leaves unmatched embedded records untouched. It never promotes a skill to
verified and can be rerun safely.

### Skill APIs

| Audience | Method and path | Purpose |
| --- | --- | --- |
| Student/Admin | `GET /api/skills` | Search/filter/paginate the library |
| Student/Admin | `GET /api/skills/:skillId` | Skill and relationship details |
| Student/Admin | `GET /api/skills/:skillId/dependencies` | Dependency tree and dependent skills |
| Student/Admin | `GET /api/skills/:skillId/related` | Related skills |
| Student | `GET/POST /api/student/skills` | List or add owned tracked skills |
| Student | `PATCH/DELETE /api/student/skills/:studentSkillId` | Update or remove an owned record |
| Student | `POST /api/student/skills/:studentSkillId/evidence` | Add owned evidence |
| Student | `DELETE /api/student/skills/:studentSkillId/evidence/:evidenceId` | Remove owned evidence |
| Student | `GET /api/student/skills/recommendations` | Deterministic curated recommendations |
| Student | `POST /api/student/skills/competency-analysis` | Compare selected requirements |
| Admin | `POST /api/admin/skills` | Create a canonical skill |
| Admin | `PATCH /api/admin/skills/:skillId` | Edit controlled library fields |
| Admin | `PATCH /api/admin/skills/:skillId/status` | Activate/deactivate a skill |
| Admin | `POST/DELETE /api/admin/skills/:skillId/relationships` | Manage curated relationships |

### AI Skill Intelligence

AI features are optional and use the same backend-only Gemini client and
`GEMINI_MODEL` configuration as resume parsing. They remain unavailable when
Gemini is not configured without affecting the library, student skills,
dependencies, competency analysis, or deterministic recommendations.

The Skill Intelligence workspace provides an explicitly refreshed, cached
profile analysis; persisted draft/saved learning strategies; an ownership-
scoped Skill Gap Coach with a 20-message conversation limit; and structured
skill assessments with history. Objective assessment questions are graded
deterministically. Subjective questions use their generated point rubric and
a separately validated AI evaluation. Results never update `StudentSkill`,
evidence status, or proficiency.

| Audience | Method and path | Purpose |
| --- | --- | --- |
| Student | `GET /api/student/skills/ai/status` | Check optional AI availability |
| Student | `GET/POST /api/student/skills/ai/analysis` | Read or explicitly regenerate cached analysis |
| Student | `GET /api/student/skills/ai/learning-strategies` | List owned strategies |
| Student | `POST /api/student/skills/ai/learning-strategies/generate` | Generate a persisted draft |
| Student | `GET/PATCH /api/student/skills/ai/learning-strategies/:strategyId` | Review or save an owned strategy |
| Student | `GET /api/student/skills/ai/coach/conversations` | List owned coach conversations |
| Student | `GET /api/student/skills/ai/coach/conversations/:conversationId` | Read an owned conversation |
| Student | `POST /api/student/skills/ai/coach` | Ask a grounded, rate-limited question |
| Student | `GET /api/student/skills/ai/assessments` | List assessment history |
| Student | `POST /api/student/skills/ai/assessments/generate` | Generate a structured assessment |
| Student | `GET /api/student/skills/ai/assessments/:assessmentId` | Read an owned assessment |
| Student | `POST /api/student/skills/ai/assessments/:assessmentId/submit` | Evaluate and store separate results |

Gemini responses are requested as structured JSON and validated with Zod
before storage or display. Prompts treat profile descriptions, uploaded-
document-derived text, questions, and answers as untrusted data. The AI cannot
write Skill Library entries, add student skills, invent evidence, promote
proficiency, mark verification, or create Career Roadmap records. Because no
learning-resource catalogue exists yet, strategies deliberately return no
provider names or links instead of inventing resources.

All mutations require CSRF protection and trusted-origin checks. Identity is
derived from the authenticated session. Students cannot set `verified`, and an
external link is never treated as verified evidence. Project, certification,
experience, research, and coursework references are checked against the
student's own `StudentProfile` subdocuments.

### Competency and recommendation methodology

Proficiency uses the explicitly labeled planning scale Beginner=1,
Intermediate=2, Advanced=3, Expert=4. For every selected requirement, current
proficiency is capped at the required value and divided by that required
value. `proficiencyCoverage` is the average of these ratios. Evidence and
prerequisite gaps are reported separately; the result is not an assessment,
hiring probability, or employment prediction.

Recommendations come only from curated prerequisites/relationships, current
proficiency and learning status, evidence state, owned projects and
certifications, declared profile interests, and academic context. Each item
includes its factual basis and a next action. They are deduplicated and
prioritized deterministically. Accepting an untracked recommendation adds a
beginner learning record; it does not demonstrate or verify it.

## Career discovery and exploration

Students use `/dashboard/careers` to search, filter, sort and paginate the
central Career Library; review deterministic profile recommendations; revisit
saved and recently viewed careers; and optionally ask the grounded Gemini
Career Explorer. `/dashboard/careers/:careerId` separates overview, education,
skills and progression details while showing a profile comparison that is
explicitly not an eligibility or hiring prediction. Admins manage the library
at `/admin/careers`.

`Career` stores canonical multi-discipline records and references the central
`Skill` collection. `StudentCareer` stores only user-owned bookmarks, recent
views and up to four comparison selections. Populate the starter catalogue
after the Skill Library exists:

```bash
cd backend
npm run skills:seed
npm run careers:seed
```

The career seed contains 20 detailed records across technical and
non-technical categories. It validates every Skill and related-career
reference before writing and is safe to rerun.

### Career APIs

| Audience | Method and path | Purpose |
| --- | --- | --- |
| Student/Admin | `GET /api/careers` | Search/filter/sort/paginate active careers |
| Student/Admin | `GET /api/careers/categories` | Category counts and industries |
| Student/Admin | `GET /api/careers/:careerId` | Structured detail and student fit when applicable |
| Student/Admin | `GET /api/careers/:careerId/related` | Curated related careers |
| Student | `GET /api/student/careers/recommendations` | Transparent weighted recommendations |
| Student | `GET /api/student/careers/saved` | Owned saved-career list |
| Student | `POST/DELETE /api/student/careers/:careerId/save` | Save or unsave a career |
| Student | `GET /api/student/careers/recently-viewed` | Owned viewing history |
| Student | `POST /api/student/careers/:careerId/view` | Record an owned view |
| Student | `PATCH /api/student/careers/:careerId/comparison` | Select a saved career for later comparison |
| Student | `POST /api/student/careers/ai/explore` | Ask the grounded Career Explorer |
| Student | `POST /api/student/careers/ai/analyze/:careerId` | Explain one verified career record |
| Admin | `GET/POST /api/admin/careers` | List all states or create a career |
| Admin | `GET/PATCH /api/admin/careers/:careerId` | Read or edit controlled fields |
| Admin | `PATCH /api/admin/careers/:careerId/status` | Activate/deactivate a record |
| Admin | `POST/DELETE /api/admin/careers/:careerId/relationships` | Manage symmetric related-career links |

Recommendation factors are Skills 35%, Education 20%, Interests 15%,
Experience and Projects 15%, Work Preferences 10%, and Certifications 5%.
Only factors with available profile and catalogue data enter the denominator.
Every result includes factor contributions, confidence, skill gaps, education
alignment, relevant owned work, cross-discipline explanations and preparation
areas. Gemini receives only retrieved catalogue records plus the authenticated
student's scoped context, returns Zod-validated JSON, and cannot write records.
Ordinary discovery and deterministic recommendations continue without Gemini.

## Career comparison and scenario simulation

Students use `/dashboard/career-comparison` to compare two to four active
careers using the same transparent recommendation factors described above.
They can save named workspaces, reopen or update them, remove individual
careers, request grounded AI insights, and print the comparison to PDF. Saved
workspaces are available at `/dashboard/career-comparison?view=saved`.

`/dashboard/career-simulator` provides an isolated what-if workspace. A
student may start from the current profile or a custom hypothetical baseline,
then vary target career, skills, qualifications, weekly learning capacity,
learning preference, target date and constraints. Actual profile data and
hypothetical inputs are always labelled and shown separately. Simulation does
not update a profile, verify evidence, predict eligibility, promise employment,
or calculate a completion time. Saved scenarios can be reopened, duplicated,
archived, compared in groups of two to four, or removed. Their saved view is
`/dashboard/career-simulator?view=saved`.

`CareerComparison` and `CareerScenario` are user-owned MongoDB records. Career
and Skill references must resolve to active central-library records. Comparison
and scenario analysis is deterministic and continues to work when Gemini is
unavailable; optional AI requests receive only the authenticated student's
scoped context and the retrieved catalogue records, and their structured JSON
responses are validated before being returned.

### Decision-workspace APIs

| Method and path | Purpose |
| --- | --- |
| `GET/POST /api/student/career-comparisons` | List or create owned comparisons |
| `GET/PATCH/DELETE /api/student/career-comparisons/:comparisonId` | Analyze, update or remove one owned comparison |
| `POST /api/student/career-comparisons/analyze` | Analyze an unsaved set of two to four careers |
| `POST /api/student/career-comparisons/ai-insights` | Generate grounded comparison insights |
| `GET/POST /api/student/career-scenarios` | List or create owned scenarios |
| `GET/PATCH/DELETE /api/student/career-scenarios/:scenarioId` | Read, update or remove one owned scenario |
| `POST /api/student/career-scenarios/analyze` | Preview an unsaved scenario without changing profile data |
| `POST /api/student/career-scenarios/:scenarioId/analyze` | Analyze one saved scenario |
| `POST /api/student/career-scenarios/:scenarioId/duplicate` | Duplicate an owned scenario |
| `POST /api/student/career-scenarios/compare` | Compare two to four owned scenarios |
| `POST /api/student/career-scenarios/ai-insights` | Generate grounded scenario insights |

All endpoints require an authenticated student; writes are CSRF-protected,
and every saved-record query is scoped by the authenticated user ID. No data
migration or new environment variable is required for Module 4. Existing
Gemini configuration remains optional.

## Education and learning resource intelligence

Students use `/dashboard/learning` to search and filter active database-backed
learning resources, inspect deterministic recommendations, bookmark useful
records, add them to My Learning, update status, and review real learning
activity. Resource details are available at
`/dashboard/learning/:resourceId`. Query views such as `?view=recommended`,
`?view=library`, `?view=progress`, and `?view=assistant` open the corresponding
workspace directly. Platform admins manage resources, Skill mappings,
categories, prices, URLs and activation state at `/admin/learning`.

`LearningResource` stores the central catalogue and references existing
`Skill` and `LearningResourceCategory` records. `StudentLearningResource`
stores bookmarks, learning-list membership and status separately for each
student. Marking a resource complete never updates skill proficiency or
evidence. Progress displays saved, in-progress and completed record counts;
it does not invent completion percentages.

Seed the small curated catalogue after the Skill Library exists. The operation
is idempotent and validates every HTTPS URL, Skill reference and category:

```bash
cd backend
npm run skills:seed
npm run learning:seed
```

### Learning APIs

| Audience | Method and path | Purpose |
| --- | --- | --- |
| Student/Admin | `GET /api/learning/resources` | Search, filter, sort and paginate active resources |
| Student/Admin | `GET /api/learning/resources/:resourceId` | Read one structured resource record |
| Student/Admin | `GET /api/learning/filters` | Read active providers and managed categories |
| Student | `GET /api/student/learning/recommendations` | Get prerequisite-first, goal-linked recommendations |
| Student | `GET/POST /api/student/learning/library` | List or save owned learning records |
| Student | `PATCH/DELETE /api/student/learning/library/:itemId` | Update status/bookmarks or remove an owned item |
| Student | `GET /api/student/learning/progress` | Read actual status and skill activity counts |
| Student | `POST /api/student/learning/ai-assistant` | Ask the grounded learning assistant |
| Admin | `GET/POST /api/admin/learning/resources` | List all states or create a resource |
| Admin | `GET/PATCH /api/admin/learning/resources/:resourceId` | Read or update a resource |
| Admin | `GET/POST /api/admin/learning/categories` | List or create managed categories |
| Admin | `PATCH /api/admin/learning/categories/:categoryId` | Edit or activate/deactivate a category |

Recommendations are derived only from recorded Skill learning goals, missing
Career requirements, Skill prerequisites, profile interests, saved careers and
saved comparisons. Completed resources are excluded. Gemini receives only
retrieved catalogue records and scoped student context; returned resource IDs
are schema-validated and checked against the supplied database records.
Deterministic discovery, recommendations, tracking and progress work without
Gemini. Module 5 adds no environment variables or runtime dependencies.

## Personalized career roadmaps

Students use `/dashboard/roadmaps` to create and manage multiple preparation
plans for active Career Library records. `/dashboard/roadmaps/:roadmapId`
provides the staged timeline, task statuses, linked Module 5 resources,
backend-calculated progress, editable learning capacity and target date,
reviewable refresh workflow, preserved history, and optional grounded Gemini
explanations.

`CareerRoadmap` is an owned record with embedded stages and tasks. Generation
is deterministic: it compares central Career requirements and recursive Skill
prerequisites with the student's current proficiency and evidence, then checks
profile projects and certifications. A skill is skipped only when its target
proficiency is met and its evidence is demonstrated or verified. Existing
proficiency without demonstrated evidence creates an evidence task. Relevant
active Learning Resource records are linked by central Skill reference.

Progress is based only on active roadmap task statuses. Remaining time is the
sum of incomplete task estimates divided by weekly learning hours and is
explicitly a planning estimate, not a completion guarantee. A refresh first
stores and returns additions, removals, and changes for review. Confirmation
preserves completed task content, retires removed work as history, and avoids
duplicate active task keys.

### Roadmap APIs

| Method and path | Purpose |
| --- | --- |
| `GET/POST /api/student/roadmaps` | List or create owned roadmaps |
| `GET/PATCH/DELETE /api/student/roadmaps/:roadmapId` | Read, edit, archive/pause, or delete one owned roadmap |
| `PATCH /api/student/roadmaps/:roadmapId/tasks/:taskId` | Update one active task status after its prerequisites |
| `POST /api/student/roadmaps/:roadmapId/refresh` | Generate and persist a reviewable refresh proposal |
| `POST /api/student/roadmaps/:roadmapId/refresh/confirm` | Confirm the server-side proposal while preserving history |
| `GET /api/student/roadmaps/:roadmapId/ai-status` | Check optional Gemini availability |
| `POST /api/student/roadmaps/:roadmapId/ai-assistant` | Ask for a grounded, read-only roadmap explanation |

Every endpoint requires an authenticated student, every database operation is
scoped by the authenticated user ID, and writes are CSRF-protected. Core
generation, management, refresh, and progress do not require Gemini. The AI
assistant receives only the scoped profile and selected roadmap records; Zod
validation and post-generation ID checks reject task or resource references
outside that roadmap. Module 6 adds no dependency, seed command, migration, or
environment variable.

## Opportunity and eligibility intelligence

Students use `/dashboard/opportunities` to search, filter, sort and paginate
the active Opportunity Library; review deterministic personalized
recommendations; and maintain their own application tracker. Details at
`/dashboard/opportunities/:opportunityId` include the verified official source,
structured requirements, an explainable eligibility comparison, and the
optional grounded opportunity assistant. Platform admins manage catalogue
records and requirements at `/admin/opportunities`.

`Opportunity` references the existing central Career and Skill libraries.
`StudentApplication` stores one ownership-scoped saved/tracker record for each
student and opportunity. Futurion never submits an application: dates, notes
and statuses are explicit student-maintained records.

Seed the curated official-source catalogue after the Skill and Career
libraries exist:

```bash
cd backend
npm run skills:seed
npm run careers:seed
npm run opportunities:seed
```

The opportunity seed is idempotent, validates all Career and Skill references,
rejects duplicate records and URLs, normalizes HTTPS source links, and marks
only its reviewed sources as verified. Deadlines and external conditions can
change; admins should periodically check the official source before retaining
the verified flag.

### Opportunity APIs

| Audience | Method and path | Purpose |
| --- | --- | --- |
| Student/Admin | `GET /api/opportunities` | Search/filter/sort/paginate active opportunities |
| Student/Admin | `GET /api/opportunities/filters` | Read active locations and type counts |
| Student/Admin | `GET /api/opportunities/:opportunityId` | Read structured detail and owned saved state |
| Student | `GET /api/student/opportunities/recommendations` | Get deterministic, explained recommendations |
| Student | `GET /api/student/opportunities/:opportunityId/eligibility` | Compare actual profile evidence with requirements |
| Student | `GET /api/student/opportunities/ai-status` | Check optional Gemini availability |
| Student | `POST /api/student/opportunities/:opportunityId/ai-assistant` | Ask the grounded, read-only assistant |
| Student | `GET/POST /api/student/applications` | List or save/track owned opportunities |
| Student | `PATCH/DELETE /api/student/applications/:applicationId` | Update or remove an owned tracker record |
| Admin | `GET/POST /api/admin/opportunities` | List all states or create an opportunity |
| Admin | `GET/PATCH/DELETE /api/admin/opportunities/:opportunityId` | Read, edit or remove a managed record |
| Admin | `PATCH /api/admin/opportunities/:opportunityId/status` | Activate or deactivate an opportunity |

Eligibility is deterministic. Each mandatory or preferred condition is
reported as met, partially met, not met, or unknown. Missing profile data is
unknown—not a mismatch—and preferred conditions do not make a student
ineligible. Other conditions without an authoritative profile field remain
unknown. The result is preparation guidance, not official eligibility or a
selection guarantee.

Recommendations combine mandatory-requirement coverage with recorded Skill
proficiency/evidence, education and experience through eligibility analysis,
plus saved Careers and profile interests. Inactive and expired opportunities
are excluded. Gemini cannot calculate or override the eligibility result; it
receives only retrieved opportunity, profile, roadmap and learning-resource
records, and Zod plus post-generation ID checks reject fabricated references.
Core discovery, eligibility, recommendations and tracking work without Gemini.
Module 7 adds no environment variable or runtime dependency.

## Student progress and career portfolio

Students use `/dashboard/progress` for a consolidated view of actual Futurion
records: developed and evidence-supported Skills, Profile projects and
certifications, completed Learning Resources, task-based Roadmap completion,
tracked Opportunities, recent activity, and derived milestones. The dashboard
does not create another career-readiness score. Its timeline is assembled from
source record IDs and timestamps, so the same source event is emitted once
without a duplicate activity collection.

Achievements are also derived rather than randomly awarded or copied into a
second collection. Current milestones cover the first documented project,
certification, completed Roadmap stage, completed Learning Resource,
evidence-supported Skill, and tracked Opportunity. Removing the underlying
record removes the derived milestone.

Students configure portfolio privacy at `/dashboard/portfolio`. The only new
persistent record is `PortfolioSettings`, which stores ownership, a unique
public slug, the public-access flag, selected sections, and selected derived
achievement keys. It does not duplicate profile content. Public portfolios are
available at `/portfolio/:publicSlug` only while explicitly enabled.

Public access starts disabled and responses use `Cache-Control: no-store` so a
disabled portfolio becomes unavailable immediately. The backend projection
includes only explicitly enabled sections and never includes email, phone,
private files, private Skill notes, application history, application notes,
eligibility results, sessions, authentication data, or unselected milestones.
The authenticated PDF export uses the same projection and therefore follows
the same section allowlist.

### Progress and portfolio APIs

| Audience | Method and path | Purpose |
| --- | --- | --- |
| Student | `GET /api/student/progress/overview` | Read consolidated factual metrics and growth insights |
| Student | `GET /api/student/progress/timeline` | Read deduplicated chronological source events |
| Student | `GET /api/student/progress/achievements` | Read milestones derived from current records |
| Student | `GET /api/student/progress/ai-status` | Check optional Gemini availability |
| Student | `POST /api/student/progress/ai-assistant` | Ask the grounded, read-only progress assistant |
| Student | `GET/PATCH /api/student/portfolio` | Preview and select visible sections/achievements |
| Student | `POST /api/student/portfolio/public` | Choose a unique slug and enable public access |
| Student | `PATCH /api/student/portfolio/public-settings` | Change the slug or immediately disable/enable access |
| Student | `GET /api/student/portfolio/pdf` | Download selected sections as a professional PDF |
| Public | `GET /api/public/portfolio/:publicSlug` | Read the backend-filtered public projection |

The optional AI Progress Assistant receives only scoped Profile, Skill,
Learning, Roadmap, Career, Opportunity and derived-achievement context. Its
strict Zod response is checked again against supplied achievement, project,
Career and record IDs. Suggestions remain drafts and never modify profile,
portfolio or progress data. All non-AI dashboard and portfolio functionality
continues when Gemini is unavailable.

Module 8 adds `pdfkit` for local server-side PDF generation. It introduces no
environment variable, seed command or data migration. Existing students receive
no public portfolio record until they save settings or explicitly publish.

## Email configuration and diagnostics

Verify the SMTP connection and authentication without sending a message:

```bash
cd backend
npm run email:verify
```

Send a development-only test email to an address you control:

```bash
npm run email:test -- recipient@example.com
```

Nodemailer's connection verification does not prove that Brevo accepts the
configured sender or that an inbox receives the message. Use the test-email
command after verifying the sender in Brevo.

Verification codes expire after five minutes. Password-reset codes expire
after ten minutes. Both are attempt-limited and stored only as user-bound HMAC
digests; codes are never written to logs.

## Tests

```bash
cd backend
npm test
```

```bash
cd frontend
npm test
npm run build
```

The backend tests cover registration/verification, authentication endpoints,
CSRF and role middleware, refresh rotation/reuse, password recovery, session
revocation, profile initialization and updates, completeness, upload security,
private file access, Gemini failure/output handling, explicit import, skill
library validation, ownership, evidence, dependency cycles, level-specific
prerequisites, competency math, contextual recommendations, AI response
validation, strategy persistence, coach isolation, assessment generation and
evaluation, career modelling, catalogue filters, recommendation scoring,
cross-discipline mapping, saved/recent ownership, career AI grounding,
administration, comparison validation and ownership, deterministic comparison
signals, prerequisite and evidence gaps, hypothetical-profile isolation,
scenario comparison, decision AI grounding, rate limits, authorization, and
error paths, learning-resource validation and filtering, Skill/category
references, prerequisite-first recommendations, progress ownership, admin
authorization, learning AI grounding, roadmap modelling, deterministic skill
gap and prerequisite ordering, task status dependencies, task-based progress,
ownership, completed-history-safe refresh, roadmap API validation, and roadmap
AI grounding, opportunity modelling, search/deadline filters, deterministic
eligibility, unknown-versus-unmet handling, mandatory/preferred semantics,
recommendation signals, tracker ownership, admin authorization, and AI output
grounding, progress aggregation, timeline deduplication, achievement
derivation, portfolio defaults and slug constraints, public-access enforcement,
privacy projection, PDF output, ownership, and progress-AI grounding. Frontend tests cover registration,
login, protected account security, coordinated refresh, the profile
overview/editor, dynamic records,
uploads, AI review selection, skill search/add/update/remove, evidence,
dependencies, competency analysis, recommendations, AI analysis, learning
strategies, coach conversations, assessments, loading/error states, conflict
handling, career cards and comparison selection, decision comparison grids,
scenario actual-versus-hypothetical rendering, resource cards, owned learning
status updates, factual progress counts, confirmation, roadmap progress,
prerequisite-aware timeline interactions, and explicit refresh confirmation.
Opportunity UI tests additionally cover cards and actions, eligibility status
distinctions, and explicit student-maintained tracker updates.
Progress and portfolio UI tests cover factual metrics, source-linked activity,
and rendering only sections returned by the backend public projection.
