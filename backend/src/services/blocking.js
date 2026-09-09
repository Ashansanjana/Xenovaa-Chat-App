import { supabase } from '../config/supabaseClient.js';

export async function isBlockedEitherWay(userAId, userBId) {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('id')
    .or(
      `and(blocker_id.eq.${userAId},blocked_id.eq.${userBId}),and(blocker_id.eq.${userBId},blocked_id.eq.${userAId})`
    )
    .maybeSingle();

  if (error) throw error;
  return !!data;
}
