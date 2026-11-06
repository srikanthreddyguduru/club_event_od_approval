// Handle navigation, forms, approvals, attendance, and sign-in.
function closeMenu() {
  $("#sidebar").classList.remove("open");
}
async function refreshFromApi() {
  const loaded = await api.loadWorkspace(currentUser);
  data.events = loaded.events;
  data.requests = loaded.requests;
}
function parseMissedSessions(text) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (!lines.length) throw new Error("Add at least one missed class session.");
  return lines.map((line, index) => {
    const [date, courseCode = "", courseName = "", period = ""] = line.split("|").map(part => part.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || Number.isNaN(new Date(`${date}T00:00:00`).getTime())) {
      throw new Error(`Line ${index + 1}: use YYYY-MM-DD | course code | course name | period.`);
    }
    return { date: new Date(`${date}T00:00:00`).toISOString(), courseCode, courseName, period };
  });
}
function sessionTextFromRequest(r) {
  return (r.rawSessions || []).map(s => [String(s.date).slice(0, 10), s.courseCode || "", s.courseName || "", s.period || ""].join(" | ")).join("\n");
}
function fileForm(json, file, field = "request") {
  const form = new FormData(); form.append(field, JSON.stringify(json)); if (file) form.append("file", file); return form;
}
$("#menuBtn").onclick = () => $("#sidebar").classList.add("open");
$("#closeNav").onclick = closeMenu;
// Route navigation and buttons through delegated handlers because page content
// is rebuilt when the user changes pages or updates a request.
document.addEventListener("click", (e) => {
  let p = e.target.closest("[data-page]");
  if (p) {
    page = p.dataset.page;
    activeId = null;
    search = "";
    filter = "All";
    render();
    closeMenu();
    scrollTo(0, 0);
    return;
  }
  let o = e.target.closest("[data-open]");
  if (o) {
    activeId = o.dataset.open;
    render();
    scrollTo(0, 0);
    return;
  }
  let fileLink = e.target.closest("[data-download-file]");
  if (fileLink) {
    const [requestId, fileId] = fileLink.dataset.downloadFile.split(":");
    api.download(`/requests/${encodeURIComponent(requestId)}/files/${encodeURIComponent(fileId)}`, fileLink.dataset.filename).catch(error => toast(error.message));
    return;
  }
  let ev = e.target.closest("[data-event]");
  if (ev) {
    activeId = ev.dataset.event;
    render();
    return;
  }
  let rg = e.target.closest("[data-register]");
  if (rg) {
    registerEvent(rg.dataset.register);
    return;
  }
  let d = e.target.closest("[data-decision]");
  if (d) {
    decide(d.dataset.id, d.dataset.decision);
    return;
  }
  let a = e.target.closest("[data-record-attendance]");
  if (a) {
    record(a.dataset.recordAttendance);
    return;
  }
  let u = e.target.closest("[data-upload-cert]");
  if (u) {
    upload(u.dataset.uploadCert);
    return;
  }
  let c = e.target.closest("[data-correct]");
  if (c) {
    correct(c.dataset.correct);
    return;
  }
});
document.addEventListener("input", (e) => {
  if (!["tableSearch", "eventSearch"].includes(e.target.id)) return;
  let id = e.target.id;
  search = e.target.value;
  let pos = e.target.selectionStart;
  render();
  let x = $("#" + id);
  if (x) {
    x.focus();
    x.setSelectionRange(pos, pos);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "typeFilter" || e.target.id === "eventFilter") {
    filter = e.target.value;
    render();
  }
});
// Create events and outside-college requests from their forms.
document.addEventListener("submit", async (e) => {
  if (e.target.id === "requestForm") {
    e.preventDefault();
    let f = new FormData(e.target),
      file = f.get("proof");
    if (!file?.name) {
      toast("Attach registration proof to submit.");
      return;
    }
    if (apiMode) {
      try {
        const sessions = parseMissedSessions(f.get("sessions"));
        const body = { eventName: f.get("event"), organizer: f.get("organizer"), startAt: new Date(`${f.get("start")}T00:00:00`).toISOString(), endAt: new Date(`${f.get("end")}T23:59:59`).toISOString(), venue: f.get("venue"), isOnline: /^online/i.test(f.get("venue")), missedSessions: sessions };
        const form = fileForm(body, file);
        const result = await api.request("/requests/outside", { method: "POST", body: form });
        await refreshFromApi(); page = "My OD Requests"; activeId = result.data.request._id; render(); toast("Request sent to your Class In-charge.");
      } catch (error) { toast(error.message); }
      return;
    }
    let id = "OD-" + (26042 + data.requests.length),
      fmt = (v) =>
        new Date(v + "T12:00:00").toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
    data.requests.unshift({
      id,
      type: "Outside-college",
      student: who(),
      roll: "23CS041",
      department: "CSE",
      year: "3rd Year",
      event: f.get("event"),
      organizer: f.get("organizer"),
      dates:
        fmt(f.get("start")) +
        (f.get("start") !== f.get("end") ? " – " + fmt(f.get("end")) : ""),
      venue: f.get("venue"),
      sessions: f.get("sessions"),
      proof: file.name,
      certificate: "",
      status: "Pending Class In-charge",
      history: [
        [
          "Submitted by " + who(),
          "Registration proof attached · " + new Date().toLocaleDateString(),
        ],
      ],
      reason: "",
    });
    save();
    page = "My OD Requests";
    render();
    toast("Request submitted to the Class In-charge.");
  }
  if (e.target.id === "eventForm") {
    e.preventDefault();
    let f = new FormData(e.target),
      fmt = (v) =>
        new Date(v + "T12:00:00").toLocaleDateString("en", {
          day: "numeric",
          month: "short",
        }),
      s = f.get("start"),
      z = f.get("end");
    if (apiMode) {
      if (z < s) { toast("End date must be on or after the start date."); return; }
      try {
        const departments = f.getAll("departments");
        const classList = String(f.get("classes") || "").split(",").map(x => x.trim()).filter(Boolean);
        const result = await api.request("/events", { method: "POST", body: JSON.stringify({
          name: f.get("name"), hostCollege: f.get("host"), startAt: new Date(`${s}T00:00:00`).toISOString(), endAt: new Date(`${z}T23:59:59`).toISOString(), venue: f.get("venue"),
          registrationDetails: f.get("registration"), category: f.get("category"), eligibleDepartments: departments, eligibleClasses: classList, status: "published"
        }) });
        await refreshFromApi(); page = "My Events"; activeId = null; render(); toast("Event published for eligible students.");
      } catch (error) { toast(error.message); }
      return;
    }
    data.events.unshift({
      id: "ev" + Date.now(),
      name: f.get("name"),
      host: f.get("host"),
      dates: fmt(s) + (s !== z ? "–" + fmt(z) : ""),
      start: s,
      venue: f.get("venue"),
      registration: f.get("registration"),
      eligibility: f.get("eligibility"),
      category: f.get("category"),
      registered: 0,
    });
    save();
    page = "My Events";
    render();
    toast("Inter-college event published.");
  }
});
// Workflow actions: register, review, record attendance, and upload evidence.
async function registerEvent(id) {
  let e = data.events.find((x) => x.id === id);
  if (!e) return;
  if (apiMode) {
    try {
      const result = await api.request(`/events/${encodeURIComponent(id)}/register`, { method: "POST" });
      await refreshFromApi(); page = "My OD Requests"; activeId = result.data.request._id; render();
      toast("Registration saved. Upload the certificate after attending.");
    } catch (error) { toast(error.message); }
    return;
  }
  if (data.requests.some((r) => r.student === who() && r.event === e.name)) {
    toast("You already have a request for this event.");
    return;
  }
  e.registered++;
  let r = {
    id: "OD-" + (26042 + data.requests.length),
    type: "Inter-college",
    student: who(),
    roll: "23CS041",
    department: "CSE",
    year: "3rd Year",
    event: e.name,
    organizer: e.host,
    dates: e.dates,
    venue: e.venue,
    sessions: "To be confirmed based on event schedule",
    proof: "",
    certificate: "",
    status: "Awaiting Certificate",
    history: [
      [
        "Registered by " + who(),
        "Event registration · " + new Date().toLocaleDateString(),
      ],
    ],
    reason: "",
  };
  data.requests.unshift(r);
  save();
  page = "My OD Requests";
  activeId = r.id;
  render();
  toast("Registration saved. Upload the certificate after attending.");
}
function modal(title, body, label, cb, danger = false) {
  $("#modalRoot").innerHTML =
    `<div class="modal-backdrop"><div class="modal"><div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn modal-close" data-dismiss>×</button></div><div class="modal-body">${body}<div class="form-actions"><button class="btn secondary" data-dismiss>Cancel</button><button id="modalSubmit" class="btn ${
      danger ? "danger" : ""
    }">${label}</button></div></div></div></div>`;
  $("#modalRoot").onclick = (e) => {
    if (e.target.hasAttribute("data-dismiss")) $("#modalRoot").innerHTML = "";
  };
  $("#modalSubmit").onclick = cb;
}
function decide(id, action) {
  let r = data.requests.find((x) => x.id === id);
  if (action === "approve") {
    modal(
      "Approve OD request",
      '<p class="subhead">Confirm approval at your review step.</p><div class="form-field" style="margin-top:12px"><label>Comment (optional)</label><textarea id="reasonInput"></textarea></div>',
      "Approve",
      () => finish(r, action, $("#reasonInput").value),
    );
  } else
    modal(
      action === "reject" ? "Reject request" : "Return for correction",
      `<p class="subhead">${action === "reject" ? "The request will stop here." : "The student can update and resubmit it."}</p><div class="form-field" style="margin-top:12px"><label>${action === "reject" ? "Rejection reason" : "Correction instructions"} *</label><textarea id="reasonInput" required></textarea></div>`,
      action === "reject" ? "Reject" : "Return",
      () => {
        let v = $("#reasonInput").value.trim();
        if (!v) {
          toast("Enter a reason to continue.");
          return;
        }
        finish(r, action, v);
      },
      true,
    );
}
async function finish(r, action, note) {
  if (apiMode) {
    try {
      const decision = action === "approve" ? "approved" : action === "reject" ? "rejected" : "returned_for_correction";
      await api.request(`/requests/${encodeURIComponent(r.backendId || r.id)}/reviews`, { method: "POST", body: JSON.stringify({ action: decision, comment: note }) });
      await refreshFromApi(); activeId = null; render();
      $("#modalRoot").innerHTML = "";
      toast(action === "approve" ? "Approval recorded." : action === "reject" ? "Request rejected." : "Request returned with correction instructions.");
    } catch (error) { toast(error.message); }
    return;
  }
  let actor =
      role === "Class In-charge"
        ? "Class In-charge"
        : role === "Department Coordinator"
          ? "Department Coordinator"
          : "Director",
    stamp = new Date().toLocaleDateString();
  if (action === "reject") {
    r.status = "Rejected";
    r.reason = note;
    r.history.push(["Rejected · " + actor, note + " · " + stamp]);
  } else if (action === "return") {
    r.status = "Returned for Correction";
    r.stage =
      role === "Class In-charge"
        ? 0
        : role === "Department Coordinator"
          ? 1
          : 2;
    r.reason = note;
    r.history.push(["Returned · " + actor, note + " · " + stamp]);
  } else {
    r.history.push([
      "Approved · " + actor,
      (note || "Approved") + " · " + stamp,
    ]);
    r.reason = "";
    if (role === "Class In-charge") r.status = "Pending Department Coordinator";
    else if (role === "Department Coordinator")
      r.status =
        r.type === "Outside-college" && !r.certificate
          ? "Awaiting Certificate"
          : "Pending Director";
    else r.status = "Pending DEO";
  }
  save();
  $("#modalRoot").innerHTML = "";
  render();
  toast(
    action === "approve"
      ? "Decision recorded."
      : action === "reject"
        ? "Request rejected."
        : "Request returned for correction.",
  );
}
function record(id) {
  let r = data.requests.find((x) => x.id === id),
    value = $("#attendanceValue")?.value || "Present";
  modal(
    "Record attendance",
    `<p class="subhead">Record <strong>${esc(value)}</strong> for ${esc(r.student)} · ${esc(r.event)}. This updates the student attendance record.</p>`,
    "Confirm attendance",
    async () => {
      if (apiMode) {
        const sessionIds = [...document.querySelectorAll('input[name="sessionChoice"]:checked')].map(x => x.value);
        try {
          await api.request(`/requests/${encodeURIComponent(r.backendId || r.id)}/attendance`, { method: "POST", body: JSON.stringify({ sessionIds, note: $("#attendanceNote")?.value || "" }) });
          await refreshFromApi(); $("#modalRoot").innerHTML = ""; render(); toast("Attendance recorded for the selected sessions.");
        } catch (error) { toast(error.message); }
        return;
      }
      r.status = "Attendance Recorded";
      r.attendance = value;
      r.history.push([
        "Attendance recorded · DEO",
        value + " · " + new Date().toLocaleDateString(),
      ]);
      save();
      $("#modalRoot").innerHTML = "";
      render();
      toast("Attendance recorded.");
    },
  );
}
function upload(id) {
  let r = data.requests.find((x) => x.id === id);
  modal(
    "Upload event certificate",
    '<p class="subhead">Attach the certificate received after attending. Confirm the class periods that should receive OD attendance.</p><div class="form-field" style="margin-top:14px"><label>Certificate *</label><input type="file" id="certFile" accept=".pdf,.png,.jpg,.jpeg,.webp"></div><div class="form-field" style="margin-top:12px"><label>Missed class sessions *</label><textarea id="certSessions" rows="4" placeholder="YYYY-MM-DD | course code | course name | period"></textarea><span class="hint">One class period per line. For an outside event, the submitted sessions are prefilled.</span></div>',
    "Upload certificate",
    async () => {
      let f = $("#certFile").files[0];
      if (!f) {
        toast("Select a certificate file.");
        return;
      }
      if (apiMode) {
        try {
          const form = new FormData(); form.append("kind", "certificate"); form.append("file", f);
          const text = $("#certSessions").value.trim();
          if (text) form.append("missedSessions", JSON.stringify(parseMissedSessions(text)));
          await api.request(`/requests/${encodeURIComponent(r.backendId || r.id)}/files`, { method: "POST", body: form });
          await refreshFromApi(); $("#modalRoot").innerHTML = ""; activeId = r.id; render(); toast("Certificate added to this request.");
        } catch (error) { toast(error.message); }
        return;
      }
      r.certificate = f.name;
      r.history.push([
        "Certificate uploaded",
        f.name + " · " + new Date().toLocaleDateString(),
      ]);
      r.status =
        r.type === "Outside-college"
          ? "Pending Director"
          : "Pending Class In-charge";
      save();
      $("#modalRoot").innerHTML = "";
      activeId = r.id;
      render();
      toast("Certificate attached to this request.");
    },
  );
}
function correct(id) {
  let r = data.requests.find((x) => x.id === id);
  const correctionBody = apiMode
    ? `<p class="subhead">Update the event details the reviewer flagged. Earlier review comments will remain in the history.</p><div class="form-grid"><div class="form-field"><label>Event name</label><input id="fixEvent" value="${esc(r.event)}"></div><div class="form-field"><label>Organizer</label><input id="fixOrganizer" value="${esc(r.organizer)}"></div><div class="form-field"><label>Start date</label><input id="fixStart" type="date" value="${esc((r.startAt || "").slice(0, 10))}"></div><div class="form-field"><label>End date</label><input id="fixEnd" type="date" value="${esc((r.endAt || "").slice(0, 10))}"></div><div class="form-field full"><label>Venue or online details</label><input id="fixVenue" value="${esc(r.venue)}"></div><div class="form-field full"><label>Missed class sessions</label><textarea id="fixSessions" rows="4">${esc(sessionTextFromRequest(r))}</textarea><span class="hint">One line per session: YYYY-MM-DD | course code | course name | period</span></div><div class="form-field full"><label>What did you correct? *</label><textarea id="correctionText" required></textarea></div><div class="form-field full"><label>Replacement registration proof (optional)</label><input type="file" id="replacement" accept=".pdf,.png,.jpg,.jpeg,.webp"></div></div>`
    : '<p class="subhead">Describe the correction. You may attach updated registration proof.</p><div class="form-field" style="margin-top:12px"><label>Correction made *</label><textarea id="correctionText"></textarea></div><div class="form-field" style="margin-top:12px"><label>Replacement proof (optional)</label><input type="file" id="replacement" accept=".pdf,.png,.jpg,.jpeg"></div>';
  modal(
    "Update and resubmit",
    correctionBody,
    "Resubmit",
    async () => {
      let note = $("#correctionText").value.trim();
      if (!note) {
        toast("Describe the correction before resubmitting.");
        return;
      }
      let file = $("#replacement").files[0];
      if (apiMode) {
        try {
          const start = $("#fixStart").value; const end = $("#fixEnd").value;
          const body = { eventName: $("#fixEvent").value, organizer: $("#fixOrganizer").value, startAt: new Date(`${start}T00:00:00`).toISOString(), endAt: new Date(`${end}T23:59:59`).toISOString(), venue: $("#fixVenue").value, isOnline: /^online/i.test($("#fixVenue").value), missedSessions: parseMissedSessions($("#fixSessions").value), correctionNote: note };
          await api.request(`/requests/${encodeURIComponent(r.backendId || r.id)}`, { method: "PATCH", body: fileForm(body, file) });
          await refreshFromApi(); $("#modalRoot").innerHTML = ""; activeId = r.id; render(); toast("Request corrected and sent back to review.");
        } catch (error) { toast(error.message); }
        return;
      }
      if (file) r.proof = file.name;
      r.reason = "";
      r.status =
        r.stage === 1
          ? "Pending Department Coordinator"
          : r.stage === 2
            ? "Pending Director"
            : "Pending Class In-charge";
      r.history.push([
        "Resubmitted by " + who(),
        note + " · " + new Date().toLocaleDateString(),
      ]);
      save();
      $("#modalRoot").innerHTML = "";
      activeId = r.id;
      render();
      toast("Request resubmitted.");
    },
  );
}
// Real sign-in derives the role from the server. Demo access is kept separate
// so it can never be mistaken for an authenticated college account.
function showLogin() {
  const demoOptions = roles.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
  $("#loginScreen").innerHTML = `<div class="auth-screen"><section class="auth-intro"><div class="auth-brand"><div class="brand-mark">C</div><div><strong>Campus OD</strong><small>Event & On-Duty</small></div></div><div class="auth-copy"><div class="eyebrow">COLLEGE EVENT SERVICES</div><h1>From event request to recorded attendance.</h1><p>One place for students to submit evidence and for staff to move each OD request through its assigned review step.</p></div><div class="auth-foot">Student services · Review workflow · Attendance record</div></section><section class="auth-main"><div class="auth-inner"><div class="eyebrow">COLLEGE ACCOUNT</div><h2>Sign in</h2><p class="subhead">Your account determines which requests and actions you can access.</p><form id="loginForm" class="auth-form"><div class="auth-form-grid"><div class="form-field"><label>College email</label><input name="email" type="email" required autocomplete="username" placeholder="name@college.edu"></div><div class="form-field"><label>Password</label><input name="password" type="password" required autocomplete="current-password" placeholder="Your account password"></div></div><div class="form-actions"><span class="auth-note">Access is managed by your college administrator.</span><button class="btn" type="submit">Sign in →</button></div></form><details class="demo-access"><summary>Preview the interface with sample records</summary><p class="auth-note">Preview data stays in this browser and does not submit to the backend.</p><div class="demo-row"><select id="demoRole" class="filter">${demoOptions}</select><button class="btn secondary" type="button" data-demo-login>Open preview</button></div></details></div></section></div>`;
}

