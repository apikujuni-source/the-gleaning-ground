import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath=resolve("scripts/integrate-companion-journal.mjs");
const generatedPath=resolve("scripts/.generated-integrate-companion-journal.mjs");
const downloadsRoot=resolve("_site/divine-blueprint-site/assets/downloads");
const fillablePath=resolve(downloadsRoot,"The-Divine-Blueprint-Companion-Fillable.pdf");
const printPath=resolve(downloadsRoot,"The-Divine-Blueprint-Companion-Print-Ready.pdf");
let source=await readFile(sourcePath,"utf8");
function req(pattern,replacement,label){const next=source.replace(pattern,replacement);if(next===source)throw new Error(`Could not apply Companion consolidation: ${label}.`);source=next;}

req(/function wrap\(value, max = 70\) \{[\s\S]*?\n\}\nfunction text\(cmd,/,`function glyphEm(ch,font="F1"){const times=font==="F3"||font==="F4";if(ch===" ")return times?.25:.278;if(/[ilI1.,'!:;|]/.test(ch))return times?.28:.25;if(/[mwMW@%]/.test(ch))return times?.84:.86;if(/[fjrt()\\[\\]{}\\-]/.test(ch))return times?.34:.33;if(/[A-Z]/.test(ch))return times?.68:.66;if(/[0-9]/.test(ch))return times?.50:.556;return times?.48:.52;}function measureTextWidth(value,size=10,font="F1"){return [...ascii(value)].reduce((sum,ch)=>sum+glyphEm(ch,font)*size,0);}function wrap(value,maxWidth=360,size=10,font="F1"){const lines=[];for(const p of ascii(value).split(/\\n/)){const words=p.trim().split(/\\s+/).filter(Boolean);let line="";for(const word of words){const candidate=line?line+" "+word:word;if(line&&measureTextWidth(candidate,size,font)>maxWidth){lines.push(line);line=word;}else line=candidate;}if(line)lines.push(line);if(!words.length)lines.push("");}return lines;}function text(cmd,`,"width-aware wrapping");

req(/function paragraph\(cmd, value, x, y, widthChars = 72, size = 10, leading = 14, font = "F1", color = INK, maxLines = 99\) \{[\s\S]*?\n\}\nfunction line\(cmd,/,`function paragraph(cmd,value,x,y,widthChars=72,size=10,leading=14,font="F1",color=INK,maxLines=99){const inferredWidth=widthChars*size*.70;const maxWidth=Math.max(40,Math.min(inferredWidth,PAGE_W-52-x));const lines=wrap(value,maxWidth,size,font).slice(0,maxLines);lines.forEach((line,i)=>text(cmd,line,x,y-i*leading,size,font,color));return y-lines.length*leading;}
function fitOneLine(cmd,value,x,y,maxWidth,size=10,font="F1",color=INK,minSize=6,align="left"){let fs=size;while(fs>minSize&&measureTextWidth(value,fs,font)>maxWidth)fs-=.25;const tw=measureTextWidth(value,fs,font);const xx=align==="center"?x+(maxWidth-tw)/2:align==="right"?x+maxWidth-tw:x;text(cmd,value,xx,y,fs,font,color);return fs;}
function fitBlock(value,w,h,size=10,font="F1",minSize=6,padding=6,maxLines=99){let fs=size,lines=[],leading=size*1.28;for(;fs>=minSize;fs-=.25){lines=wrap(value,Math.max(10,w-padding*2),fs,font);leading=fs*1.28;const fitsWidth=lines.every(v=>measureTextWidth(v,fs,font)<=w-padding*2+.01);const blockH=fs+(lines.length-1)*leading;if(fitsWidth&&lines.length<=maxLines&&blockH<=h-padding*2)return{fs,lines,leading,blockH};}fs=minSize;lines=wrap(value,Math.max(10,w-padding*2),fs,font);leading=fs*1.22;return{fs,lines,leading,blockH:fs+(lines.length-1)*leading};}
function centerBlock(cmd,value,x,y,w,h,size=10,font="F1",color=INK,minSize=6,padding=6,maxLines=99){const b=fitBlock(value,w,h,size,font,minSize,padding,maxLines);const top=y+(h+b.blockH)/2;const first=top-b.fs*.78;b.lines.forEach((v,i)=>{const tw=measureTextWidth(v,b.fs,font);text(cmd,v,x+(w-tw)/2,first-i*b.leading,b.fs,font,color);});return b;}
function leftBlock(cmd,value,x,y,w,h,size=10,font="F1",color=INK,minSize=6,padding=0,maxLines=99){const b=fitBlock(value,w,h,size,font,minSize,padding,maxLines);const top=y+(h+b.blockH)/2;const first=top-b.fs*.78;b.lines.forEach((v,i)=>text(cmd,v,x+padding,first-i*b.leading,b.fs,font,color));return b;}
function line(cmd,`,"point-width paragraphs and box alignment helpers");

req(`function pageTitle(cmd, kicker, titleValue, pageNo) {\n  pageBase(cmd, pageNo);\n  text(cmd, kicker.toUpperCase(), 42, 660, 8, "F2", GOLD);\n  paragraph(cmd, titleValue, 42, 630, 34, 24, 27, "F4", NAVY, 3);\n  line(cmd, 42, 572, PAGE_W - 42, 572, GOLD, 0.8);\n}`,`function pageTitle(cmd,kicker,titleValue,pageNo){pageBase(cmd,pageNo);text(cmd,kicker.toUpperCase(),42,660,8,"F2",GOLD);const max=PAGE_W-84;let size=24;while(size>20&&measureTextWidth(titleValue,size,"F4")>max)size-=.5;if(measureTextWidth(titleValue,size,"F4")<=max)text(cmd,titleValue,42,630,size,"F4",NAVY);else wrap(titleValue,max,20,"F4").slice(0,2).forEach((v,i)=>text(cmd,v,42,630-i*24,20,"F4",NAVY));line(cmd,42,572,PAGE_W-42,572,GOLD,.8);}`,"fitted page titles");

req(/function checkArea\(cmd, fields, fillable, name, x, y, label\) \{[\s\S]*?\n\}/,`function checkArea(cmd,fields,fillable,name,x,y,label){rect(cmd,x,y,12,12,fillable?PAPER:null,GOLD,.7);if(fillable)fields.push({type:"checkbox",name,x,y,w:12,h:12});fitOneLine(cmd,label,x+20,y+2,Math.max(30,PAGE_W-52-(x+20)),9.2,"F1",INK,7.5,"left");}`,"checkbox label alignment");

req(/    const items = \["Read the matching chapter in the book\.",[\s\S]*?    paragraph\(cmd, "Digital edition:/,`    const items = ["Read the matching chapter in the book.", "Complete the Companion pages over approximately ten days.", "Write honestly; polished religious answers are not required.", "Use the practices as invitations, not performance measures.", "Return to your milestones at the end of the journey."];
    items.forEach((item,i)=>{const by=515-i*72;rect(cmd,52,by,30,30,null,GOLD,1);centerBlock(cmd,String(i+1),52,by,30,30,10,"F2",NAVY,8,3,1);leftBlock(cmd,item,98,by-4,354,38,10,"F1",INK,8.5,0,3);});
    paragraph(cmd, "Digital edition:`,"How to Use box and text alignment");

req(/    chapters\.forEach\(\(ch, i\) => \{\n      const y = 478 - i \* 43;[\s\S]*?    \}\);\n  \} else if \(index === 5\) \{/,`    text(cmd,"CHAPTER",52,500,7.5,"F2",GOLD);fitOneLine(cmd,"FORMATION WINDOW",365,500,87,7.5,"F2",GOLD,7,"right");
    chapters.forEach((ch,i)=>{const y=468-i*43;text(cmd,String(i+1).padStart(2,"0"),52,y,9.5,"F2",GOLD);fitOneLine(cmd,ch.title,88,y,270,9.3,"F2",NAVY,7.2,"left");fitOneLine(cmd,"Days "+String(i*10+1)+"-"+String(i*10+10),365,y,87,8.3,"F1",MUTED,7.2,"right");line(cmd,52,y-10,PAGE_W-52,y-10,[.78,.75,.68],.35);});
  } else if (index === 5) {`,"formation rhythm table alignment");

req(/    chapters\.forEach\(\(ch, i\) => \{\n      const y = 520 - i \* 45;\n      text\(cmd, `CHAPTER \$\{String\(ch\.number\)\.padStart\(2, "0"\)\}`, 52, y, 8, "F2", GOLD\);\n      text\(cmd, ch\.title, 142, y, 10, "F3", NAVY\);\n      text\(cmd, String\(9 \+ i \* 10\), 438, y, 8, "F1", MUTED\);\n      line\(cmd, 52, y - 11, PAGE_W - 52, y - 11, \[0\.8, 0\.77, 0\.7\], 0\.35\);\n    \}\);/,`    chapters.forEach((ch,i)=>{const y=520-i*45;text(cmd,"CHAPTER "+String(ch.number).padStart(2,"0"),52,y,8,"F2",GOLD);fitOneLine(cmd,ch.title,142,y,276,10,"F3",NAVY,7.5,"left");fitOneLine(cmd,String(9+i*9),430,y,22,8,"F1",MUTED,7.5,"right");line(cmd,52,y-11,PAGE_W-52,y-11,[.8,.77,.7],.35);});`,"contents table alignment and page numbers");

req(/    chapters\.forEach\(\(ch, i\) => \{\n      const y = 332 - i \* 32;\n      text\(cmd, `\$\{ch\.number\}\. \$\{ch\.title\}`, 58, y \+ 7, 8\.5, "F1", INK\);\n      fieldArea\(cmd, fields, fillable, `chapter_\$\{ch\.number\}_completion_date`, 332, y, 120, 22, false\);\n    \}\);/,`    chapters.forEach((ch,i)=>{const y=332-i*32;fitOneLine(cmd,String(ch.number)+". "+ch.title,58,y+7,258,8.5,"F1",INK,7.2,"left");fieldArea(cmd,fields,fillable,"chapter_"+String(ch.number)+"_completion_date",332,y,120,22,false);});`,"Journey Dates row alignment");

req('const pageNames = ["", "Chapter Objective & Prepare Your Heart", "Formation Pathway & Personal Inventory", "Guided Reflection", "Chapter Synthesis", "Scripture Meditation", "Observe, Understand, Apply", "My Story", "Practice & Declarations", "Kingdom Journal & Spiritual Checkpoint"];','const pageNames = ["", "Chapter Objective & Prepare Your Heart", "Formation Pathway & Personal Reflection", "Unused", "Chapter Synthesis", "Scripture Meditation", "Observe, Understand, Apply", "My Story", "Practice & Declarations", "Kingdom Journal & Spiritual Checkpoint"];',"page names");

req(`    rect(cmd, 48, 190, 408, 120, PAPER, GOLD, 0.8);\n    text(cmd, "PREPARE YOUR HEART", 165, 282, 10, "F2", NAVY);\n    paragraph(cmd, ch.prayer, 76, 252, 58, 10, 16, "F3", INK, 5);`,`    const prayerProbe=fitBlock(ch.prayer,376,90,10,"F3",9,10,5);const prayerBoxH=Math.max(80,48+prayerProbe.blockH);const prayerBoxY=310-prayerBoxH;
    rect(cmd,48,prayerBoxY,408,prayerBoxH,PAPER,GOLD,.8);
    fitOneLine(cmd,"PREPARE YOUR HEART",68,prayerBoxY+prayerBoxH-27,368,10,"F2",NAVY,9,"center");
    centerBlock(cmd,ch.prayer,60,prayerBoxY+10,384,prayerBoxH-48,10,"F3",INK,9,8,5);`,"dynamic centered Prepare Your Heart box");

req(/  \} else if \(pageIndex === 2\) \{[\s\S]*?  \} else if \(pageIndex === 4\) \{/,`  } else if (pageIndex === 2) {
    text(cmd,"THE FORMATION PATHWAY",48,530,10,"F2",NAVY);
    ch.themes.forEach((theme,i)=>{const x=50+i*80;rect(cmd,x,458,62,38,i===0?NAVY:PAPER,GOLD,.7);centerBlock(cmd,theme.toUpperCase(),x,458,62,38,6.7,"F2",i===0?[1,1,1]:NAVY,5.2,5,2);if(i<ch.themes.length-1)line(cmd,x+62,477,x+78,477,GOLD,.8);});
    text(cmd,"PERSONAL REFLECTION",48,415,10,"F2",NAVY);text(cmd,"LET THE CHAPTER SEARCH YOUR HEART",48,392,7.8,"F2",GOLD);
    ch.prompts.forEach((p,i)=>{const y=338-i*82;leftBlock(cmd,String(i+1)+". "+p,52,y+17,400,31,9.1,"F2",INK,8.2,0,2);fieldArea(cmd,fields,fillable,prefix+"_reflection_"+String(i+1),52,y-34,400,48,true);});
  } else if (pageIndex === 4) {`,"formation pathway cells and reflection labels");

req(`    rect(cmd, 48, 380, 408, 125, PAPER, GOLD, 0.8);\n    paragraph(cmd, ch.summary, 68, 475, 58, 10.5, 17, "F3", NAVY, 7);`,`    const summaryProbe=fitBlock(ch.summary,376,105,10.5,"F3",9.5,10,5);const summaryBoxH=Math.max(76,28+summaryProbe.blockH);const summaryBoxY=505-summaryBoxH;
    rect(cmd,48,summaryBoxY,408,summaryBoxH,PAPER,GOLD,.8);
    centerBlock(cmd,ch.summary,60,summaryBoxY+8,384,summaryBoxH-16,10.5,"F3",NAVY,9.5,8,5);`,"dynamic centered Chapter Synthesis box");

req('      paragraph(cmd, p, 62, y + 18, 20, 8.5, 13, "F2", NAVY, 4);','      centerBlock(cmd,p,50,y-42,132,82,8.5,"F2",NAVY,7.5,10,4);',"Observe Understand Apply cell labels");

req('    ch.declarations.forEach((d, i) => { text(cmd, ">", 57, 225 - i * 25, 9, "F2", GOLD); text(cmd, d, 77, 225 - i * 25, 9.2, "F1", INK); });','    ch.declarations.forEach((d,i)=>{const yy=225-i*25;text(cmd,">",57,yy,9,"F2",GOLD);fitOneLine(cmd,d,77,yy,375,9.2,"F1",INK,7.6,"left");});',"declaration line fitting");

req('for (const ch of chapters) for (let i = 0; i < 10; i++) specs.push(renderChapterPage(ch, i, fillable, pageNo++));','for (const ch of chapters) for (const i of [0, 1, 2, 4, 5, 6, 7, 8, 9]) specs.push(renderChapterPage(ch, i, fillable, pageNo++));',"89-page sequence");

req('paragraph(cmd, "For church, ministry, classroom, or small-group licensing, contact The Gleaning Ground.", 48, 265, 68, 10, 15, "F1");','paragraph(cmd, "For church, ministry, classroom, or small-group licensing, contact The Gleaning Ground at www.gleaningground.com.", 48, 265, 68, 10, 15, "F1");',"license URL");

source=source.replaceAll("A 98-page, 90-day","An 89-page, 90-day").replaceAll("98 pages in a 7 × 10-inch","89 pages in a 7 × 10-inch").replaceAll("<strong>98</strong><span>Journal pages</span>","<strong>89</strong><span>Journal pages</span>").replaceAll("personal inventory, guided reflection","personal reflection").replaceAll("98 pages each","89 pages each");
const oldPreview='<article><span>03</span><h3>Personal Inventory</h3><p>Questions that locate your present condition.</p></article><article><span>04</span><h3>Guided Reflection</h3><p>Space to respond honestly to the chapter.</p></article>';
req(oldPreview,'<article><span>03</span><h3>Personal Reflection</h3><p>Four focused prompts that locate your present condition and help you respond honestly to the chapter.</p></article>',"reflection preview");
for(const [a,b,h] of [["05","04","Scripture Meditation"],["06","05","My Story"],["07","06","Practice"],["08","07","Declarations"],["09","08","Kingdom Journal"],["10","09","Spiritual Checkpoint"]])req(`<article><span>${a}</span><h3>${h}</h3>`,`<article><span>${b}</span><h3>${h}</h3>`,`${h} numbering`);
if(source.includes("PERSONAL INVENTORY")||source.includes('"Guided Reflection"'))throw new Error("Retired reflection heading remains.");
await writeFile(generatedPath,source,"utf8");try{await import(`${pathToFileURL(generatedPath).href}?build=${Date.now()}`);}finally{await rm(generatedPath,{force:true});}
for(const path of [fillablePath,printPath]){const pdf=(await readFile(path)).toString("latin1");if(!pdf.includes("/Count 89"))throw new Error(`${path}: wrong page count`);if(!pdf.includes("www.gleaningground.com"))throw new Error(`${path}: license URL missing`);if(pdf.includes("PERSONAL INVENTORY")||pdf.includes("Guided Reflection"))throw new Error(`${path}: retired heading remains`);if((pdf.match(/PERSONAL REFLECTION/g)||[]).length!==9)throw new Error(`${path}: reflection count wrong`);for(const label of ["TRANSFORMATION","RESPONSIBILITY","MULTIPLICATION"])if(!pdf.includes(label))throw new Error(`${path}: expected formation label missing: ${label}`);}
console.log("Built and verified both 89-page Companion PDFs with width-aware wrapping, centered box text, fitted table labels, and polished layout spacing.");
