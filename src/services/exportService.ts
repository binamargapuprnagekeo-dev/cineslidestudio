import PptxGenJS from 'pptxgenjs';
import { Scene, ThemeConfig, AvatarConfig } from '../types';
import { THEMES } from '../constants/presets';

// Helper to download blob
export function downloadBlob(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Generate PowerPoint PPTX presentation
export async function exportToPPTX(
  scenes: Scene[],
  themeIndex: number,
  projectName = 'Presentasi-Studio-AI',
  embedAudio = true
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

  const theme = THEMES[themeIndex] || THEMES[0];
  const hexClean = (hex: string) => hex.replace('#', '');

  scenes.forEach((sc, i) => {
    const slide = pptx.addSlide();
    slide.background = { color: hexClean(theme.bg) };

    const acHex = hexClean(theme.ac);
    const inkHex = hexClean(theme.ink);

    // Accent line decoration
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8,
      y: 0.5,
      w: 1.2,
      h: 0.08,
      fill: { color: acHex },
      line: { color: acHex },
    });

    const slideTitle = sc.title || `Slide ${i + 1}`;
    slide.addText(slideTitle, {
      x: 0.8,
      y: 0.7,
      w: 11.5,
      h: 1.1,
      fontFace: 'Calibri',
      fontSize: 36,
      bold: true,
      color: inkHex,
      valign: 'top',
    });

    // Bullets / body text
    const bulletItems = sc.body.split('\n').filter(Boolean);
    if (bulletItems.length > 0) {
      slide.addText(
        bulletItems.map((q) => ({ text: q, options: { bullet: true, breakLine: true } })),
        {
          x: 0.8,
          y: 2.0,
          w: 11.5,
          h: 4.8,
          fontFace: 'Calibri',
          fontSize: 22,
          color: inkHex,
          valign: 'top',
          paraSpaceAfter: 10,
        }
      );
    }

    // Slide number
    slide.addText(`${i + 1} / ${scenes.length}`, {
      x: 11.5,
      y: 7.0,
      w: 1.2,
      h: 0.4,
      fontSize: 12,
      color: acHex,
      align: 'right',
    });

    // Speaker notes with narration text
    if (sc.text) {
      slide.addNotes(sc.text);
    }

    // Embed narration audio if available
    if (embedAudio && sc.audio && sc.audio.b64) {
      try {
        slide.addMedia({
          type: 'audio',
          data: `data:${sc.audio.mime};base64,${sc.audio.b64}`,
          x: 12.2,
          y: 6.7,
          w: 0.5,
          h: 0.5,
        });
      } catch (e) {
        console.warn('Could not embed audio in PPTX:', e);
      }
    }
  });

  const blob = await pptx.write({ outputType: 'blob' }) as Blob;
  downloadBlob(blob, `${projectName}.pptx`);
}

// Check best supported video MIME type
export function getSupportedVideoMime(): string {
  const candidateTypes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return candidateTypes.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';
}
