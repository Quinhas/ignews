import Prismic from "@prismicio/client";

export function getPrismicClient(req?: unknown) {
  const prismic = Prismic.client(String(process.env.PRISMIC_ENDPOINT), {
    req,
    accessToken: String(process.env.PRISMIC_ACCESS_TOKEN),
  });

  return prismic;
}