async function loadLiveWorkspace() {
  const result = await api.loadWorkspace(currentUser);
  data.events = result.events;
  data.requests = result.requests;
}

document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-demo-login]")) {
    role = $("#demoRole").value;
    apiMode = false; currentUser = null;
    sessionStorage.removeItem("campusOD.token"); sessionStorage.removeItem("campusOD.user");
    loggedIn = true; sessionStorage.setItem("campusOD.role", role); sessionStorage.setItem("campusOD.signedIn", "yes");
    page = "Dashboard"; activeId = null; render();
  }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "loginForm") return;
  e.preventDefault(); const form = new FormData(e.target);
  const submit = e.target.querySelector('button[type="submit"]'); submit.disabled = true; submit.textContent = "Signing in…";
  try {
    const result = await api.request("/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    sessionStorage.setItem("campusOD.token", result.data.token);
    currentUser = result.data.user; sessionStorage.setItem("campusOD.user", JSON.stringify(currentUser));
    role = apiRoleToUi[currentUser.role];
    if (!role) throw new Error("This account role is not supported in the web interface.");
    people[role] = [currentUser.name, [currentUser.department, currentUser.classSection].filter(Boolean).join(" · ") || "College account"];
    sessionStorage.setItem("campusOD.role", role); sessionStorage.removeItem("campusOD.signedIn");
    apiMode = true; loggedIn = true; page = "Dashboard"; activeId = null;
    render();
    try { await loadLiveWorkspace(); render(); }
    catch (error) { toast(`Signed in, but the workspace could not load: ${error.message}`); }
  } catch (error) { toast(error.message || "Could not sign in."); submit.disabled = false; submit.textContent = "Sign in →"; }
});
window.addEventListener("campusod:session-expired", () => {
  if (!apiMode) return;
  loggedIn = false; apiMode = false; currentUser = null;
  ["campusOD.token", "campusOD.user", "campusOD.role", "campusOD.signedIn"].forEach(key => sessionStorage.removeItem(key));
  page = "Dashboard"; activeId = null; render();
  toast("Your college session expired. Sign in again to continue.");
});
$("#logoutBtn").addEventListener("click", () => {
  loggedIn = false; apiMode = false; currentUser = null;
  ["campusOD.signedIn", "campusOD.role", "campusOD.token", "campusOD.user"].forEach(key => sessionStorage.removeItem(key));
  page = "Dashboard"; activeId = null; render();
});

render();
if (apiMode && loggedIn) loadLiveWorkspace().then(render).catch(error => toast(`Could not load your workspace: ${error.message}`));
