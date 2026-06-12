export interface User {
  id: string;
  name: string;
  avatar: string | null;
  email?: string;
}

export interface Couple {
  id: string;
  partner1: User;
  partner2: User;
  startDate: string;
  inviteCode: string;
}
