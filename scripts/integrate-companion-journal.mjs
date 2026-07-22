import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const siteRoot = "_site/divine-blueprint-site";
const assetsRoot = join(siteRoot, "assets");
const downloadsRoot = join(assetsRoot, "downloads");
const PAGE_W = 504;
const PAGE_H = 720;
const CREAM = [0.975, 0.962, 0.925];
const PAPER = [0.995, 0.99, 0.97];
const NAVY = [0.035, 0.105, 0.19];
const GOLD = [0.71, 0.48, 0.16];
const INK = [0.08, 0.12, 0.17];
const MUTED = [0.38, 0.4, 0.42];

if (!existsSync(siteRoot)) throw new Error("Divine Blueprint site must be extracted before Companion integration.");
await mkdir(downloadsRoot, { recursive: true });

const chapters = [
  {
    number: 1,
    title: "The Light of Men",
    key: "In Him was life; and the life was the light of men. - John 1:4",
    scriptures: ["Genesis 1:1-3", "John 1:1-5", "John 1:12", "2 Corinthians 5:17"],
    themes: ["Darkness", "Light", "Identity", "Recreation", "Purpose"],
    objectives: ["Recognize Jesus as the Light who begins God's recreative work.", "Identify areas of darkness, emptiness, and disorder.", "Receive the ministry of the Spirit and the Word.", "Cooperate with God's work of new creation."],
    prayer: "Father, expose every place that needs Your light. Let me encounter Jesus afresh, receive Your truth, and cooperate with Your recreative work. Amen.",
    summary: "God begins recreation by bringing the Light of Christ into darkness. The Spirit prepares the heart, the Word speaks life, and identity, order, and purpose begin to emerge.",
    prompts: ["Where do I need God's light most today?", "What false identity must I surrender?", "What emptiness have I tried to fill without God?", "What new beginning is God inviting me to receive?"],
    practices: ["Read John 1 each morning.", "Pray before checking your phone.", "Memorize John 1:4.", "Spend one hour without distraction.", "Record one insight each day."],
    declarations: ["I reject darkness.", "I receive the Light of Christ.", "I belong to God.", "My life has divine purpose.", "The Word recreates me daily.", "The Holy Spirit is working in me."],
    milestone: "The clearest evidence of God's light in me is..."
  },
  {
    number: 2,
    title: "If Children, Then Heirs",
    key: "And if children, then heirs; heirs of God, and joint-heirs with Christ. - Romans 8:17",
    scriptures: ["Romans 8:15-17", "Colossians 1:12-14", "Galatians 4:5-7", "Ephesians 1:13-14"],
    themes: ["Adoption", "Redemption", "Translation", "Inheritance", "Belonging"],
    objectives: ["Understand the Spirit of adoption.", "See redemption and translation as one salvation work.", "Receive your identity as God's child.", "Begin living with the consciousness of inheritance."],
    prayer: "Father, deliver me from the mentality of bondage. Teach my heart to cry Abba, receive my place in Your family, and walk gratefully as an heir in Christ. Amen.",
    summary: "In Christ we are redeemed from darkness, translated into the kingdom of the Son, sealed by the Spirit, and welcomed into God's household as children and heirs.",
    prompts: ["Where do I still think like an outsider?", "What does adoption reveal about God's heart?", "Which part of my inheritance have I neglected?", "How should belonging to God's family change my choices?"],
    practices: ["Thank God daily for adoption.", "Read Romans 8 aloud.", "Reject one fear-based decision.", "Serve a member of God's family.", "List five gifts of grace you have received."],
    declarations: ["I have received the Spirit of adoption.", "God is my Father.", "I am redeemed from darkness.", "I belong in God's household.", "I am an heir of God.", "My identity is secure in Christ."],
    milestone: "Living as an heir will change this area of my life..."
  },
  {
    number: 3,
    title: "Partakers of His Divine Nature",
    key: "That by these ye might be partakers of the divine nature. - 2 Peter 1:4",
    scriptures: ["2 Peter 1:3-4", "Hebrews 4:14-16", "Romans 8:3-4", "Philippians 2:13"],
    themes: ["Holiness", "Access", "Power", "Grace", "Transformation"],
    objectives: ["Understand participation in Christ's nature.", "Receive grace for holiness rather than self-effort.", "Approach the Father with confidence.", "Yield to resurrection power in daily life."],
    prayer: "Father, thank You for making me a partaker of Christ's life. Let Your holiness, access, power, and grace become visible in the way I live. Amen.",
    summary: "Our union with Christ gives us participation in His holiness, access to the Father, and the power of His risen life. Transformation flows from grace and the indwelling Spirit.",
    prompts: ["Where am I still striving instead of receiving grace?", "What does bold access to God mean for me?", "Which habit resists Christ's nature?", "Where do I need resurrection power?"],
    practices: ["Approach God boldly in prayer.", "Meditate on 2 Peter 1:3-4.", "Replace striving with dependence.", "Choose holiness in one practical area.", "Thank God for His indwelling power."],
    declarations: ["Christ's life is at work in me.", "I partake of His holiness.", "I have access to the Father.", "Grace empowers my obedience.", "The Spirit fulfills God's will in me.", "I am being transformed."],
    milestone: "One expression of Christ's nature growing in me is..."
  },
  {
    number: 4,
    title: "But Is Under Tutors",
    key: "But is under tutors and governors until the time appointed of the father. - Galatians 4:2",
    scriptures: ["Galatians 4:1-2", "Matthew 11:28-30", "Ephesians 4:11-14", "John 14:26"],
    themes: ["Tutorship", "Discipleship", "Correction", "Submission", "Growth"],
    objectives: ["Recognize the necessity of spiritual formation.", "Discern God's tutors and provisions for growth.", "Receive correction without losing sight of Christ.", "Submit to the Holy Spirit as the primary Tutor."],
    prayer: "Father, give me a teachable heart. Help me recognize Your provisions for growth, receive correction humbly, and remain yoked to Christ. Amen.",
    summary: "Inheritance does not remove the need for training. God uses the Holy Spirit, Scripture, discipleship, and mature believers to form children into stable and fruitful sons.",
    prompts: ["Where do I resist instruction?", "Who has God used to shape me?", "How do I respond to correction?", "What provision for growth am I overlooking?"],
    practices: ["Ask for honest spiritual feedback.", "Honor a faithful mentor.", "Study one correction from Scripture.", "Practice listening before defending.", "Obey one instruction promptly."],
    declarations: ["I am teachable.", "The Holy Spirit is my primary Tutor.", "Correction produces growth in me.", "I receive God's provisions for maturity.", "Jesus is my perfect pattern.", "I am being established in truth."],
    milestone: "The tutorship I need to embrace now is..."
  },
  {
    number: 5,
    title: "Becoming Sons",
    key: "Let us go on unto perfection. - Hebrews 6:1",
    scriptures: ["Hebrews 6:1-3", "Romans 8:14", "1 Corinthians 3:1-3", "Hebrews 5:12-14"],
    themes: ["Maturity", "Responsibility", "Discernment", "Obedience", "Character"],
    objectives: ["Distinguish belonging from maturity.", "Identify marks of spiritual childhood.", "Accept responsibility for continued growth.", "Develop discernment and Christlike character."],
    prayer: "Father, lead me beyond spiritual childhood. Form Christ in me, strengthen my discernment, and make me responsible with truth, relationships, and assignment. Amen.",
    summary: "Sonship describes maturity: a life increasingly led by the Spirit, able to receive strong truth, take responsibility, discern wisely, and express the character of Christ.",
    prompts: ["Where am I still reacting like a spiritual child?", "What responsibility have I avoided?", "How is my discernment developing?", "Which character trait must mature next?"],
    practices: ["Choose responsibility over blame.", "Study a difficult passage patiently.", "Delay one impulsive response.", "Ask the Spirit for discernment.", "Complete one neglected assignment."],
    declarations: ["I am growing into maturity.", "I am led by the Spirit.", "I receive strong truth.", "I take kingdom responsibility.", "Christ's character is formed in me.", "I discern good and evil."],
    milestone: "The next evidence of maturity in my life will be..."
  },
  {
    number: 6,
    title: "The Cross in the Making of Sons",
    key: "If any man will come after me, let him deny himself, and take up his cross daily, and follow me. - Luke 9:23",
    scriptures: ["Luke 9:23", "Galatians 2:20", "1 Corinthians 9:26-27", "2 Corinthians 5:14-15"],
    themes: ["Self-Denial", "Surrender", "Obedience", "Endurance", "Following"],
    objectives: ["Understand the cross as a daily formation process.", "Identify demands of the flesh that resist God.", "Choose obedience over convenience.", "Follow Christ under the Spirit's leadership."],
    prayer: "Lord Jesus, teach me to deny myself, take up my cross daily, and follow You. Bring every desire, habit, and ambition under Your lordship. Amen.",
    summary: "The cross brings the self-life under Christ's lordship. Through daily surrender, disciplined obedience, endurance, and following the Spirit, Christ's life becomes visible in us.",
    prompts: ["What desire competes with Christ's lordship?", "Where is obedience currently costly?", "What comfort has become an idol?", "What would following Jesus look like today?"],
    practices: ["Fast from one appetite or distraction.", "Obey a difficult instruction.", "Pray Galatians 2:20 daily.", "Serve without recognition.", "Endure one inconvenience without complaint."],
    declarations: ["I am crucified with Christ.", "Christ lives in me.", "I choose obedience over convenience.", "My body is under the Spirit's rule.", "I follow Jesus daily.", "The cross is producing life in me."],
    milestone: "The surrender God is asking of me now is..."
  },
  {
    number: 7,
    title: "Knowledge in the Making of Sons",
    key: "That the God of our Lord Jesus Christ... may give unto you the spirit of wisdom and revelation. - Ephesians 1:17",
    scriptures: ["2 Peter 1:3-4", "Ephesians 1:15-20", "Philippians 3:10", "John 5:39"],
    themes: ["Revelation", "Knowledge", "Wisdom", "Inheritance", "Truth"],
    objectives: ["Distinguish information from revelational knowledge.", "Pursue intimate knowledge of God's Person.", "Discover inheritance through Scripture.", "Let truth shape choices and boundaries."],
    prayer: "Father, give me the Spirit of wisdom and revelation. Enlighten the eyes of my heart so I may know You, understand my inheritance, and walk in truth. Amen.",
    summary: "Mature sons need deep knowledge of God, His Word, and their inheritance. Revelation received in fellowship becomes wisdom, faith, stability, and transformed conduct.",
    prompts: ["What do I know about God only secondhand?", "Which truth must move from information to revelation?", "How has knowledge shaped my recent choices?", "Where do I need the eyes of my heart enlightened?"],
    practices: ["Study one passage slowly.", "Ask God one honest question.", "Journal what Scripture reveals about God.", "Replace one assumption with truth.", "Share one insight with another believer."],
    declarations: ["The eyes of my heart are enlightened.", "I know God personally.", "The Word reveals my inheritance.", "Truth governs my choices.", "Wisdom and revelation grow in me.", "I am stable in sound doctrine."],
    milestone: "A truth that has become living revelation to me is..."
  },
  {
    number: 8,
    title: "The Fellowship of the Spirit in the Making of Sons",
    key: "Truly our fellowship is with the Father, and with his Son Jesus Christ. - 1 John 1:3",
    scriptures: ["1 John 1:1-3", "2 Corinthians 3:18", "Romans 8:26", "Acts 2:42"],
    themes: ["Communion", "Prayer", "Word", "Brethren", "Transformation"],
    objectives: ["Understand fellowship as shared life with God.", "Depend on the Holy Spirit for communion.", "Practice fellowship through Word and prayer.", "Value the transforming fellowship of believers."],
    prayer: "Holy Spirit, draw me into deeper fellowship with the Father and the Son. Teach me in the Word, help me in prayer, and place me rightly in the fellowship of believers. Amen.",
    summary: "The Holy Spirit gives us access to living fellowship with the Father and Son. In prayer, Scripture, worship, and the gathering of believers, God's nature is shared and Christ is formed in us.",
    prompts: ["Is my fellowship with God truly two-way?", "How is the Spirit helping my prayer life?", "What has God recently shown me in His Word?", "How can I participate more faithfully in Christian fellowship?"],
    practices: ["Spend twenty minutes listening in prayer.", "Pray with Scripture.", "Join believers in meaningful fellowship.", "Encourage one person spiritually.", "Record what the Spirit highlights."],
    declarations: ["I have fellowship with the Father and Son.", "The Holy Spirit helps my weakness.", "God speaks to me through His Word.", "Prayer draws me into communion.", "I belong to Christ's body.", "Fellowship transforms me."],
    milestone: "The fellowship rhythm I will establish is..."
  },
  {
    number: 9,
    title: "The Manifestation of the Sons of God",
    key: "For the earnest expectation of the creature waiteth for the manifestation of the sons of God. - Romans 8:19",
    scriptures: ["Romans 8:18-19", "Colossians 1:27", "1 Corinthians 12:7-10", "Ephesians 4:11-13"],
    themes: ["Glory", "Service", "Gifts", "Assignment", "Multiplication"],
    objectives: ["Connect maturity with trustworthy manifestation.", "See Christ in believers as the hope of glory.", "Steward spiritual gifts for the profit of others.", "Multiply mature disciples in every sphere."],
    prayer: "Father, mature me for trustworthy manifestation. Let Christ be visible through my character, service, gifts, profession, and relationships. Use my life to equip others. Amen.",
    summary: "Manifestation is the mature expression of Christ through yielded sons. God's character, wisdom, power, gifts, service, and equipping grace address real needs and multiply His life in others.",
    prompts: ["What human need is God calling me to address?", "How is Christ becoming visible through me?", "Which gift or ability must I steward more faithfully?", "Who am I intentionally helping to mature?"],
    practices: ["Serve one real need this week.", "Use a gift for another person's benefit.", "Pray for your sphere of influence.", "Encourage an emerging disciple.", "Write a kingdom assignment statement."],
    declarations: ["Christ in me is the hope of glory.", "I am led and empowered by the Spirit.", "My gifts profit others.", "I bring God's wisdom into real needs.", "I serve faithfully in my sphere.", "I multiply mature disciples."],
    milestone: "My present sphere of kingdom manifestation is..."
  }
];

