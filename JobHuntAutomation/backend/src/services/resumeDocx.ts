import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

export async function buildResumeDocx(params: {
  candidateName: string;
  summary: string;
  skills: string[];
  bullets: string[];
}): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: params.candidateName, heading: HeadingLevel.TITLE }),
          new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new TextRun(params.summary)] }),
          new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ children: [new TextRun(params.skills.join(", "))] }),
          new Paragraph({ text: "Experience Highlights", heading: HeadingLevel.HEADING_2 }),
          ...params.bullets.map(
            (b) => new Paragraph({ text: b, bullet: { level: 0 } })
          ),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
