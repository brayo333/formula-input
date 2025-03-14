import { create } from "zustand";

export type AutoCompObj = {
  name: string;
  category: string;
  value: string | number;
  id: string;
};

interface StoreState {
  tags: AutoCompObj[];
  setTags: (tags: AutoCompObj[]) => void;
}

export const useStore = create<StoreState>((set) => ({
  tags: [],
  setTags: (tags) => set({ tags }),
}));