function ascii(value = "") {
  return String(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x20-\x7E\n]/g, "");
}
function esc(value) { return ascii(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function n(value) { return Number(value.toFixed(3)); }
function rgb(c, stroke = false) { return `${c.map(n).join(" ")} ${stroke ? "RG" : "rg"}`; }
function wrap(value, max = 70) {
  const lines = [];
  for (const paragraph of ascii(value).split(/\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > max && line) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    if (!words.length) lines.push("");
  }
  return lines;
}
function text(cmd, value, x, y, size = 10, font = "F1", color = INK) {
  cmd.push(`${rgb(color)} BT /${font} ${n(size)} Tf ${n(x)} ${n(y)} Td (${esc(value)}) Tj ET`);
}
function paragraph(cmd, value, x, y, widthChars = 72, size = 10, leading = 14, font = "F1", color = INK, maxLines = 99) {
  const lines = wrap(value, widthChars).slice(0, maxLines);
  lines.forEach((line, i) => text(cmd, line, x, y - i * leading, size, font, color));
  return y - lines.length * leading;
}
function line(cmd, x1, y1, x2, y2, color = GOLD, width = 0.7) { cmd.push(`${rgb(color, true)} ${n(width)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`); }
function rect(cmd, x, y, w, h, fill = null, stroke = null, width = 0.7) {
  if (fill) cmd.push(`${rgb(fill)} ${n(x)} ${n(y)} ${n(w)} ${n(h)} re f`);
  if (stroke) cmd.push(`${rgb(stroke, true)} ${n(width)} w ${n(x)} ${n(y)} ${n(w)} ${n(h)} re S`);
}
function fieldArea(cmd, fields, fillable, name, x, y, w, h, multiline = true) {
  rect(cmd, x, y, w, h, fillable ? PAPER : null, GOLD, 0.6);
  if (fillable) fields.push({ type: "text", name, x, y, w, h, multiline });
  else for (let yy = y + h - 18; yy > y + 8; yy -= 18) line(cmd, x + 8, yy, x + w - 8, yy, [0.72, 0.7, 0.65], 0.35);
}
function checkArea(cmd, fields, fillable, name, x, y, label) {
  rect(cmd, x, y, 12, 12, fillable ? PAPER : null, GOLD, 0.7);
  if (fillable) fields.push({ type: "checkbox", name, x, y, w: 12, h: 12 });
  text(cmd, label, x + 20, y + 2, 9.2, "F1", INK);
}

class PDFWriter {
  constructor() { this.objects = []; }
  reserve() { this.objects.push(null); return this.objects.length; }
  set(id, body) { this.objects[id - 1] = body; }
  add(body) { const id = this.reserve(); this.set(id, body); return id; }
  stream(dict, data) { return `<< ${dict} /Length ${Buffer.byteLength(data, "latin1")} >>\nstream\n${data}\nendstream`; }
  build(rootRef, infoRef) {
    let output = "%PDF-1.7\n%\xFF\xFF\xFF\xFF\n";
    const offsets = [0];
    for (let i = 0; i < this.objects.length; i++) {
      if (this.objects[i] == null) throw new Error(`Unset PDF object ${i + 1}`);
      offsets.push(Buffer.byteLength(output, "latin1"));
      output += `${i + 1} 0 obj\n${this.objects[i]}\nendobj\n`;
    }
    const xref = Buffer.byteLength(output, "latin1");
    output += `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i < offsets.length; i++) output += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    output += `trailer\n<< /Size ${this.objects.length + 1} /Root ${rootRef} 0 R /Info ${infoRef} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return Buffer.from(output, "latin1");
  }
}

function pageBase(cmd, pageNo, section = "THE DIVINE BLUEPRINT COMPANION") {
  rect(cmd, 0, 0, PAGE_W, PAGE_H, CREAM);
  rect(cmd, 0, PAGE_H - 25, PAGE_W, 25, NAVY);
  text(cmd, section, 34, PAGE_H - 17, 7.2, "F2", [0.88, 0.72, 0.39]);
  line(cmd, 34, 31, PAGE_W - 34, 31, GOLD, 0.5);
  text(cmd, String(pageNo), PAGE_W / 2 - 3, 17, 7, "F1", MUTED);
}
function pageTitle(cmd, kicker, titleValue, pageNo) {
  pageBase(cmd, pageNo);
  text(cmd, kicker.toUpperCase(), 42, 660, 8, "F2", GOLD);
  paragraph(cmd, titleValue, 42, 630, 34, 24, 27, "F4", NAVY, 3);
  line(cmd, 42, 572, PAGE_W - 42, 572, GOLD, 0.8);
}

function renderFrontPage(index, fillable, pageNo) {
  const cmd = [];
  const fields = [];
  if (index === 0) {
    rect(cmd, 0, 0, PAGE_W, PAGE_H, NAVY);
    for (let x = 25; x < PAGE_W; x += 32) line(cmd, x, 0, x, PAGE_H, [0.09, 0.19, 0.28], 0.3);
    for (let y = 25; y < PAGE_H; y += 32) line(cmd, 0, y, PAGE_W, y, [0.09, 0.19, 0.28], 0.3);
    rect(cmd, 28, 28, PAGE_W - 56, PAGE_H - 56, null, GOLD, 1);
    text(cmd, "THE DIVINE", 66, 510, 24, "F4", [1, 1, 1]);
    text(cmd, "BLUEPRINT", 66, 472, 38, "F4", [1, 1, 1]);
    text(cmd, "COMPANION", 66, 425, 28, "F4", GOLD);
    line(cmd, 66, 395, 250, 395, GOLD, 1);
    paragraph(cmd, "A 90-Day Guided Journey of Reading, Reflection, Prayer, Practice, and Becoming", 66, 360, 43, 13, 18, "F3", [0.95, 0.93, 0.86], 5);
    text(cmd, "AYO-PAUL IKUJUNI", 66, 90, 10, "F2", GOLD);
    text(cmd, "THE GLEANING GROUND", 66, 68, 8, "F1", [0.92, 0.9, 0.82]);
    return { cmd, fields };
  }
  const titles = ["Copyright & Personal-Use License", "Welcome to the Journey", "How to Use This Companion", "Your 90-Day Formation Rhythm", "Contents", "Journey Dates", "Prayer of Surrender"];
  pageTitle(cmd, "The Divine Blueprint Companion", titles[index - 1], pageNo);
  if (index === 1) {
    paragraph(cmd, "Copyright (c) 2026 Ayo-Paul Ikujuni. Published as a discipleship initiative of The Gleaning Ground.", 48, 530, 68, 11, 16, "F1");
    paragraph(cmd, "This edition is licensed for the personal spiritual formation of the original downloader. You may save the fillable edition on your own devices and print one personal copy. You may not resell, redistribute, upload, reproduce for groups, or modify this journal for commercial use without written permission.", 48, 470, 68, 10, 15, "F1");
    paragraph(cmd, "Your journal entries remain inside the copy saved on your device. The website does not receive or read anything you type into the PDF.", 48, 340, 68, 11, 16, "F2", NAVY);
    paragraph(cmd, "For church, ministry, classroom, or small-group licensing, contact The Gleaning Ground.", 48, 265, 68, 10, 15, "F1");
  } else if (index === 2) {
    paragraph(cmd, "This Companion was created to help the message of The Divine Blueprint move from the page into lived formation. Do not rush. Let Scripture search you, let prayer become honest, and let each practice become an act of obedience.", 48, 530, 68, 11, 17, "F3");
    paragraph(cmd, "The recurring rhythm is simple:", 48, 410, 68, 10, 15, "F2", NAVY);
    ["READ - engage the chapter and key Scriptures.", "REFLECT - notice what God is revealing.", "PRAY - answer God with surrender and faith.", "PRACTICE - turn truth into one concrete response.", "BECOME - record the evidence of transformation."].forEach((item, i) => { text(cmd, item, 62, 375 - i * 42, 10, i === 4 ? "F2" : "F1", i === 4 ? GOLD : INK); });
  } else if (index === 3) {
    const items = ["Read the matching chapter in the book.", "Complete the Companion pages over approximately ten days.", "Write honestly; polished religious answers are not required.", "Use the practices as invitations, not performance measures.", "Return to your milestones at the end of the journey."];
    items.forEach((item, i) => { rect(cmd, 52, 515 - i * 72, 30, 30, null, GOLD, 1); text(cmd, String(i + 1), 63, 525 - i * 72, 10, "F2", NAVY); paragraph(cmd, item, 98, 535 - i * 72, 54, 10, 14, "F1", INK, 3); });
    paragraph(cmd, "Digital edition: download the PDF first and open it in Adobe Acrobat Reader or another form-compatible PDF app. Save your copy after each session.", 52, 135, 66, 9.5, 14, "F2", NAVY);
  } else if (index === 4) {
    paragraph(cmd, "Each chapter is designed for ten days. Use the suggested rhythm below or adapt it prayerfully.", 48, 530, 68, 10.5, 16, "F1");
    chapters.forEach((ch, i) => {
      const y = 478 - i * 43;
      text(cmd, String(i + 1).padStart(2, "0"), 52, y, 10, "F2", GOLD);
      text(cmd, ch.title, 88, y, 9.5, "F2", NAVY);
      text(cmd, `Days ${i * 10 + 1}-${i * 10 + 10}`, 385, y, 8.5, "F1", MUTED);
      line(cmd, 52, y - 10, PAGE_W - 52, y - 10, [0.78, 0.75, 0.68], 0.35);
    });
  } else if (index === 5) {
    chapters.forEach((ch, i) => {
      const y = 520 - i * 45;
      text(cmd, `CHAPTER ${String(ch.number).padStart(2, "0")}`, 52, y, 8, "F2", GOLD);
      text(cmd, ch.title, 142, y, 10, "F3", NAVY);
      text(cmd, String(9 + i * 10), 438, y, 8, "F1", MUTED);
      line(cmd, 52, y - 11, PAGE_W - 52, y - 11, [0.8, 0.77, 0.7], 0.35);
    });
  } else if (index === 6) {
    text(cmd, "Name", 52, 535, 9, "F2", NAVY); fieldArea(cmd, fields, fillable, "journey_name", 52, 500, 400, 28, false);
    text(cmd, "Journey start", 52, 458, 9, "F2", NAVY); fieldArea(cmd, fields, fillable, "journey_start", 52, 425, 180, 26, false);
    text(cmd, "Journey completion", 272, 458, 9, "F2", NAVY); fieldArea(cmd, fields, fillable, "journey_end", 272, 425, 180, 26, false);
    text(cmd, "Chapter completion dates", 52, 377, 11, "F2", NAVY);
    chapters.forEach((ch, i) => {
      const y = 332 - i * 32;
      text(cmd, `${ch.number}. ${ch.title}`, 58, y + 7, 8.5, "F1", INK);
      fieldArea(cmd, fields, fillable, `chapter_${ch.number}_completion_date`, 332, y, 120, 22, false);
    });
  } else if (index === 7) {
    paragraph(cmd, "Father, I place this journey before You. I surrender my assumptions, fears, pride, hurry, and resistance. Let Your Word expose what must change. Let the Holy Spirit form Christ in me. Give me grace not merely to finish pages, but to obey what You reveal. Make me, mature me, and manifest Your life through me. In Jesus' name, Amen.", 56, 520, 60, 12, 20, "F3", NAVY);
    text(cmd, "My intention for this journey", 52, 300, 10, "F2", GOLD);
    fieldArea(cmd, fields, fillable, "journey_intention", 52, 95, 400, 185, true);
  }
  return { cmd, fields };
}

function renderChapterPage(ch, pageIndex, fillable, pageNo) {
  const cmd = [];
  const fields = [];
  const prefix = `ch${ch.number}_p${pageIndex + 1}`;
  if (pageIndex === 0) {
    rect(cmd, 0, 0, 125, PAGE_H, NAVY);
    rect(cmd, 125, 0, PAGE_W - 125, PAGE_H, CREAM);
    for (let x = 15; x < 120; x += 22) line(cmd, x, 0, x, PAGE_H, [0.08, 0.19, 0.29], 0.35);
    for (let y = 18; y < PAGE_H; y += 22) line(cmd, 0, y, 125, y, [0.08, 0.19, 0.29], 0.35);
    text(cmd, "CHAPTER", 34, 650, 8, "F2", GOLD);
    text(cmd, String(ch.number).padStart(2, "0"), 34, 608, 32, "F4", GOLD);
    text(cmd, "THE DIVINE", 30, 90, 7, "F2", GOLD);
    text(cmd, "BLUEPRINT", 30, 76, 7, "F2", GOLD);
    text(cmd, "COMPANION", 30, 62, 7, "F2", GOLD);
    paragraph(cmd, ch.title, 165, 540, 24, 28, 31, "F4", NAVY, 5);
    line(cmd, 165, 405, 375, 405, GOLD, 0.8);
    paragraph(cmd, ch.key, 165, 370, 42, 12, 18, "F3", INK, 5);
    text(cmd, "KEY SCRIPTURES", 165, 220, 8, "F2", GOLD);
    ch.scriptures.forEach((s, i) => text(cmd, s, 165 + (i % 2) * 145, 190 - Math.floor(i / 2) * 40, 9, "F1", NAVY));
    text(cmd, String(pageNo), 310, 17, 7, "F1", MUTED);
    return { cmd, fields };
  }
  const pageNames = ["", "Chapter Objective & Prepare Your Heart", "Formation Pathway & Personal Inventory", "Guided Reflection", "Chapter Synthesis", "Scripture Meditation", "Observe, Understand, Apply", "My Story", "Practice & Declarations", "Kingdom Journal & Spiritual Checkpoint"];
  pageTitle(cmd, `Chapter ${String(ch.number).padStart(2, "0")}`, pageNames[pageIndex], pageNo);
  if (pageIndex === 1) {
    text(cmd, "BY THE END OF THIS CHAPTER YOU WILL:", 48, 535, 9, "F2", NAVY);
    ch.objectives.forEach((o, i) => { text(cmd, String(i + 1), 54, 495 - i * 48, 10, "F2", GOLD); paragraph(cmd, o, 82, 500 - i * 48, 58, 9.5, 14, "F1", INK, 3); });
    rect(cmd, 48, 190, 408, 120, PAPER, GOLD, 0.8);
    text(cmd, "PREPARE YOUR HEART", 165, 282, 10, "F2", NAVY);
    paragraph(cmd, ch.prayer, 76, 252, 58, 10, 16, "F3", INK, 5);
    text(cmd, "Date", 48, 145, 8, "F2", NAVY); fieldArea(cmd, fields, fillable, `${prefix}_date`, 82, 132, 145, 24, false);
  } else if (pageIndex === 2) {
    text(cmd, "THE FORMATION PATHWAY", 48, 530, 10, "F2", NAVY);
    ch.themes.forEach((theme, i) => {
      const x = 50 + i * 80;
      rect(cmd, x, 458, 62, 38, i === 0 ? NAVY : PAPER, GOLD, 0.7);
      text(cmd, theme.toUpperCase(), x + 5, 474, 6.7, "F2", i === 0 ? [1, 1, 1] : NAVY);
      if (i < ch.themes.length - 1) line(cmd, x + 62, 477, x + 78, 477, GOLD, 0.8);
    });
    text(cmd, "PERSONAL INVENTORY", 48, 415, 10, "F2", NAVY);
    ch.prompts.slice(0, 3).forEach((p, i) => {
      const y = 345 - i * 105;
      paragraph(cmd, p, 52, y + 38, 65, 9.3, 13, "F2", INK, 2);
      fieldArea(cmd, fields, fillable, `${prefix}_inventory_${i + 1}`, 52, y - 35, 400, 62, true);
    });
  } else if (pageIndex === 3) {
    text(cmd, "LET THE CHAPTER SEARCH YOUR HEART", 48, 535, 9, "F2", NAVY);
    ch.prompts.forEach((p, i) => {
      const y = 465 - i * 118;
      paragraph(cmd, `${i + 1}. ${p}`, 52, y + 42, 64, 9.5, 14, "F2", INK, 2);
      fieldArea(cmd, fields, fillable, `${prefix}_reflection_${i + 1}`, 52, y - 42, 400, 72, true);
    });
  } else if (pageIndex === 4) {
    text(cmd, "THE MESSAGE IN ONE VIEW", 48, 535, 9, "F2", NAVY);
    rect(cmd, 48, 380, 408, 125, PAPER, GOLD, 0.8);
    paragraph(cmd, ch.summary, 68, 475, 58, 10.5, 17, "F3", NAVY, 7);
    const synth = ["What truth stands out most?", "What conviction requires a response?", "What promise will I carry forward?"];
    synth.forEach((p, i) => {
      const y = 300 - i * 90;
      text(cmd, p, 52, y + 35, 9, "F2", INK);
      fieldArea(cmd, fields, fillable, `${prefix}_synthesis_${i + 1}`, 52, y - 28, 400, 52, true);
    });
  } else if (pageIndex === 5) {
    text(cmd, "KEY PASSAGE", 48, 535, 9, "F2", GOLD);
    paragraph(cmd, ch.key, 52, 505, 62, 12, 19, "F3", NAVY, 4);
    const prompts = ["Write the verse in your own words.", "What does this reveal about God?", "What invitation or command do I hear?"];
    prompts.forEach((p, i) => {
      const y = 390 - i * 115;
      text(cmd, p, 52, y + 45, 9.3, "F2", INK);
      fieldArea(cmd, fields, fillable, `${prefix}_meditation_${i + 1}`, 52, y - 38, 400, 70, true);
    });
  } else if (pageIndex === 6) {
    const rows = ["What does the passage say?", "What does it reveal about God?", "What does it reveal about me?", "What will I do in response?"];
    text(cmd, "READ THE CHAPTER AND KEY SCRIPTURES AGAIN", 48, 535, 9, "F2", NAVY);
    rows.forEach((p, i) => {
      const y = 455 - i * 105;
      rect(cmd, 50, y - 42, 132, 82, i % 2 === 0 ? [0.94, 0.92, 0.86] : PAPER, GOLD, 0.5);
      paragraph(cmd, p, 62, y + 18, 20, 8.5, 13, "F2", NAVY, 4);
      fieldArea(cmd, fields, fillable, `${prefix}_observe_${i + 1}`, 182, y - 42, 270, 82, true);
    });
  } else if (pageIndex === 7) {
    text(cmd, "TRACE GOD'S WORK IN YOUR OWN STORY", 48, 535, 9, "F2", NAVY);
    const story = ["Where was I before this truth became clear?", "What has God changed or begun to change?", "What is still being formed in me?"];
    story.forEach((p, i) => {
      const y = 430 - i * 145;
      text(cmd, p, 52, y + 60, 9.5, "F2", INK);
      fieldArea(cmd, fields, fillable, `${prefix}_story_${i + 1}`, 52, y - 55, 400, 100, true);
    });
  } else if (pageIndex === 8) {
    text(cmd, "PRACTICE THIS WEEK", 48, 535, 10, "F2", NAVY);
    ch.practices.forEach((p, i) => checkArea(cmd, fields, fillable, `${prefix}_practice_${i + 1}`, 56, 482 - i * 42, p));
    text(cmd, "DECLARATIONS", 48, 258, 10, "F2", NAVY);
    ch.declarations.forEach((d, i) => { text(cmd, ">", 57, 225 - i * 25, 9, "F2", GOLD); text(cmd, d, 77, 225 - i * 25, 9.2, "F1", INK); });
    text(cmd, "My specific act of obedience", 48, 62, 8.5, "F2", NAVY);
    fieldArea(cmd, fields, fillable, `${prefix}_obedience`, 205, 48, 247, 28, false);
  } else if (pageIndex === 9) {
    text(cmd, "KINGDOM JOURNAL", 48, 535, 10, "F2", NAVY);
    text(cmd, "Lord, what are You saying to me after this chapter?", 52, 507, 9, "F2", INK);
    fieldArea(cmd, fields, fillable, `${prefix}_kingdom_journal`, 52, 310, 400, 180, true);
    text(cmd, "SPIRITUAL CHECKPOINT", 48, 270, 10, "F2", NAVY);
    text(cmd, "Rate my present response: 1 = beginning, 5 = established", 52, 246, 8.5, "F1", MUTED);
    for (let i = 1; i <= 5; i++) checkArea(cmd, fields, fillable, `${prefix}_checkpoint_${i}`, 72 + (i - 1) * 70, 203, ` ${i}`);
    text(cmd, "BLUEPRINT MILESTONE", 48, 160, 10, "F2", NAVY);
    paragraph(cmd, ch.milestone, 52, 137, 64, 9.2, 13, "F1", INK, 2);
    fieldArea(cmd, fields, fillable, `${prefix}_milestone`, 52, 55, 400, 62, true);
  }
  return { cmd, fields };
}

function fieldObject(field, pageRef, offRef, yesRef) {
  const rectValue = `[${n(field.x)} ${n(field.y)} ${n(field.x + field.w)} ${n(field.y + field.h)}]`;
  if (field.type === "checkbox") {
    return `<< /Type /Annot /Subtype /Widget /FT /Btn /T (${esc(field.name)}) /Rect ${rectValue} /P ${pageRef} 0 R /F 4 /V /Off /AS /Off /MK << /BC [${GOLD.join(" ")}] /BG [${PAPER.join(" ")}] >> /BS << /W 0.8 /S /S >> /AP << /N << /Off ${offRef} 0 R /Yes ${yesRef} 0 R >> >> >>`;
  }
  const flags = field.multiline ? 4096 : 0;
  return `<< /Type /Annot /Subtype /Widget /FT /Tx /T (${esc(field.name)}) /Rect ${rectValue} /P ${pageRef} 0 R /F 4 /Ff ${flags} /DA (/F1 9 Tf 0.08 0.12 0.17 rg) /MK << /BC [${GOLD.join(" ")}] /BG [${PAPER.join(" ")}] >> /BS << /W 0.7 /S /S >> >>`;
}

function generateJournal(fillable) {
  const pdf = new PDFWriter();
  const catalogRef = pdf.reserve();
  const pagesRef = pdf.reserve();
  const acroRef = fillable ? pdf.reserve() : null;
  const font1 = pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const font2 = pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  const font3 = pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>");
  const font4 = pdf.add("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>");
  let offRef = null;
  let yesRef = null;
  if (fillable) {
    offRef = pdf.add(pdf.stream("/Type /XObject /Subtype /Form /BBox [0 0 12 12] /Resources << >>", `0.71 0.48 0.16 RG 0.8 w 0.5 0.5 11 11 re S`));
    yesRef = pdf.add(pdf.stream("/Type /XObject /Subtype /Form /BBox [0 0 12 12] /Resources << >>", `0.71 0.48 0.16 RG 0.8 w 0.5 0.5 11 11 re S 0.04 0.12 0.2 RG 1.6 w 2.5 6 m 5 3 l 10 10 l S`));
  }
  const pageRefs = [];
  const fieldRefs = [];
  let pageNo = 1;
  const specs = [];
  for (let i = 0; i < 8; i++) specs.push(renderFrontPage(i, fillable, pageNo++));
  for (const ch of chapters) for (let i = 0; i < 10; i++) specs.push(renderChapterPage(ch, i, fillable, pageNo++));

  for (const spec of specs) {
    const pageRef = pdf.reserve();
    const streamData = spec.cmd.join("\n");
    const contentRef = pdf.add(pdf.stream("", streamData));
    const annots = [];
    if (fillable) {
      for (const field of spec.fields) {
        const ref = pdf.add(fieldObject(field, pageRef, offRef, yesRef));
        annots.push(ref);
        fieldRefs.push(ref);
      }
    }
    const annotsPart = annots.length ? `/Annots [${annots.map(r => `${r} 0 R`).join(" ")}]` : "";
    pdf.set(pageRef, `<< /Type /Page /Parent ${pagesRef} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${font1} 0 R /F2 ${font2} 0 R /F3 ${font3} 0 R /F4 ${font4} 0 R >> >> /Contents ${contentRef} 0 R ${annotsPart} >>`);
    pageRefs.push(pageRef);
  }
  pdf.set(pagesRef, `<< /Type /Pages /Kids [${pageRefs.map(r => `${r} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`);
  if (fillable) {
    pdf.set(acroRef, `<< /Fields [${fieldRefs.map(r => `${r} 0 R`).join(" ")}] /NeedAppearances true /DR << /Font << /F1 ${font1} 0 R >> >> /DA (/F1 9 Tf 0 g) >>`);
    pdf.set(catalogRef, `<< /Type /Catalog /Pages ${pagesRef} 0 R /AcroForm ${acroRef} 0 R /PageMode /UseNone >>`);
  } else {
    pdf.set(catalogRef, `<< /Type /Catalog /Pages ${pagesRef} 0 R /PageMode /UseNone >>`);
  }
  const infoRef = pdf.add(`<< /Title (The Divine Blueprint Companion Journal) /Author (Ayo-Paul Ikujuni) /Subject (${fillable ? "Fillable digital edition" : "Personal print edition"}) /Creator (The Gleaning Ground) /Producer (The Gleaning Ground Netlify Build) >>`);
  return pdf.build(catalogRef, infoRef);
}

const fillablePdf = generateJournal(true);
const printPdf = generateJournal(false);
const fillableName = "The-Divine-Blueprint-Companion-Fillable.pdf";
const printName = "The-Divine-Blueprint-Companion-Print-Ready.pdf";
await writeFile(join(downloadsRoot, fillableName), fillablePdf);
await writeFile(join(downloadsRoot, printName), printPdf);

const companionHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="Download The Divine Blueprint Companion as a fillable digital journal or a print-ready personal journal.">
<title>The Companion Journal | The Divine Blueprint</title>
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="container nav-wrap">
<a class="brand" href="index.html"><img src="assets/logo.svg" alt=""><span>The Divine<br>Blueprint</span></a>
<nav class="nav-links" aria-label="Primary"><a href="index.html">Home</a><a href="start-here.html">Start Here</a><a href="journey.html">The Journey</a><a href="bible-studies.html">Bible Studies</a><a href="teachings.html">Teachings</a><a href="podcast.html">Podcast</a><a href="companion.html" aria-current="page">The Companion</a><a href="about.html">About</a></nav>
<div class="nav-actions"><button class="btn btn-primary" type="button" data-modal-open>Get the Book</button><button class="menu-toggle" type="button" aria-label="Toggle menu" aria-expanded="false">☰</button></div>
</div></header>
<main id="main">
<section class="page-hero companion-download-hero"><div class="container companion-hero-grid"><div><div class="breadcrumbs"><a href="index.html">Home</a> / The Companion</div><span class="section-kicker">Guided Spiritual Formation</span><h1>The Divine Blueprint Companion Journal</h1><p class="lead">A 98-page, 90-day formation journey through reading, reflection, prayer, practice, and becoming.</p><div class="companion-hero-actions"><a class="btn btn-primary" href="#download-editions">Choose Your Edition ↓</a><a class="btn btn-secondary" href="#inside">See What Is Inside</a></div></div><div class="companion-cover-visual" aria-label="The Divine Blueprint Companion journal cover"><span>THE DIVINE</span><strong>BLUEPRINT</strong><em>COMPANION</em><small>READ · REFLECT · PRAY · PRACTICE · BECOME</small></div></div></section>
<section class="section section-light"><div class="container companion-intro-grid"><div><span class="section-kicker">More Than a Journal</span><h2>Turn Every Chapter Into a Formation Experience</h2><p>The Companion follows all nine chapters of <em>The Divine Blueprint</em> and creates space for Scripture meditation, personal inventory, guided reflection, spiritual practices, prayer, and measurable milestones.</p><ul class="list-check"><li>98 pages in a 7 × 10-inch journal format</li><li>Nine chapter-by-chapter formation modules</li><li>Fillable writing fields and clickable checkboxes</li><li>Personal-print edition with writing lines</li><li>90-day journey plan and chapter completion tracker</li><li>Private by design—your journal entries never return to the website</li></ul></div><div class="companion-facts"><div><strong>98</strong><span>Journal pages</span></div><div><strong>9</strong><span>Formation modules</span></div><div><strong>90</strong><span>Suggested days</span></div><div><strong>2</strong><span>Download editions</span></div></div></div></section>
<section class="section" id="download-editions"><div class="container"><div class="section-head"><span class="section-kicker">Choose Your Edition</span><h2>How Would You Like to Journey?</h2><p>Both editions contain the same guided formation content. Choose the format that best matches how you prefer to write.</p></div><div class="companion-edition-grid">
<article class="companion-edition-card featured"><span class="edition-badge">Recommended for tablets & computers</span><div class="edition-icon">⌨</div><h3>Fillable Digital Journal</h3><p>Type directly inside the PDF, click practice checkboxes, save your progress, and return whenever you are ready.</p><ul><li>Interactive multiline writing fields</li><li>Clickable practice and checkpoint boxes</li><li>Works offline after download</li><li>Your entries stay on your device</li></ul><a class="btn btn-primary companion-download-button" href="assets/downloads/${fillableName}" download data-companion-download="fillable" data-track-event="resource_opened" data-resource-id="divine-blueprint-companion" data-resource-type="journal" data-edition="fillable">Download Fillable PDF ↓</a><small>For best results, download first and open in Adobe Acrobat Reader or another form-compatible PDF app.</small></article>
<article class="companion-edition-card"><span class="edition-badge">Recommended for handwriting</span><div class="edition-icon">✎</div><h3>Print-Ready Personal Journal</h3><p>Download a clean, flattened edition formatted at 7 × 10 inches with writing lines and checkboxes for personal printing.</p><ul><li>No interactive form fields</li><li>Consistent 7 × 10-inch page size</li><li>Clear writing lines and reflection spaces</li><li>Suitable for home or local printing</li></ul><a class="btn btn-secondary companion-download-button" href="assets/downloads/${printName}" download data-companion-download="print" data-track-event="resource_opened" data-resource-id="divine-blueprint-companion" data-resource-type="journal" data-edition="print">Download Print Edition ↓</a><small>This is a personal-print interior. Commercial manufacturing may require printer-specific bleed, paper, binding, and cover files.</small></article>
</div><div class="companion-privacy-note"><strong>Your writing is private.</strong><p>The website may record only that an edition was selected when analytics consent has been granted. It cannot see your prayers, journal entries, assessment responses, or anything typed into the downloaded PDF.</p></div></div></section>
<section class="section section-dark" id="inside"><div class="container"><div class="section-head"><span class="section-kicker">Inside Every Chapter</span><h2>A Repeatable Rhythm for Real Formation</h2></div><div class="companion-preview-grid"><article><span>01</span><h3>Chapter Opener</h3><p>Theme, key passage, and supporting Scriptures.</p></article><article><span>02</span><h3>Prepare Your Heart</h3><p>Objectives and a prayer of surrender.</p></article><article><span>03</span><h3>Personal Inventory</h3><p>Questions that locate your present condition.</p></article><article><span>04</span><h3>Guided Reflection</h3><p>Space to respond honestly to the chapter.</p></article><article><span>05</span><h3>Scripture Meditation</h3><p>Observation, understanding, and application.</p></article><article><span>06</span><h3>My Story</h3><p>Trace the evidence of God's work in your life.</p></article><article><span>07</span><h3>Practice</h3><p>Concrete acts that translate truth into obedience.</p></article><article><span>08</span><h3>Declarations</h3><p>Truth-filled statements to read and pray aloud.</p></article><article><span>09</span><h3>Kingdom Journal</h3><p>Record what the Lord is emphasizing now.</p></article><article><span>10</span><h3>Spiritual Checkpoint</h3><p>Rate your response and record a milestone.</p></article></div></div></section>
<section class="section section-light"><div class="container"><div class="section-head"><span class="section-kicker">The Rhythm</span><h2>Read. Reflect. Pray. Practice. Become.</h2></div><div class="grid chapter-grid"><div class="resource-card"><h3>Read</h3><p>Engage the chapter and its key Scriptures with purpose.</p></div><div class="resource-card"><h3>Reflect</h3><p>Identify what God is revealing about your heart and formation.</p></div><div class="resource-card"><h3>Pray</h3><p>Respond through surrender, thanksgiving, petition, and listening.</p></div><div class="resource-card"><h3>Practice</h3><p>Translate insight into a concrete act of obedience.</p></div><div class="resource-card"><h3>Become</h3><p>Track the ongoing transformation of character, identity, and purpose.</p></div></div></div></section>
<section class="section"><div class="container companion-license"><div><span class="section-kicker">Personal-Use License</span><h2>Use It Freely. Share It Responsibly.</h2><p>Your download is for your individual spiritual formation journey. You may save the digital edition on your devices and print one personal copy. The journal may not be resold, redistributed, uploaded, reproduced for groups, or modified for commercial use without written permission from The Gleaning Ground.</p></div><a class="btn btn-secondary" href="contact.html">Ask About Group Licensing</a></div></section>
</main>
<footer class="footer"><div class="container"><div class="footer-grid"><div><a class="brand" href="index.html" style="color:white"><img src="assets/logo.svg" alt=""><span>The Divine Blueprint</span></a><p>A discipleship initiative of The Gleaning Ground.</p><p>Read. Reflect. Pray. Practice. Become.</p></div><div><h3>Journey</h3><a href="start-here.html">Start Here</a><br><a href="journey.html">All Chapters</a><br><a href="bible-studies.html">Bible Studies</a></div><div><h3>Media</h3><a href="teachings.html">Teachings</a><br><a href="podcast.html">Podcast</a><br><a href="companion.html">The Companion</a></div><div><h3>Connect</h3><a href="about.html">About</a><br><a href="contact.html">Contact</a><br><a href="privacy.html">Privacy & Tracking</a><br><a href="https://www.thegleaningground.com">The Gleaning Ground</a></div></div><div class="footer-bottom"><span>© <span data-year></span> The Divine Blueprint. All rights reserved.</span><span>The Making, Maturing and Manifestation of God's Sons</span></div></div></footer>
<div class="modal" role="dialog" aria-modal="true" aria-label="Book availability"><div class="modal-card"><button class="modal-close" type="button" data-modal-close aria-label="Close">×</button><span class="section-kicker">Store connection</span><h2>Book ordering is ready to connect.</h2><p>Add your final book-ordering link when it becomes available.</p><a class="btn btn-primary" href="contact.html">Contact the Ministry</a></div></div>
<script src="assets/script.js"></script>
<script src="assets/tracking-config.js"></script>
<script src="assets/activity-tracking.js"></script>
<script>
(function(){
  document.querySelectorAll('[data-companion-download]').forEach(function(link){
    link.addEventListener('click', function(){
      var properties={resource_id:'divine-blueprint-companion',resource_type:'journal',edition:link.getAttribute('data-companion-download'),format:'pdf',version:'1.0'};
      if(typeof window.trackDivineBlueprintEvent==='function') window.trackDivineBlueprintEvent('resource_opened',properties);
      window.dispatchEvent(new CustomEvent('divineblueprint:track',{detail:{event:'resource_opened',properties:properties}}));
    });
  });
})();
</script>
</body></html>`;
await writeFile(join(siteRoot, "companion.html"), companionHtml, "utf8");

const stylesPath = join(assetsRoot, "styles.css");
const marker = "/* Companion Journal Download Integration */";
const companionCss = `

${marker}
.companion-download-hero{position:relative;overflow:hidden}
.companion-hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:4rem;align-items:center}
.companion-hero-actions{display:flex;flex-wrap:wrap;gap:.85rem;margin-top:1.5rem}
.companion-cover-visual{min-height:470px;background:#071b31;color:white;border:1px solid #b57b29;box-shadow:0 28px 60px rgba(7,27,49,.24);display:flex;flex-direction:column;justify-content:center;padding:3.3rem;position:relative;overflow:hidden}
.companion-cover-visual:before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(181,123,41,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(181,123,41,.1) 1px,transparent 1px);background-size:28px 28px}
.companion-cover-visual>*{position:relative}.companion-cover-visual span{font-family:Georgia,serif;font-size:1.5rem;letter-spacing:.08em}.companion-cover-visual strong{font-family:Georgia,serif;font-size:3.35rem;line-height:.95;margin:.4rem 0;color:#fff}.companion-cover-visual em{font-family:Georgia,serif;font-size:2rem;color:#d0a354;font-style:normal}.companion-cover-visual small{margin-top:4rem;color:#d9c9ad;letter-spacing:.1em;font-size:.65rem}
.companion-intro-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:4rem;align-items:start}.companion-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem}.companion-facts div{background:#fffaf0;border:1px solid rgba(181,123,41,.35);padding:1.5rem;border-radius:14px}.companion-facts strong{display:block;font-family:Georgia,serif;font-size:2.6rem;color:#071b31}.companion-facts span{color:#6c665b;font-size:.85rem;text-transform:uppercase;letter-spacing:.08em}
.companion-edition-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.4rem}.companion-edition-card{position:relative;background:#fffdf8;border:1px solid #d8c9aa;border-radius:18px;padding:2rem;display:flex;flex-direction:column}.companion-edition-card.featured{border:2px solid #b57b29;box-shadow:0 20px 45px rgba(7,27,49,.1)}.edition-badge{display:inline-flex;align-self:flex-start;background:#f1e4c9;color:#071b31;border-radius:999px;padding:.35rem .7rem;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em}.edition-icon{font-size:2rem;margin:1.4rem 0 .5rem;color:#b57b29}.companion-edition-card h3{font-family:Georgia,serif;color:#071b31;font-size:1.75rem;margin:.3rem 0}.companion-edition-card ul{padding-left:1.2rem;margin:1rem 0 1.5rem}.companion-edition-card .companion-download-button{margin-top:auto}.companion-edition-card small{display:block;margin-top:1rem;color:#6c665b;line-height:1.45}.companion-privacy-note{margin-top:1.5rem;background:#edf1ec;border-left:4px solid #506b59;padding:1.15rem 1.3rem}.companion-privacy-note strong{color:#173e32}.companion-privacy-note p{margin:.25rem 0 0}
.companion-preview-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:rgba(255,255,255,.18)}.companion-preview-grid article{background:#071b31;padding:1.35rem;min-height:180px}.companion-preview-grid span{color:#d0a354;font-family:Georgia,serif;font-size:1.3rem}.companion-preview-grid h3{color:white;font-family:Georgia,serif;font-size:1.15rem}.companion-preview-grid p{color:#cad4dc;font-size:.9rem}.companion-license{display:flex;justify-content:space-between;align-items:center;gap:3rem}.companion-license>div{max-width:760px}
@media(max-width:950px){.companion-hero-grid,.companion-intro-grid{grid-template-columns:1fr}.companion-cover-visual{max-width:500px}.companion-preview-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:680px){.companion-edition-grid,.companion-facts,.companion-preview-grid{grid-template-columns:1fr}.companion-license{align-items:flex-start;flex-direction:column}.companion-cover-visual{min-height:390px;padding:2rem}.companion-cover-visual strong{font-size:2.65rem}}
`;
let styles = await readFile(stylesPath, "utf8");
if (!styles.includes(marker)) { styles += companionCss; await writeFile(stylesPath, styles, "utf8"); }

console.log(`Integrated Companion Journal: ${fillablePdf.length} byte fillable PDF, ${printPdf.length} byte print PDF, 98 pages each.`);
