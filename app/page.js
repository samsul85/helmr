diff --git a/app/page.js b/app/page.js
index 79245f8..fd1d38f 100644
--- a/app/page.js
+++ b/app/page.js
@@ -78,6 +78,26 @@ const S = {
   modal: { background: 'white', borderRadius: '16px', padding: '20px', maxWidth: '420px', width: '100%' },
 };
 
+// Convert a <input type="datetime-local"> value (no timezone, e.g. "2026-05-23T22:20")
+// into an ISO string anchored to the user's local timezone, ready to store on the server.
+// Returns '' if input is empty/invalid.
+function datetimeLocalToIso(s) {
+  if (!s) return '';
+  const d = new Date(s);
+  if (isNaN(d.getTime())) return '';
+  return d.toISOString();
+}
+
+// Convert a stored ISO string back into the format the datetime-local input expects
+// (YYYY-MM-DDTHH:MM in local time). Returns '' if missing/invalid.
+function isoToDatetimeLocal(s) {
+  if (!s) return '';
+  const d = new Date(s);
+  if (isNaN(d.getTime())) return '';
+  const pad = n => String(n).padStart(2, '0');
+  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
+}
+
 function FeedbackModal({ open, onClose, currentScreen }) {
   const [verdict, setVerdict] = useState('');
   const [comment, setComment] = useState('');
@@ -316,6 +336,8 @@ export default function Helmr() {
   const [goal, setGoal] = useState(0);
   const [suggestionAmount, setSuggestionAmount] = useState(0);
   const [suggestionUnit, setSuggestionUnit] = useState('per person');
+  const [customFieldLabel, setCustomFieldLabel] = useState(''); // e.g. "Child's name"; empty = feature off
+  const [responseDeadline, setResponseDeadline] = useState(''); // datetime-local string or ''
   const [people, setPeople] = useState([
     { id: 'organizer', name: 'You', status: 'paid', role: 'organizer' },
   ]);
@@ -335,6 +357,15 @@ export default function Helmr() {
   const contributorCount = people.filter(p => p.role !== 'organizer' && Number(p.contributedAmount) > 0).length;
   const inviteeCount = people.filter(p => p.role !== 'organizer').length;
 
+  // Deadline helpers: parse the datetime-local string into a JS Date.
+  // Empty string = no deadline. Passed = closed.
+  const deadlineDate = responseDeadline ? new Date(responseDeadline) : null;
+  const deadlinePassed = !!(deadlineDate && !isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < Date.now());
+  const formatDeadline = (d) => {
+    if (!d || isNaN(d.getTime())) return '';
+    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
+  };
+
   const resumeEvent = async (id) => {
     setLoading(true);
     try {
@@ -365,6 +396,8 @@ export default function Helmr() {
       setGoal(Number(data.goal) || 0);
       setSuggestionAmount(Number(data.suggestionAmount) || 0);
       setSuggestionUnit(data.suggestionUnit || 'per person');
+      setCustomFieldLabel(data.customFieldLabel || '');
+      setResponseDeadline(isoToDatetimeLocal(data.responseDeadline || ''));
       setPeople(data.people || [{ id: 'organizer', name: 'You', status: 'organizer', role: 'organizer' }]);
       setExpenses(data.expenses || []);
       setTip(Number(data.tip) || 0);
@@ -398,6 +431,8 @@ export default function Helmr() {
             organizerName, organizerEmail,
             mode, inviteMode, goal: Number(goal) || 0,
             suggestionAmount: Number(suggestionAmount) || 0, suggestionUnit,
+            customFieldLabel,
+            responseDeadline: datetimeLocalToIso(responseDeadline),
             people, expenses, tip: Number(tip) || 0,
             knownGuestIds: Array.from(knownGuestIdsRef.current),
           }),
@@ -410,7 +445,7 @@ export default function Helmr() {
       }
     }, 800);
     return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
-  }, [eventId, screen, eventName, eventDate, eventLoc, dateTBD, locTBD, organizerName, organizerEmail, mode, inviteMode, goal, suggestionAmount, suggestionUnit, people, expenses, tip]);
+  }, [eventId, screen, eventName, eventDate, eventLoc, dateTBD, locTBD, organizerName, organizerEmail, mode, inviteMode, goal, suggestionAmount, suggestionUnit, customFieldLabel, responseDeadline, people, expenses, tip]);
 
   // Poll for server-side guest changes (viewedAt, RSVP status, broadcast signups, view counter)
   useEffect(() => {
@@ -494,6 +529,8 @@ export default function Helmr() {
     setGoal(0);
     setSuggestionAmount(0);
     setSuggestionUnit('per person');
+    setCustomFieldLabel('');
+    setResponseDeadline('');
     setViewCount(0);
     setTip(0);
     setExpenses([]);
@@ -521,6 +558,8 @@ export default function Helmr() {
           organizerName, organizerEmail,
           mode, inviteMode, goal: Number(goal) || 0,
           suggestionAmount: Number(suggestionAmount) || 0, suggestionUnit,
+          customFieldLabel,
+          responseDeadline: datetimeLocalToIso(responseDeadline),
           people, expenses, tip: Number(tip) || 0,
         }),
       });
