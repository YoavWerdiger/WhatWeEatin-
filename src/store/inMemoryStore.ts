import {
  Match,
  Restaurant,
  Session,
  SessionCandidate,
  SessionMember,
  User,
  Vote,
} from "../domain/types.js";

export class InMemoryStore {
  users = new Map<string, User>();
  sessions = new Map<string, Session>();
  membersBySession = new Map<string, SessionMember[]>();
  restaurants = new Map<string, Restaurant>();
  candidatesBySession = new Map<string, SessionCandidate[]>();
  votesBySession = new Map<string, Vote[]>();
  matchesBySession = new Map<string, Match>();

  reset(): void {
    this.users.clear();
    this.sessions.clear();
    this.membersBySession.clear();
    this.restaurants.clear();
    this.candidatesBySession.clear();
    this.votesBySession.clear();
    this.matchesBySession.clear();
  }
}
