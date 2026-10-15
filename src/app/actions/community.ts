'use server';

export async function addCommunityComment(_input: { postId: string; commentText: string }) {
  return { ok: false as const, error: 'المنتدى قيد التطوير' };
}

export async function likeCommunityPost(_postId: string) {
  return { ok: false as const, error: 'المنتدى قيد التطوير' };
}
