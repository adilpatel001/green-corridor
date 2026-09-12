// Phase 6: role-based views.
//
// IMPORTANT CAVEAT, worth stating plainly rather than glossing over: this
// is NOT real authentication. The role comes from a client-supplied
// header, which anyone can set to whatever they want with a single curl
// flag. This demonstrates the *authorization pattern* — routes checking
// a role and enforcing it server-side, not just hiding a button in the
// UI — without building a login system, which was never part of this
// project's scope. A real version would derive the role from a verified
// session or JWT, not a header the client controls.

export function requireAuthority(req, res, next) {
  if (req.headers["x-role"] !== "authority") {
    return res.status(403).json({ error: "Authority role required for this action" });
  }
  next();
}