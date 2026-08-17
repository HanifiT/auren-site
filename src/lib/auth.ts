import type { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";

import { recordLogin } from "./db";

/**
 * Discord OAuth2.
 *
 * Scopes are `identify guilds` and nothing more. `email` is deliberately not
 * requested: the site has no use for it, and not holding it is simpler than
 * holding it responsibly.
 *
 * `guilds` is requested so we can tell at login whether the person is actually
 * in the Auren server, which is the one fact the site needs that `identify`
 * cannot provide.
 *
 * Sessions are JWT rather than database-backed, which is why 001 has no
 * session table.
 */
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? "",
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],

  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, account, profile }) {
      // Only runs on the initial sign-in, when we still hold the access token.
      if (account?.access_token && profile) {
        const p = profile as {
          id: string;
          username: string;
          global_name?: string | null;
          avatar?: string | null;
        };

        let inGuild = false;
        try {
          const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
            headers: { Authorization: `Bearer ${account.access_token}` },
            // Discord's guild list is stable enough for a login-time check.
            cache: "no-store",
          });
          if (res.ok) {
            const guilds = (await res.json()) as Array<{ id: string }>;
            inGuild = guilds.some((g) => g.id === GUILD_ID);
          }
        } catch {
          // A failed membership check must not block the login. Defaulting to
          // false is the safe direction: it under-privileges rather than over.
          inGuild = false;
        }

        token.discordId = p.id;
        token.username = p.username;
        token.inGuild = inGuild;

        try {
          await recordLogin({
            discordId: p.id,
            username: p.username,
            globalName: p.global_name ?? null,
            avatarHash: p.avatar ?? null,
            inGuild,
          });
        } catch (err) {
          // The database being down should not stop someone signing in; it
          // should be loud in the logs instead.
          console.error("recordLogin failed", err);
        }
      }
      return token;
    },

    async session({ session, token }) {
      session.discordId = token.discordId as string | undefined;
      session.inGuild = Boolean(token.inGuild);
      return session;
    },
  },

  pages: { signIn: "/" },
};
