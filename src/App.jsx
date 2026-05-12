import React, { useState, useEffect, useRef } from "react";
import { Mountain, Calendar as CalendarIcon, MapPin, Clock, TrendingUp, Users, Upload, X, ChevronLeft, ChevronRight, Plus, Check, Image as ImageIcon, Settings } from "lucide-react";

export default function KitsapTrailheadCollective() {
  const [view, setView] = useState("blog"); // blog | calendar | admin
  const [hikes, setHikes] = useState([]);
  const [signups, setSignups] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedHike, setSelectedHike] = useState(null);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [showNewHike, setShowNewHike] = useState(false);
  const [editingHike, setEditingHike] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date());

  // ---------- Persistence ----------
  useEffect(() => {
    (async () => {
      try {
        const h = await window.storage.get("hikes:all", true);
        if (h) setHikes(JSON.parse(h.value));
        else {
          // Seed with a couple of example hikes so the page isn't empty on first load
          const seed = seedHikes();
          setHikes(seed);
          await window.storage.set("hikes:all", JSON.stringify(seed), true);
        }
      } catch (e) {
        const seed = seedHikes();
        setHikes(seed);
        try { await window.storage.set("hikes:all", JSON.stringify(seed), true); } catch {}
      }
      try {
        const s = await window.storage.get("signups:all", true);
        if (s) setSignups(JSON.parse(s.value));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const persistHikes = async (next) => {
    setHikes(next);
    try { await window.storage.set("hikes:all", JSON.stringify(next), true); } catch (e) { console.error(e); }
  };
  const persistSignups = async (next) => {
    setSignups(next);
    try { await window.storage.set("signups:all", JSON.stringify(next), true); } catch (e) { console.error(e); }
  };

  // ---------- Handlers ----------
  const handleSignup = async (hikeId, formData) => {
    const hike = hikes.find(h => h.id === hikeId);
    const current = signups[hikeId] || [];
    const isWaitlist = current.filter(s => !s.waitlist).length >= hike.capacity;
    const entry = { ...formData, signedUpAt: new Date().toISOString(), waitlist: isWaitlist };
    const next = { ...signups, [hikeId]: [...current, entry] };
    await persistSignups(next);
    setShowSignupForm(false);
    return isWaitlist;
  };

  const handleNewHike = async (hike) => {
    const next = [...hikes, { ...hike, id: `hike_${Date.now()}` }];
    await persistHikes(next);
    setShowNewHike(false);
  };

  const handleEditHike = async (updated) => {
    const next = hikes.map(h => h.id === updated.id ? updated : h);
    await persistHikes(next);
    setEditingHike(null);
    // Refresh the selected hike if it's the one being edited
    if (selectedHike?.id === updated.id) setSelectedHike(updated);
  };

  const handleDeleteHike = async (id) => {
    await persistHikes(hikes.filter(h => h.id !== id));
    const next = { ...signups };
    delete next[id];
    await persistSignups(next);
    setSelectedHike(null);
    setConfirmDelete(null);
  };

  // ---------- Render ----------
  return (
    <div style={styles.root}>
      <style>{globalCSS}</style>
      <TopoBackground />

      <header style={styles.header}>
        <div style={styles.brand}>
          <Mountain size={28} strokeWidth={1.5} style={{ color: "var(--moss)" }} />
          <div>
            <div style={styles.brandName}>Kitsap Trailhead Collective</div>
            <div style={styles.brandTag}>Group hikes · Pacific Northwest</div>
          </div>
        </div>
        <nav style={styles.nav}>
          <NavBtn active={view === "blog"} onClick={() => setView("blog")}>Field Notes</NavBtn>
          <NavBtn active={view === "calendar"} onClick={() => setView("calendar")}>Calendar</NavBtn>
          <NavBtn active={view === "admin"} onClick={() => setView("admin")}><Settings size={14} /> Manage</NavBtn>
        </nav>
      </header>

      <main style={styles.main}>
        {loading ? (
          <div style={styles.loading}>Loading the trail log…</div>
        ) : view === "blog" ? (
          <BlogView hikes={hikes} signups={signups} onSelect={setSelectedHike} />
        ) : view === "calendar" ? (
          <CalendarView hikes={hikes} month={calMonth} setMonth={setCalMonth} onSelect={setSelectedHike} />
        ) : (
          <AdminView hikes={hikes} signups={signups} onNewHike={() => setShowNewHike(true)} onDelete={(h) => setConfirmDelete(h)} onEdit={setEditingHike} onSelect={setSelectedHike} />
        )}
      </main>

      <footer style={styles.footer}>
        <div>— elevation gained together —</div>
        <div style={{ opacity: 0.6, fontSize: 12, marginTop: 4 }}>Kitsap Trailhead Collective · est. 2026</div>
      </footer>

      {selectedHike && (
        <HikeModal
          hike={selectedHike}
          signups={signups[selectedHike.id] || []}
          onClose={() => setSelectedHike(null)}
          onSignup={() => setShowSignupForm(true)}
          isAdmin={view === "admin"}
          onDelete={() => setConfirmDelete(selectedHike)}
          onEdit={() => setEditingHike(selectedHike)}
        />
      )}
      {showSignupForm && selectedHike && (
        <SignupForm
          hike={selectedHike}
          existingSignups={signups[selectedHike.id] || []}
          onClose={() => setShowSignupForm(false)}
          onSubmit={(data) => handleSignup(selectedHike.id, data)}
        />
      )}
      {showNewHike && (
        <HikeForm
          mode="new"
          onClose={() => setShowNewHike(false)}
          onSubmit={handleNewHike}
        />
      )}
      {editingHike && (
        <HikeForm
          mode="edit"
          initial={editingHike}
          onClose={() => setEditingHike(null)}
          onSubmit={handleEditHike}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this hike?"
          message={`"${confirmDelete.title}" will be removed, along with ${(signups[confirmDelete.id] || []).length} signup${(signups[confirmDelete.id] || []).length === 1 ? "" : "s"}. This can't be undone.`}
          confirmLabel="Delete hike"
          onConfirm={() => handleDeleteHike(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ============== Components ==============

function NavBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} className="navbtn" style={{
      ...styles.navBtn,
      color: active ? "var(--cream)" : "var(--ink)",
      background: active ? "var(--moss)" : "transparent",
      borderColor: active ? "var(--moss)" : "var(--ink-faint)",
    }}>{children}</button>
  );
}

function BlogView({ hikes, signups, onSelect }) {
  const sorted = [...hikes].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = sorted.filter(h => new Date(h.date) >= new Date(new Date().toDateString()));
  const featured = upcoming[0];
  const rest = upcoming.slice(1);

  return (
    <div>
      <section style={styles.hero}>
        <div style={styles.heroLabel}>ISSUE №{String(hikes.length).padStart(2, "0")} · MAY 2026</div>
        <h1 style={styles.heroTitle}>
          Where the <em style={styles.heroEm}>switchbacks</em><br />carry us next.
        </h1>
        <p style={styles.heroSub}>
          A small group of hikers, a shared logbook, and a calendar of trips you're invited to.
          Read the field notes, then sign up for one.
        </p>
      </section>

      {featured && (
        <article style={styles.featured} onClick={() => onSelect(featured)}>
          <div style={styles.featuredImageWrap}>
            {featured.image ? (
              <img src={featured.image} alt={featured.title} style={styles.featuredImage} />
            ) : (
              <div style={{ ...styles.featuredImage, ...styles.placeholderImg }}>
                <Mountain size={64} strokeWidth={1} style={{ opacity: 0.3 }} />
              </div>
            )}
            <div style={styles.featuredBadge}>NEXT UP</div>
          </div>
          <div style={styles.featuredBody}>
            <div style={styles.meta}>
              <span><CalendarIcon size={13} /> {formatDate(featured.date)}</span>
              <span><MapPin size={13} /> {featured.location}</span>
              <span><TrendingUp size={13} /> {featured.difficulty}</span>
            </div>
            <h2 style={styles.featuredTitle}>{featured.title}</h2>
            <p style={styles.featuredExcerpt}>{featured.description}</p>
            <div style={styles.signupRow}>
              <span style={styles.spotsLeft}>
                <Users size={13} /> {(signups[featured.id] || []).length} / {featured.capacity} signed up
              </span>
              <button className="cta" style={styles.cta}>Read & sign up →</button>
            </div>
          </div>
        </article>
      )}

      {rest.length > 0 && (
        <div>
          <h3 style={styles.sectionLabel}>— Also on the docket —</h3>
          <div style={styles.grid}>
            {rest.map((h) => (
              <article key={h.id} className="card" style={styles.card} onClick={() => onSelect(h)}>
                {h.image ? (
                  <img src={h.image} alt={h.title} style={styles.cardImage} />
                ) : (
                  <div style={{ ...styles.cardImage, ...styles.placeholderImg }}>
                    <Mountain size={40} strokeWidth={1} style={{ opacity: 0.3 }} />
                  </div>
                )}
                <div style={styles.cardBody}>
                  <div style={styles.cardDate}>{formatDate(h.date)}</div>
                  <h4 style={styles.cardTitle}>{h.title}</h4>
                  <div style={styles.cardMeta}>
                    <MapPin size={11} /> {h.location} · <TrendingUp size={11} /> {h.difficulty}
                  </div>
                  <div style={styles.cardFooter}>
                    <Users size={12} /> {(signups[h.id] || []).length}/{h.capacity}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 && (
        <div style={styles.empty}>
          <Mountain size={48} strokeWidth={1} style={{ opacity: 0.4 }} />
          <h3>No hikes on the books yet</h3>
          <p>Head to the Manage tab to post your first trip.</p>
        </div>
      )}
    </div>
  );
}

function CalendarView({ hikes, month, setMonth, onSelect }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstDay = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const monthName = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const hikesByDate = {};
  hikes.forEach(h => {
    const d = new Date(h.date).toDateString();
    if (!hikesByDate[d]) hikesByDate[d] = [];
    hikesByDate[d].push(h);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date().toDateString();

  return (
    <div>
      <div style={styles.calHeader}>
        <h2 style={styles.calTitle}>{monthName}</h2>
        <div style={styles.calNav}>
          <button className="navbtn" style={styles.calNavBtn} onClick={() => setMonth(new Date(year, m - 1, 1))}>
            <ChevronLeft size={16} />
          </button>
          <button className="navbtn" style={{ ...styles.calNavBtn, fontSize: 12, padding: "6px 14px" }} onClick={() => setMonth(new Date())}>
            Today
          </button>
          <button className="navbtn" style={styles.calNavBtn} onClick={() => setMonth(new Date(year, m + 1, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div style={styles.calGrid}>
        {["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d => (
          <div key={d} style={styles.calDayLabel}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} style={styles.calCell} />;
          const cellDate = new Date(year, m, d);
          const cellHikes = hikesByDate[cellDate.toDateString()] || [];
          const isToday = cellDate.toDateString() === today;
          return (
            <div key={i} style={{
              ...styles.calCell,
              background: isToday ? "var(--cream-warm)" : "var(--cream)",
              borderColor: isToday ? "var(--moss)" : "var(--ink-faint)",
              borderWidth: isToday ? 2 : 1,
            }}>
              <div style={styles.calDayNum}>{d}</div>
              {cellHikes.map(h => (
                <button
                  key={h.id}
                  onClick={() => onSelect(h)}
                  className="calevent"
                  style={styles.calEvent}
                >
                  <div style={{ fontWeight: 600 }}>{h.title}</div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>{h.location}</div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminView({ hikes, signups, onNewHike, onDelete, onEdit, onSelect }) {
  const totalSignups = Object.values(signups).reduce((a, b) => a + b.length, 0);
  return (
    <div>
      <div style={styles.adminHeader}>
        <div>
          <h2 style={styles.adminTitle}>Trip Manager</h2>
          <p style={styles.adminSub}>{hikes.length} hike{hikes.length === 1 ? "" : "s"} posted · {totalSignups} total signup{totalSignups === 1 ? "" : "s"}</p>
        </div>
        <button className="cta" style={styles.cta} onClick={onNewHike}>
          <Plus size={14} /> Post a new hike
        </button>
      </div>

      <div style={styles.adminList}>
        {hikes.length === 0 ? (
          <div style={styles.empty}>
            <Mountain size={48} strokeWidth={1} style={{ opacity: 0.4 }} />
            <h3>No hikes yet</h3>
            <p>Click "Post a new hike" to get started.</p>
          </div>
        ) : hikes.map(h => {
          const list = signups[h.id] || [];
          const confirmed = list.filter(s => !s.waitlist).length;
          const waitlisted = list.filter(s => s.waitlist).length;
          return (
            <div key={h.id} style={styles.adminRow}>
              <div style={styles.adminThumb}>
                {h.image ? <img src={h.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Mountain size={20} style={{ opacity: 0.4 }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.adminRowTitle}>{h.title}</div>
                <div style={styles.adminRowMeta}>
                  {formatDate(h.date)} · {h.location} · {confirmed}/{h.capacity} signed up
                  {waitlisted > 0 && <span style={{ color: "var(--rust)" }}> · {waitlisted} waitlisted</span>}
                </div>
              </div>
              <button className="navbtn" style={styles.linkBtn} onClick={() => onSelect(h)}>View</button>
              <button className="navbtn" style={styles.linkBtn} onClick={() => onEdit(h)}>Edit</button>
              <button className="navbtn" style={{ ...styles.linkBtn, color: "var(--rust)" }} onClick={() => onDelete(h)}>Delete</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HikeModal({ hike, signups, onClose, onSignup, isAdmin, onEdit, onDelete }) {
  const confirmed = signups.filter(s => !s.waitlist);
  const waitlisted = signups.filter(s => s.waitlist);
  const isFull = confirmed.length >= hike.capacity;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}><X size={18} /></button>
        {hike.image ? (
          <img src={hike.image} alt={hike.title} style={styles.modalImage} />
        ) : (
          <div style={{ ...styles.modalImage, ...styles.placeholderImg }}>
            <Mountain size={80} strokeWidth={1} style={{ opacity: 0.3 }} />
          </div>
        )}
        <div style={styles.modalBody}>
          <div style={styles.meta}>
            <span><CalendarIcon size={13} /> {formatDate(hike.date)}</span>
            <span><Clock size={13} /> {hike.time}</span>
            <span><MapPin size={13} /> {hike.location}</span>
          </div>
          <h2 style={styles.modalTitle}>{hike.title}</h2>
          <div style={styles.modalStats}>
            <Stat label="Difficulty" value={hike.difficulty} />
            <Stat label="Distance" value={hike.distance} />
            <Stat label="Elevation" value={hike.elevation} />
            <Stat label="Spots" value={`${confirmed.length}/${hike.capacity}`} />
          </div>
          <p style={styles.modalDesc}>{hike.description}</p>
          {hike.meetingPoint && (
            <div style={styles.modalSection}>
              <div style={styles.modalSectionLabel}>Meeting Point</div>
              <div>{hike.meetingPoint}</div>
            </div>
          )}
          {hike.bring && (
            <div style={styles.modalSection}>
              <div style={styles.modalSectionLabel}>What to Bring</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{hike.bring}</div>
            </div>
          )}

          {isAdmin ? (
            <>
              <div style={styles.modalSection}>
                <div style={styles.modalSectionLabel}>Confirmed ({confirmed.length})</div>
                {confirmed.length === 0 ? (
                  <div style={{ opacity: 0.6, fontStyle: "italic" }}>No signups yet.</div>
                ) : (
                  <div style={styles.signupList}>
                    {confirmed.map((s, i) => <SignupCard key={i} s={s} />)}
                  </div>
                )}
              </div>
              {waitlisted.length > 0 && (
                <div style={styles.modalSection}>
                  <div style={{ ...styles.modalSectionLabel, color: "var(--rust)" }}>Waitlist ({waitlisted.length})</div>
                  <div style={styles.signupList}>
                    {waitlisted.map((s, i) => <SignupCard key={i} s={s} waitlist />)}
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
                <button className="cta" style={styles.cta} onClick={onEdit}>Edit hike</button>
                <button className="navbtn" style={{ ...styles.linkBtn, color: "var(--rust)", padding: "10px 16px", border: "1px solid var(--rust)", borderRadius: 2, textDecoration: "none" }} onClick={onDelete}>Delete hike</button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: 24 }}>
              {isFull && (
                <div style={styles.waitlistNotice}>
                  This hike is full — you'll be added to the waitlist.
                </div>
              )}
              <button className="cta" style={{ ...styles.cta, width: "100%", justifyContent: "center", padding: "14px" }} onClick={onSignup}>
                {isFull ? "Join waitlist" : "Sign me up"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SignupCard({ s, waitlist }) {
  return (
    <div style={{ ...styles.signupCard, borderLeftColor: waitlist ? "var(--rust)" : "var(--moss)" }}>
      <div style={{ fontWeight: 600 }}>{s.name}</div>
      <div style={styles.signupCardMeta}>{s.email} · {s.phone}</div>
      {s.emergencyContact && <div style={styles.signupCardMeta}>Emergency: {s.emergencyContact}</div>}
      {s.experience && <div style={styles.signupCardMeta}>Experience: {s.experience}</div>}
      {s.notes && <div style={{ ...styles.signupCardMeta, fontStyle: "italic" }}>"{s.notes}"</div>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function SignupForm({ hike, existingSignups, onClose, onSubmit }) {
  const [data, setData] = useState({ name: "", email: "", phone: "", emergencyContact: "", experience: "Some", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [wasWaitlisted, setWasWaitlisted] = useState(false);
  const willWaitlist = (existingSignups || []).filter(s => !s.waitlist).length >= hike.capacity;

  const submit = async () => {
    if (!data.name || !data.email || !data.phone) return;
    const waitlisted = await onSubmit(data);
    setWasWaitlisted(waitlisted);
    setSubmitted(true);
  };
  if (submitted) {
    return (
      <div style={styles.modalBackdrop} onClick={onClose}>
        <div style={{ ...styles.modal, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ ...styles.checkBubble, background: wasWaitlisted ? "var(--rust)" : "var(--moss)" }}><Check size={32} strokeWidth={2.5} /></div>
            <h2 style={{ ...styles.modalTitle, marginTop: 20 }}>
              {wasWaitlisted ? "You're on the waitlist." : "You're in."}
            </h2>
            <p style={{ opacity: 0.7, marginBottom: 24 }}>
              {wasWaitlisted
                ? "We'll reach out if a spot opens up. You're high on the list — folks drop more often than you'd think."
                : "We'll be in touch before the trip with last-minute details. See you on the trail."}
            </p>
            <button className="cta" style={styles.cta} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}><X size={18} /></button>
        <div style={{ padding: "40px 36px" }}>
          <div style={styles.formLabel}>{willWaitlist ? "JOIN WAITLIST" : "SIGN UP"}</div>
          <h2 style={styles.modalTitle}>{hike.title}</h2>
          <p style={{ opacity: 0.6, marginBottom: 16, fontSize: 14 }}>{formatDate(hike.date)} · {hike.location}</p>
          {willWaitlist && (
            <div style={styles.waitlistNotice}>
              This hike is full. We'll add you to the waitlist and notify you if a spot opens up.
            </div>
          )}
          <Field label="Full name *" value={data.name} onChange={v => setData({ ...data, name: v })} />
          <Field label="Email *" type="email" value={data.email} onChange={v => setData({ ...data, email: v })} />
          <Field label="Phone *" value={data.phone} onChange={v => setData({ ...data, phone: v })} />
          <Field label="Emergency contact" value={data.emergencyContact} onChange={v => setData({ ...data, emergencyContact: v })} placeholder="Name & phone" />
          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Hiking experience</label>
            <select style={styles.input} value={data.experience} onChange={e => setData({ ...data, experience: e.target.value })}>
              <option>New to hiking</option>
              <option>Some</option>
              <option>Lots</option>
              <option>I basically live out there</option>
            </select>
          </div>
          <Field label="Anything we should know?" value={data.notes} onChange={v => setData({ ...data, notes: v })} multiline placeholder="Dietary restrictions, pace concerns, etc." />
          <button className="cta" style={{ ...styles.cta, width: "100%", justifyContent: "center", padding: 14, marginTop: 8 }} onClick={submit}>
            {willWaitlist ? "Join waitlist" : "Confirm signup"}
          </button>
        </div>
      </div>
    </div>
  );
}

function HikeForm({ mode, initial, onClose, onSubmit }) {
  const [data, setData] = useState(initial || {
    title: "", date: "", time: "8:00 AM", location: "", difficulty: "Moderate",
    distance: "", elevation: "", capacity: 12, description: "", meetingPoint: "", bring: "", image: ""
  });
  const [error, setError] = useState("");
  const fileRef = useRef();
  const isEdit = mode === "edit";

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setData({ ...data, image: reader.result });
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!data.title || !data.date || !data.location) {
      setError("Title, date, and location are required.");
      return;
    }
    onSubmit(data);
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}><X size={18} /></button>
        <div style={{ padding: "40px 36px" }}>
          <div style={styles.formLabel}>{isEdit ? "EDIT TRIP" : "NEW TRIP"}</div>
          <h2 style={styles.modalTitle}>{isEdit ? "Edit hike" : "Post a hike"}</h2>

          <div style={styles.fieldWrap}>
            <label style={styles.fieldLabel}>Cover photo</label>
            <div style={styles.uploadBox} onClick={() => fileRef.current?.click()}>
              {data.image ? (
                <img src={data.image} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 4 }} />
              ) : (
                <div style={{ textAlign: "center", color: "var(--ink-soft)" }}>
                  <Upload size={28} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>Click to upload a photo</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
            </div>
            {data.image && (
              <button onClick={() => setData({ ...data, image: "" })} style={{ ...styles.linkBtn, marginTop: 6 }}>Remove photo</button>
            )}
          </div>

          <Field label="Hike title *" value={data.title} onChange={v => setData({ ...data, title: v })} placeholder="e.g. Mount Townsend sunrise loop" />
          <div style={styles.row2}>
            <Field label="Date *" type="date" value={data.date} onChange={v => setData({ ...data, date: v })} />
            <Field label="Start time" value={data.time} onChange={v => setData({ ...data, time: v })} />
          </div>
          <Field label="Location *" value={data.location} onChange={v => setData({ ...data, location: v })} placeholder="e.g. Olympic National Park, WA" />
          <div style={styles.row2}>
            <div style={styles.fieldWrap}>
              <label style={styles.fieldLabel}>Difficulty</label>
              <select style={styles.input} value={data.difficulty} onChange={e => setData({ ...data, difficulty: e.target.value })}>
                <option>Easy</option>
                <option>Moderate</option>
                <option>Strenuous</option>
                <option>Expert</option>
              </select>
            </div>
            <Field label="Group size" type="number" value={data.capacity} onChange={v => setData({ ...data, capacity: parseInt(v) || 0 })} />
          </div>
          <div style={styles.row2}>
            <Field label="Distance" value={data.distance} onChange={v => setData({ ...data, distance: v })} placeholder="e.g. 8.2 mi" />
            <Field label="Elevation gain" value={data.elevation} onChange={v => setData({ ...data, elevation: v })} placeholder="e.g. 2,400 ft" />
          </div>
          <Field label="Description" value={data.description} onChange={v => setData({ ...data, description: v })} multiline placeholder="Tell people what to expect — the route, the views, the vibe." />
          <Field label="Meeting point" value={data.meetingPoint} onChange={v => setData({ ...data, meetingPoint: v })} placeholder="Trailhead, parking lot, or carpool spot" />
          <Field label="What to bring" value={data.bring} onChange={v => setData({ ...data, bring: v })} multiline placeholder="Water, layers, sturdy boots, etc." />

          {error && <div style={styles.errorBox}>{error}</div>}

          <button className="cta" style={{ ...styles.cta, width: "100%", justifyContent: "center", padding: 14, marginTop: 8 }} onClick={submit}>
            {isEdit ? "Save changes" : "Post the hike"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div style={styles.modalBackdrop} onClick={onCancel}>
      <div style={{ ...styles.modal, maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: 36 }}>
          <h3 style={{ ...styles.modalTitle, fontSize: 24, marginTop: 0 }}>{title}</h3>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.6, fontSize: 14 }}>{message}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 24, justifyContent: "flex-end" }}>
            <button className="navbtn" style={{ ...styles.cta, background: "transparent", color: "var(--ink)", border: "1px solid var(--ink-faint)" }} onClick={onCancel}>Cancel</button>
            <button className="cta" style={{ ...styles.cta, background: "var(--rust)" }} onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "", multiline = false }) {
  return (
    <div style={styles.fieldWrap}>
      <label style={styles.fieldLabel}>{label}</label>
      {multiline ? (
        <textarea
          style={{ ...styles.input, minHeight: 80, resize: "vertical", fontFamily: "inherit" }}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          style={styles.input}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function TopoBackground() {
  return (
    <svg style={styles.topo} viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <pattern id="topo" x="0" y="0" width="1200" height="800" patternUnits="userSpaceOnUse">
          {[...Array(20)].map((_, i) => (
            <path
              key={i}
              d={`M -100 ${100 + i * 40} Q 200 ${60 + i * 40 + (i % 2 ? 30 : -30)}, 400 ${100 + i * 40} T 800 ${100 + i * 40} T 1300 ${100 + i * 40}`}
              fill="none"
              stroke="var(--moss)"
              strokeWidth="1"
              opacity={0.06}
            />
          ))}
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#topo)" />
    </svg>
  );
}

// ============== Utilities ==============

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function seedHikes() {
  const today = new Date();
  const future = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };
  return [
    {
      id: "hike_seed_1",
      title: "Mount Townsend sunrise loop",
      date: future(7),
      time: "5:30 AM",
      location: "Olympic National Forest, WA",
      difficulty: "Moderate",
      distance: "8.2 mi",
      elevation: "2,900 ft",
      capacity: 10,
      description: "We catch first light from the summit and drop down the back side through the meadows. Bring a headlamp for the first hour — the trail is well-graded but dark.",
      meetingPoint: "Park-and-ride lot at Hwy 20 & Discovery Rd, 4:45 AM carpool",
      bring: "Headlamp, 2L water, layers (it's cold up top), snacks, gloves",
      image: "",
    },
    {
      id: "hike_seed_2",
      title: "Hurricane Ridge wildflower walk",
      date: future(21),
      time: "9:00 AM",
      location: "Olympic National Park, WA",
      difficulty: "Easy",
      distance: "3.5 mi",
      elevation: "600 ft",
      capacity: 15,
      description: "A relaxed pace through the alpine meadows at peak bloom. Good for folks newer to hiking or coming back after time away. Lots of stopping to look at things.",
      meetingPoint: "Hurricane Ridge visitor center",
      bring: "Water, sunhat, snacks, camera",
      image: "",
    },
    {
      id: "hike_seed_3",
      title: "Mount Ellinor scramble",
      date: future(35),
      time: "7:00 AM",
      location: "Olympic Peninsula, WA",
      difficulty: "Strenuous",
      distance: "6.2 mi",
      elevation: "3,300 ft",
      capacity: 8,
      description: "Steep, sustained climb to one of the best views on the peninsula. The final pitch is a rocky scramble — hands-on but not technical. Mountain goats often nearby.",
      meetingPoint: "Upper trailhead off FR 2419",
      bring: "Sturdy boots, 3L water, gloves for the scramble, layers, lunch",
      image: "",
    },
  ];
}

// ============== Styles ==============

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT@9..144,300..800,0..100&family=Inter:wght@400;500;600&display=swap');
  :root {
    --cream: #f4ede0;
    --cream-warm: #ebe0cb;
    --cream-deep: #e2d4b8;
    --moss: #2d4a2b;
    --moss-light: #4a6b48;
    --rust: #a8421a;
    --ochre: #c08a3e;
    --ink: #1a1814;
    --ink-soft: #5a5448;
    --ink-faint: #c9bea8;
  }
  * { box-sizing: border-box; }
  body { margin: 0; }
  .navbtn { transition: all 0.18s ease; cursor: pointer; }
  .navbtn:hover { transform: translateY(-1px); }
  .cta { transition: all 0.2s ease; cursor: pointer; }
  .cta:hover { background: var(--ink) !important; transform: translateY(-1px); }
  .card { transition: all 0.3s cubic-bezier(.2,.8,.2,1); cursor: pointer; }
  .card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(26,24,20,0.12); }
  .calevent { transition: all 0.15s ease; cursor: pointer; }
  .calevent:hover { background: var(--moss) !important; color: var(--cream) !important; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: var(--moss) !important; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;

const styles = {
  root: {
    minHeight: "100vh",
    background: "var(--cream)",
    color: "var(--ink)",
    fontFamily: "'Inter', -apple-system, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  topo: {
    position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0,
  },
  header: {
    position: "relative", zIndex: 2,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "28px 48px", borderBottom: "1px solid var(--ink-faint)",
    flexWrap: "wrap", gap: 16,
  },
  brand: { display: "flex", alignItems: "center", gap: 14 },
  brandName: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" },
  brandTag: { fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-soft)", marginTop: 2 },
  nav: { display: "flex", gap: 8, flexWrap: "wrap" },
  navBtn: {
    padding: "8px 16px", border: "1px solid", borderRadius: 999,
    fontSize: 13, fontWeight: 500, fontFamily: "inherit",
    display: "inline-flex", alignItems: "center", gap: 6,
    letterSpacing: "0.02em",
  },
  main: {
    position: "relative", zIndex: 1,
    maxWidth: 1200, margin: "0 auto", padding: "48px",
  },
  loading: { textAlign: "center", padding: 80, fontStyle: "italic", color: "var(--ink-soft)" },
  hero: { marginBottom: 64, animation: "fadeUp 0.6s ease" },
  heroLabel: { fontSize: 11, letterSpacing: "0.25em", color: "var(--rust)", marginBottom: 16, fontWeight: 600 },
  heroTitle: {
    fontFamily: "'Fraunces', serif", fontSize: "clamp(40px, 6vw, 76px)", lineHeight: 0.95,
    fontWeight: 400, margin: 0, letterSpacing: "-0.02em",
  },
  heroEm: { fontStyle: "italic", color: "var(--moss)", fontWeight: 500 },
  heroSub: { fontSize: 18, maxWidth: 560, marginTop: 24, lineHeight: 1.6, color: "var(--ink-soft)" },
  featured: {
    display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0,
    background: "var(--cream-warm)", border: "1px solid var(--ink-faint)",
    marginBottom: 64, cursor: "pointer", overflow: "hidden",
    animation: "fadeUp 0.7s ease 0.1s backwards",
  },
  featuredImageWrap: { position: "relative", minHeight: 360 },
  featuredImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  featuredBadge: {
    position: "absolute", top: 20, left: 20, background: "var(--moss)", color: "var(--cream)",
    padding: "6px 14px", fontSize: 10, letterSpacing: "0.2em", fontWeight: 600,
  },
  featuredBody: { padding: "48px 44px", display: "flex", flexDirection: "column", justifyContent: "center" },
  meta: { display: "flex", gap: 16, fontSize: 12, color: "var(--ink-soft)", marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  featuredTitle: { fontFamily: "'Fraunces', serif", fontSize: 36, lineHeight: 1.1, margin: "0 0 16px 0", letterSpacing: "-0.01em" },
  featuredExcerpt: { fontSize: 15, lineHeight: 1.6, color: "var(--ink-soft)", marginBottom: 24 },
  signupRow: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  spotsLeft: { fontSize: 12, color: "var(--ink-soft)", display: "inline-flex", alignItems: "center", gap: 6 },
  cta: {
    background: "var(--moss)", color: "var(--cream)", border: "none", padding: "10px 20px",
    fontSize: 13, fontWeight: 500, fontFamily: "inherit", letterSpacing: "0.02em",
    display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 2,
  },
  sectionLabel: {
    fontFamily: "'Fraunces', serif", fontSize: 14, letterSpacing: "0.1em",
    textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 24, fontStyle: "italic", fontWeight: 400,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 24 },
  card: { background: "var(--cream-warm)", border: "1px solid var(--ink-faint)", overflow: "hidden" },
  cardImage: { width: "100%", height: 180, objectFit: "cover", display: "block" },
  cardBody: { padding: 20 },
  cardDate: { fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--rust)", marginBottom: 8, fontWeight: 600 },
  cardTitle: { fontFamily: "'Fraunces', serif", fontSize: 20, margin: "0 0 8px 0", lineHeight: 1.2 },
  cardMeta: { fontSize: 12, color: "var(--ink-soft)", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
  cardFooter: { marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--ink-faint)", fontSize: 12, color: "var(--ink-soft)", display: "inline-flex", alignItems: "center", gap: 6 },
  placeholderImg: { background: "linear-gradient(135deg, var(--cream-deep), var(--cream-warm))", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--moss)" },
  empty: { textAlign: "center", padding: 80, color: "var(--ink-soft)" },

  calHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 },
  calTitle: { fontFamily: "'Fraunces', serif", fontSize: 36, margin: 0, letterSpacing: "-0.01em", fontWeight: 500 },
  calNav: { display: "flex", gap: 8 },
  calNavBtn: { padding: "8px 12px", border: "1px solid var(--ink-faint)", background: "var(--cream)", borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, background: "var(--cream)", padding: 4, border: "1px solid var(--ink-faint)" },
  calDayLabel: { fontSize: 10, letterSpacing: "0.2em", color: "var(--ink-soft)", padding: "10px 6px", textAlign: "center", fontWeight: 600 },
  calCell: { minHeight: 110, background: "var(--cream)", border: "1px solid var(--ink-faint)", padding: 8, display: "flex", flexDirection: "column", gap: 4 },
  calDayNum: { fontSize: 13, fontWeight: 500, color: "var(--ink)", fontFamily: "'Fraunces', serif" },
  calEvent: { background: "var(--ochre)", color: "var(--ink)", border: "none", padding: "6px 8px", fontSize: 11, textAlign: "left", fontFamily: "inherit", lineHeight: 1.2, borderRadius: 2 },

  adminHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 },
  adminTitle: { fontFamily: "'Fraunces', serif", fontSize: 36, margin: "0 0 4px 0", letterSpacing: "-0.01em", fontWeight: 500 },
  adminSub: { margin: 0, color: "var(--ink-soft)", fontSize: 14 },
  adminList: { display: "flex", flexDirection: "column", gap: 8 },
  adminRow: { display: "flex", alignItems: "center", gap: 16, background: "var(--cream-warm)", border: "1px solid var(--ink-faint)", padding: 16, flexWrap: "wrap" },
  adminThumb: { width: 60, height: 60, background: "var(--cream-deep)", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  adminRowTitle: { fontFamily: "'Fraunces', serif", fontSize: 18, marginBottom: 2 },
  adminRowMeta: { fontSize: 12, color: "var(--ink-soft)" },
  linkBtn: { background: "transparent", border: "none", color: "var(--moss)", fontSize: 13, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: 3, fontFamily: "inherit", padding: "6px 8px" },

  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(26,24,20,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20, animation: "fadeUp 0.2s ease" },
  modal: { background: "var(--cream)", maxWidth: 720, width: "100%", maxHeight: "92vh", overflow: "auto", position: "relative", border: "1px solid var(--ink-faint)" },
  modalClose: { position: "absolute", top: 16, right: 16, background: "var(--cream)", border: "1px solid var(--ink-faint)", borderRadius: 999, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 2 },
  modalImage: { width: "100%", height: 320, objectFit: "cover", display: "block" },
  modalBody: { padding: "32px 36px 40px" },
  modalTitle: { fontFamily: "'Fraunces', serif", fontSize: 32, margin: "8px 0 16px", lineHeight: 1.1, letterSpacing: "-0.01em" },
  modalStats: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, background: "var(--ink-faint)", border: "1px solid var(--ink-faint)", margin: "20px 0" },
  stat: { background: "var(--cream-warm)", padding: "14px 16px" },
  statLabel: { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--ink-soft)", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: 500, fontFamily: "'Fraunces', serif" },
  modalDesc: { fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)", margin: "20px 0" },
  modalSection: { marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--ink-faint)" },
  modalSectionLabel: { fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--rust)", marginBottom: 8, fontWeight: 600 },
  signupList: { display: "flex", flexDirection: "column", gap: 8 },
  signupCard: { background: "var(--cream-warm)", padding: 12, borderLeftWidth: 3, borderLeftStyle: "solid", borderLeftColor: "var(--moss)" },
  signupCardMeta: { fontSize: 12, color: "var(--ink-soft)", marginTop: 2 },
  fullBadge: { background: "var(--rust)", color: "var(--cream)", padding: 14, textAlign: "center", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 },
  waitlistNotice: { background: "var(--cream-deep)", border: "1px solid var(--ochre)", borderLeft: "3px solid var(--rust)", padding: "12px 16px", fontSize: 13, color: "var(--ink-soft)", marginBottom: 16, lineHeight: 1.5 },
  errorBox: { background: "rgba(168, 66, 26, 0.1)", border: "1px solid var(--rust)", padding: "10px 14px", fontSize: 13, color: "var(--rust)", marginTop: 12, marginBottom: 12 },

  formLabel: { fontSize: 11, letterSpacing: "0.25em", color: "var(--rust)", marginBottom: 12, fontWeight: 600 },
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { display: "block", fontSize: 12, letterSpacing: "0.05em", color: "var(--ink-soft)", marginBottom: 6, fontWeight: 500 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid var(--ink-faint)", background: "var(--cream)", fontSize: 14, fontFamily: "inherit", color: "var(--ink)", borderRadius: 2 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  uploadBox: { border: "2px dashed var(--ink-faint)", borderRadius: 4, height: 160, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "var(--cream-warm)", overflow: "hidden" },
  checkBubble: { width: 64, height: 64, borderRadius: 999, background: "var(--moss)", color: "var(--cream)", display: "inline-flex", alignItems: "center", justifyContent: "center" },

  footer: { position: "relative", zIndex: 1, textAlign: "center", padding: "48px 24px 32px", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "var(--ink-soft)", borderTop: "1px solid var(--ink-faint)", marginTop: 64 },
};
