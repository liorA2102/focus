import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const JACOB = `יעקב אבידר, מנכ"ל Focus Group — חברת גיוס ומיקום בעלת 33 שנות ניסיון`;
const JACOB_EN = `Jacob Avidar, CEO at Focus Group — a 33-year veteran recruiting and placement firm`;

export async function POST(req: NextRequest) {
  const {
    // position-post fields
    title, location, salaryRange, description, requirements,
    // studio-post fields
    postType, hint,
    // shared
    lang, action, currentText,
  } = await req.json();

  const isHe = lang === "he";
  let prompt: string;

  // ── Shorten / Expand (shared) ──
  if (action === "shorten") {
    prompt = isHe
      ? `אתה עורך פוסט לינקדאין. קצר את הפוסט הבא ב-30%, שמור על כל המידע החיוני. החזר רק את טקסט הפוסט המקוצר.\n\n${currentText}`
      : `You are editing a LinkedIn post. Shorten the following post by ~30%, keeping all essential information. Return only the shortened post text.\n\n${currentText}`;
    } else if (action === "expand") {
    prompt = isHe
      ? `אתה עורך פוסט לינקדאין. הרחב את הפוסט הבא ב-30%, הוסף פרטים ומשיכה. החזר רק את טקסט הפוסט המורחב.\n\n${currentText}`
      : `You are editing a LinkedIn post. Expand the following post by ~30%, adding more detail and appeal. Return only the expanded post text.\n\n${currentText}`;

  // ── Studio: Holiday post ──
  } else if (postType === "holiday") {
    prompt = isHe
      ? `אתה כותב פוסט לינקדאין עבור ${JACOB}.
כתוב פוסט ברכה לחג בעברית. סגנון: חם, אישי, קצר (4-6 שורות). אל תיכנס לפוסט דתי מדי — שמור על טון מקצועי-אנושי.
${hint ? `הוראות נוספות: ${hint}` : ""}
החזר רק את טקסט הפוסט.`
      : `You are writing a LinkedIn post for ${JACOB_EN}.
Write a warm, short holiday greeting post in English (4-6 lines). Keep it professional yet human — not too religious.
${hint ? `Additional instructions: ${hint}` : ""}
Return only the post text.`;

  // ── Studio: PR / Company post ──
  } else if (postType === "pr") {
    prompt = isHe
      ? `אתה כותב פוסט לינקדאין עבור ${JACOB}.
כתוב פוסט עסקי/חברה בעברית — יכול להיות הישג, תובנה מקצועית, או עדכון מהחברה. סגנון: מקצועי, ביטחוני, קצר.
${hint ? `נושא/מידע: ${hint}` : ""}
החזר רק את טקסט הפוסט.`
      : `You are writing a LinkedIn post for ${JACOB_EN}.
Write a professional company/PR post in English — an achievement, professional insight, or company update. Style: confident, professional, concise.
${hint ? `Topic/info: ${hint}` : ""}
Return only the post text.`;

  // ── Job post (position detail or studio) ──
  } else {
    prompt = isHe
      ? `אתה כותב פוסטים לינקדאין עבור ${JACOB}.

כתוב פוסט לינקדאין בעברית לפרסום משרה. סגנון: ישיר, מקצועי, רשימות קצרות. מבנה:
- שורת פתיחה בולטת (תפקיד בלבד — אל תזכיר שם חברת הלקוח)
- 2-3 משפטים על תחום העבודה/הסביבה
- רשימת דרישות (bullets)
- שכר אם ידוע
- שורת סיום: ניתן לעבור קו"ח ל: cv@focusgroup.co.il
${hint ? `\nהנחיות נוספות: ${hint}` : ""}
פרטי המשרה:
${title    ? `תפקיד: ${title}` : ""}
${location   ? `מיקום: ${location}` : ""}
${salaryRange ? `שכר: ${salaryRange}` : ""}
${description  ? `תיאור: ${description}` : ""}
${requirements ? `דרישות: ${requirements}` : ""}

החזר רק את טקסט הפוסט, ללא כותרות או הסברים.`
      : `You are writing LinkedIn posts for ${JACOB_EN}.

Write a LinkedIn job post in English. Style: direct, professional, short bullet lists. Structure:
- Strong opening line (role only — do NOT mention the client company name)
- 2-3 sentences about the field/environment
- Requirements list (bullets)
- Salary if known
- Closing: Send CV to: cv@focusgroup.co.il
${hint ? `\nAdditional instructions: ${hint}` : ""}
Position details:
${title    ? `Title: ${title}` : ""}
${location   ? `Location: ${location}` : ""}
${salaryRange ? `Salary: ${salaryRange}` : ""}
${description  ? `Description: ${description}` : ""}
${requirements ? `Requirements: ${requirements}` : ""}

Return only the post text, no headers or commentary.`;
  }

  const msg = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 800,
    messages: [{ role: "user", content: prompt }],
  });

  const text = msg.content[0].type === "text" ? msg.content[0].text : "";
  return NextResponse.json({ text });
}
