// Socials are copied from each channel's public Twitch page (schema.org sameAs
// on the profile). Do not add a network that is not in that list.

export type CreatorSocial = {
  name: "Twitch" | "X" | "YouTube" | "TikTok" | "Instagram" | "Discord";
  href: string;
};

export type Creator = {
  name: string;
  twitchLogin: string;
  line: string;
  avatar: string;
  socials: CreatorSocial[];
};

export const CREATORS: Creator[] = [
  {
    name: "Cyclops",
    twitchLogin: "cvcyclops",
    line: "Hanging out after the 1k. Once Human, Labyrinthine, and chill nights.",
    avatar: "https://static-cdn.jtvnw.net/jtv_user_pictures/bda2877e-9546-4bc6-9f98-2630df4343c4-profile_image-300x300.png",
    socials: [
      { name: "Twitch", href: "https://www.twitch.tv/cvcyclops" },
      { name: "YouTube", href: "https://www.youtube.com/@CVCyclops" },
      { name: "Instagram", href: "https://www.instagram.com/cvcyclops/" },
    ],
  },
  {
    name: "Demon Hunter",
    twitchLogin: "the_demon_hunter3",
    line: "Your local hunter. Variety nights, The Witcher, and the road to 1k.",
    avatar: "https://static-cdn.jtvnw.net/jtv_user_pictures/46c52d21-60fb-42db-ba67-df1518a143b5-profile_image-300x300.png",
    socials: [
      { name: "Twitch", href: "https://www.twitch.tv/the_demon_hunter3" },
      { name: "X", href: "https://x.com/THEdemonHUNT3er" },
      { name: "TikTok", href: "https://www.tiktok.com/@the_demon_hunter3" },
    ],
  },
];

export const SHOUTOUT_LOGINS = new Set(CREATORS.map((creator) => creator.twitchLogin));
