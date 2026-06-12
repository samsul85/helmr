export function isProUser(user) {
  if (!user) return false;
  const metadata = user.user_metadata || {};
  return metadata.plan === 'pro' || metadata.pro === true;
}