@@ -686,6 +725,31 @@ export default function Helmr() {
 
           <label style={S.label}><input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} style={{ marginRight: '4px' }} /> Location TBD</label>
           {!locTBD && <input style={S.input} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}
+          <div style={{ height: '14px' }} />
+
+          <label style={S.label}>Response deadline (optional)</label>
+          <input
+            style={S.input}
+            type="datetime-local"
+            value={responseDeadline}
+            onChange={e => setResponseDeadline(e.target.value)}
+          />
+          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
+            After this, new people can't join. Already-confirmed guests can still pay.
+          </p>
+          <div style={{ height: '14px' }} />
+
+          <label style={S.label}>Ask each guest for… (optional)</label>
+          <input
+            style={S.input}
+            placeholder={mode === 'open_pool' ? "e.g. Child's name" : "e.g. Dietary restriction"}
+            value={customFieldLabel}
+            onChange={e => setCustomFieldLabel(e.target.value)}
+            maxLength={40}
+          />
+          <p style={{ fontSize: '11px', color: '#999', margin: '4px 0 0' }}>
+            Adds a short text field on the guest page. Leave blank to skip.
+          </p>
           <div style={{ height: '20px' }} />
 
           <button style={{ ...S.btn, ...S.btnPrimary, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={goToDashboard}>
@@ -714,6 +778,23 @@ export default function Helmr() {
           ))}
         </div>
 
+        {deadlineDate && !isNaN(deadlineDate.getTime()) && (
+          <div style={{
+            padding: '8px 12px',
+            borderRadius: '8px',
+            marginBottom: '10px',
+            fontSize: '12px',
+            background: deadlinePassed ? '#fcebeb' : '#f5f3ee',
+            color: deadlinePassed ? '#791f1f' : '#666',
+            border: `0.5px solid ${deadlinePassed ? '#f09595' : '#e5e0d4'}`,
+          }}>
+            {deadlinePassed
+              ? <>🔒 Closed to new joiners since {formatDeadline(deadlineDate)}. Already-confirmed guests can still pay.</>
+              : <>⏰ Closes to new joiners on {formatDeadline(deadlineDate)}</>
+            }
+          </div>
+        )}
+
         {tab === 'overview' && (
           <>
             {mode === 'cost_split' ? (
@@ -859,6 +940,11 @@ export default function Helmr() {
                       >🗑️</button>
                     )}
                   </div>
+                  {!isOrganizer && customFieldLabel && p.customFieldValue && (
+                    <div style={{ fontSize: '12px', color: '#777', marginTop: '4px' }}>
+                      {customFieldLabel}: <span style={{ color: '#333' }}>{p.customFieldValue}</span>
+                    </div>
+                  )}
                 </div>
               );
             })}
@@ -913,7 +999,30 @@ export default function Helmr() {
               {!dateTBD && <input style={{ ...S.input, marginBottom: '10px' }} type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />}
 
               <label style={S.label}><input type="checkbox" checked={locTBD} onChange={() => setLocTBD(!locTBD)} style={{ marginRight: '4px' }} /> Location TBD</label>
-              {!locTBD && <input style={S.input} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}
+              {!locTBD && <input style={{ ...S.input, marginBottom: '10px' }} placeholder="Where?" value={eventLoc} onChange={e => setEventLoc(e.target.value)} />}
+
+              <label style={S.label}>Response deadline (optional)</label>
+              <input
+                style={{ ...S.input, marginBottom: '4px' }}
+                type="datetime-local"
+                value={responseDeadline}
+                onChange={e => setResponseDeadline(e.target.value)}
+              />
+              <p style={{ fontSize: '11px', color: '#999', margin: '0 0 10px' }}>
+                After this, new people can't join. Already-confirmed guests can still pay.
+              </p>
+
+              <label style={S.label}>Ask each guest for… (optional)</label>
+              <input
+                style={{ ...S.input, marginBottom: '4px' }}
+                placeholder={mode === 'open_pool' ? "e.g. Child's name" : "e.g. Dietary restriction"}
+                value={customFieldLabel}
+                onChange={e => setCustomFieldLabel(e.target.value)}
+                maxLength={40}
+              />
+              <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
+                Adds a short text field on the guest page.
+              </p>
             </div>
 
             {mode === 'open_pool' && (
