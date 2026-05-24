// Shared share-calculation logic used by both the organizer dashboard (app/page.js)
// and the guest view (app/e/[eventId]/GuestView.js).
//
// Backward compatibility: an expense without `participantIds` (or with an empty
// array) is treated as "everyone" — matching the original equal-split behavior.

// Get the set of person IDs who count toward an expense, given the event's
// people list. Pass `confirmedOnly=true` for "current" math, false for "if all join".
//
// For an expense with no participantIds set: everyone confirmed (or everyone
// invited, depending on confirmedOnly).
// For an expense with participantIds set: that subset, filtered to confirmed
// (or just that subset for "if all join").
export function participantsForExpense(expense, people, { confirmedOnly, includeOrganizer }) {
  const guests = people.filter(p => p.role !== 'organizer');
  const organizer = people.find(p => p.role === 'organizer');
  const explicit = Array.isArray(expense.participantIds) && expense.participantIds.length > 0;

  let base;
  if (explicit) {
    const set = new Set(expense.participantIds);
    base = people.filter(p => set.has(p.id));
  } else {
    // Default: everyone (guests + organizer if included in split)
    base = [...guests];
    if (includeOrganizer && organizer) base.push(organizer);
  }

  if (!confirmedOnly) {
    // "If all join" denominator: don't filter out invited/declined
    // BUT still respect organizer opt-in: never include organizer unless flagged
    if (!includeOrganizer) base = base.filter(p => p.role !== 'organizer');
    return base;
  }

  return base.filter(p => {
    if (p.role === 'organizer') return includeOrganizer;
    return p.status === 'confirmed' || p.status === 'paid';
  });
}

// Compute a single person's expected share across all expenses they're on.
// Returns { share, breakdown: [{ expenseId, expenseName, amount, splitCount, perPerson }] }
export function computePersonShare(personId, expenses, people, opts) {
  const breakdown = [];
  let share = 0;
  for (const e of expenses) {
    const amt = Number(e.amount) || 0;
    if (amt <= 0) continue;
    const participants = participantsForExpense(e, people, opts);
    const ids = new Set(participants.map(p => p.id));
    if (!ids.has(personId)) continue;
    const splitCount = participants.length;
    if (splitCount === 0) continue;
    const perPerson = amt / splitCount;
    share += perPerson;
    breakdown.push({ expenseId: e.id, expenseName: e.name, amount: amt, splitCount, perPerson });
  }
  return { share, breakdown };
}

// Whether any expense uses per-expense participants (i.e. has a non-empty
// participantIds). Used to decide whether to show the breakdown UI.
export function hasPerExpenseSplits(expenses) {
  return (expenses || []).some(e => Array.isArray(e.participantIds) && e.participantIds.length > 0);
}
