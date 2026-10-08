import { describe, expect, it } from "vitest";
import { answerQuestion, type KnowledgeDoc } from "@/lib/assistant";

const DOCS: KnowledgeDoc[] = [
  {
    id: "about",
    title: "Dharanidharan Senthilkumar",
    kind: "about",
    text: "Security Engineer focused on detection, cloud and AI security.\nBased in India. Open to global roles.",
    open: "about",
  },
  {
    id: "project:helios",
    title: "HELIOS",
    kind: "project",
    text: "Autonomous security investigation, evidence first.\nA multi-agent platform that turns forensic evidence into an investigation graph.\nStatus: In development.",
    open: "open helios",
  },
  {
    id: "project:owl",
    title: "OWL",
    kind: "project",
    text: "A capability-secured, agent-native operating system.\nIt is written in Rust and targets x86-64.",
    open: "open owl",
  },
  {
    id: "experience:facilio",
    title: "Facilio",
    kind: "experience",
    text: "Member of Technical Staff (Intern).\n2024.\nWorked with Redis, Kafka and Apache.",
    open: "experience",
  },
  {
    id: "certifications",
    title: "Certifications",
    kind: "certifications",
    text: "Earned: AWS Certified Cloud Practitioner; ISC2 Certified in Cybersecurity (CC).",
    open: "certifications",
  },
  {
    id: "contact",
    title: "Contact",
    kind: "contact",
    text: "Email: someone@example.com\nLinkedIn: https://www.linkedin.com/in/someone",
    open: "contact",
  },
];

describe("answerQuestion", () => {
  it("answers from the document whose title the question names", () => {
    const answer = answerQuestion("Tell me about HELIOS", DOCS);
    expect(answer.found).toBe(true);
    expect(answer.lines[0]).toBe("SYSTEM / HELIOS");
    expect(answer.lines.join("\n")).toContain("investigation graph");
    expect(answer.lines.join("\n")).toContain('Type "open helios"');
  });

  it("finds a fact in the body of a document", () => {
    const answer = answerQuestion("what did you do with kafka?", DOCS);
    expect(answer.found).toBe(true);
    expect(answer.lines[0]).toBe("EXPERIENCE / Facilio");
    expect(answer.lines.join("\n")).toContain("Redis, Kafka and Apache");
  });

  it("uses the kind of question: certifications and contact details", () => {
    expect(answerQuestion("Which certifications do you have?", DOCS).lines[0]).toBe(
      "CERTIFICATIONS / Certifications",
    );
    const contact = answerQuestion("How can I contact you?", DOCS);
    expect(contact.lines[0]).toBe("CONTACT / Contact");
    expect(contact.lines.join("\n")).toContain("someone@example.com");
  });

  it("matches plurals and word endings", () => {
    expect(answerQuestion("operating systems", DOCS).lines[0]).toBe("SYSTEM / OWL");
  });

  it("says it found nothing instead of guessing", () => {
    expect(answerQuestion("what is the weather in Paris", DOCS)).toEqual({
      found: false,
      lines: [],
    });
    expect(answerQuestion("", DOCS).found).toBe(false);
    expect(answerQuestion("the of and", DOCS).found).toBe(false);
  });

  it("treats hostile words as ordinary words", () => {
    for (const word of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(() => answerQuestion(word, DOCS)).not.toThrow();
      expect(answerQuestion(word, DOCS).found).toBe(false);
    }
  });

  it("only repeats text that is in the documents", () => {
    const answer = answerQuestion("Tell me about HELIOS", DOCS);
    const corpus = DOCS.map((doc) => doc.text).join("\n");
    for (const line of answer.lines.slice(1)) {
      if (line === "" || line.startsWith("Type ") || line.startsWith("Related:")) continue;
      expect(corpus).toContain(line);
    }
  });
});
