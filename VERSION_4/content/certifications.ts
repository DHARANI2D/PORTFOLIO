import type { z } from "zod";
import type { Certification } from "@/content/schema";

type CertificationInput = z.input<typeof Certification>;

/**
 * Source: docs/FACTS.md section A. Years are known only for the two Proofpoint certifications and
 * are not inferred for any other. The Proofpoint certifications have no public link. Planned items
 * are the owner's stated direction, not earned, and carry no year or link.
 */
export const certificationEntries: CertificationInput[] = [
  {
    name: "Proofpoint AI Data Security Specialist",
    issuer: "Proofpoint",
    status: "verified",
    year: "2025",
  },
  {
    name: "Proofpoint AI Email Security Specialist",
    issuer: "Proofpoint",
    status: "verified",
    year: "2025",
  },
  {
    name: "AWS Certified Cloud Practitioner",
    issuer: "Amazon Web Services",
    status: "verified",
    url: "https://www.credly.com/badges/cc8bf7c0-904d-4c17-b65c-68e85343e29e/public_url",
  },
  {
    name: "Microsoft Azure Fundamentals (AZ-900)",
    issuer: "Microsoft",
    status: "verified",
    url: "https://learn.microsoft.com/en-us/users/dharanidharansenthilkumar-6756/credentials/aad1a5408e695541",
  },
  {
    name: "Fortinet NSE 1 Network Security Associate",
    issuer: "Fortinet",
    status: "verified",
    url: "https://www.credly.com/badges/65f7a98e-7448-4cbe-a487-415b581e9d74/public_url",
  },
  {
    name: "Fortinet NSE 2 Associate",
    issuer: "Fortinet",
    status: "verified",
    url: "https://www.credly.com/badges/3b954dc3-8ae3-4e40-bbac-0d17da9f71fc/public_url",
  },
  {
    name: "TigerGraph Associate",
    issuer: "TigerGraph",
    status: "verified",
    url: "https://drive.google.com/file/d/1_sxQoQdSRJzYMeLQkDwJGYQMjtfoWGEH/view?usp=sharing",
  },
  {
    name: "ISC2 Certified in Cybersecurity (CC)",
    issuer: "ISC2",
    status: "verified",
    url: "https://www.credly.com/badges/dcd906b2-db62-4386-a5ce-940699f3a576",
  },
  {
    name: "AWS Solutions Architect",
    issuer: "Amazon Web Services",
    status: "planned",
  },
  {
    name: "Security-focused certifications",
    status: "planned",
  },
  {
    name: "AI security specialization",
    status: "planned",
  },
];
