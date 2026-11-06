// Small browser client for the Express API in /back-end.
const API_BASE = window.CAMPUS_OD_API || localStorage.getItem("campusOD.apiBase") || "http://localhost:5000/api";
const api = {
  async request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = sessionStorage.getItem("campusOD.token");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.error?.message || `Request failed (${response.status}).`);
      error.status = response.status;
      if (response.status === 401) window.dispatchEvent(new Event("campusod:session-expired"));
      throw error;
    }
    return response.status === 204 ? null : response.json();
  },
  async loadWorkspace(user) {
    const [eventResult, requestResult, attendanceResult] = await Promise.all([
      this.request("/events"), this.request("/requests"),
      user?.role === "event_coordinator" ? Promise.resolve({ data: { attendance: [] } }) : this.request("/requests/attendance")
    ]);
    const rawRequests = requestResult.data.requests || [];
    const recorded = attendanceResult.data.attendance || [];
    const records = new Map(recorded.map(row => [String(row.requestId), row]));
    return {
      events: (eventResult.data.events || []).map(apiEvent),
      requests: rawRequests.map(row => apiRequest(row, records.get(String(row._id)))),
    };
  },
  async download(path, name) {
    const token = sessionStorage.getItem("campusOD.token");
    const response = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) { const body = await response.json().catch(() => ({})); const error = new Error(body.error?.message || "Could not open this file."); error.status = response.status; if (response.status === 401) window.dispatchEvent(new Event("campusod:session-expired")); throw error; }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a"); link.href = url; link.download = name || "evidence"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

const apiRoleToUi = {
  student: "Student", event_coordinator: "Event Coordinator", class_incharge: "Class In-charge",
  department_coordinator: "Department Coordinator", director: "Director", deo: "DEO", admin: "Admin"
};
function prettyDate(value, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", opts).format(new Date(value));
}
function apiEvent(row) {
  return {
    id: String(row._id), name: row.name, host: row.hostCollege,
    dates: `${prettyDate(row.startAt)}${new Date(row.startAt).toDateString() === new Date(row.endAt).toDateString() ? "" : ` – ${prettyDate(row.endAt)}`}`,
    start: String(row.startAt).slice(0, 10), end: String(row.endAt).slice(0, 10), venue: row.venue,
    registration: row.registrationDetails, registrationUrl: row.registrationUrl || "",
    eligibility: row.eligibleDepartments?.length ? row.eligibleDepartments.join(", ") : "All departments",
    eligibleDepartments: row.eligibleDepartments || [], category: row.category || "Academic",
    registered: row.registrationCount ?? row.registrations?.length ?? 0, status: row.status
  };
}
function apiRequest(row, attendance) {
  const sessions = row.missedSessions || [];
  const sessionText = sessions.map(s => `${prettyDate(s.date)}${s.period ? ` · Period ${s.period}` : ""}${s.courseCode ? ` · ${s.courseCode}` : ""}`).join("; ") || "No sessions listed";
  const fileOf = kind => (row.files || []).filter(f => f.kind === kind).at(-1);
  const proof = fileOf("registration_proof"), certificate = fileOf("certificate");
  const timeline = (row.history || []).map(h => {
    const decision = (row.decisions || []).find(d => String(d.reviewer?._id || d.reviewer) === String(h.actor?._id || h.actor) && d.action === h.action);
    const stage = { class_incharge: "Class In-charge", department_coordinator: "Department Coordinator", director: "Director" }[decision?.stage];
    const actionText = h.action === "approved" ? "Approved" : h.action === "rejected" ? "Rejected" : h.action === "returned_for_correction" ? "Returned" : h.action.replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
    const title = stage ? `${actionText} · ${stage}` : h.action === "uploaded_certificate" ? "Certificate uploaded" : h.action === "attendance_recorded" ? "Attendance recorded · DEO" : actionText;
    return [title, `${h.message || ""}${h.at ? ` · ${prettyDate(h.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}`.trim()];
  });
  const statuses = {
    awaiting_certificate: "Awaiting Certificate", pending_class_incharge: "Pending Class In-charge",
    pending_department_coordinator: "Pending Department Coordinator", pending_director: "Pending Director",
    returned_for_correction: "Returned for Correction", rejected: "Rejected", pending_deo: "Pending DEO", attendance_recorded: "Attendance Recorded"
  };
  return {
    id: String(row._id), backendId: String(row._id), type: row.type === "inter_college" ? "Inter-college" : "Outside-college",
    student: row.student?.name || "Student", roll: row.student?.studentId || "—", department: row.department,
    year: row.classSection || "", event: row.eventName, eventId: row.event ? String(row.event) : "",
    organizer: row.organizer || "—", dates: `${prettyDate(row.startAt)}${new Date(row.startAt).toDateString() === new Date(row.endAt).toDateString() ? "" : ` – ${prettyDate(row.endAt)}`}`,
    venue: row.venue, sessions: sessionText, sessionItems: sessions.map(s => ({ id: String(s._id), label: `${prettyDate(s.date)}${s.period ? ` · Period ${s.period}` : ""}${s.courseCode ? ` · ${s.courseCode}` : ""}` })),
    proof: proof?.originalName || "", certificate: certificate?.originalName || "", proofId: proof?._id, certificateId: certificate?._id,
    files: row.files || [], status: statuses[row.status] || row.status, rawStatus: row.status,
    history: timeline, reason: row.correctionInstructions || row.rejectedReason || "",
    correctionStage: row.correctionStage === "class_incharge" ? 0 : row.correctionStage === "department_coordinator" ? 1 : undefined,
    attendance: attendance ? "Recorded" : "", attendanceEntry: attendance,
    startAt: row.startAt, endAt: row.endAt, isOnline: row.isOnline,
    rawSessions: sessions, decisions: row.decisions || []
  };
}
