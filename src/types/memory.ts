export interface Memory {
  id: string;
  imageUrl: string;
  caption: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar: string | null;
  };
}
