// Public business details shared by the website, emails, and the HQ.
// Private values (passwords, API keys) live only in environment variables.

export const site = {
  name: "Northstar Learning Montreal",
  shortName: "Northstar",
  tutor: "Gregory",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://northstar-learning-montreal.vercel.app").replace(/\/$/, ""),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "gregory.sudjian@gmail.com",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || "",
  linkedin: "https://www.linkedin.com/in/gregorysutjian/",
};
