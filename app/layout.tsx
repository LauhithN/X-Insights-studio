import type { Metadata } from "next";
import "./globals.css";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://x-insights-studio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "X Insights Studio",
    template: "%s | X Insights Studio"
  },
  description:
    "CSV-first analytics workspace for X. Find top follower-converting posts, timing windows, and growth insights without API setup.",
  keywords: [
    "X analytics",
    "Twitter analytics",
    "CSV analytics",
    "social media dashboard",
    "creator analytics"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "X Insights Studio",
    description:
      "Upload X analytics CSVs and get conversion, growth, and posting-time insights in minutes.",
    url: "/",
    siteName: "X Insights Studio",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "X Insights Studio",
    description:
      "A CSV-first analytics studio for X exports: conversion, engagement, and timing insights."
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
