import { query as q } from "faunadb";
import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { fauna } from "../../../services/fauna";

export default NextAuth({
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      scope: "read:user",
    }),
  ],
  theme: "auto",
  callbacks: {
    async signIn(user, account, profile) {
      const { email } = user;

      if (!email) {
        return false;
      }

      try {
        await fauna.query(
          q.If(
            q.Not(
              q.Exists(q.Match(q.Index("user_by_email"), q.Casefold(email)))
            ),
            q.Create(q.Collection("users"), {
              data: {
                email: email,
              },
            }),
            q.Get(q.Match(q.Index("user_by_email"), q.Casefold(email)))
          )
        );
        return true;
      } catch (error) {
        return false;
      }
    },
  },
});
