export interface Note {
  id: string;
  houseId: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  isPinned: boolean;
}