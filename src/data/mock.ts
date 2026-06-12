import { DashboardResponse } from "@/types/dashboard";
import { Memory } from "@/types/memory";
import { Journal } from "@/types/journal";
import { Event } from "@/types/event";
import { Note } from "@/types/note";
import { Couple } from "@/types/user";

export const mockCouple: Couple = {
  id: "c1",
  partner1: {
    id: "u1",
    name: "Alex",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
    email: "alex@lovespace.com"
  },
  partner2: {
    id: "u2",
    name: "Sam",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
    email: "sam@lovespace.com"
  },
  startDate: "2023-01-05",
  inviteCode: "LOVE-987-XCS"
};

export const mockMemories: Memory[] = [
  {
    id: "m1",
    imageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=800",
    caption: "Our first trip to Da Lat together. The coffee was amazing, the weather was chilly, and your smile warmed everything up.",
    createdAt: "2023-10-15T08:00:00Z",
    author: {
      id: "u1",
      name: "Alex",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
    }
  },
  {
    id: "m2",
    imageUrl: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&q=80&w=800",
    caption: "Lazy Sunday coffee date. You were busy reading while I was just admiring you.",
    createdAt: "2023-11-02T14:30:00Z",
    author: {
      id: "u2",
      name: "Sam",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
    }
  },
  {
    id: "m3",
    imageUrl: "https://images.unsplash.com/photo-1494774157365-9e04c6720e47?auto=format&fit=crop&q=80&w=800",
    caption: "Sunset stroll at Vung Tau beach. The sky was painted in purple and pink.",
    createdAt: "2023-12-25T18:00:00Z",
    author: {
      id: "u1",
      name: "Alex",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
    }
  },
  {
    id: "m4",
    imageUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&q=80&w=800",
    caption: "Count down to 2026. Another beautiful year ahead with you!",
    createdAt: "2026-01-01T00:00:00Z",
    author: {
      id: "u2",
      name: "Sam",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
    }
  },
  {
    id: "m5",
    imageUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800",
    caption: "Happy wedding anniversary of our best friends. Made us think about ours.",
    createdAt: "2026-02-14T19:00:00Z",
    author: {
      id: "u1",
      name: "Alex",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
    }
  },
  {
    id: "m6",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=800",
    caption: "Weekend hiking. So tired but the view from the top with you was worth it.",
    createdAt: "2026-03-22T11:00:00Z",
    author: {
      id: "u2",
      name: "Sam",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120"
    }
  }
];

export const mockJournals: Journal[] = [
  {
    id: "j1",
    title: "The Magic Anniversary Dinner",
    content: "We decided to try the new rooftop restaurant in District 1. The view was absolutely breathtaking, showing the sparkling cityscape. We ordered two steaks and a bottle of red wine. We talked about how much we've grown since we first met at that coffee shop 3 years ago. You looked so stunning in your black dress. It's one of those nights I'll hold close to my heart forever. Thank you for being my partner in everything.",
    imageUrl: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800",
    createdAt: "2026-02-14T22:30:00Z",
    author: {
      id: "u2",
      name: "Sam"
    }
  },
  {
    id: "j2",
    title: "Quiet Rainy Movie Night",
    content: "It rained cats and dogs outside, so we canceled our dinner plans and stayed in. We ordered pizza, built a cozy blanket fort in the living room, and watched a marathon of old mystery movies. We fell asleep halfway through the third movie, tangled in blankets. Sometimes the best dates are the ones where we do absolutely nothing together.",
    imageUrl: null,
    createdAt: "2026-02-10T21:45:00Z",
    author: {
      id: "u1",
      name: "Alex"
    }
  },
  {
    id: "j3",
    title: "Cooking Disaster but Lots of Laughs",
    content: "We tried to bake a soufflé today. It went completely flat, and the kitchen looked like a flour bomb went off. But ordering Thai takeout and eating it on the kitchen floor while covered in flour made it the best cooking experience ever. I love that we can turn any failure into a fun memory.",
    imageUrl: null,
    createdAt: "2026-01-20T18:15:00Z",
    author: {
      id: "u2",
      name: "Sam"
    }
  }
];

export const mockEvents: Event[] = [
  {
    id: "e1",
    title: "Sam's 25th Birthday 🎉",
    eventDate: "2026-07-12T00:00:00Z",
    type: "birthday"
  },
  {
    id: "e2",
    title: "Summer Trip to Phu Quoc 🏖️",
    eventDate: "2026-08-15T00:00:00Z",
    type: "trip"
  },
  {
    id: "e3",
    title: "Our 3rd Year Anniversary 💖",
    eventDate: "2026-10-15T00:00:00Z",
    type: "anniversary"
  },
  {
    id: "e4",
    title: "Weekend Date at Art Exhibition 🎨",
    eventDate: "2026-06-20T00:00:00Z",
    type: "date"
  }
];

export const mockNotes: Note[] = [
  {
    id: "n1",
    content: "📌 Keep this in mind: Our flight to Phu Quoc departs at 7:30 AM on August 15. We need to be at the airport by 5:30 AM! Don't oversleep!",
    isPinned: true
  },
  {
    id: "n2",
    content: "🛒 Groceries for this week:\n- Almond milk\n- Avocados\n- Spaghetti pasta\n- Fresh basil\n- Dark chocolate (your favorite!)",
    isPinned: false
  },
  {
    id: "n3",
    content: "💡 Cafe to visit next time:\n- 'The Hidden Garden' in District 3\n- Has lots of trees and quiet music, perfect for reading.",
    isPinned: false
  },
  {
    id: "n4",
    content: "🎵 Songs to add to our shared playlist:\n- 'Midnight City' - M83\n- 'Like Real People Do' - Hozier\n- 'Beyond' - Leon Bridges",
    isPinned: false
  }
];

export const mockDashboard: DashboardResponse = {
  loveDays: 1250,
  totalMemories: 342,
  totalJournals: 56,
  upcomingEvents: 4,
  latestMemories: mockMemories.slice(0, 4),
  recentJournals: mockJournals.slice(0, 2),
  pinnedNote: mockNotes[0]
};
