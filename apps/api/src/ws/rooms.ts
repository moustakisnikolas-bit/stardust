export function matchRoom(matchId: string): string {
  return `match:${matchId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}
