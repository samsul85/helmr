# Helmr — To-Do List

_Last updated: May 24, 2026_

Running list across chats. Reference this in new Claude conversations so context isn't lost.

---

## 🔴 Active priorities

### 1. Wait on Natalia's ongoing campaign
$200 collected so far via Open Pool. Don't poke — let it play out. Her experience drives the next build decisions. Watch for: parent confusion, Interac friction, anything she had to work around.

### 2. Phoebe debrief
Phoebe completed a full Open Pool campaign end-to-end. First real validation event in Helmr's history. Need a real conversation (15-min call ideal) to extract:
- What was confusing
- What she had to explain to parents
- What almost broke it
- How she shared the link (WhatsApp / group chat / other)

Gold is in the workarounds, not "it worked great."

### 3. Organizer contribution to pool
Add organizer as implicit participant with a "My contribution" field reflected in total collected. Currently the organizer's own $ is invisible in dashboard math — breaks open-pool gift collections where the organizer also chips in.

---

## 🟡 Build queue (deferred until #1 and #2 resolve)

### 4. Per-expense participant selection
Toggle which expenses each guest is on. JZ + friends' #1 friction point. Open design question still unresolved:
- **Model A** — Organizer decides who's on each expense
- **Model B** — Guests toggle which expenses they want in on

### 5. Custom (non-equal) splits
Natural follow-on to #4.

### 6. RSVP deadline + phase-based UX
Planning → RSVP-open → collection. Provisional-vs-final share problem only half-solved by the current labeling fix.

### 7. Guest-side "Tip the Planner"
With organizer opt-in toggle.

### 8. Buffer/Incidentals smart default for trip events

---

## 🟢 Bigger-picture pending

### 9. Real Interac integration
Currently text-only instructions.

### 10. Stripe for non-Canadian users
Fallback path for users outside Canada.

### 11. Real auth + multi-device sync
Phase 4+ thing. Privacy/revocation depends on this.

### 12. Guest link expiry awareness
"This link expires in 90 days."

---

## ⚪ Shipped (for reference)

- Vercel KV + event persistence
- Personal shareable links per guest (`/e/[eventId]?g=[guestId]`)
- "Viewed" tracking on organizer dashboard
- Open Pool mode (from Natalia's feedback)
- Broadcast invite mode (Open Pool default; one link, self-entered names)
- Provisional share labeling ("$1000 each if all 3 join")
- Multi-event support + "Your events" list (localStorage)
- Edit event details from Extras tab
- Screenshot upload (Interac confirmation)

---

## 🗒️ Resolved / decided

- **Name**: keeping Helmr, not renaming
- **David / Waypoint LLC**: handled, not a concern
- **Code workflow**: working from GitHub repo, not zip uploads

---

## 🎯 Working principles

- Default to action over discussion
- Surface trade-offs clearly, recommend one path
- Don't build features for users who don't exist yet
- Real user behavior > feature roadmap intuitions
- Nothing in the build queue moves until #1 or #2 resolves
