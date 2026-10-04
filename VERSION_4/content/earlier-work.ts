export type EarlierWorkEntry = { name: string; note?: string; url?: string };

/**
 * Academic and supporting work. Source: docs/FACTS.md section A. The last five entries are named
 * only. No description is known, so none is written.
 */
export const earlierWork: EarlierWorkEntry[] = [
  {
    name: "Ransomware Detection and Prevention",
    note: "Python, behavioral analysis. Monitors file-system activity and halts encryption processes on ransomware-like behavior.",
    url: "https://github.com/DHARANI2D/ransomware_detection",
  },
  {
    name: "Deep Fake Detection",
    note: "Machine learning. Audio and video spectral analysis.",
    url: "https://github.com/DHARANI2D/Deep_Fake_Detection",
  },
  {
    name: "Structured Terraform",
    note: "Terraform, AWS, Kubernetes. Modular, environment-specific configuration with secure state.",
    url: "https://github.com/DHARANI2D/terraform-aws",
  },
  {
    name: "QuantCrypt",
    note: "AWS S3 with quantum-resistant algorithms and secure key management.",
    url: "https://github.com/DHARANI2D/quantum-crypt-encryption",
  },
  {
    name: "Sentinel AI",
    note: "Node.js, TypeScript, React. Detects phishing, scams and malicious URLs by combining rule-based detection with LLM-driven reasoning. Real-time threat monitoring.",
  },
  { name: "Health Predictor" },
  { name: "Grade Predictor" },
  { name: "Celebria" },
  { name: "BADAD" },
  { name: "Accounting App" },
];
