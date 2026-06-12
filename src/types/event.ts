export interface Event {
  id: string;
  title: string;
  eventDate: string;
  type: string; // 'anniversary' | 'birthday' | 'date' | 'exam' | 'custom'
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}
