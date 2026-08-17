import "next-auth";

declare module "next-auth" {
  interface Session {
    /** Discord snowflake, as a string — it exceeds Number.MAX_SAFE_INTEGER. */
    discordId?: string;
    /** Whether this account is a member of the Auren guild. */
    inGuild?: boolean;
  }
}
