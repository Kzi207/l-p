export interface Journal {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
}
